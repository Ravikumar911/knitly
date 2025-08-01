import { FullConfig } from '@playwright/test';
import { stopMockServers } from './mock-servers';
import { cleanupTestDatabase } from './test-database';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown...');

  try {
    // Step 1: Stop mock servers
    console.log('🛑 Stopping mock servers...');
    await stopMockServers();
    console.log('✅ Mock servers stopped');

    // Step 2: Cleanup test database
    console.log('🗑️ Cleaning up test database...');
    await cleanupTestDatabase();
    console.log('✅ Test database cleaned');

    console.log('✨ Global teardown completed');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error in teardown as it might mask test failures
  }
}

export default globalTeardown;