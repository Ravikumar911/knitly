import { randomUUID } from "node:crypto";
import { db, sqlite } from "../client";
import { chatMessages } from "../schema/chatMessages";
import { chats } from "../schema/chat";
import { emailSyncStatus } from "../schema/emailSyncStatus";
import { feedback } from "../schema/feedback";
import { parsedEmails } from "../schema/parsedEmails";
import { LOCAL_USER_ID, profiles } from "../schema/users";
import { transactionsV2 } from "../schema/transactionsV2";

export const localMigrationSql = `
CREATE TABLE IF NOT EXISTS profiles (
  id text PRIMARY KEY NOT NULL,
  first_name text,
  last_name text,
  updated_at integer NOT NULL
);

CREATE TABLE IF NOT EXISTS parsed_emails (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL REFERENCES profiles(id) ON DELETE cascade,
  snippet text,
  sender_email_id text,
  thread_id text,
  subject text,
  received_date integer,
  parse_success integer DEFAULT 0,
  parse_errors text,
  raw_content text,
  attachment_storage_path text,
  parsed_at integer,
  created_at integer NOT NULL,
  updated_at integer NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS parsed_emails_user_id_thread_id
ON parsed_emails(user_id, thread_id);

CREATE TABLE IF NOT EXISTS email_sync_status (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL REFERENCES profiles(id) ON DELETE cascade,
  last_synced_at integer,
  last_sync_attempt_at integer,
  next_page_token text,
  sync_status text DEFAULT 'complete',
  error_details text,
  oauth_error_type text,
  oauth_error_code text,
  requires_reauth integer DEFAULT 0,
  user_friendly_error text,
  total_emails integer,
  processed_emails integer DEFAULT 0,
  estimated_completion integer,
  progress_percentage real DEFAULT 0,
  has_initial_sync integer DEFAULT 0,
  sync_timeout_at integer,
  created_at integer NOT NULL,
  updated_at integer NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions_v2 (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL REFERENCES profiles(id) ON DELETE cascade,
  parsed_email_id text REFERENCES parsed_emails(id) ON DELETE set null,
  merchant_id text,
  merchant_code text,
  merchant_name text,
  amount real NOT NULL,
  currency text DEFAULT 'INR',
  type text NOT NULL,
  status text DEFAULT 'COMPLETED',
  transaction_date integer NOT NULL,
  description text,
  category text,
  payment_method text,
  reference_ids text,
  location text,
  merchant_data text,
  extraction_confidence real,
  schema_used text,
  data_source text,
  is_verified integer DEFAULT 0,
  verification_status text DEFAULT 'UNVERIFIED',
  duplicate_of text,
  created_at integer NOT NULL,
  updated_at integer NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_v2_user_date
ON transactions_v2(user_id, transaction_date);

CREATE INDEX IF NOT EXISTS idx_transactions_v2_merchant
ON transactions_v2(user_id, merchant_id);

CREATE TABLE IF NOT EXISTS feedback (
  id text PRIMARY KEY NOT NULL,
  user_id text REFERENCES profiles(id),
  subject text NOT NULL,
  message text NOT NULL,
  type text NOT NULL,
  priority text DEFAULT 'medium',
  status text DEFAULT 'open',
  user_email text,
  user_agent text,
  created_at integer,
  updated_at integer
);

CREATE TABLE IF NOT EXISTS chats (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL REFERENCES profiles(id) ON DELETE cascade,
  title text NOT NULL,
  created_at integer NOT NULL,
  updated_at integer NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id text PRIMARY KEY NOT NULL,
  chat_id text NOT NULL REFERENCES chats(id) ON DELETE cascade,
  role text NOT NULL,
  parts text NOT NULL,
  created_at integer NOT NULL
);
`;

type SeedOrder = {
  daysAgo: number;
  amount: number;
  service: "FOOD_DELIVERY" | "INSTAMART" | "DINEOUT";
  restaurantName?: string;
  description: string;
  deliveryFee?: number;
  discount?: number;
  membershipDiscount?: number;
  area: string;
  pincode: string;
  items?: Array<{ name: string; quantity: number; price: number }>;
  hour: number;
};

