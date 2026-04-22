---
id: gmail-swiggy
name: Gmail Swiggy
version: 1.0.0
category: ingest
requires:
  bins: []
---

# Gmail Swiggy

Runs the local Swiggy Gmail ingest job through the IMAP backend, keeps the scheduler/config surface stable, and writes parsed receipts and transactions into SQLite.

The default Gmail query is stored in `config.json` at `sync.gmailQuery`.
