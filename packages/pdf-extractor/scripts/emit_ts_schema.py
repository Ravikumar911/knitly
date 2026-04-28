from __future__ import annotations

EXPECTED_TS_SCHEMA = """import { z } from "zod";

export const PdfExtractionFieldsSchema = z.record(z.unknown()).default({});

export const PdfExtractionRawSchema = z.object({
  page_count: z.number().nullable().optional(),
  tables: z.array(z.record(z.unknown())).default([]),
  text: z.string().default(""),
  sources: z.record(z.unknown()).default({}),
});

export const SourceQualitySchema = z.object({
  kind: z.enum(["text", "scanned", "empty", "encrypted", "corrupted"]),
  page_count: z.number().int().nonnegative(),
  parsers_used: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});

export const PdfExtractionSchema = z.object({
  schema_version: z.literal("2"),
  extractor: z.string().min(1),
  extractor_version: z.string().min(1),
  merchant: z.literal("swiggy"),
  confidence: z.number().min(0).max(1),
  fields: PdfExtractionFieldsSchema,
  raw: PdfExtractionRawSchema,
  source_quality: SourceQualitySchema,
});

export type PdfExtraction = z.infer<typeof PdfExtractionSchema>;
export type PdfExtractionFields = z.infer<typeof PdfExtractionFieldsSchema>;
export type SourceQuality = z.infer<typeof SourceQualitySchema>;
"""


def main() -> int:
    print(EXPECTED_TS_SCHEMA, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
