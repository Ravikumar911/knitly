---
id: gmail-swiggy
name: Gmail Receipts
version: 1.0.0
category: ingest
requires:
  bins: []
---

# Gmail Receipts

Runs the local supported-receipts Gmail ingest job through the IMAP backend, keeps the scheduler/config surface stable, and writes parsed receipts and transactions into SQLite.

The default Gmail query is stored in `config.json` at `sync.gmailQuery`.
