---
id: gmail-swiggy
name: Gmail Swiggy
version: 1.0.0
category: ingest
requires:
  bins: []
---

# Gmail Swiggy

Tracks the local Swiggy inbox-sync capability while the mailbox backend is being migrated, keeps the scheduler/config surface stable, and writes results to SQLite once the next mailbox phase lands.

The default Gmail query is stored in `config.json` at `sync.gmailQuery`.
