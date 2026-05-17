export type ExtractionProvenance = {
  parser: string;
  parserVersion: string;
  parsersUsed: string[];
  sourceQuality: "text" | "scanned" | "empty" | "encrypted" | "corrupted";
  warnings: string[];
  pdfAttachmentPath: string | null;
  extractedAt: string;
};
