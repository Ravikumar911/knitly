import { z } from "zod";

export const configSchema = z.object({
  server: z.object({
    host: z.literal("127.0.0.1").default("127.0.0.1"),
    port: z.number().int().min(1024).max(65535).default(3000),
  }),
  ai: z.object({
    ollamaBaseUrl: z.string().url().default("http://127.0.0.1:11434/v1"),
    chatModel: z.string().min(1).default("gemma3n:e4b"),
  }),
  sync: z.object({
    schedule: z.string().default("*/15 * * * *"),
  }),
});

export type SlashcashConfig = z.infer<typeof configSchema>;

export const defaultConfig: SlashcashConfig = {
  server: {
    host: "127.0.0.1",
    port: 3000,
  },
  ai: {
    ollamaBaseUrl: "http://127.0.0.1:11434/v1",
    chatModel: "gemma3n:e4b",
  },
  sync: {
    schedule: "*/15 * * * *",
  },
};
