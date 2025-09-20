const appwrite = require('../config/appwrite');
require('dotenv').config();

async function verifyMigration() {
  console.log('🔍 Verifying Appwrite migration...');
  
  try {
    await appwrite.init();
    console.log('✓ Connected to Appwrite');

    // Check each collection
    const collections = [
      { name: 'users', id: appwrite.collections.users },
      { name: 'clients', id: appwrite.collections.clients },
      { name: 'categories', id: appwrite.collections.categories },
      { name: 'accounts', id: appwrite.collections.accounts },
      { name: 'transactions', id: appwrite.collections.transactions },
      { name: 'invoices', id: appwrite.collections.invoices }
    ];

    console.log('\n📊 Collection Statistics:');
    
    for (const collection of collections) {
      try {
        const documents = await appwrite.listDocuments(collection.id);
        console.log(`  ${collection.name}: ${documents.total} documents`);
        
        // Show sample document structure
        if (documents.documents.length > 0) {
          const sample = documents.documents[0];
          const fields = Object.keys(sample).filter(key => !key.startsWith('$'));
          console.log(`    Sample fields: ${fields.slice(0, 5).join(', ')}${fields.length > 5 ? '...' : ''}`);
        }
      } catch (error) {
        console.log(`  ${collection.name}: ❌ Error - ${error.message}`);
      }
    }

    console.log('\n✅ Verification completed');
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  verifyMigration();
}

module.exports = verifyMigration;