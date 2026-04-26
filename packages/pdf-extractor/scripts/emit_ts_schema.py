from __future__ import annotations

EXPECTED_TS_SCHEMA = """import { z } from "zod";

export const SwiggyLineItemSchema = z.object({
  name: z.string(),
  quantity: z.number().nullable().optional(),
  unit_price: z.number().nullable().optional(),
  amount: z.number().nullable().optional(),
  discount: z.number().nullable().optional(),
  net_amount: z.number().nullable().optional(),
  tax_total: z.number().nullable().optional(),
});

export const SwiggyInvoiceFieldsSchema = z.object({
  order_id: z.string().nullable().optional(),
  invoice_no: z.string().nullable().optional(),
  invoice_date: z.string().nullable().optional(),
  restaurant_name: z.string().nullable().optional(),
  restaurant_address: z.string().nullable().optional(),
  customer_address: z.string().nullable().optional(),
  pincode: z.string().nullable().optional(),
  invoice_total: z.number().nullable().optional(),
  paid_amount: z.number().nullable().optional(),
  item_subtotal: z.number().nullable().optional(),
  tax_total: z.number().nullable().optional(),
  platform_fee: z.number().nullable().optional(),
  delivery_fee: z.number().nullable().optional(),
  packaging_fee: z.number().nullable().optional(),
  discount_total: z.number().nullable().optional(),
  payment_method: z.string().nullable().optional(),
  service_type: z
    .enum(["FOOD_DELIVERY", "INSTAMART", "GENIE", "DINEOUT", "UNKNOWN"])
    .default("UNKNOWN"),
  items: z.array(SwiggyLineItemSchema).default([]),
});

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
  fields: SwiggyInvoiceFieldsSchema,
  raw: PdfExtractionRawSchema,
  source_quality: SourceQualitySchema,
});

export type PdfExtraction = z.infer<typeof PdfExtractionSchema>;
export type PdfExtractionFields = z.infer<typeof SwiggyInvoiceFieldsSchema>;
export type SourceQuality = z.infer<typeof SourceQualitySchema>;
"""


def main() -> int:
    print(EXPECTED_TS_SCHEMA, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
