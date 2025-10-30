import { z } from "zod";
import { SwiggyExtractionSchema } from "@workspace/tasks/merchants/swiggy/schema";

/**
 * Type for expected Swiggy extraction results
 */
export type SwiggyExpectedOutput = z.infer<typeof SwiggyExtractionSchema>;

/**
 * Expected outputs for each test case
 * Extracted from actual Swiggy invoice PDFs
 */
export const SWIGGY_EXPECTED_OUTPUTS: SwiggyExpectedOutput[] = [
  // Test Case 0: taco_0000218052900102_bc65ae56-3b68-47ff-9c71-aea444c61dfd.pdf
  {
    detectedProvider: "Swiggy",
    emailType: "ORDER_CONFIRMATION",
    emailSubject: "Your Swiggy order has been delivered",
    parseSuccess: true,
    parseErrors: [],
    confidenceScore: 0.95,
    dataSource: "PDF_ATTACHMENT",
    transaction: {
      amount: 10.50,
      currency: "INR",
      type: "DEBIT",
      status: "COMPLETED",
      transactionDate: "2025-05-29T00:00:00.000Z",
      description: "Swiggy Food Order - Anand Sweets & Savouries",
      category: "FOOD_AND_DINING",
      referenceIds: { invoiceNo: "0000218052900102" },
      orderId: "207494377347345",
      restaurantName: "Anand Sweets & Savouries",
      orderItems: [
        { name: "Order Packing Charges", quantity: 1, price: 10.00, customizations: [] }
      ],
      deliveryAddress: {
        fullAddress: "D-1301 Garebhavipalya, Hongasandra, Bengaluru, Karnataka 560068, India",
      },
    },
    swiggyMetadata: {
      service: "FOOD_DELIVERY",
      orderType: "DELIVERY",
    },
  },
  
  // Test Case 1: taco_0000304042800041_e058427b-e389-41eb-bdb4-abfda2fe5833.pdf
  {
    detectedProvider: "Swiggy",
    emailType: "ORDER_CONFIRMATION",
    emailSubject: "Your Swiggy order has been delivered",
    parseSuccess: true,
    parseErrors: [],
    confidenceScore: 0.95,
    dataSource: "PDF_ATTACHMENT",
    transaction: {
      amount: 254.63,
      currency: "INR",
      type: "DEBIT",
      status: "COMPLETED",
      transactionDate: "2025-04-28T00:00:00.000Z",
      description: "Swiggy Food Order - A2B - Adyar Ananda Bhavan",
      category: "FOOD_AND_DINING",
      referenceIds: { invoiceNo: "0000304042800041" },
      orderId: "204779470584684",
      restaurantName: "A2B - Adyar Ananda Bhavan",
      orderItems: [
        { name: "Mini Tiffin", quantity: 1, price: 180.00, customizations: [] },
        { name: "Poori [2 Nos]", quantity: 1, price: 95.00, customizations: [] },
        { name: "Order Packing Charges", quantity: 1, price: 0.00, customizations: [] }
      ],
      deliveryAddress: {
        fullAddress: "D-1301 Garebhavipalya, Hongasandra, Bengaluru, Karnataka 560068, India",
      },
    },
    swiggyMetadata: {
      service: "FOOD_DELIVERY",
      orderType: "DELIVERY",
    },
  },

  // Test Case 2: taco_0000310092500031_62686ae3-c442-4d05-957f-c2ef2531c490.pdf
  {
    detectedProvider: "Swiggy",
    emailType: "ORDER_CONFIRMATION",
    emailSubject: "Your Swiggy order has been delivered",
    parseSuccess: true,
    parseErrors: [],
    confidenceScore: 0.95,
    dataSource: "PDF_ATTACHMENT",
    transaction: {
      amount: 552.30,
      currency: "INR",
      type: "DEBIT",
      status: "COMPLETED",
      transactionDate: "2025-09-25T00:00:00.000Z",
      description: "Swiggy Food Order - Gongura Grand",
      category: "FOOD_AND_DINING",
      referenceIds: { invoiceNo: "0000310092500031" },
      orderId: "217776031755480",
      restaurantName: "Gongura Grand",
      orderItems: [
        { name: "Mutton Roast", quantity: 1, price: 298.00, customizations: [] },
        { name: "Mutton Fry", quantity: 1, price: 298.00, customizations: [] },
        { name: "Order Packing Charges", quantity: 1, price: 0.00, customizations: [] }
      ],
      deliveryAddress: {
        fullAddress: "D-1301 Garebhavipalya, Hongasandra, Bengaluru, Karnataka 560068, India",
      },
    },
    swiggyMetadata: {
      service: "FOOD_DELIVERY",
      orderType: "DELIVERY",
    },
  },

  // Test Case 3: taco_0000426092200082_a0ea2714-c764-428f-ac36-dd11b739a929.pdf
  {
    detectedProvider: "Swiggy",
    emailType: "ORDER_CONFIRMATION",
    emailSubject: "Your Swiggy order has been delivered",
    parseSuccess: true,
    parseErrors: [],
    confidenceScore: 0.95,
    dataSource: "PDF_ATTACHMENT",
    transaction: {
      amount: 320.25,
      currency: "INR",
      type: "DEBIT",
      status: "COMPLETED",
      transactionDate: "2025-09-22T00:00:00.000Z",
      description: "Swiggy Food Order - Hotel Empire",
      category: "FOOD_AND_DINING",
      referenceIds: { invoiceNo: "0000426092200082" },
      orderId: "217501149626774",
      restaurantName: "Hotel Empire",
      orderItems: [
        { name: "Romali Roti Romali Roti", quantity: 2, price: 68.00, customizations: [] },
        { name: "Grilled Chicken", quantity: 1, price: 237.00, customizations: [] },
        { name: "Order Packing Charges", quantity: 1, price: 0.00, customizations: [] }
      ],
      deliveryAddress: {
        fullAddress: "D-1301 Garebhavipalya, Hongasandra, Bengaluru, Karnataka 560068, India",
      },
    },
    swiggyMetadata: {
      service: "FOOD_DELIVERY",
      orderType: "DELIVERY",
    },
  },

  // Test Case 4: taco_0000491052300012_9e22d6be-7064-4339-a3d9-6bd469783767.pdf
  {
    detectedProvider: "Swiggy",
    emailType: "ORDER_CONFIRMATION",
    emailSubject: "Your Swiggy order has been delivered",
    parseSuccess: true,
    parseErrors: [],
    confidenceScore: 0.95,
    dataSource: "PDF_ATTACHMENT",
    transaction: {
      amount: 1459.00,
      currency: "INR",
      type: "DEBIT",
      status: "COMPLETED",
      transactionDate: "2025-05-23T00:00:00.000Z",
      description: "Swiggy Food Order - La Casa Brewery + Kitchen",
      category: "FOOD_AND_DINING",
      referenceIds: { invoiceNo: "0000491052300012" },
      orderId: "206980956281350",
      restaurantName: "La Casa Brewery + Kitchen",
      orderItems: [
        { name: "Tandoori Peri Peri Wings", quantity: 1, price: 375.00, customizations: [] },
        { name: "Crunchy Switz Schezwan Chicken Finger", quantity: 1, price: 360.00, customizations: [] },
        { name: "Fish Finger", quantity: 1, price: 325.00, customizations: [] },
        { name: "Chilli Fish", quantity: 1, price: 320.00, customizations: [] },
        { name: "Order Packing Charges", quantity: 1, price: 9.52, customizations: [] }
      ],
      deliveryAddress: {
        fullAddress: "D-204, D-Block, 2nd Floor Choodasandra Road, Kasavanahalli, Bengaluru, Karnataka 560035, India",
      },
    },
    swiggyMetadata: {
      service: "FOOD_DELIVERY",
      orderType: "DELIVERY",
    },
  },

  // Test Case 5: taco_0005770052700021_159f1722-11e4-4be7-8694-321efe471fb8.pdf
  {
    detectedProvider: "Swiggy",
    emailType: "ORDER_CONFIRMATION",
    emailSubject: "Your Swiggy order has been delivered",
    parseSuccess: true,
    parseErrors: [],
    confidenceScore: 0.95,
    dataSource: "PDF_ATTACHMENT",
    transaction: {
      amount: 582.75,
      currency: "INR",
      type: "DEBIT",
      status: "COMPLETED",
      transactionDate: "2025-05-27T00:00:00.000Z",
      description: "Swiggy Food Order - Mughal Treat",
      category: "FOOD_AND_DINING",
      referenceIds: { invoiceNo: "0005770052700021" },
      orderId: "207321850700907",
      restaurantName: "Mughal Treat",
      orderItems: [
        { name: "Grill Chicken Full", quantity: 1, price: 590.00, customizations: [] },
        { name: "Order Packing Charges", quantity: 1, price: 5.00, customizations: [] }
      ],
      deliveryAddress: {
        fullAddress: "D-1301 Garebhavipalya, Hongasandra, Bengaluru, Karnataka 560068, India",
      },
    },
    swiggyMetadata: {
      service: "FOOD_DELIVERY",
      orderType: "DELIVERY",
    },
  },

  // Test Case 6: taco_0005770052700063_feeb125e-faa1-4d03-9eb9-78818780c834.pdf
  {
    detectedProvider: "Swiggy",
    emailType: "ORDER_CONFIRMATION",
    emailSubject: "Your Swiggy order has been delivered",
    parseSuccess: true,
    parseErrors: [],
    confidenceScore: 0.95,
    dataSource: "PDF_ATTACHMENT",
    transaction: {
      amount: 582.75,
      currency: "INR",
      type: "DEBIT",
      status: "COMPLETED",
      transactionDate: "2025-05-27T00:00:00.000Z",
      description: "Swiggy Food Order - Mughal Treat",
      category: "FOOD_AND_DINING",
      referenceIds: { invoiceNo: "0005770052700063" },
      orderId: "207321850700907",
      restaurantName: "Mughal Treat",
      orderItems: [
        { name: "Grill Chicken Full", quantity: 1, price: 590.00, customizations: [] },
        { name: "Order Packing Charges", quantity: 1, price: 5.00, customizations: [] }
      ],
      deliveryAddress: {
        fullAddress: "D-1301 Garebhavipalya, Hongasandra, Bengaluru, Karnataka 560068, India",
      },
    },
    swiggyMetadata: {
      service: "FOOD_DELIVERY",
      orderType: "DELIVERY",
    },
  },

  // Test Case 7: taco_0038008051300083_bcd78691-b9f7-4ca8-b590-34dc468f80f6.pdf
  {
    detectedProvider: "Swiggy",
    emailType: "ORDER_CONFIRMATION",
    emailSubject: "Your Swiggy order has been delivered",
    parseSuccess: true,
    parseErrors: [],
    confidenceScore: 0.95,
    dataSource: "PDF_ATTACHMENT",
    transaction: {
      amount: 130.20,
      currency: "INR",
      type: "DEBIT",
      status: "COMPLETED",
      transactionDate: "2025-05-13T00:00:00.000Z",
      description: "Swiggy Food Order - Punjabi Nawabi",
      category: "FOOD_AND_DINING",
      referenceIds: { invoiceNo: "0038008051300083" },
      orderId: "206115420634488",
      restaurantName: "Punjabi Nawabi",
      orderItems: [
        { name: "Phulka", quantity: 8, price: 208.00, customizations: [] },
        { name: "Order Packing Charges", quantity: 1, price: 0.00, customizations: [] }
      ],
      deliveryAddress: {
        fullAddress: "D-1301 Garebhavipalya, Hongasandra, Bengaluru, Karnataka 560068, India",
      },
    },
    swiggyMetadata: {
      service: "FOOD_DELIVERY",
      orderType: "DELIVERY",
    },
  },

  // Test Case 8: taco_0069760050200001_fa1133e6-f3c0-4b17-bc30-8524806747a9.pdf
  {
    detectedProvider: "Swiggy",
    emailType: "ORDER_CONFIRMATION",
    emailSubject: "Your Swiggy order has been delivered",
    parseSuccess: true,
    parseErrors: [],
    confidenceScore: 0.95,
    dataSource: "PDF_ATTACHMENT",
    transaction: {
      amount: 370.65,
      currency: "INR",
      type: "DEBIT",
      status: "COMPLETED",
      transactionDate: "2025-05-02T00:00:00.000Z",
      description: "Swiggy Food Order - Hotel Annavasai",
      category: "FOOD_AND_DINING",
      referenceIds: { invoiceNo: "0069760050200001" },
      orderId: "205138269861113",
      restaurantName: "Hotel Annavasai",
      orderItems: [
        { name: "Chicken Chindamani", quantity: 1, price: 182.00, customizations: [] },
        { name: "Pepper Kaadai", quantity: 1, price: 156.00, customizations: [] },
        { name: "Order Packing Charges", quantity: 1, price: 15.00, customizations: [] }
      ],
      deliveryAddress: {
        fullAddress: "237 Ingur, Tamil Nadu, India",
      },
    },
    swiggyMetadata: {
      service: "FOOD_DELIVERY",
      orderType: "DELIVERY",
    },
  },

  // Test Case 9: taco_0095108042700062_03d14b18-9582-4d32-9f02-b8a8ef9dd445.pdf
  {
    detectedProvider: "Swiggy",
    emailType: "ORDER_CONFIRMATION",
    emailSubject: "Your Swiggy order has been delivered",
    parseSuccess: true,
    parseErrors: [],
    confidenceScore: 0.95,
    dataSource: "PDF_ATTACHMENT",
    transaction: {
      amount: 566.58,
      currency: "INR",
      type: "DEBIT",
      status: "COMPLETED",
      transactionDate: "2025-04-27T00:00:00.000Z",
      description: "Swiggy Food Order - Chicken County Restaurant",
      category: "FOOD_AND_DINING",
      referenceIds: { invoiceNo: "0095108042700062" },
      orderId: "204732080911196",
      restaurantName: "Chicken County Restaurant",
      orderItems: [
        { name: "Grilled Chicken F", quantity: 1, price: 560.00, customizations: [] },
        { name: "Order Packing Charges", quantity: 1, price: 19.60, customizations: [] }
      ],
      deliveryAddress: {
        fullAddress: "D-1301 Garebhavipalya, Hongasandra, Bengaluru, Karnataka 560068, India",
      },
    },
    swiggyMetadata: {
      service: "FOOD_DELIVERY",
      orderType: "DELIVERY",
    },
  },
];

/**
 * Get expected output for a specific test case
 */
export function getExpectedOutput(index: number): SwiggyExpectedOutput {
  if (index < 0 || index >= SWIGGY_EXPECTED_OUTPUTS.length) {
    throw new Error(`Expected output index ${index} out of range (0-${SWIGGY_EXPECTED_OUTPUTS.length - 1})`);
  }
  return SWIGGY_EXPECTED_OUTPUTS[index]!;
}

