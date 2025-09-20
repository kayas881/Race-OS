import { Client, Account, Databases, Query, ID } from 'appwrite';

class AppwriteConfig {
  constructor() {
    this.client = new Client();
    this.account = new Account(this.client);
    this.databases = new Databases(this.client);

    const endpoint = process.env.REACT_APP_APPWRITE_ENDPOINT;
    const projectId = process.env.REACT_APP_APPWRITE_PROJECT_ID;

    if (!endpoint) {
      console.warn('⚠️ REACT_APP_APPWRITE_ENDPOINT is not set in environment variables');
    }
    if (!projectId) {
      console.warn('⚠️ REACT_APP_APPWRITE_PROJECT_ID is not set in environment variables');
    }

    console.log('🔧 Appwrite Client Config:', { endpoint, projectId });

    this.client
      .setEndpoint(endpoint)
      .setProject(projectId);

    // Database and Collection IDs (must match backend)
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

  // Authentication methods
  async createAccount(email, password, name) {
    try {
      const user = await this.account.create(ID.unique(), email, password, name);
      await this.login(email, password);
      return user;
    } catch (error) {
      console.error('Error creating account:', error);
      throw error;
    }
  }

  async login(email, password) {
    try {
      return await this.account.createEmailPasswordSession(email, password);
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  }

  async logout() {
    try {
      return await this.account.deleteSession('current');
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  }

  async getCurrentUser() {
    try {
      return await this.account.get();
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  async updatePassword(newPassword, oldPassword) {
    try {
      return await this.account.updatePassword(newPassword, oldPassword);
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  }

  // Database methods
  async createDocument(collectionId, data) {
    try {
      return await this.databases.createDocument(
        this.databaseId,
        collectionId,
        ID.unique(),
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

  // Helper methods for specific collections
  async getUserTransactions(userId) {
    return this.listDocuments(this.collections.transactions, [
      Query.equal('userId', userId),
      Query.orderDesc('date')
    ]);
  }

  async getUserAccounts(userId) {
    return this.listDocuments(this.collections.accounts, [
      Query.equal('userId', userId),
      Query.equal('isActive', true)
    ]);
  }

  async getUserPlatformIntegrations(userId) {
    return this.listDocuments(this.collections.platformIntegrations, [
      Query.equal('userId', userId)
    ]);
  }

  // Query utilities
  Query = Query;
  ID = ID;
}

const appwrite = new AppwriteConfig();
export default appwrite;