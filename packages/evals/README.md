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

### Hello Eval (Example)

A simple example evaluation to verify Braintrust setup:

```bash
pnpm eval          # Run in CLI mode
pnpm eval:ui       # Run with Braintrust UI
```

### Swiggy Extraction Eval

Tests Swiggy invoice data extraction accuracy with different AI models.

#### Quick Start

```bash
# Run with default model (gpt-5-nano)
pnpm eval:swiggy

# Run with specific models
pnpm eval:swiggy:nano    # Using gpt-5-nano
pnpm eval:swiggy:mini    # Using gpt-5-mini

# Run with Braintrust UI for visual comparison
pnpm eval:swiggy:ui
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

Location: `/Users/ravikumarr/Downloads/swiggy-test-data/`

The evaluation uses 10 sample Swiggy PDF invoices. Test cases are defined in:
- `src/fixtures/swiggy-samples.ts` - EmailData fixtures with PDF attachments
- `src/fixtures/swiggy-expected.ts` - Expected extraction outputs

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

3. Update the corresponding entry in `SWIGGY_EXPECTED_OUTPUTS` array

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
Verify the PDF path in `src/fixtures/swiggy-samples.ts` matches your local directory.

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
