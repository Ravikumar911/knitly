import { createClient } from '@supabase/supabase-js';

// Mock database state - in-memory storage for e2e tests
let mockDatabase: {
  users: any[];
  user_google_tokens: any[];
  parsed_emails: any[];
  transactions_v2: any[];
  email_sync_status: any[];
  feedback: any[];
} = {
  users: [],
  user_google_tokens: [],
  parsed_emails: [],
  transactions_v2: [],
  email_sync_status: [],
  feedback: []
};

export async function setupTestDatabase(): Promise<void> {
  try {
    console.log('📦 Setting up in-memory mock database...');
    
    // Reset mock database state
    resetMockDatabase();
    
    // Seed initial test data
    await seedTestData();

    console.log('✅ Test database setup complete');
  } catch (error) {
    console.error('❌ Failed to setup test database:', error);
    throw error;
  }
}

export function resetMockDatabase(): void {
  mockDatabase = {
    users: [],
    user_google_tokens: [],
    parsed_emails: [],
    transactions_v2: [],
    email_sync_status: [],
    feedback: []
  };
}

export async function cleanupTestDatabase(): Promise<void> {
  try {
    // Reset in-memory database
    resetMockDatabase();
    console.log('✅ Test database cleanup complete');
  } catch (error) {
    console.error('❌ Failed to cleanup test database:', error);
  }
}

// Mock database query functions
export function getMockDatabase() {
  return mockDatabase;
}

export function insertIntoMockTable(table: keyof typeof mockDatabase, data: any) {
  mockDatabase[table].push({
    ...data,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
}

export function findInMockTable(table: keyof typeof mockDatabase, predicate: (item: any) => boolean) {
  return mockDatabase[table].find(predicate);
}

export function findAllInMockTable(table: keyof typeof mockDatabase, predicate?: (item: any) => boolean) {
  return predicate ? mockDatabase[table].filter(predicate) : mockDatabase[table];
}

async function seedTestData(): Promise<void> {
  const testUserId = process.env.TEST_USER_ID || 'test-user-e2e-123';
  
  // Insert test user
  insertIntoMockTable('users', {
    id: testUserId,
    email: process.env.TEST_USER_EMAIL || 'e2e-test@example.com',
    name: process.env.TEST_USER_NAME || 'E2E Test User',
    avatar_url: 'https://example.com/avatar.png'
  });

  // Insert test Google tokens
  insertIntoMockTable('user_google_tokens', {
    user_id: testUserId,
    provider_token: 'test-provider-token',
    provider_refresh_token: 'test-refresh-token',
    token_expires_at: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
  });

  // Insert test email sync status
  insertIntoMockTable('email_sync_status', {
    user_id: testUserId,
    status: 'idle',
    total_emails: 0,
    processed_emails: 0
  });

  // Insert sample transactions for testing
  const sampleTransactions = [
    {
      id: 'txn-e2e-1',
      user_id: testUserId,
      amount: 299.00,
      type: 'DEBIT',
      description: 'Swiggy food order',
      merchant_name: 'Swiggy',
      category: 'FOOD_DELIVERY',
      transaction_date: new Date().toISOString(),
      currency: 'INR',
      status: 'COMPLETED'
    },
    {
      id: 'txn-e2e-2',
      user_id: testUserId,
      amount: 150.00,
      type: 'DEBIT',
      description: 'Instamart grocery',
      merchant_name: 'Swiggy Instamart',
      category: 'GROCERIES',
      transaction_date: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      currency: 'INR',
      status: 'COMPLETED'
    },
  ];

  sampleTransactions.forEach(txn => {
    insertIntoMockTable('transactions_v2', txn);
  });

  console.log('🌱 Test data seeded successfully');
}

export function getTestDatabase() {
  return mockDatabase;
}

// Export for CLI usage
if (typeof require !== 'undefined' && require.main === module) {
  const command = process.argv[2];
  
  if (command === 'setup') {
    setupTestDatabase().catch(console.error);
  } else if (command === 'cleanup') {
    cleanupTestDatabase().catch(console.error);
  } else {
    console.log('Usage: node test-database.js [setup|cleanup]');
  }
}