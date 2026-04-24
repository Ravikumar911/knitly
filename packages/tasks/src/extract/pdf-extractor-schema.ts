import { z } from "zod";

export const PdfExtractionItemSchema = z.object({
  name: z.string().nullable().optional(),
  quantity: z.number().nullable().optional(),
  unitPrice: z.number().nullable().optional(),
  lineTotal: z.number().nullable().optional(),
});

export const PdfExtractionTaxesSchema = z.object({
  gst: z.number().nullable().optional(),
  serviceCharge: z.number().nullable().optional(),
});

export const PdfExtractionDeliverySchema = z.object({
  address: z.string().nullable().optional(),
  pincode: z.string().nullable().optional(),
  fee: z.number().nullable().optional(),
});

export const PdfExtractionFieldsSchema = z.object({
  orderId: z.string().nullable().optional(),
  totalAmount: z.number().nullable().optional(),
  currency: z.string().default("INR"),
  transactionDate: z.string().nullable().optional(),
  items: z.array(PdfExtractionItemSchema).default([]),
  taxes: PdfExtractionTaxesSchema.nullable().optional(),
  delivery: PdfExtractionDeliverySchema.nullable().optional(),
  paymentMethod: z.string().nullable().optional(),
  restaurantName: z.string().nullable().optional(),
});

export const PdfExtractionRawSchema = z.object({
  pageCount: z.number().nullable().optional(),
  tables: z.array(z.record(z.unknown())).default([]),
  text: z.string().default(""),
});

export const PdfExtractionSchema = z.object({
  schemaVersion: z.literal("1"),
  extractor: z.string().min(1),
  extractorVersion: z.string().min(1),
  merchant: z.literal("swiggy"),
  confidence: z.number().min(0).max(1),
  fields: PdfExtractionFieldsSchema,
  warnings: z.array(z.string()).default([]),
  raw: PdfExtractionRawSchema,
});

export type PdfExtraction = z.infer<typeof PdfExtractionSchema>;
export type PdfExtractionFields = z.infer<typeof PdfExtractionFieldsSchema>;