const seedOrders: SeedOrder[] = [
  {
    daysAgo: 2,
    amount: 486,
    service: "FOOD_DELIVERY",
    restaurantName: "Truffles",
    description: "Dinner order from Truffles",
    deliveryFee: 32,
    discount: 80,
    membershipDiscount: 25,
    area: "Indiranagar",
    pincode: "560038",
    hour: 21,
  },
  {
    daysAgo: 5,
    amount: 292,
    service: "FOOD_DELIVERY",
    restaurantName: "Meghana Foods",
    description: "Lunch order from Meghana Foods",
    deliveryFee: 28,
    discount: 60,
    area: "Indiranagar",
    pincode: "560038",
    hour: 13,
  },
  {
    daysAgo: 8,
    amount: 713,
    service: "INSTAMART",
    description: "Weekly groceries from Instamart",
    deliveryFee: 0,
    discount: 95,
    area: "Indiranagar",
    pincode: "560038",
    items: [
      { name: "Milk", quantity: 2, price: 32 },
      { name: "Bananas", quantity: 1, price: 64 },
      { name: "Greek Yogurt", quantity: 2, price: 95 },
    ],
    hour: 18,
  },
  {
    daysAgo: 12,
    amount: 955,
    service: "DINEOUT",
    restaurantName: "Toit",
    description: "Weekend dinner via Dineout",
    deliveryFee: 0,
    discount: 180,
    area: "Indiranagar",
    pincode: "560038",
    hour: 20,
  },
  {
    daysAgo: 18,
    amount: 338,
    service: "FOOD_DELIVERY",
    restaurantName: "Asha Tiffins",
    description: "Breakfast order from Asha Tiffins",
    deliveryFee: 24,
    discount: 35,
    membershipDiscount: 15,
    area: "Domlur",
    pincode: "560071",
    hour: 9,
  },
  {
    daysAgo: 24,
    amount: 529,
    service: "FOOD_DELIVERY",
    restaurantName: "Truffles",
    description: "Burger order from Truffles",
    deliveryFee: 35,
    discount: 70,
    area: "Indiranagar",
    pincode: "560038",
    hour: 22,
  },
  {
    daysAgo: 35,
    amount: 644,
    service: "INSTAMART",
    description: "Pantry restock from Instamart",
    deliveryFee: 0,
    discount: 75,
    area: "Domlur",
    pincode: "560071",
    items: [
      { name: "Coffee", quantity: 1, price: 310 },
      { name: "Milk", quantity: 2, price: 32 },
      { name: "Eggs", quantity: 1, price: 96 },
    ],
    hour: 17,
  },
  {
    daysAgo: 48,
    amount: 418,
    service: "FOOD_DELIVERY",
    restaurantName: "Meghana Foods",
    description: "Biryani order from Meghana Foods",
    deliveryFee: 31,
    discount: 45,
    area: "Indiranagar",
    pincode: "560038",
    hour: 14,
  },
];

export function ensureLocalDatabase() {
  sqlite.exec(localMigrationSql);
}

export async function clearLocalSeedData() {
  await db.delete(chatMessages);
  await db.delete(chats);
  await db.delete(feedback);
  await db.delete(transactionsV2);
  await db.delete(parsedEmails);
  await db.delete(emailSyncStatus);
  await db.delete(profiles);
}

export async function seedLocalDatabase() {
  ensureLocalDatabase();
  await clearLocalSeedData();

  const now = new Date();
  await db.insert(profiles).values({
    id: LOCAL_USER_ID,
    first_name: "Local",
    last_name: "User",
    updated_at: now,
  });

  await db.insert(emailSyncStatus).values({
    userId: LOCAL_USER_ID,
    lastSyncedAt: now,
    lastSyncAttemptAt: now,
    syncStatus: "complete",
    totalEmails: seedOrders.length,
    processedEmails: seedOrders.length,
    progressPercentage: 100,
    hasInitialSync: true,
    createdAt: now,
    updatedAt: now,
  });

  const parsedRows = seedOrders.map((order, index) => {
    const receivedDate = dateForOrder(order);
    return {
      id: `seed-email-${index + 1}`,
      userId: LOCAL_USER_ID,
      senderEmailId: "noreply@swiggy.in",
      threadId: `seed-thread-${index + 1}`,
      subject: `Swiggy order ${index + 1}`,
      snippet: order.description,
      receivedDate,
      parseSuccess: true,
      parseErrors: null,
      rawContent: order.description,
      attachmentStoragePath: null,
      parsedAt: receivedDate,
      createdAt: now,
      updatedAt: now,
    };
  });

  await db.insert(parsedEmails).values(parsedRows);

  await db.insert(transactionsV2).values(
    seedOrders.map((order, index) => {
      const transactionDate = dateForOrder(order);
      return {
        id: `seed-transaction-${index + 1}`,
        userId: LOCAL_USER_ID,
        parsedEmailId: parsedRows[index]!.id,
        merchantId: "swiggy",
        merchantCode: "SWIGGY",
        merchantName: "Swiggy",
        amount: order.amount,
        currency: "INR",
        type: "DEBIT",
        status: "COMPLETED",
        transactionDate,
        description: order.description,
        category: order.service === "INSTAMART" ? "Groceries" : "Food",
        paymentMethod: "UPI",
        referenceIds: {
          orderId: `SW${String(index + 1).padStart(5, "0")}`,
        },
        location: {
          area: order.area,
          pincode: order.pincode,
        },
        merchantData: {
          swiggyMetadata: {
            service: order.service,
          },
          transaction: {
            orderId: `SW${String(index + 1).padStart(5, "0")}`,
            restaurantName: order.restaurantName,
            orderItems: order.items ?? [],
            deliveryFee: order.deliveryFee ?? 0,
            discount: order.discount ?? 0,
            membershipDiscount: order.membershipDiscount ?? 0,
            deliveryAddress: {
              area: order.area,
              pincode: order.pincode,
            },
          },
        },
        extractionConfidence: 0.97,
        schemaUsed: "swiggy.seed.v1",
        dataSource: "SEED",
        isVerified: true,
        verificationStatus: "VERIFIED",
        duplicateOf: null,
        createdAt: now,
        updatedAt: now,
      };
    }),
  );

  const chatId = randomUUID();
  await db.insert(chats).values({
    id: chatId,
    userId: LOCAL_USER_ID,
    title: "Swiggy spending snapshot",
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(chatMessages).values({
    chatId,
    role: "assistant",
    parts: [
      {
        type: "text",
        text: "Your local seed data is ready. Ask me about your Swiggy spending.",
      },
    ],
    createdAt: now,
  });
}

function dateForOrder(order: SeedOrder): Date {
  const date = new Date();
  date.setDate(date.getDate() - order.daysAgo);
  date.setHours(order.hour, 15, 0, 0);
  return date;
}
