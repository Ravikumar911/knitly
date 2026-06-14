# Ingest Real Behavior Proof

Generated: 2026-06-14T03:58:37.390Z
Fixtures: packages/e2e-tests/fixtures/imap
SQLite DB: /var/folders/p_/v22kpmh52dx3ykf51mxfh6m40000gn/T/slashcash-ingest-proof-I5ybI1/home/db.sqlite
Attachments: /var/folders/p_/v22kpmh52dx3ykf51mxfh6m40000gn/T/slashcash-ingest-proof-I5ybI1/home/attachments
Strict: true

## Summary

- Modes run: 2
- Fixture observations: 8
- Processed: 4
- Skipped: 4
- Failed: 0
- Expectation diffs: 0

## Notes

- Fixture sync uses packages/tasks/src/gmail/imap-client.ts fixture mode and packages/tasks/src/trigger/processEmails.ts.
- Rows are written by packages/tasks/src/extract/pipeline.ts through exported @workspace/database helpers into an isolated SQLite database.
- The CLI sync command is IMAP/account backed, so this proof uses the closest local CLI-equivalent fixture path rather than real Gmail credentials.
- The runner forces SLASHCASH_ASSISTANT_PROVIDER=none so fixture proof is deterministic and does not call a model.

## pdf-enabled

- PDF extractor disabled: false
- Elapsed: 260ms
- Transaction rows: 0 -> 2
- Counts: processed=2, skipped_existing=0, skipped_non_transaction=2, failed=0

| Fixture | Kind | Schema | Source | Amount | Order ID | Warnings | Diffs |
| --- | --- | --- | --- | ---: | --- | ---: | ---: |
| swiggy-body-only | processed | swiggy.body.v1 | EMAIL_BODY | 482.5 | SWG-BODY-1002 | 0 | 0 |
| swiggy-order-with-pdf | processed | swiggy.deterministic.v1 | BOTH | 512.4 | SWG-PDF-1001 | 1 | 0 |
| swiggy-promotion | skipped_non_transaction |  |  |  |  | 0 | 0 |
| swiggy-status-update | skipped_non_transaction |  |  |  |  | 0 | 0 |

### pdf-enabled / swiggy-body-only

```json
{
  "expected": {
    "amount": 482.5,
    "kind": "processed",
    "orderId": "SWG-BODY-1002",
    "schemaUsed": "swiggy.body.v1"
  },
  "actual": {
    "kind": "processed",
    "messageId": "swiggy-body-only",
    "transactionId": "4828fba3-6c2c-4847-aeb9-7fd668bf1c11",
    "amount": 482.5,
    "orderId": "SWG-BODY-1002",
    "schemaUsed": "swiggy.body.v1",
    "dataSource": "EMAIL_BODY",
    "extractionConfidence": 0.7,
    "provenance": null,
    "warnings": [],
    "parseErrors": [],
    "paymentMethod": "UPI",
    "description": "Swiggy order - Meghana Foods",
    "itemNames": [],
    "attachmentStoragePath": [],
    "reason": null
  },
  "diffs": []
}
```

### pdf-enabled / swiggy-order-with-pdf

```json
{
  "expected": {
    "amount": 512.4,
    "kind": "processed",
    "orderId": "SWG-PDF-1001",
    "schemaUsed": "swiggy.deterministic.v1"
  },
  "actual": {
    "kind": "processed",
    "messageId": "swiggy-order-with-pdf",
    "transactionId": "1c2aacd9-76b2-48fc-85d7-34c37072e2ee",
    "amount": 512.4,
    "orderId": "SWG-PDF-1001",
    "schemaUsed": "swiggy.deterministic.v1",
    "dataSource": "BOTH",
    "extractionConfidence": 0.9,
    "provenance": {
      "parser": "slashcash_pdf_extractor",
      "parserVersion": "0.2.0",
      "parsersUsed": [
        "pdfplumber"
      ],
      "sourceQuality": "text",
      "warnings": [
        "Docling is not installed."
      ],
      "pdfAttachmentPath": "/var/folders/p_/v22kpmh52dx3ykf51mxfh6m40000gn/T/slashcash-ingest-proof-I5ybI1/home/attachments/swiggy-order-with-pdf.pdf",
      "extractedAt": "2026-06-14T03:58:37.352Z"
    },
    "warnings": [
      "Docling is not installed."
    ],
    "parseErrors": [],
    "paymentMethod": "UPI",
    "description": "Swiggy order - Millet Bowl Co",
    "itemNames": [],
    "attachmentStoragePath": [
      "/var/folders/p_/v22kpmh52dx3ykf51mxfh6m40000gn/T/slashcash-ingest-proof-I5ybI1/home/attachments/swiggy-order-with-pdf.pdf"
    ],
    "reason": null
  },
  "diffs": []
}
```

### pdf-enabled / swiggy-promotion

```json
{
  "expected": {
    "kind": "skipped_non_transaction"
  },
  "actual": {
    "kind": "skipped_non_transaction",
    "messageId": "swiggy-promotion",
    "transactionId": null,
    "amount": null,
    "orderId": null,
    "schemaUsed": null,
    "dataSource": null,
    "extractionConfidence": null,
    "provenance": null,
    "warnings": [],
    "parseErrors": [],
    "paymentMethod": null,
    "description": null,
    "itemNames": [],
    "attachmentStoragePath": null,
    "reason": "No completed Swiggy transaction was found."
  },
  "diffs": []
}
```

