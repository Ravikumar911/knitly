import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import Database from "better-sqlite3";

const dbPath =
  process.env.SQLITE_DB_PATH || join(homedir(), ".slashcash", "db.sqlite");

if (!existsSync(dbPath)) {
  throw new Error(`No slashcash database found at ${dbPath}`);
}

const db = new Database(dbPath, { readonly: true });
const rows = db
  .prepare(
    `select id, amount, transaction_date, description, reference_ids, merchant_data
     from transactions_v2
     where merchant_code = 'SWIGGY'
     order by random()
     limit 20`,
  )
  .all() as Array<Record<string, unknown>>;

for (const row of rows) {
  const referenceIds = parseJson(row.reference_ids);
  const merchantData = parseJson(row.merchant_data);
  console.log(
    JSON.stringify(
      {
        id: row.id,
        amount: row.amount,
        description: row.description,
        orderId: referenceIds?.orderId,
        invoiceNo: referenceIds?.invoiceNo,
        invoiceDate: referenceIds?.invoiceDate,
        restaurant: (merchantData?.transaction as { restaurantName?: string })
          ?.restaurantName,
        itemCount: (merchantData?.transaction as { orderItems?: unknown[] })
          ?.orderItems?.length,
        provenance: merchantData?.provenance,
      },
      null,
      2,
    ),
  );
}

function parseJson(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "object") return value as Record<string, unknown>;
  try {
    return JSON.parse(String(value)) as Record<string, unknown>;
  } catch {
    return null;
  }
}
