import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const home = mkdtempSync(join(tmpdir(), "slashcash-db-test-"));
process.env.SLASHCASH_HOME = home;
process.env.SQLITE_DB_PATH = join(home, "db.sqlite");

async function main() {
  try {
    const database = await import("../src/index.js");
    database.ensureLocalDatabase();
    await database.seedLocalDatabase();

    const transactionCount = database.sqlite
      .prepare("select count(*) as count from transactions_v2")
      .get() as { count: number };
    const chatCount = database.sqlite
      .prepare("select count(*) as count from chats")
      .get() as { count: number };

    assert.equal(transactionCount.count, 8);
    assert.equal(chatCount.count, 1);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }

  console.log("database tests passed");
}

void main();
