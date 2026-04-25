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
const TEST_DATA_DIR = new URL("../../test-data/", import.meta.url).pathname;

export const SWIGGY_TEST_PDFS = [
  `${TEST_DATA_DIR}live-swiggy/139276.pdf`,
  `${TEST_DATA_DIR}live-swiggy/137853.pdf`,
  `${TEST_DATA_DIR}live-swiggy/141136.pdf`,
  `${TEST_DATA_DIR}live-swiggy/139271.pdf`,
  `${TEST_DATA_DIR}live-swiggy/136579.pdf`,
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
          storageUrl: pdfPath,
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
    throw new Error(
      `Test case index ${index} out of range (0-${fixtures.length - 1})`,
    );
  }
  return fixtures[index]!;
}

/**
 * Get all test cases
 */
export function getAllTestCases(): EmailData[] {
  return createSwiggyEmailFixtures();
}
