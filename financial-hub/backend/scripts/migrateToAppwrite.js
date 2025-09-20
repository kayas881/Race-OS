const mongoose = require('mongoose');
const appwrite = require('../config/appwrite');
const User = require('../models/User');
const Client = require('../models/Client');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const Invoice = require('../models/Invoice');
require('dotenv').config();

class DataMigration {
  constructor() {
    this.migrationLog = [];
  }

  log(message) {
    console.log(message);
    this.migrationLog.push(`${new Date().toISOString()}: ${message}`);
  }

  async connectMongoDB() {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      this.log('✓ Connected to MongoDB');
    } catch (error) {
      throw new Error(`MongoDB connection failed: ${error.message}`);
    }
  }

  async initializeAppwrite() {
    try {
      await appwrite.init();
      this.log('✓ Appwrite initialized');
    } catch (error) {
      throw new Error(`Appwrite initialization failed: ${error.message}`);
    }
  }

  async migrateUsers() {
    this.log('🔄 Starting user migration...');
    
    try {
      const mongoUsers = await User.find({});
      this.log(`Found ${mongoUsers.length} users in MongoDB`);

      let migrated = 0;
      let skipped = 0;
      let errors = 0;

      for (const mongoUser of mongoUsers) {
        try {
          // Check if user already exists in Appwrite
          const existingUsers = await appwrite.listDocuments(appwrite.collections.users, [
            appwrite.Query.equal('email', mongoUser.email)
          ]);

          if (existingUsers.documents.length > 0) {
            this.log(`⚠️ User ${mongoUser.email} already exists, skipping`);
            skipped++;
            continue;
          }

          // Create user profile document in Appwrite
          const userDoc = await appwrite.createDocument(appwrite.collections.users, {
            userId: mongoUser._id.toString(),
            email: mongoUser.email,
            name: mongoUser.name || '',
            businessName: mongoUser.businessName || '',
            businessType: mongoUser.businessType || '',
            role: mongoUser.role || 'user',
            createdAt: mongoUser.createdAt ? mongoUser.createdAt.toISOString() : new Date().toISOString(),
            // Note: Appwrite auth accounts need to be created separately
            migrated: true,
            originalMongoId: mongoUser._id.toString()
          });

          this.log(`✓ Migrated user: ${mongoUser.email}`);
          migrated++;
        } catch (error) {
          this.log(`❌ Error migrating user ${mongoUser.email}: ${error.message}`);
          errors++;
        }
      }

      this.log(`📊 User migration complete: ${migrated} migrated, ${skipped} skipped, ${errors} errors`);
      return { migrated, skipped, errors };
    } catch (error) {
      this.log(`❌ User migration failed: ${error.message}`);
      throw error;
    }
  }

  async migrateClients() {
    this.log('🔄 Starting client migration...');
    
    try {
      const mongoClients = await Client.find({});
      this.log(`Found ${mongoClients.length} clients in MongoDB`);

      let migrated = 0;
      let errors = 0;

      for (const mongoClient of mongoClients) {
        try {
          const clientDoc = await appwrite.createDocument(appwrite.collections.clients, {
            userId: mongoClient.userId.toString(),
            name: mongoClient.name,
            email: mongoClient.email || '',
            phone: mongoClient.phone || '',
            address: mongoClient.address || '',
            city: mongoClient.city || '',
            state: mongoClient.state || '',
            zipCode: mongoClient.zipCode || '',
            country: mongoClient.country || '',
            taxId: mongoClient.taxId || '',
            paymentTerms: mongoClient.paymentTerms || 30,
            currency: mongoClient.currency || 'USD',
            isActive: mongoClient.isActive !== false,
            createdAt: mongoClient.createdAt ? mongoClient.createdAt.toISOString() : new Date().toISOString(),
            originalMongoId: mongoClient._id.toString()
          });

          migrated++;
        } catch (error) {
          this.log(`❌ Error migrating client ${mongoClient.name}: ${error.message}`);
          errors++;
        }
      }

      this.log(`📊 Client migration complete: ${migrated} migrated, ${errors} errors`);
      return { migrated, errors };
    } catch (error) {
      this.log(`❌ Client migration failed: ${error.message}`);
      throw error;
    }
  }

  async migrateCategories() {
    this.log('🔄 Starting category migration...');
    
    try {
      const mongoCategories = await Category.find({});
      this.log(`Found ${mongoCategories.length} categories in MongoDB`);

      let migrated = 0;
      let errors = 0;

      for (const mongoCategory of mongoCategories) {
        try {
          const categoryDoc = await appwrite.createDocument(appwrite.collections.categories, {
            userId: mongoCategory.userId ? mongoCategory.userId.toString() : null,
            name: mongoCategory.name,
            description: mongoCategory.description || '',
            type: mongoCategory.type || 'expense',
            color: mongoCategory.color || '#3B82F6',
            isDefault: mongoCategory.isDefault || false,
            isActive: mongoCategory.isActive !== false,
            createdAt: mongoCategory.createdAt ? mongoCategory.createdAt.toISOString() : new Date().toISOString(),
            originalMongoId: mongoCategory._id.toString()
          });

          migrated++;
        } catch (error) {
          this.log(`❌ Error migrating category ${mongoCategory.name}: ${error.message}`);
          errors++;
        }
      }

      this.log(`📊 Category migration complete: ${migrated} migrated, ${errors} errors`);
      return { migrated, errors };
    } catch (error) {
      this.log(`❌ Category migration failed: ${error.message}`);
      throw error;
    }
  }

  async migrateAccounts() {
    this.log('🔄 Starting account migration...');
    
    try {
      const mongoAccounts = await Account.find({});
      this.log(`Found ${mongoAccounts.length} accounts in MongoDB`);

      let migrated = 0;
      let errors = 0;

      for (const mongoAccount of mongoAccounts) {
        try {
          const accountDoc = await appwrite.createDocument(appwrite.collections.accounts, {
            userId: mongoAccount.userId.toString(),
            name: mongoAccount.name,
            type: mongoAccount.type,
            balance: mongoAccount.balance || 0,
            currency: mongoAccount.currency || 'USD',
            bankName: mongoAccount.bankName || '',
            accountNumber: mongoAccount.accountNumber || '',
            routingNumber: mongoAccount.routingNumber || '',
            isActive: mongoAccount.isActive !== false,
            lastSynced: mongoAccount.lastSynced ? mongoAccount.lastSynced.toISOString() : null,
            createdAt: mongoAccount.createdAt ? mongoAccount.createdAt.toISOString() : new Date().toISOString(),
            originalMongoId: mongoAccount._id.toString()
          });

          migrated++;
        } catch (error) {
          this.log(`❌ Error migrating account ${mongoAccount.name}: ${error.message}`);
          errors++;
        }
      }

      this.log(`📊 Account migration complete: ${migrated} migrated, ${errors} errors`);
      return { migrated, errors };
    } catch (error) {
      this.log(`❌ Account migration failed: ${error.message}`);
      throw error;
    }
  }

  async migrateTransactions() {
    this.log('🔄 Starting transaction migration...');
    
    try {
      const mongoTransactions = await Transaction.find({}).limit(1000); // Migrate in batches
      this.log(`Found ${mongoTransactions.length} transactions in MongoDB (first batch)`);

      let migrated = 0;
      let errors = 0;

      for (const mongoTransaction of mongoTransactions) {
        try {
          const transactionDoc = await appwrite.createDocument(appwrite.collections.transactions, {
            userId: mongoTransaction.userId.toString(),
            accountId: mongoTransaction.accountId ? mongoTransaction.accountId.toString() : null,
            categoryId: mongoTransaction.categoryId ? mongoTransaction.categoryId.toString() : null,
            amount: mongoTransaction.amount,
            description: mongoTransaction.description || '',
            type: mongoTransaction.type,
            date: mongoTransaction.date ? mongoTransaction.date.toISOString() : new Date().toISOString(),
            isRecurring: mongoTransaction.isRecurring || false,
            tags: mongoTransaction.tags || [],
            attachments: mongoTransaction.attachments || [],
            taxInfo: mongoTransaction.taxInfo || {},
            createdAt: mongoTransaction.createdAt ? mongoTransaction.createdAt.toISOString() : new Date().toISOString(),
            originalMongoId: mongoTransaction._id.toString()
          });

          migrated++;
          
          if (migrated % 100 === 0) {
            this.log(`📈 Progress: ${migrated} transactions migrated`);
          }
        } catch (error) {
          this.log(`❌ Error migrating transaction ${mongoTransaction._id}: ${error.message}`);
          errors++;
        }
      }

      this.log(`📊 Transaction migration complete: ${migrated} migrated, ${errors} errors`);
      return { migrated, errors };
    } catch (error) {
      this.log(`❌ Transaction migration failed: ${error.message}`);
      throw error;
    }
  }

  async migrateInvoices() {
    this.log('🔄 Starting invoice migration...');
    
    try {
      const mongoInvoices = await Invoice.find({});
      this.log(`Found ${mongoInvoices.length} invoices in MongoDB`);

      let migrated = 0;
      let errors = 0;

      for (const mongoInvoice of mongoInvoices) {
        try {
          const invoiceDoc = await appwrite.createDocument(appwrite.collections.invoices, {
            userId: mongoInvoice.userId.toString(),
            clientId: mongoInvoice.clientId ? mongoInvoice.clientId.toString() : null,
            invoiceNumber: mongoInvoice.invoiceNumber,
            status: mongoInvoice.status || 'draft',
            issueDate: mongoInvoice.issueDate ? mongoInvoice.issueDate.toISOString() : new Date().toISOString(),
            dueDate: mongoInvoice.dueDate ? mongoInvoice.dueDate.toISOString() : null,
            items: mongoInvoice.items || [],
            subtotal: mongoInvoice.subtotal || 0,
            taxAmount: mongoInvoice.taxAmount || 0,
            total: mongoInvoice.total || 0,
            currency: mongoInvoice.currency || 'USD',
            notes: mongoInvoice.notes || '',
            paymentTerms: mongoInvoice.paymentTerms || '',
            paidAt: mongoInvoice.paidAt ? mongoInvoice.paidAt.toISOString() : null,
            createdAt: mongoInvoice.createdAt ? mongoInvoice.createdAt.toISOString() : new Date().toISOString(),
            originalMongoId: mongoInvoice._id.toString()
          });

          migrated++;
        } catch (error) {
          this.log(`❌ Error migrating invoice ${mongoInvoice.invoiceNumber}: ${error.message}`);
          errors++;
        }
      }

      this.log(`📊 Invoice migration complete: ${migrated} migrated, ${errors} errors`);
      return { migrated, errors };
    } catch (error) {
      this.log(`❌ Invoice migration failed: ${error.message}`);
      throw error;
    }
  }

  async runFullMigration() {
    this.log('🚀 Starting full data migration from MongoDB to Appwrite');
    
    try {
      await this.connectMongoDB();
      await this.initializeAppwrite();

      const results = {};
      
      // Migrate in order of dependencies
      results.users = await this.migrateUsers();
      results.categories = await this.migrateCategories();
      results.clients = await this.migrateClients();
      results.accounts = await this.migrateAccounts();
      results.transactions = await this.migrateTransactions();
      results.invoices = await this.migrateInvoices();

      this.log('✅ Full migration completed successfully!');
      this.log('📊 Migration Summary:');
      Object.entries(results).forEach(([collection, stats]) => {
        this.log(`  ${collection}: ${JSON.stringify(stats)}`);
      });

      return results;
    } catch (error) {
      this.log(`❌ Migration failed: ${error.message}`);
      throw error;
    } finally {
      await mongoose.disconnect();
      this.log('🔌 Disconnected from MongoDB');
    }
  }

  getMigrationLog() {
    return this.migrationLog;
  }
}

module.exports = DataMigration;

// CLI usage
if (require.main === module) {
  const migration = new DataMigration();
  
  migration.runFullMigration()
    .then((results) => {
      console.log('\n✅ Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error.message);
      process.exit(1);
    });
}