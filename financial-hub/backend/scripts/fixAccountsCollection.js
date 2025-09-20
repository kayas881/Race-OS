require('dotenv').config();
const appwrite = require('../config/appwrite');

async function recreateAccountsCollection() {
  console.log('🔄 Recreating Accounts collection...');
  
  try {
    await appwrite.initializeClient(
      process.env.APPWRITE_ENDPOINT,
      process.env.APPWRITE_PROJECT_ID,
      process.env.APPWRITE_API_KEY
    );
    
    // Delete existing collection if it exists
    try {
      await appwrite.databases.deleteCollection(appwrite.databaseId, appwrite.collections.accounts);
      console.log('🗑️ Deleted existing Accounts collection');
    } catch (error) {
      if (error.code !== 404) {
        console.log('⚠️ Error deleting collection:', error.message);
      }
    }
    
    // Create the collection
    await appwrite.databases.createCollection(
      appwrite.databaseId,
      appwrite.collections.accounts,
      'Accounts'
    );
    console.log('✅ Created Accounts collection');
    
    // Create attributes one by one
    const attributes = [
      { key: 'userId', type: 'string', size: 255, required: true },
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'type', type: 'string', size: 100, required: true },
      { key: 'balance', type: 'double', default: 0 },
      { key: 'currency', type: 'string', size: 10, required: false },
      { key: 'bankName', type: 'string', size: 255, required: false },
      { key: 'accountNumber', type: 'string', size: 100, required: false },
      { key: 'routingNumber', type: 'string', size: 100, required: false },
      { key: 'isActive', type: 'boolean', default: true },
      { key: 'lastSynced', type: 'datetime', required: false },
      { key: 'createdAt', type: 'datetime', required: true }
    ];
    
    for (const attr of attributes) {
      try {
        if (attr.type === 'string') {
          await appwrite.databases.createStringAttribute(
            appwrite.databaseId,
            appwrite.collections.accounts,
            attr.key,
            attr.size,
            attr.required || false
          );
        } else if (attr.type === 'double') {
          await appwrite.databases.createFloatAttribute(
            appwrite.databaseId,
            appwrite.collections.accounts,
            attr.key,
            attr.required || false,
            null, // min
            null, // max
            attr.default || null
          );
        } else if (attr.type === 'boolean') {
          await appwrite.databases.createBooleanAttribute(
            appwrite.databaseId,
            appwrite.collections.accounts,
            attr.key,
            attr.required || false,
            attr.default || null
          );
        } else if (attr.type === 'datetime') {
          await appwrite.databases.createDatetimeAttribute(
            appwrite.databaseId,
            appwrite.collections.accounts,
            attr.key,
            attr.required || false
          );
        }
        console.log(`✅ Created attribute: ${attr.key} (${attr.type})`);
      } catch (error) {
        console.log(`❌ Error creating attribute ${attr.key}: ${error.message}`);
      }
    }
    
    console.log('✅ Accounts collection recreated successfully!');
    
  } catch (error) {
    console.error('❌ Error recreating accounts collection:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  recreateAccountsCollection();
}