import { BASE_SYSTEM_PROMPT, buildMerchantPrompt } from "../base/basePrompt";

const SWIGGY_SPECIFIC_INSTRUCTIONS = `
SWIGGY EXTRACTION FOCUS:
1. ALWAYS extract the order ID - it's critical for Swiggy transactions
2. Look for order details including:
   - Individual items with quantities and prices
   - Restaurant/store name and ID
   - Delivery address (full address, landmark, area)
   - Delivery partner information
3. Extract fee breakdown:
   - Item total, delivery fee, taxes, packaging fee
   - Discounts and membership benefits (Swiggy One/Pro)
   - Final amount paid
4. Identify service type:
   - Food Delivery (restaurants)
   - Instamart (grocery/essentials)
   - Genie (pick-up and drop service)
5. Payment and delivery details:
   - Payment method and gateway
   - Estimated vs actual delivery time
   - Order type (delivery/pickup)

SWIGGY EMAIL PATTERNS:
- Order confirmations: "Your Swiggy order..."
- Delivery updates: "Your order is on the way", "successfully delivered"
- Payment confirmations: "Payment successful for order"
- Instamart orders: "Your Swiggy Instamart order"

REFERENCE ID EXTRACTION:
- Order ID: Usually in format like "123456789" or "SW123456789"
- Transaction ID: Payment gateway transaction ID
- Restaurant ID: Internal Swiggy restaurant identifier

VALIDATION RULES:
- Order ID is mandatory for successful parsing
- Amount should match the final total paid
- Service type should be correctly identified
- Address extraction is important for delivery orders

For failed extractions:
- Check if it's a promotional/marketing email (set parseSuccess = false)
- Verify order ID presence and format
- Ensure amount extraction is successful
`;

export const SWIGGY_RECONCILIATION_RULES = `
RECONCILIATION RULES:
- Prefer the PDF amount when the email body and PDF disagree.
- Prefer the PDF order ID when both sources provide one.
- Prefer the email sender and email date as the canonical message metadata.
- If the amounts disagree by more than 1%, cut confidence in half and surface an "amount mismatch" warning.
`;

export const SWIGGY_PROMPT = buildMerchantPrompt(
  BASE_SYSTEM_PROMPT,
  SWIGGY_SPECIFIC_INSTRUCTIONS,
);
