import type { Command } from "commander";
import { streamText, type LanguageModel } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import pc from "picocolors";
import {
  clearAssistantCredential,
  readAssistantCredential,
  writeAssistantCredential,
} from "../../config/credentials.js";
import { loadConfig, writeConfig } from "../../config/load.js";

type AssistantProvider = "ollama" | "openai-compatible" | "anthropic";

export function register(program: Command) {
  const assistant = program
    .command("assistant")
    .description("Configure the dashboard assistant provider");

  assistant
    .command("install")
    .description("Configure an assistant provider")
    .option("--provider <provider>", "ollama, openai-compatible, or anthropic")
    .option("--base-url <url>", "OpenAI-compatible base URL")
    .option("--model <model>", "Chat model name")
    .option("--api-key <key>", "API key for hosted providers")
    .action(
      async (options: {
        provider?: AssistantProvider;
        baseUrl?: string;
        model?: string;
        apiKey?: string;
      }) => {
        const provider = options.provider || "ollama";
        if (provider === "ollama") {
          const config = loadConfig({ createIfMissing: true });
          config.assistant = {
            provider: "ollama-local",
            baseUrl:
              options.baseUrl ||
              config.assistant.baseUrl ||
              "http://127.0.0.1:11434/v1",
            chatModel:
              options.model || config.assistant.chatModel || "qwen3:4b",
          };
          writeConfig(config);
          console.log(
            pc.green(
              `assistant provider: local Ollama (${config.assistant.chatModel})`,
            ),
          );
          return;
        }

        if (provider !== "openai-compatible" && provider !== "anthropic") {
          throw new Error(`Unsupported assistant provider: ${provider}`);
        }

        const apiKey =
          options.apiKey ||
          (provider === "anthropic"
            ? process.env.ANTHROPIC_API_KEY
            : process.env.OPENAI_API_KEY);
        if (!apiKey) {
          throw new Error(
            `Missing API key. Pass --api-key or set ${
              provider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY"
            }.`,
          );
        }

        await writeAssistantCredential({ provider, apiKey });
        const config = loadConfig({ createIfMissing: true });
        config.assistant = {
          provider,
          baseUrl:
            options.baseUrl ||
            (provider === "anthropic"
              ? "https://api.anthropic.com/v1"
              : "https://api.openai.com/v1"),
          chatModel:
            options.model ||
            (provider === "anthropic" ? "claude-haiku-4-5" : "gpt-5.4-mini"),
        };
        writeConfig(config);
        console.log(
          pc.green(
            `assistant provider: ${provider} (${config.assistant.chatModel})`,
          ),
        );
      },
    );

  assistant
    .command("status")
    .description("Print assistant provider status")
    .option("--json", "Print JSON")
    .action(async (options: { json?: boolean }) => {
      const status = await assistantStatus();
      if (options.json) {
        console.log(JSON.stringify(status, null, 2));
      } else {
        console.log(
          `${status.provider} ${status.ready ? pc.green("ready") : pc.yellow("not ready")}${status.reason ? ` (${status.reason})` : ""}`,
        );
      }
    });

  assistant
    .command("test")
    .description("Check the configured assistant provider")
    .action(async () => {
      await testAssistantProvider();
      console.log(pc.green("assistant provider ready"));
    });

  assistant
    .command("clear")
    .description("Clear assistant provider config and API keys")
    .action(async () => {
      await clearAssistantCredential();
      const config = loadConfig({ createIfMissing: true });
      config.assistant.provider = "none";
      writeConfig(config);
      console.log(pc.green("assistant provider cleared"));
    });
}

type AssistantStatus =
  | {
      provider: "none";
      ready: false;
      reason: "no-assistant-provider";
    }
  | {
      provider: "ollama-local";
      ready: boolean;
      reason: "ollama-not-running" | null;
      model: string;
      baseUrl: string;
    }
  | {
      provider: "openai-compatible" | "anthropic";
      ready: boolean;
      reason: "missing-api-key" | null;
      model: string;
      baseUrl: string;
    };

export async function assistantStatus(): Promise<AssistantStatus> {
  const config = loadConfig({ createIfMissing: true });
  const provider = config.assistant.provider;
  if (provider === "none") {
    return {
      provider,
      ready: false,
      reason: "no-assistant-provider",
    };
  }

  if (provider === "ollama-local") {
    const ready = await checkHttp(config.assistant.baseUrl);
    return {
      provider,
      ready,
      reason: ready ? null : "ollama-not-running",
      model: config.assistant.chatModel,
      baseUrl: config.assistant.baseUrl,
    };
  }

  const credential = await readAssistantCredential(provider);
  if (!credential) {
    return {
      provider,
      ready: false,
      reason: "missing-api-key",
      model: config.assistant.chatModel,
      baseUrl: config.assistant.baseUrl,
    };
  }

  if (credential.apiKey.startsWith("sk-test")) {
    return {
      provider,
      ready: true,
      reason: null,
      model: config.assistant.chatModel,
      baseUrl: config.assistant.baseUrl,
    };
  }

  return {
    provider,
    ready: true,
    reason: null,
    model: config.assistant.chatModel,
    baseUrl: config.assistant.baseUrl,
  };
}

export async function testAssistantProvider() {
  const status = await assistantStatus();
  if (!status.ready) {
    throw new Error(status.reason || "assistant provider is not ready");
  }

  const result = streamText({
    model: await assistantLanguageModel(status),
    system: "Reply with exactly: ok",
    prompt: "Say ok.",
    maxOutputTokens: 8,
  });

  for await (const chunk of result.textStream) {
    if (chunk.trim().length > 0) {
      return;
    }
  }

  throw new Error("assistant provider returned an empty response");
}

async function assistantLanguageModel(
  status: Exclude<AssistantStatus, { provider: "none"; ready: false }>,
): Promise<LanguageModel> {
  const credential =
    status.provider === "openai-compatible" || status.provider === "anthropic"
      ? await readAssistantCredential(status.provider)
      : null;
  if (
    (status.provider === "openai-compatible" ||
      status.provider === "anthropic") &&
    !credential
  ) {
    throw new Error("missing-api-key");
  }

  return createOpenAICompatible({
    name:
      status.provider === "anthropic"
        ? "anthropic-compatible"
        : status.provider,
    baseURL: status.baseUrl,
    apiKey: credential?.apiKey,
  })(status.model);
}

async function checkHttp(baseUrl: string) {
  try {
    const endpoint = new URL(baseUrl);
    endpoint.pathname = "/api/tags";
    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(1_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
