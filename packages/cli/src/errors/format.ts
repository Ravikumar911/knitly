export type CliErrorArea =
  | "auth"
  | "network"
  | "binary"
  | "schema"
  | "config"
  | "filesystem"
  | "runtime"
  | "internal";

export type CliErrorBlock = {
  area: CliErrorArea;
  symptom: string;
  cause: string;
  fix: string;
  docs?: string;
};

export class CliError extends Error {
  readonly block: CliErrorBlock;

  constructor(block: CliErrorBlock) {
    super(block.symptom);
    this.name = "CliError";
    this.block = block;
  }
}

export function formatCliError(error: CliErrorBlock) {
  const lines = [
    `error[${error.area}]: ${error.symptom}`,
    `  cause: ${error.cause}`,
    `  fix:   ${error.fix}`,
  ];

  if (error.docs) {
    lines.push(`  docs:  ${error.docs}`);
  }

  return lines.join("\n");
}

export function normalizeCliError(error: unknown): CliErrorBlock {
  if (error instanceof CliError) {
    return error.block;
  }

  if (isCliErrorBlock(error)) {
    return error;
  }

  const cause = error instanceof Error ? error.message : String(error);
  return {
    area: "runtime",
    symptom: "Command failed.",
    cause: cause || "No additional error detail was provided.",
    fix: "Run `slashcash doctor --fix`, then retry the command.",
  };
}

function isCliErrorBlock(value: unknown): value is CliErrorBlock {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CliErrorBlock>;
  return Boolean(
    candidate.area && candidate.symptom && candidate.cause && candidate.fix,
  );
}
