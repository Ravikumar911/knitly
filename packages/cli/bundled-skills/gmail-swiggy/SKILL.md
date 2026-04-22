---
id: gmail-swiggy
name: Gmail Swiggy
version: 1.0.0
category: ingest
requires:
  bins:
    - gws
---

# Gmail Swiggy

Reads Swiggy transaction emails from Gmail through `gws`, stores invoice PDFs under the local attachments directory, extracts transaction data with the configured local model, and writes rows to SQLite.

The default Gmail query is stored in `config.json` at `sync.gmailQuery`.
