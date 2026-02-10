import { BaseExtractionSchema, BaseTransactionSchema } from "./base/baseSchema";
import { MerchantConfig } from "./types";

const DoorDashExtractionSchema = BaseExtractionSchema.extend({
  transaction: BaseTransactionSchema.optional(),
});

const DOORDASH_PROMPT = `Extract transaction data from DoorDash order and receipt emails for US and Canada users.

Prioritize:
- total charged amount
- currency (USD/CAD)
- order date/time
- restaurant/store name
- delivery fee and tax details when available
- order identifiers in referenceIds

Return a valid object that matches the provided schema.`;

const DoorDashMerchant: MerchantConfig = {
  id: "doordash",
  name: "DoorDash",
  code: "DOORDASH",
  emailPatterns: ["doordash.com", "mx.doordash.com"],
  subjectPatterns: [
    "doordash order",
    "your order",
    "receipt",
    "dasher",
    "order delivered",
  ],
  bodyPatterns: ["doordash", "order total", "subtotal", "delivery fee"],
  schema: DoorDashExtractionSchema,
  prompt: DOORDASH_PROMPT,
  priority: 95,
  isActive: true,
};

export default DoorDashMerchant;
