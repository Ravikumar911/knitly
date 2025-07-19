const { stopMockServers } = require('./mock-servers.js');
const { cleanupTestDatabase } = require('./test-database.js');

async function globalTeardown(config) {
  console.log('🧹 Starting global teardown...');

  try {
    // Step 1: Stop mock servers (handled by webServer config)
    console.log('🛑 Mock servers will be stopped by webServer config...');

    // Step 2: Cleanup test database (temporarily disabled)
    console.log('🗑️ Skipping test database cleanup...');
    // await cleanupTestDatabase();
    console.log('✅ Test database cleanup skipped');

    console.log('✨ Global teardown completed');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error in teardown as it might mask test failures
  }
}

module.exports = globalTeardown;