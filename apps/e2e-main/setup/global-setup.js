const { setupTestDatabase } = require('./test-database.js');
const { startMockServers } = require('./mock-servers.js');
const dotenv = require('dotenv');
const path = require('path');

async function globalSetup(config) {
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

module.exports = globalSetup;