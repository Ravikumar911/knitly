import { z } from "zod";
import { SwiggyMerchant } from "../merchants/swiggy";
import type { EmailData } from "../types/slashAI";
import { extractPdf } from "./pdf-extractor";

type SwiggyExtraction = z.infer<typeof SwiggyMerchant.schema>;

export type PdfExtractionCandidate = {
  extractionData: SwiggyExtraction;
  extractionConfidence: number;
  parseErrors: string[];
  warnings: string[];
  schemaUsed: "swiggy.docling.v1";
  dataSource: "PDF_ATTACHMENT";
  attachmentPath: string;
  contributedByPdf: true;
};

export async function extractFromPdf(input: {
  emailData: EmailData;
  attachmentPath: string;
}): Promise<
  { ok: true; value: PdfExtractionCandidate } | { ok: false; message: string }
> {
  const result = await extractPdf(input.attachmentPath);
  if (!result.ok) {
    return {
      ok: false,
      message: result.error.message,
    };
  }

  const pdf = result.value;
  const address = pdf.fields.delivery?.address;
  const pincode = pdf.fields.delivery?.pincode;
  const extractionData = SwiggyMerchant.schema.parse({
    detectedProvider: "Swiggy",
    emailType: "ORDER_CONFIRMATION",
    emailSubject: input.emailData.subject,
    parseSuccess: true,
    parseErrors: [],
    confidenceScore: pdf.confidence,
    dataSource: "PDF_ATTACHMENT",
    merchantId: SwiggyMerchant.id,
    merchantCode: SwiggyMerchant.code,
    transaction: {
      amount: pdf.fields.totalAmount ?? 0,
      currency: pdf.fields.currency || "INR",
      type: "DEBIT",
      status: "COMPLETED",
      transactionDate: pdf.fields.transactionDate || input.emailData.date,
      description: `Swiggy order - ${pdf.fields.restaurantName || "Swiggy"}`,
      category: "Food",
      merchantName: pdf.fields.restaurantName || "Swiggy",
      paymentMethod: pdf.fields.paymentMethod || undefined,
      referenceIds: pdf.fields.orderId ? { orderId: pdf.fields.orderId } : {},
      orderId: pdf.fields.orderId || undefined,
      orderItems: pdf.fields.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.unitPrice,
        category: "Food",
        customizations: [],
      })),
      deliveryAddress: {
        fullAddress: address || undefined,
        pincode: pincode || undefined,
        area: address || undefined,
      },
      restaurantName: pdf.fields.restaurantName || undefined,
      taxes:
        (pdf.fields.taxes?.gst || 0) + (pdf.fields.taxes?.serviceCharge || 0) ||
        undefined,
      deliveryFee: pdf.fields.delivery?.fee || undefined,
    } satisfies NonNullable<SwiggyExtraction["transaction"]>,
    swiggyMetadata: {
      service: "FOOD_DELIVERY",
      orderType: "DELIVERY",
      paymentGateway: pdf.fields.paymentMethod || undefined,
    },
  });

  return {
    ok: true,
    value: {
      extractionData,
      extractionConfidence: pdf.confidence,
      parseErrors: [],
      warnings: pdf.warnings,
      schemaUsed: "swiggy.docling.v1",
      dataSource: "PDF_ATTACHMENT",
      attachmentPath: input.attachmentPath,
      contributedByPdf: true,
    },
  };
}
