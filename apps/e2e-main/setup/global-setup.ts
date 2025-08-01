import { FullConfig } from '@playwright/test';
import { startMockServers } from './mock-servers';
import { setupTestDatabase } from './test-database';
import dotenv from 'dotenv';
import path from 'path';

async function globalSetup(config: FullConfig) {
  // Load test environment variables
  dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

  console.log('🚀 Starting global setup for e2e tests...');

  try {
    // Step 1: Setup test database (temporarily disabled)
    console.log('📦 Skipping test database setup for now...');
    // await setupTestDatabase();
    console.log('✅ Test database skipped');

    // Step 2: Start mock servers (handled by webServer config)
    console.log('🔧 Mock servers will be started by webServer config...');
    console.log('✅ Mock servers configured');

    console.log('🎉 Global setup completed successfully');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

export default globalSetup;