import { readFileSync } from "fs";
import { EmailData } from "@workspace/tasks/types/slashAI";

/**
 * Load a PDF file and encode it to base64
 */
export function loadPDFAsBase64(filePath: string): string {
  const buffer = readFileSync(filePath);
  return buffer.toString("base64");
}

/**
 * Test PDF file paths - 10 sample Swiggy invoices
 * Located in test-data folder within evals package
 */
const TEST_DATA_DIR = new URL('../../test-data/', import.meta.url).pathname;

export const SWIGGY_TEST_PDFS = [
  `${TEST_DATA_DIR}taco_0000218052900102_bc65ae56-3b68-47ff-9c71-aea444c61dfd.pdf`,
  `${TEST_DATA_DIR}taco_0000304042800041_e058427b-e389-41eb-bdb4-abfda2fe5833.pdf`,
  `${TEST_DATA_DIR}taco_0000310092500031_62686ae3-c442-4d05-957f-c2ef2531c490.pdf`,
  `${TEST_DATA_DIR}taco_0000426092200082_a0ea2714-c764-428f-ac36-dd11b739a929.pdf`,
  `${TEST_DATA_DIR}taco_0000491052300012_9e22d6be-7064-4339-a3d9-6bd469783767.pdf`,
  `${TEST_DATA_DIR}taco_0005770052700021_159f1722-11e4-4be7-8694-321efe471fb8.pdf`,
  `${TEST_DATA_DIR}taco_0005770052700063_feeb125e-faa1-4d03-9eb9-78818780c834.pdf`,
  `${TEST_DATA_DIR}taco_0038008051300083_bcd78691-b9f7-4ca8-b590-34dc468f80f6.pdf`,
  `${TEST_DATA_DIR}taco_0069760050200001_fa1133e6-f3c0-4b17-bc30-8524806747a9.pdf`,
  `${TEST_DATA_DIR}taco_0095108042700062_03d14b18-9582-4d32-9f02-b8a8ef9dd445.pdf`,
];

/**
 * Create EmailData fixtures with PDF attachments
 */
export function createSwiggyEmailFixtures(): EmailData[] {
  return SWIGGY_TEST_PDFS.map((pdfPath, index) => {
    const pdfBase64 = loadPDFAsBase64(pdfPath);
    const filename = pdfPath.split("/").pop() || `swiggy_invoice_${index}.pdf`;
    
    return {
      userId: "test-user-123",
      emailId: `test-email-${index + 1}`,
      threadId: `thread-${index + 1}`,
      subject: `Your Swiggy order has been delivered`,
      body: `Hello,\n\nYour Swiggy order has been successfully delivered.\nPlease find the invoice attached.\n\nThank you for ordering with Swiggy!`,
      date: new Date().toISOString(),
      from: "noreply@swiggy.in",
      attachments: [
        {
          filename: filename,
          mimeType: "application/pdf",
          content: pdfBase64,
        },
      ],
    };
  });
}

/**
 * Get a specific test case by index (0-9)
 */
export function getTestCase(index: number): EmailData {
  const fixtures = createSwiggyEmailFixtures();
  if (index < 0 || index >= fixtures.length) {
    throw new Error(`Test case index ${index} out of range (0-${fixtures.length - 1})`);
  }
  return fixtures[index];
}

/**
 * Get all test cases
 */
export function getAllTestCases(): EmailData[] {
  return createSwiggyEmailFixtures();
}

