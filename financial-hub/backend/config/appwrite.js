const sdk = require('node-appwrite');

class AppwriteService {
  constructor() {
    this.client = new sdk.Client();
    this.account = new sdk.Account(this.client);
    this.databases = new sdk.Databases(this.client);
    this.users = new sdk.Users(this.client);
    this.Query = sdk.Query;
    this.ID = sdk.ID;
    this.initialized = false;

    // Database and Collection IDs
    this.databaseId = 'race-os-financial-hub';
    this.collections = {
      users: 'users',
      transactions: 'transactions',
      accounts: 'accounts',
      categories: 'categories',
      clients: 'clients',
      invoices: 'invoices',
      integrations: 'integrations',
      platformIntegrations: 'platform-integrations',
      bankIntegrations: 'bank-integrations',
      taxCalculations: 'tax-calculations',
      branding: 'branding'
    };
  }

  // Initialize the client with environment variables
  initializeClient(endpoint, projectId, apiKey) {
    this.client
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);
    this.initialized = true;
  }

  // Initialize database and collections
  async initializeDatabase() {
    try {
      // Create database
      try {
        await this.databases.create(this.databaseId, 'Race-OS Financial Hub');
        console.log('✅ Database created successfully');
      } catch (error) {
        if (error.code === 409) {
          console.log('📍 Database already exists');
        } else {
          throw error;
        }
      }

      // Create collections
      await this.createCollections();
      console.log('✅ Appwrite database initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing Appwrite database:', error);
      throw error;
    }
  }

  async createCollections() {
    const collections = [
      {
        id: this.collections.users,
        name: 'Users',
        attributes: [
          { key: 'email', type: 'string', size: 255, required: true },
          { key: 'name', type: 'string', size: 255, required: true },
          { key: 'role', type: 'string', size: 50, default: 'user' },
          { key: 'preferences', type: 'string', size: 10000, required: false },
          { key: 'createdAt', type: 'datetime', required: true },
          { key: 'updatedAt', type: 'datetime', required: true }
        ]
      },
      {
        id: this.collections.transactions,
        name: 'Transactions',
        attributes: [
          { key: 'userId', type: 'string', size: 255, required: true },
          { key: 'amount', type: 'double', required: true },
          { key: 'type', type: 'string', size: 50, required: true },
          { key: 'category', type: 'string', size: 255, required: true },
          { key: 'description', type: 'string', size: 1000, required: false },
          { key: 'date', type: 'datetime', required: true },
          { key: 'accountId', type: 'string', size: 255, required: false },
          { key: 'metadata', type: 'string', size: 5000, required: false },
          { key: 'createdAt', type: 'datetime', required: true }
        ]
      },
      {
        id: this.collections.accounts,
        name: 'Accounts',
        attributes: [
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
        ]
      },
      {
        id: this.collections.categories,
        name: 'Categories',
        attributes: [
          { key: 'userId', type: 'string', size: 255, required: false },
          { key: 'name', type: 'string', size: 255, required: true },
          { key: 'type', type: 'string', size: 50, required: true },
          { key: 'color', type: 'string', size: 20, required: false },
          { key: 'icon', type: 'string', size: 50, required: false },
          { key: 'isDefault', type: 'boolean', default: false },
          { key: 'createdAt', type: 'datetime', required: true }
        ]
      },
      {
        id: this.collections.platformIntegrations,
        name: 'Platform Integrations',
        attributes: [
          { key: 'userId', type: 'string', size: 255, required: true },
          { key: 'platform', type: 'string', size: 100, required: true },
          { key: 'accessToken', type: 'string', size: 1000, required: true },
          { key: 'refreshToken', type: 'string', size: 1000, required: false },
          { key: 'channelId', type: 'string', size: 255, required: false },
          { key: 'channelName', type: 'string', size: 255, required: false },
          { key: 'status', type: 'string', size: 50, required: true },
          { key: 'metadata', type: 'string', size: 5000, required: false },
          { key: 'lastSync', type: 'datetime', required: false },
          { key: 'createdAt', type: 'datetime', required: true }
        ]
      }
    ];

    for (const collection of collections) {
      try {
        await this.databases.createCollection(
          this.databaseId,
          collection.id,
          collection.name
        );

        // Create attributes
        for (const attr of collection.attributes) {
          try {
            if (attr.type === 'string') {
              await this.databases.createStringAttribute(
                this.databaseId,
                collection.id,
                attr.key,
                attr.size || 255,
                attr.required || false,
                attr.default || null
              );
            } else if (attr.type === 'double') {
              await this.databases.createFloatAttribute(
                this.databaseId,
                collection.id,
                attr.key,
                attr.required || false,
                null, // min
                null, // max
                attr.default || null
              );
            } else if (attr.type === 'boolean') {
              await this.databases.createBooleanAttribute(
                this.databaseId,
                collection.id,
                attr.key,
                attr.required || false,
                attr.default || null
              );
            } else if (attr.type === 'datetime') {
              await this.databases.createDatetimeAttribute(
                this.databaseId,
                collection.id,
                attr.key,
                attr.required || false,
                attr.default || null
              );
            }
          } catch (attrError) {
            if (attrError.code !== 409) { // Skip if attribute already exists
              console.log(`⚠️ Error creating attribute ${attr.key}: ${attrError.message}`);
            }
          }
        }

        console.log(`✅ Collection ${collection.name} created`);
      } catch (error) {
        if (error.code === 409) {
          console.log(`📍 Collection ${collection.name} already exists`);
        } else {
          console.error(`❌ Error creating collection ${collection.name}:`, error);
        }
      }
    }
  }

  // User management
  async createUser(email, password, name) {
    try {
      const user = await this.users.create(this.ID.unique(), email, undefined, password, name);
      
      // Create user profile in database
      await this.databases.createDocument(
        this.databaseId,
        this.collections.users,
        this.ID.unique(),
        {
          userId: user.$id,
          email: user.email,
          name: user.name,
          role: 'user',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );

      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async getUser(userId) {
    try {
      return await this.users.get(userId);
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }

  // Database operations
  async createDocument(collectionId, data) {
    try {
      return await this.databases.createDocument(
        this.databaseId,
        collectionId,
        this.ID.unique(),
        {
          ...data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('Error creating document:', error);
      throw error;
    }
  }

  async getDocument(collectionId, documentId) {
    try {
      return await this.databases.getDocument(this.databaseId, collectionId, documentId);
    } catch (error) {
      console.error('Error getting document:', error);
      throw error;
    }
  }

  async updateDocument(collectionId, documentId, data) {
    try {
      return await this.databases.updateDocument(
        this.databaseId,
        collectionId,
        documentId,
        {
          ...data,
          updatedAt: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  }

  async deleteDocument(collectionId, documentId) {
    try {
      return await this.databases.deleteDocument(this.databaseId, collectionId, documentId);
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  async listDocuments(collectionId, queries = []) {
    try {
      return await this.databases.listDocuments(this.databaseId, collectionId, queries);
    } catch (error) {
      console.error('Error listing documents:', error);
      throw error;
    }
  }

  // Main initialization method
  async init() {
    // Initialize client with environment variables
    if (!process.env.APPWRITE_ENDPOINT || !process.env.APPWRITE_PROJECT_ID || !process.env.APPWRITE_API_KEY) {
      throw new Error('Missing Appwrite environment variables');
    }
    
    this.initializeClient(
      process.env.APPWRITE_ENDPOINT,
      process.env.APPWRITE_PROJECT_ID,
      process.env.APPWRITE_API_KEY
    );
    
    // Initialize database and collections
    await this.initializeDatabase();
  }

}

const appwriteService = new AppwriteService();

module.exports = appwriteService;
module.exports.Query = appwriteService.Query;