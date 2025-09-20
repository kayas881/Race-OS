require('dotenv').config();
const appwrite = require('../config/appwrite');

async function initializeAppwrite() {
  console.log('🚀 Initializing Appwrite database and collections...');
  
  // Check environment variables
  if (!process.env.APPWRITE_ENDPOINT) {
    console.error('❌ APPWRITE_ENDPOINT is not set in .env file');
    process.exit(1);
  }
  
  if (!process.env.APPWRITE_PROJECT_ID) {
    console.error('❌ APPWRITE_PROJECT_ID is not set in .env file');
    process.exit(1);
  }
  
  if (!process.env.APPWRITE_API_KEY || process.env.APPWRITE_API_KEY === 'your_api_key_here') {
    console.error('❌ APPWRITE_API_KEY is not set in .env file');
    console.log('');
    console.log('🔑 To get your API key:');
    console.log('1. Go to: https://fra.cloud.appwrite.io/console/project-ayanayan');
    console.log('2. Navigate to Settings → API Keys');
    console.log('3. Create a new API key with full permissions');
    console.log('4. Update APPWRITE_API_KEY in your .env file');
    process.exit(1);
  }
  
  try {
    // Initialize Appwrite service
    await appwrite.init();
    console.log('✓ Connected to Appwrite');
    
    console.log('📋 Appwrite setup completed successfully!');
    console.log('');
    console.log('🎯 Next steps:');
    console.log('1. Your collections are ready to use');
    console.log('2. You can now run the application: npm run dev');
    console.log('3. Test user registration and login');
    console.log('');
    console.log('🔍 Collections created:');
    console.log(`  - users: ${appwrite.collections.users}`);
    console.log(`  - clients: ${appwrite.collections.clients}`);
    console.log(`  - categories: ${appwrite.collections.categories}`);
    console.log(`  - accounts: ${appwrite.collections.accounts}`);
    console.log(`  - transactions: ${appwrite.collections.transactions}`);
    console.log(`  - invoices: ${appwrite.collections.invoices}`);
    
  } catch (error) {
    console.error('❌ Appwrite initialization failed:', error.message);
    
    if (error.message.includes('Invalid API key')) {
      console.log('');
      console.log('🔑 Please check your API key:');
      console.log('1. Go to your Appwrite Console: https://fra.cloud.appwrite.io/console/project-ayanayan');
      console.log('2. Navigate to Settings → API Keys');
      console.log('3. Create a new API key with full permissions');
      console.log('4. Update APPWRITE_API_KEY in your .env file');
    }
    
    if (error.message.includes('project not found')) {
      console.log('');
      console.log('📁 Please check your project ID:');
      console.log('1. Verify project ID "ayanayan" is correct');
      console.log('2. Check that you have access to the project');
    }
    
    process.exit(1);
  }
}

if (require.main === module) {
  initializeAppwrite();
}

module.exports = initializeAppwrite;