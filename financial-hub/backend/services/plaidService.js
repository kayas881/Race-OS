const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');

class PlaidService {
  constructor() {
    this.configuration = new Configuration({
      basePath: process.env.PLAID_ENV === 'production' 
        ? PlaidEnvironments.production 
        : PlaidEnvironments.sandbox,
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
          'PLAID-SECRET': process.env.PLAID_SECRET,
        },
      },
    });
    
    this.client = new PlaidApi(this.configuration);
  }

  // Create a link token for Plaid Link initialization
  async createLinkToken(userId) {
    try {
      const configs = {
        user: {
          client_user_id: userId.toString(),
        },
        client_name: 'Financial Hub',
        products: ['transactions', 'accounts', 'identity'],
        country_codes: ['US'],
        language: 'en',
        webhook: process.env.PLAID_WEBHOOK_URL,
        account_filters: {
          depository: {
            account_subtypes: ['checking', 'savings', 'money_market', 'cd'],
          },
          credit: {
            account_subtypes: ['credit_card', 'paypal'],
          },
        },
      };

      const response = await this.client.linkTokenCreate(configs);
      return response.data;
    } catch (error) {
      console.error('Error creating link token:', error);
      throw new Error('Failed to create link token');
    }
  }

  // Exchange public token for access token
  async exchangePublicToken(publicToken) {
    try {
      const response = await this.client.itemPublicTokenExchange({
        public_token: publicToken,
      });
      
      return {
        accessToken: response.data.access_token,
        itemId: response.data.item_id,
      };
    } catch (error) {
      console.error('Error exchanging public token:', error);
      throw new Error('Failed to exchange public token');
    }
  }

  // Get account information
  async getAccounts(accessToken) {
    try {
      const response = await this.client.accountsGet({
        access_token: accessToken,
      });
      
      return response.data.accounts.map(account => ({
        accountId: account.account_id,
        name: account.name,
        officialName: account.official_name,
        type: account.type,
        subtype: account.subtype,
        balance: {
          current: account.balances.current,
          available: account.balances.available,
          limit: account.balances.limit,
        },
        mask: account.mask,
      }));
    } catch (error) {
      console.error('Error fetching accounts:', error);
      throw new Error('Failed to fetch accounts');
    }
  }

  // Get transactions
  async getTransactions(accessToken, startDate, endDate, accountIds = null) {
    try {
      const request = {
        access_token: accessToken,
        start_date: startDate,
        end_date: endDate,
        count: 500,
        offset: 0,
      };

      if (accountIds) {
        request.account_ids = accountIds;
      }

      const response = await this.client.transactionsGet(request);
      
      return response.data.transactions.map(transaction => ({
        transactionId: transaction.transaction_id,
        accountId: transaction.account_id,
        amount: transaction.amount,
        date: transaction.date,
        description: transaction.name,
        merchantName: transaction.merchant_name,
        category: transaction.category,
        subcategory: transaction.category?.[1] || null,
        pending: transaction.pending,
        accountOwner: transaction.account_owner,
      }));
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw new Error('Failed to fetch transactions');
    }
  }

  // Get identity information
  async getIdentity(accessToken) {
    try {
      const response = await this.client.identityGet({
        access_token: accessToken,
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching identity:', error);
      throw new Error('Failed to fetch identity');
    }
  }

  // Remove an item
  async removeItem(accessToken) {
    try {
      await this.client.itemRemove({
        access_token: accessToken,
      });
      return true;
    } catch (error) {
      console.error('Error removing item:', error);
      throw new Error('Failed to remove item');
    }
  }
}

module.exports = new PlaidService();
