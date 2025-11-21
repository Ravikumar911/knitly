# Knitly Evaluations

This package contains Braintrust evaluations for testing AI model performance across different extraction tasks.

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Set up environment variables:
Create a `.env` or `.env.local` file with your API keys:
```bash
OPENAI_API_KEY=your_openai_api_key
BRAINTRUST_API_KEY=your_braintrust_api_key
```

## Available Evaluations

### Extraction Methods Eval

Tests the two core extraction functions (`extractWithOpenAI` and `extractWithMistralOCR`) independently to compare their performance on different types of emails.

#### Quick Start

```bash
# Run in CLI mode (shows results in terminal)
npx tsx src/extraction-methods.eval.ts

# Run with Braintrust UI (visual dashboard)
npx braintrust eval src/extraction-methods.eval.ts

# Test with different OpenAI models (for OpenAI extraction only)
MODEL_NAME=gpt-4o npx tsx src/extraction-methods.eval.ts
MODEL_NAME=gpt-5-mini npx tsx src/extraction-methods.eval.ts
```

#### What It Tests

This evaluation provides a **direct comparison** of the two extraction strategies:

**OpenAI Extraction (`extractWithOpenAI`):**
- Used for: Text-only emails (no PDF attachments)
- Model: Configurable OpenAI model (default: gpt-5-nano)
- Input: Email body text with optional inline data
- Temperature: 1 (more creative)

**Mistral OCR Extraction (`extractWithMistralOCR`):**
- Used for: Emails with PDF attachments
- Model: mistral-ocr-latest (fixed)
- Input: Email text + PDF file attachments
- Temperature: 0.1 (more deterministic)
- Timeout: 20 seconds
- Limits: 8 document images, 10 pages per document

#### Test Cases

The eval automatically splits test cases based on PDF presence:
- **Text-only cases** → `extractWithOpenAI`
- **PDF cases** → `extractWithMistralOCR`

From the Supabase test data:
- OpenAI cases: 0 (all test cases have PDFs)
- Mistral OCR cases: 10 (all Swiggy orders have invoice PDFs)

#### Why This Eval?

This evaluation helps answer:
1. How accurate is each extraction method on its intended input type?
2. What are the failure modes for each method?
3. Which fields does each method extract better?
4. Is Mistral OCR worth the extra cost for PDF documents?
5. Can we improve by adjusting prompts/schemas per method?

#### Comparison with Swiggy Extraction Eval

| Feature | Extraction Methods Eval | Swiggy Extraction Eval |
|---------|------------------------|------------------------|
| **Scope** | Tests individual extraction functions | Tests end-to-end extraction pipeline |
| **Functions** | `extractWithOpenAI`, `extractWithMistralOCR` | `extractEmailData` |
| **Purpose** | Compare extraction strategies | Test overall accuracy |
| **Separation** | Splits by extraction method | Automatic routing based on PDF |
| **Use Case** | Method-specific optimization | Production validation |

### Swiggy Extraction Eval

Tests Swiggy invoice data extraction accuracy with different AI models using production-aligned fixtures. This tests the end-to-end `extractEmailData` function.

#### Quick Start

```bash
# Run in CLI mode (default: gpt-5-nano)
npx tsx src/swiggy-extraction.eval.ts

# Run with Braintrust UI
npx braintrust eval src/swiggy-extraction.eval.ts

# Test with different models
MODEL_NAME=gpt-4o npx tsx src/swiggy-extraction.eval.ts
MODEL_NAME=gpt-5-mini npx tsx src/swiggy-extraction.eval.ts
```

#### What It Tests

The evaluation tests extraction of the following fields from Swiggy PDF invoices:

**Critical Fields:**
- Order ID (exact match required)
- Transaction amount (with decimal tolerance)
- Parse success status

**Merchant Fields:**
- Restaurant name (fuzzy match)
- Swiggy service type (FOOD_DELIVERY/INSTAMART)
- Order type (DELIVERY/PICKUP)

**Order Details:**
- Order items count and accuracy
- Delivery address
- Currency and transaction type
- Confidence score

#### Test Data

Location: `packages/evals/test-data/supabase/`

The evaluation uses 10 Swiggy PDF invoices captured from live ingestion. Test cases are defined in:
- `src/fixtures/supabase-swiggy-testcases.ts` - Fixtures with inline expectations and base64-encoded attachments
- `src/fixtures/swiggy-expected.ts` - Shared expected output types and helpers

