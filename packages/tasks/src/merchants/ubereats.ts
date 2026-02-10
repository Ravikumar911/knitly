import { BaseExtractionSchema, BaseTransactionSchema } from "./base/baseSchema";
import { MerchantConfig } from "./types";

const UberEatsExtractionSchema = BaseExtractionSchema.extend({
  transaction: BaseTransactionSchema.optional(),
});

const UBEREATS_PROMPT = `Extract transaction data from Uber Eats order and receipt emails for US and Canada users.

Prioritize:
- total charged amount
- currency (USD/CAD)
- order date/time
- merchant or restaurant name
- delivery fee and taxes when available
- order identifiers in referenceIds

Return a valid object that matches the provided schema.`;

const UberEatsMerchant: MerchantConfig = {
  id: "ubereats",
  name: "Uber Eats",
  code: "UBER_EATS",
  emailPatterns: ["uber.com", "e.uber.com", "uber-eats.com"],
  subjectPatterns: [
    "uber eats",
    "your receipt",
    "trip receipt",
    "order delivered",
    "thanks for ordering",
  ],
  bodyPatterns: ["uber eats", "order total", "delivery", "service fee"],
  schema: UberEatsExtractionSchema,
  prompt: UBEREATS_PROMPT,
  priority: 95,
  isActive: true,
};

export default UberEatsMerchant;
