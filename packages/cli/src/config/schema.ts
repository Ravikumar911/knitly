import { z } from "zod";

export const DEFAULT_GMAIL_QUERY =
  "from:(swiggy.in OR swiggy.com OR uber.com OR ubereats.com OR doordash.com) newer_than:365d";

export const configSchema = z.object({
  server: z.object({
    host: z.literal("127.0.0.1").default("127.0.0.1"),
    port: z.number().int().min(1024).max(65535).default(3000),
  }),
  ai: z.object({
    ollamaBaseUrl: z.string().url().default("http://127.0.0.1:11434/v1"),
    chatModel: z.string().min(1).default("gemma4:latest"),
    visionModel: z.string().min(1).default("gemma4:latest"),
  }),
  assistant: z
    .object({
      provider: z
        .enum(["none", "ollama-local", "openai-compatible", "anthropic"])
        .default("none"),
      baseUrl: z.string().url().default("http://127.0.0.1:11434/v1"),
      chatModel: z.string().min(1).default("gemma4:latest"),
    })
    .default({
      provider: "none",
      baseUrl: "http://127.0.0.1:11434/v1",
      chatModel: "gemma4:latest",
    }),
  pdfExtractor: z
    .object({
      enabled: z.boolean().default(true),
      timeoutMs: z.number().int().min(1_000).max(300_000).default(30_000),
      pythonBin: z.string().default(""),
    })
    .default({
      enabled: true,
      timeoutMs: 30_000,
      pythonBin: "",
    }),
  sync: z.object({
    schedule: z.string().default("*/15 * * * *"),
    gmailQuery: z.string().min(1).default(DEFAULT_GMAIL_QUERY),
    maxMessages: z.number().int().min(1).max(500).default(50),
    concurrency: z
      .object({
        fetch: z.number().int().min(1).max(16).default(4),
        extract: z.number().int().min(1).max(16).default(4),
        write: z.literal(1).default(1),
      })
      .default({
        fetch: 4,
        extract: 4,
        write: 1,
      }),
  }),
  gmail: z
    .object({
      address: z.string().default(""),
      passwordStore: z.enum(["keychain", "file"]).default("keychain"),
      imapServer: z.literal("imap.gmail.com:993").default("imap.gmail.com:993"),
    })
    .default({
      address: "",
      passwordStore: "keychain",
      imapServer: "imap.gmail.com:993",
    }),
  skills: z
    .object({
      enabled: z.record(z.boolean()).default({ "gmail-swiggy": true }),
    })
    .default({ enabled: { "gmail-swiggy": true } }),
  updates: z
    .object({
      checkOnVersion: z.boolean().default(false),
    })
    .default({ checkOnVersion: false }),
});

export type SlashcashConfig = z.infer<typeof configSchema>;

export const defaultConfig: SlashcashConfig = {
  server: {
    host: "127.0.0.1",
    port: 3000,
  },
  ai: {
    ollamaBaseUrl: "http://127.0.0.1:11434/v1",
    chatModel: "gemma4:latest",
    visionModel: "gemma4:latest",
  },
  assistant: {
    provider: "none",
    baseUrl: "http://127.0.0.1:11434/v1",
    chatModel: "gemma4:latest",
  },
  pdfExtractor: {
    enabled: true,
    timeoutMs: 30_000,
    pythonBin: "",
  },
  sync: {
    schedule: "*/15 * * * *",
    gmailQuery: DEFAULT_GMAIL_QUERY,
    maxMessages: 50,
    concurrency: {
      fetch: 4,
      extract: 4,
      write: 1,
    },
  },
  gmail: {
    address: "",
    passwordStore: "keychain",
    imapServer: "imap.gmail.com:993",
  },
  skills: {
    enabled: {
      "gmail-swiggy": true,
    },
  },
  updates: {
    checkOnVersion: false,
  },
};