#### ⚠️ IMPORTANT: Update Expected Outputs

**Before running the evaluation, you MUST update the expected outputs** in `src/fixtures/swiggy-expected.ts`.

The file currently contains template structures with TODO markers. You need to:

1. Open each PDF in `/Users/ravikumarr/Downloads/swiggy-test-data/`
2. Manually extract the following data from each PDF:
   - Order ID (CRITICAL)
   - Total amount
   - Restaurant name
   - Order items (name, quantity, price)
   - Delivery address
   - Transaction date
   - Service type (FOOD_DELIVERY/INSTAMART)

3. Update the corresponding entry inside `src/fixtures/supabase-swiggy-testcases.ts`

Example of a completed entry:
```typescript
{
  detectedProvider: "Swiggy",
  emailType: "ORDER_CONFIRMATION",
  emailSubject: "Your Swiggy order has been delivered",
  parseSuccess: true,
  parseErrors: [],
  confidenceScore: 0.95,
  dataSource: "PDF_ATTACHMENT",
  transaction: {
    amount: 450.50,
    currency: "INR",
    type: "DEBIT",
    status: "COMPLETED",
    transactionDate: "2024-05-27T14:30:00.000Z",
    description: "Swiggy Food Order",
    category: "FOOD_AND_DINING",
    orderId: "218052900102",
    restaurantName: "Domino's Pizza",
    orderItems: [
      { 
        name: "Margherita Pizza", 
        quantity: 1, 
        price: 299 
      },
      { 
        name: "Garlic Bread", 
        quantity: 2, 
        price: 99 
      }
    ],
    deliveryAddress: {
      fullAddress: "123 Main St, Apartment 4B, Mumbai, 400001",
    },
  },
  swiggyMetadata: {
    service: "FOOD_DELIVERY",
    orderType: "DELIVERY",
  },
}
```

#### Scoring

The evaluation uses custom scorers defined in `src/scorers/swiggy-field-scorer.ts`:

1. **Field Accuracy Scorer** (`swiggyFieldScorer`)
   - Compares each field against expected output
   - Critical fields (orderId, amount) are weighted heavily
   - Restaurant names use fuzzy matching (Levenshtein distance)
   - Returns field-by-field breakdown

2. **Schema Validation Scorer** (`schemaValidationScorer`)
   - Validates output conforms to SwiggyExtractionSchema
   - Checks presence of required fields
   - Verifies correct schema selection

#### Results

After running the evaluation, you can:
- View detailed results in the Braintrust dashboard
- Compare model performance side-by-side
- Identify problematic fields and patterns
- Export results for further analysis

## Architecture

### Refactored slashAIV2Agent

The `slashAIV2Agent` has been refactored for testability:

**New Function:** `extractEmailData(emailData, model, options)`
- Pure extraction logic without side effects
- Accepts any AI model as parameter
- Optional logger (uses console.log for tests)
- No database storage (just returns data)

**Original Function:** `slashAIV2Agent(emailData)`
- Wrapper around `extractEmailData`
- Uses default model
- Handles database storage
- Maintains backward compatibility

## Adding New Evaluations

To add a new evaluation:

1. Create test fixtures in `src/fixtures/`
2. Create expected outputs
3. Create custom scorers in `src/scorers/` (optional)
4. Create evaluation file in `src/` (e.g., `my-eval.eval.ts`)
5. Add npm scripts to `package.json`

## Troubleshooting

### Missing API Keys
Ensure `OPENAI_API_KEY` and `BRAINTRUST_API_KEY` are set in your `.env` file.

### PDF Files Not Found
Verify the PDFs exist under `packages/evals/test-data/supabase/` and that filenames referenced in `src/fixtures/supabase-swiggy-testcases.ts` match.

### TypeScript Errors
Run `pnpm install` to ensure all workspace dependencies are linked correctly.

### Model Not Found
Check that the model name in your script matches available OpenAI models. Supported models:
- `gpt-5-nano`
- `gpt-5-mini`
- `gpt-4o`
- `gpt-4o-mini`

## Resources

- [Braintrust Documentation](https://www.braintrust.dev/docs)
- [Braintrust Evals Guide](https://www.braintrust.dev/docs/guides/evals)
- [Autoevals Scorers](https://github.com/braintrustdata/autoevals)
