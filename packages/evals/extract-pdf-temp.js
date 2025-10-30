import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PDF_FILES = [
  'taco_0000218052900102_bc65ae56-3b68-47ff-9c71-aea444c61dfd.pdf',
  'taco_0000304042800041_e058427b-e389-41eb-bdb4-abfda2fe5833.pdf',
  'taco_0000310092500031_62686ae3-c442-4d05-957f-c2ef2531c490.pdf',
  'taco_0000426092200082_a0ea2714-c764-428f-ac36-dd11b739a929.pdf',
  'taco_0000491052300012_9e22d6be-7064-4339-a3d9-6bd469783767.pdf',
  'taco_0005770052700021_159f1722-11e4-4be7-8694-321efe471fb8.pdf',
  'taco_0005770052700063_feeb125e-faa1-4d03-9eb9-78818780c834.pdf',
  'taco_0038008051300083_bcd78691-b9f7-4ca8-b590-34dc468f80f6.pdf',
  'taco_0069760050200001_fa1133e6-f3c0-4b17-bc30-8524806747a9.pdf',
  'taco_0095108042700062_03d14b18-9582-4d32-9f02-b8a8ef9dd445.pdf'
];

async function extractPDFText(pdfPath) {
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdf(dataBuffer);
  return data.text;
}

async function main() {
  const testDataDir = path.join(__dirname, 'test-data');
  
  for (let i = 0; i < PDF_FILES.length; i++) {
    const pdfPath = path.join(testDataDir, PDF_FILES[i]);
    console.log(`\n${'='.repeat(80)}`);
    console.log(`PDF ${i}: ${PDF_FILES[i]}`);
    console.log('='.repeat(80));
    
    try {
      const text = await extractPDFText(pdfPath);
      console.log(text);
      console.log('\n');
    } catch (error) {
      console.error(`Error extracting ${PDF_FILES[i]}:`, error.message);
    }
  }
}

main().catch(console.error);

