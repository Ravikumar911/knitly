import { MerchantConfig } from "../types";
import { FoodDeliveryExtractionSchema } from "../food-delivery/schema";

export const UberEatsMerchant: MerchantConfig = {
  id: "uber-eats",
  name: "Uber Eats",
  code: "UBER_EATS",
  emailPatterns: [
    "uber.com",
    "*.uber.com",
    "ubereats.com",
    "*.ubereats.com",
    "noreply@uber.com",
    "receipts@uber.com",
  ],
  subjectPatterns: [
    "your uber eats order",
    "your order with uber eats",
    "receipt for your order",
    "thanks for ordering",
    "your receipt from uber",
  ],
  bodyPatterns: ["uber eats", "order total", "charged", "delivery"],
  schema: FoodDeliveryExtractionSchema,
  prompt: "",
  priority: 80,
  isActive: true,
};

export default UberEatsMerchant;
