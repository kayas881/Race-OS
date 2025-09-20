require('dotenv').config();
const appwrite = require('../config/appwrite');

async function createMissingCollections() {
  console.log('🔄 Creating missing collections...');
  
  try {
    await appwrite.initializeClient(
      process.env.APPWRITE_ENDPOINT,
      process.env.APPWRITE_PROJECT_ID,
      process.env.APPWRITE_API_KEY
    );
    
    // Define missing collections
    const collections = [
      {
        id: 'clients',
        name: 'Clients',
        attributes: [
          { key: 'userId', type: 'string', size: 255, required: true },
          { key: 'name', type: 'string', size: 255, required: true },
          { key: 'email', type: 'string', size: 255, required: false },
          { key: 'phone', type: 'string', size: 50, required: false },
          { key: 'address', type: 'string', size: 500, required: false },
          { key: 'city', type: 'string', size: 100, required: false },
          { key: 'state', type: 'string', size: 100, required: false },
          { key: 'zipCode', type: 'string', size: 20, required: false },
          { key: 'country', type: 'string', size: 100, required: false },
          { key: 'taxId', type: 'string', size: 100, required: false },
          { key: 'paymentTerms', type: 'integer', default: 30 },
          { key: 'currency', type: 'string', size: 10, required: false },
          { key: 'isActive', type: 'boolean', default: true },
          { key: 'createdAt', type: 'datetime', required: true }
        ]
      },
      {
        id: 'invoices',
        name: 'Invoices',
        attributes: [
          { key: 'userId', type: 'string', size: 255, required: true },
          { key: 'clientId', type: 'string', size: 255, required: false },
          { key: 'invoiceNumber', type: 'string', size: 100, required: true },
          { key: 'status', type: 'string', size: 50, required: true },
          { key: 'issueDate', type: 'datetime', required: true },
          { key: 'dueDate', type: 'datetime', required: false },
          { key: 'items', type: 'string', size: 5000, required: false }, // JSON string
          { key: 'subtotal', type: 'double', default: 0 },
          { key: 'taxAmount', type: 'double', default: 0 },
          { key: 'total', type: 'double', default: 0 },
          { key: 'currency', type: 'string', size: 10, required: false },
          { key: 'notes', type: 'string', size: 1000, required: false },
          { key: 'paymentTerms', type: 'string', size: 500, required: false },
          { key: 'paidAt', type: 'datetime', required: false },
          { key: 'createdAt', type: 'datetime', required: true }
        ]
      }
    ];
    
    for (const collection of collections) {
      try {
        // Create collection
        await appwrite.databases.createCollection(
          appwrite.databaseId,
          collection.id,
          collection.name
        );
        console.log(`✅ Created collection: ${collection.name}`);
        
        // Create attributes
        for (const attr of collection.attributes) {
          try {
            if (attr.type === 'string') {
              await appwrite.databases.createStringAttribute(
                appwrite.databaseId,
                collection.id,
                attr.key,
                attr.size,
                attr.required || false
              );
            } else if (attr.type === 'double') {
              await appwrite.databases.createFloatAttribute(
                appwrite.databaseId,
                collection.id,
                attr.key,
                attr.required || false,
                null, // min
                null, // max
                attr.default || null
              );
            } else if (attr.type === 'integer') {
              await appwrite.databases.createIntegerAttribute(
                appwrite.databaseId,
                collection.id,
                attr.key,
                attr.required || false,
                null, // min
                null, // max
                attr.default || null
              );
            } else if (attr.type === 'boolean') {
              await appwrite.databases.createBooleanAttribute(
                appwrite.databaseId,
                collection.id,
                attr.key,
                attr.required || false,
                attr.default || null
              );
            } else if (attr.type === 'datetime') {
              await appwrite.databases.createDatetimeAttribute(
                appwrite.databaseId,
                collection.id,
                attr.key,
                attr.required || false
              );
            }
            console.log(`  ✅ Created attribute: ${attr.key} (${attr.type})`);
          } catch (attrError) {
            if (attrError.code !== 409) {
              console.log(`  ⚠️ Error creating attribute ${attr.key}: ${attrError.message}`);
            }
          }
        }
      } catch (collectionError) {
        if (collectionError.code === 409) {
          console.log(`📍 Collection ${collection.name} already exists`);
        } else {
          console.log(`❌ Error creating collection ${collection.name}: ${collectionError.message}`);
        }
      }
    }
    
    console.log('✅ Missing collections created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating collections:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  createMissingCollections();
}