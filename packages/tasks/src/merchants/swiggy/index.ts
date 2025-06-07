import { MerchantConfig } from "../types";
import { SwiggyExtractionSchema } from "./schema";
import { SWIGGY_PROMPT } from "./prompt";

export const SwiggyMerchant: MerchantConfig = {
  id: "swiggy" as const,
  name: "Swiggy",
  code: "SWIGGY",
  
  // Primary filtering: Domain-based Gmail search
  emailPatterns: [
    "*.swiggy.in",    // Catches all Swiggy India subdomains
    "*.swiggy.com"    // Catches all Swiggy global subdomains
  ],
  
  // Secondary filtering: Used for post-processing identification only
  subjectPatterns: [
    "swiggy order",
    "swiggy instamart", 
    "order delivered",
    "payment swiggy",
    "your swiggy order",
    "successfully delivered"
  ],
  
  bodyPatterns: [
    "swiggy",
    "order id",
    "delivery address",
    "restaurant order"
  ],
  
  // Schema and prompt
  schema: SwiggyExtractionSchema,
  prompt: SWIGGY_PROMPT,
  
  // Configuration
  priority: 90, // High priority for specific merchant
  isActive: true,
};

export default SwiggyMerchant; 