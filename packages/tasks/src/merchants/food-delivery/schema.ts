import { z } from "zod";
import {
  BaseExtractionSchema,
  BaseTransactionSchema,
} from "../base/baseSchema";

export const FoodDeliveryTransactionSchema = BaseTransactionSchema.extend({
  orderId: z.string().min(1).optional(),
  orderItems: z
    .array(
      z.object({
        name: z.string().optional(),
        quantity: z.number().positive().optional(),
        price: z.number().positive().optional(),
      }),
    )
    .optional(),
  restaurantName: z.string().optional(),
  deliveryAddress: z
    .object({
      fullAddress: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
    })
    .optional(),
  deliveryFee: z.number().optional(),
  taxes: z.number().optional(),
  tip: z.number().optional(),
  discount: z.number().optional(),
});

export const FoodDeliveryExtractionSchema = BaseExtractionSchema.extend({
  transaction: FoodDeliveryTransactionSchema.optional(),
  foodDeliveryMetadata: z
    .object({
      service: z
        .enum(["FOOD_DELIVERY", "GROCERY", "RIDESHARE"])
        .default("FOOD_DELIVERY"),
      fulfillmentType: z.enum(["DELIVERY", "PICKUP"]).default("DELIVERY"),
    })
    .optional(),
});

export type FoodDeliveryTransaction = z.infer<
  typeof FoodDeliveryTransactionSchema
>;
export type FoodDeliveryExtraction = z.infer<
  typeof FoodDeliveryExtractionSchema
>;
