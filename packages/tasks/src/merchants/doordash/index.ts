import { MerchantConfig } from "../types";
import { FoodDeliveryExtractionSchema } from "../food-delivery/schema";

export const DoorDashMerchant: MerchantConfig = {
  id: "doordash",
  name: "DoorDash",
  code: "DOORDASH",
  emailPatterns: [
    "doordash.com",
    "*.doordash.com",
    "no-reply@doordash.com",
    "orders@doordash.com",
    "hello@doordash.com",
  ],
  subjectPatterns: [
    "your doordash order",
    "your order has been delivered",
    "thanks for your order",
    "receipt for your doordash order",
    "your receipt from doordash",
  ],
  bodyPatterns: ["doordash", "order total", "charged", "delivery"],
  schema: FoodDeliveryExtractionSchema,
  prompt: "",
  priority: 80,
  isActive: true,
};

export default DoorDashMerchant;
