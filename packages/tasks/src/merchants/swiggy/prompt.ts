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
- transaction.amount must come from the email body ("Paid Via", "Grand Total", or "Order Total"), never from the PDF invoice total.
- The PDF "Invoice Total" is usually the restaurant food subtotal only. Platform fees, delivery, and Swiggy discounts live in the email body.
- A difference between PDF invoice total and email "Paid Via" amount is normal. Do not treat it as an extraction failure.
- Prefer the PDF for invoice fields, line items, restaurant name, taxes, and packaging.
- Prefer the email body for final paid amount, payment method, order ID when present, and service type hints.
- Swiggy delivery confirmation emails ("successfully delivered", "delivered on time/superfast") are valid receipts when they include Order ID and a final paid amount.
- Return parseSuccess=false only for marketing/promotional email without an order receipt, or when order ID and final paid amount are both missing.
`;

export const SWIGGY_PROMPT = buildMerchantPrompt(
  BASE_SYSTEM_PROMPT,
  SWIGGY_SPECIFIC_INSTRUCTIONS,
);