### pdf-enabled / swiggy-status-update

```json
{
  "expected": {
    "kind": "skipped_non_transaction"
  },
  "actual": {
    "kind": "skipped_non_transaction",
    "messageId": "swiggy-status-update",
    "transactionId": null,
    "amount": null,
    "orderId": null,
    "schemaUsed": null,
    "dataSource": null,
    "extractionConfidence": null,
    "provenance": null,
    "warnings": [],
    "parseErrors": [],
    "paymentMethod": null,
    "description": null,
    "itemNames": [],
    "attachmentStoragePath": null,
    "reason": "No completed Swiggy transaction was found."
  },
  "diffs": []
}
```

## pdf-disabled

- PDF extractor disabled: true
- Elapsed: 25ms
- Transaction rows: 0 -> 2
- Counts: processed=2, skipped_existing=0, skipped_non_transaction=2, failed=0

| Fixture | Kind | Schema | Source | Amount | Order ID | Warnings | Diffs |
| --- | --- | --- | --- | ---: | --- | ---: | ---: |
| swiggy-body-only | processed | swiggy.body.v1 | EMAIL_BODY | 482.5 | SWG-BODY-1002 | 0 | 0 |
| swiggy-order-with-pdf | processed | swiggy.body.v1 | EMAIL_BODY | 348.5 | SWG-TEST-12345 | 1 | 0 |
| swiggy-promotion | skipped_non_transaction |  |  |  |  | 0 | 0 |
| swiggy-status-update | skipped_non_transaction |  |  |  |  | 0 | 0 |

### pdf-disabled / swiggy-body-only

```json
{
  "expected": {
    "amount": 482.5,
    "kind": "processed",
    "orderId": "SWG-BODY-1002",
    "schemaUsed": "swiggy.body.v1"
  },
  "actual": {
    "kind": "processed",
    "messageId": "swiggy-body-only",
    "transactionId": "244a61ce-65b7-4e5e-b8d5-302fd0776f84",
    "amount": 482.5,
    "orderId": "SWG-BODY-1002",
    "schemaUsed": "swiggy.body.v1",
    "dataSource": "EMAIL_BODY",
    "extractionConfidence": 0.7,
    "provenance": null,
    "warnings": [],
    "parseErrors": [],
    "paymentMethod": "UPI",
    "description": "Swiggy order - Meghana Foods",
    "itemNames": [],
    "attachmentStoragePath": [],
    "reason": null
  },
  "diffs": []
}
```

### pdf-disabled / swiggy-order-with-pdf

```json
{
  "expected": {
    "amount": 348.5,
    "kind": "processed",
    "orderId": "SWG-TEST-12345",
    "schemaUsed": "swiggy.body.v1"
  },
  "actual": {
    "kind": "processed",
    "messageId": "swiggy-order-with-pdf",
    "transactionId": "dc9cee73-b7ea-4a5a-92f6-90c6857855da",
    "amount": 348.5,
    "orderId": "SWG-TEST-12345",
    "schemaUsed": "swiggy.body.v1",
    "dataSource": "EMAIL_BODY",
    "extractionConfidence": 0.7,
    "provenance": null,
    "warnings": [
      "The PDF extractor is disabled by environment."
    ],
    "parseErrors": [],
    "paymentMethod": null,
    "description": "Swiggy order - Millet Bowl Co",
    "itemNames": [],
    "attachmentStoragePath": [
      "/var/folders/p_/v22kpmh52dx3ykf51mxfh6m40000gn/T/slashcash-ingest-proof-I5ybI1/home/attachments/swiggy-order-with-pdf.pdf"
    ],
    "reason": null
  },
  "diffs": []
}
```

### pdf-disabled / swiggy-promotion

```json
{
  "expected": {
    "kind": "skipped_non_transaction"
  },
  "actual": {
    "kind": "skipped_non_transaction",
    "messageId": "swiggy-promotion",
    "transactionId": null,
    "amount": null,
    "orderId": null,
    "schemaUsed": null,
    "dataSource": null,
    "extractionConfidence": null,
    "provenance": null,
    "warnings": [],
    "parseErrors": [],
    "paymentMethod": null,
    "description": null,
    "itemNames": [],
    "attachmentStoragePath": null,
    "reason": "No completed Swiggy transaction was found."
  },
  "diffs": []
}
```

### pdf-disabled / swiggy-status-update

```json
{
  "expected": {
    "kind": "skipped_non_transaction"
  },
  "actual": {
    "kind": "skipped_non_transaction",
    "messageId": "swiggy-status-update",
    "transactionId": null,
    "amount": null,
    "orderId": null,
    "schemaUsed": null,
    "dataSource": null,
    "extractionConfidence": null,
    "provenance": null,
    "warnings": [],
    "parseErrors": [],
    "paymentMethod": null,
    "description": null,
    "itemNames": [],
    "attachmentStoragePath": null,
    "reason": "No completed Swiggy transaction was found."
  },
  "diffs": []
}
```
