import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '@workspace/database';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.resolve(__dirname, '../test.db');
let db: ReturnType<typeof drizzle> | null = null;

export async function setupTestDatabase(): Promise<void> {
  try {
    // Remove existing test database
    if (fs.existsSync(DB_PATH)) {
      fs.unlinkSync(DB_PATH);
    }

    // Create new SQLite database
    const sqlite = new Database(DB_PATH);
    db = drizzle(sqlite, { schema });

    // Run migrations to create tables
    console.log('📦 Running database migrations...');
    
    // Since we're using SQLite for tests, we need to create the schema manually
    // as Drizzle migrations are designed for PostgreSQL
    await createTestSchema(sqlite);
    
    // Seed initial test data
    await seedTestData();

    console.log('✅ Test database setup complete');
  } catch (error) {
    console.error('❌ Failed to setup test database:', error);
    throw error;
  }
}

export async function cleanupTestDatabase(): Promise<void> {
  try {
    if (db) {
      // Close database connection
      (db as any).close?.();
      db = null;
    }

    // Remove test database file
    if (fs.existsSync(DB_PATH)) {
      fs.unlinkSync(DB_PATH);
    }

    console.log('✅ Test database cleanup complete');
  } catch (error) {
    console.error('❌ Failed to cleanup test database:', error);
  }
}

async function createTestSchema(sqlite: Database.Database): Promise<void> {
  // Create users table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      avatar_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Create user_google_tokens table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS user_google_tokens (
      user_id TEXT PRIMARY KEY,
      provider_token TEXT,
      provider_refresh_token TEXT,
      token_expires_at TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Create parsed_emails table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS parsed_emails (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email_id TEXT UNIQUE NOT NULL,
      message_id TEXT NOT NULL,
      subject TEXT,
      from_email TEXT,
      date TEXT,
      body TEXT,
      attachments TEXT,
      parse_success BOOLEAN DEFAULT FALSE,
      parse_errors TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Create transactions_v2 table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS transactions_v2 (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email_id TEXT,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'INR',
      type TEXT NOT NULL CHECK (type IN ('DEBIT', 'CREDIT')),
      status TEXT DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'PENDING', 'FAILED', 'CANCELLED')),
      transaction_date TEXT,
      description TEXT NOT NULL,
      category TEXT,
      merchant_name TEXT,
      merchant_category TEXT,
      payment_method TEXT,
      reference_ids TEXT,
      location TEXT,
      duplicate_of TEXT,
      confidence_score REAL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (email_id) REFERENCES parsed_emails(id),
      FOREIGN KEY (duplicate_of) REFERENCES transactions_v2(id)
    );
  `);

  // Create email_sync_status table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS email_sync_status (
      user_id TEXT PRIMARY KEY,
      status TEXT DEFAULT 'idle' CHECK (status IN ('idle', 'counting_emails', 'in_progress', 'syncing', 'complete', 'failed')),
      last_synced_at TEXT,
      total_emails INTEGER DEFAULT 0,
      processed_emails INTEGER DEFAULT 0,
      error_message TEXT,
      estimated_completion TEXT,
      estimated_minutes_remaining INTEGER,
      oauth_error_type TEXT,
      oauth_error_message TEXT,
      oauth_requires_reauth BOOLEAN DEFAULT FALSE,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Create feedback table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('bug', 'feature', 'general')),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  console.log('📦 Test schema created successfully');
}

async function seedTestData(): Promise<void> {
  if (!db) {
    throw new Error('Database not initialized');
  }

  const sqlite = (db as any).db;

  // Insert test user
  sqlite.prepare(`
    INSERT INTO users (id, email, name, avatar_url)
    VALUES (?, ?, ?, ?)
  `).run(
    process.env.TEST_USER_ID || 'test-user-123',
    process.env.TEST_USER_EMAIL || 'test@example.com',
    process.env.TEST_USER_NAME || 'Test User',
    'https://example.com/avatar.png'
  );

  // Insert test Google tokens
  sqlite.prepare(`
    INSERT INTO user_google_tokens (user_id, provider_token, provider_refresh_token, token_expires_at)
    VALUES (?, ?, ?, ?)
  `).run(
    process.env.TEST_USER_ID || 'test-user-123',
    'test-provider-token',
    'test-refresh-token',
    new Date(Date.now() + 3600000).toISOString() // 1 hour from now
  );

  // Insert test email sync status
  sqlite.prepare(`
    INSERT INTO email_sync_status (user_id, status, total_emails, processed_emails)
    VALUES (?, ?, ?, ?)
  `).run(
    process.env.TEST_USER_ID || 'test-user-123',
    'idle',
    0,
    0
  );

  // Insert sample transactions for testing
  const sampleTransactions = [
    {
      id: 'txn-1',
      amount: 299.00,
      description: 'Swiggy food order',
      merchant_name: 'Swiggy',
      category: 'FOOD_DELIVERY',
      transaction_date: new Date().toISOString(),
    },
    {
      id: 'txn-2',
      amount: 150.00,
      description: 'Instamart grocery',
      merchant_name: 'Swiggy Instamart',
      category: 'GROCERIES',
      transaction_date: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    },
  ];

  const insertTransaction = sqlite.prepare(`
    INSERT INTO transactions_v2 (
      id, user_id, amount, type, description, merchant_name, 
      category, transaction_date, currency, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  sampleTransactions.forEach(txn => {
    insertTransaction.run(
      txn.id,
      process.env.TEST_USER_ID || 'test-user-123',
      txn.amount,
      'DEBIT',
      txn.description,
      txn.merchant_name,
      txn.category,
      txn.transaction_date,
      'INR',
      'COMPLETED'
    );
  });

  console.log('🌱 Test data seeded successfully');
}

export function getTestDatabase() {
  if (!db) {
    throw new Error('Test database not initialized. Call setupTestDatabase() first.');
  }
  return db;
}

// Export for CLI usage
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'setup') {
    setupTestDatabase().catch(console.error);
  } else if (command === 'cleanup') {
    cleanupTestDatabase().catch(console.error);
  } else {
    console.log('Usage: node test-database.js [setup|cleanup]');
  }
}