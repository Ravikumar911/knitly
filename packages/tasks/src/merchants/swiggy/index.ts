import { MerchantConfig } from "../types";
import { SwiggyExtractionSchema } from "./schema";
import { SWIGGY_PROMPT } from "./prompt";

export const SwiggyMerchant: MerchantConfig = {
  id: "swiggy" as const,
  name: "Swiggy",
  code: "SWIGGY",
  
  // Email identification patterns
  emailPatterns: [
    "swiggy.in",
    "swiggy.com",
    "noreply@swiggy.in",
    "orders@swiggy.in",
    "partnerupdate.swiggy.in"
  ],
  
  subjectPatterns: [
    "swiggy order",
    "swiggy instamart",
    "order.*delivered",
    "payment.*swiggy",
    "your.*swiggy.*order"
  ],
  
  bodyPatterns: [
    "swiggy",
    "order id",
    "delivery.*address",
    "restaurant.*order"
  ],
  
  // Schema and prompt
  schema: SwiggyExtractionSchema,
  prompt: SWIGGY_PROMPT,
  
  // Configuration
  priority: 90, // High priority for specific merchant
  isActive: true,
};

export default SwiggyMerchant; 