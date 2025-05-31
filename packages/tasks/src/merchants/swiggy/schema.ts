import { z } from "zod";
import { BaseTransactionSchema, BaseExtractionSchema } from "../base/baseSchema";

// Swiggy-specific transaction extensions
export const SwiggyTransactionSchema = BaseTransactionSchema.extend({
  // Order-specific fields
  orderId: z.string().min(1, "Order ID is required for Swiggy transactions").optional()
    .describe("Swiggy order ID, usually a numeric string like '207494377347345'"),
  orderItems: z.array(z.object({
    name: z.string().optional().describe("Name of the food item ordered"),
    quantity: z.number().positive().optional().describe("Number of units of this item"),
    price: z.number().positive().optional().describe("Price of this individual item"),
    category: z.string().optional().describe("Category of the food item (e.g., 'Main Course', 'Dessert')"),
    customizations: z.array(z.string()).default([]).describe("Any customizations made to the item")
  })).optional().describe("List of items ordered from the restaurant"),
  
  // Delivery information
  deliveryAddress: z.object({
    fullAddress: z.string().optional().describe("Complete delivery address"),
    landmark: z.string().optional().describe("Landmark near the delivery address"),
    pincode: z.string().optional().describe("PIN code of the delivery area"),
    area: z.string().optional().describe("Area or locality of delivery")
  }).optional().describe("Address where the order was delivered"),
  
  // Swiggy-specific IDs
  restaurantId: z.string().optional().describe("Swiggy's internal restaurant identifier"),
  restaurantName: z.string().optional().describe("Name of the restaurant from which order was placed"),
  
  // Delivery details
  deliveryFee: z.number().optional().describe("Fee charged for delivery if free delivery value is 0"),
  taxes: z.number().optional().describe("Total taxes applied to the order"),
  discount: z.number().optional().describe("Total discount amount applied"),
  packagingFee: z.number().optional().describe("Fee charged for packaging"),
  
  // Delivery partner info
  deliveryPartnerName: z.string().optional().describe("Name of the delivery partner"),
  estimatedDeliveryTime: z.string().optional().describe("Initially estimated delivery time"),
  actualDeliveryTime: z.string().optional().describe("Actual time when order was delivered"),
  
  // Swiggy One/Pro benefits
  membershipDiscount: z.number().optional().describe("Discount applied due to Swiggy One/Pro membership"),
  proStatus: z.boolean().default(false).optional().describe("Whether the customer has Swiggy Pro/One membership"),
});

// Complete Swiggy extraction schema
export const SwiggyExtractionSchema = BaseExtractionSchema.extend({
  // Override transaction field with Swiggy-specific schema
  transaction: SwiggyTransactionSchema.optional()
    .describe("Detailed transaction information for Swiggy orders"),
  
  // Swiggy-specific metadata
  swiggyMetadata: z.object({
    service: z.enum(["FOOD_DELIVERY", "INSTAMART", "GENIE"]).default("FOOD_DELIVERY")
      .describe("Type of Swiggy service - FOOD_DELIVERY for restaurants, INSTAMART for groceries, GENIE for courier"),
    appVersion: z.string().optional().describe("Version of the Swiggy app used"),
    orderType: z.enum(["DELIVERY", "PICKUP", "DINE_IN"]).default("DELIVERY")
      .describe("How the order was fulfilled - DELIVERY for home delivery, PICKUP for customer pickup"),
    paymentGateway: z.string().optional().describe("Payment method used (e.g., 'Swiggy Money', 'UPI', 'Credit Card')"),
  }).optional().describe("Swiggy-specific metadata that should be at the root level, not inside transaction"),
});

// Type exports
export type SwiggyTransaction = z.infer<typeof SwiggyTransactionSchema>;
export type SwiggyExtraction = z.infer<typeof SwiggyExtractionSchema>; 