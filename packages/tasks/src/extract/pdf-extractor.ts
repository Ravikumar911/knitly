import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { extname, join, resolve } from "node:path";
import {
  PdfExtractionSchema,
  type PdfExtraction,
} from "./pdf-extractor-schema";

export type PdfExtractErrorCode =
  | "pdf-extractor-not-ready"
  | "pdf-extractor-timeout"
  | "pdf-extractor-crashed"
  | "pdf-extractor-bad-output"
  | "pdf-extractor-unsupported-format"
  | "pdf-extractor-empty"
  | "unknown";

export type PdfExtractError = {
  code: PdfExtractErrorCode;
  message: string;
  stderr?: string;
  exitCode?: number | null;
};

export type PdfExtractResult =
  | { ok: true; value: PdfExtraction }
  | { ok: false; error: PdfExtractError };

export async function extractPdf(
  absolutePath: string,
  opts: { timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<PdfExtractResult> {
  if (process.env.SLASHCASH_PDF_EXTRACTOR_DISABLED === "1") {
    return {
      ok: false,
      error: {
        code: "pdf-extractor-not-ready",
        message: "The PDF extractor is disabled by environment.",
      },
    };
  }

  if (extname(absolutePath).toLowerCase() !== ".pdf") {
    return {
      ok: false,
      error: {
        code: "pdf-extractor-unsupported-format",
        message: `Unsupported file type: ${extname(absolutePath) || "<none>"}`,
      },
    };
  }

  const pythonBin = resolvePdfExtractorPython();
  const timeoutMs = resolveTimeoutMs(opts.timeoutMs);

  return new Promise<PdfExtractResult>((resolveResult) => {
    let settled = false;
    let stdout = "";
    let stderr = "";
    let killTimer: NodeJS.Timeout | undefined;

    const child = spawn(
      pythonBin,
      ["-m", "slashcash_pdf_extractor", resolve(absolutePath)],
      {
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    const settle = (result: PdfExtractResult) => {
      if (settled) return;
      settled = true;
      if (killTimer) clearTimeout(killTimer);
      resolveResult(result);
    };

    child.stdout?.setEncoding("utf8");
    child.stdout?.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", (chunk) => {
      stderr += chunk;
    });

    child.once("error", (error) => {
      settle({
        ok: false,
        error: {
          code: "pdf-extractor-not-ready",
          message: error.message,
          stderr,
        },
      });
    });

    if (opts.signal) {
      opts.signal.addEventListener(
        "abort",
        () => {
          child.kill("SIGTERM");
          settle({
            ok: false,
            error: {
              code: "pdf-extractor-timeout",
              message: "The PDF extractor was aborted.",
              stderr,
            },
          });
        },
        { once: true },
      );
    }

    killTimer = setTimeout(() => {
      child.kill("SIGTERM");
      setTimeout(() => {
        if (!settled) {
          child.kill("SIGKILL");
        }
      }, 2_000);
      settle({
        ok: false,
        error: {
          code: "pdf-extractor-timeout",
          message: `The PDF extractor timed out after ${timeoutMs}ms.`,
          stderr,
        },
      });
    }, timeoutMs);

    child.once("close", (code) => {
      if (settled) return;

      if ((stdout || "").trim().length === 0 && code === 0) {
        settle({
          ok: false,
          error: {
            code: "pdf-extractor-empty",
            message: "The PDF extractor returned no stdout payload.",
            stderr,
            exitCode: code,
          },
        });
        return;
      }

      if (code !== 0) {
        settle({
          ok: false,
          error: {
            code:
              code === 2
                ? "pdf-extractor-unsupported-format"
                : "pdf-extractor-crashed",
            message:
              stderr.trim() ||
              stdout.trim() ||
              `The PDF extractor exited with code ${String(code)}.`,
            stderr,
            exitCode: code,
          },
        });
        return;
      }

      try {
        const parsed = JSON.parse(stdout) as unknown;
        const validated = PdfExtractionSchema.safeParse(parsed);
        if (!validated.success) {
          settle({
            ok: false,
            error: {
              code: "pdf-extractor-bad-output",
              message: validated.error.message,
              stderr,
              exitCode: code,
            },
          });
          return;
        }

        settle({ ok: true, value: validated.data });
      } catch (error) {
        settle({
          ok: false,
          error: {
            code: "pdf-extractor-bad-output",
            message:
              error instanceof Error
                ? error.message
                : "The PDF extractor returned invalid JSON.",
            stderr,
            exitCode: code,
          },
        });
      }
    });
  });
}

function resolveTimeoutMs(timeoutMs?: number) {
  if (timeoutMs !== undefined) return timeoutMs;
  const configured = Number(
    process.env.SLASHCASH_PDF_EXTRACTOR_TIMEOUT_MS || 30_000,
  );
  return Number.isFinite(configured) && configured > 0 ? configured : 30_000;
}

function resolvePdfExtractorPython() {
  return (
    process.env.SLASHCASH_PDF_EXTRACTOR_PYTHON ||
    join(
      process.env.SLASHCASH_HOME || join(homedir(), ".slashcash"),
      "py-venv",
      "bin",
      "python",
    )
  );
}
