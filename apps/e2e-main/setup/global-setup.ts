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
    // Step 1: Setup test database
    console.log('📦 Setting up test database...');
    await setupTestDatabase();
    console.log('✅ Test database ready');

    // Step 2: Start mock servers
    console.log('🔧 Starting mock servers...');
    await startMockServers();
    console.log('✅ Mock servers running');

    console.log('🎉 Global setup completed successfully');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

export default globalSetup;