require('dotenv').config();
const database = require('./config/database');

async function testDatabase() {
  try {
    console.log('Testing database connection...');
    console.log('🔍 MONGODB_URI:', process.env.MONGODB_URI ? 'Set (Atlas)' : 'Not set (will use Memory Server)');
    console.log('🔍 NODE_ENV:', process.env.NODE_ENV);
    
    await database.connect();
    console.log('✅ Database connected successfully!');
    
    const status = database.getConnectionStatus();
    console.log('📊 Database Status:', JSON.stringify(status, null, 2));
    
    await database.disconnect();
    console.log('✅ Database disconnected successfully!');
  } catch (error) {
    console.error('❌ Database test failed:', error);
  }
}

testDatabase();
