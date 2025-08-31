const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');

class PlaidService {
  constructor() {
    this.configuration = new Configuration({
      basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
          'PLAID-SECRET': process.env.PLAID_SECRET,
        },
      },
    });
    
    this.client = new PlaidApi(this.configuration);
  }

  async createLinkToken(userId) {
    try {
      const configs = {
        user: {
          client_user_id: userId.toString(),
        },
        client_name: 'Financial Hub',
        products: ['transactions'],
        country_codes: ['US'],
        language: 'en',
        webhook: process.env.PLAID_WEBHOOK_URL,
        redirect_uri: process.env.PLAID_REDIRECT_URI,
      };

      const response = await this.client.linkTokenCreate(configs);
      return response.data.link_token;
    } catch (error) {
      console.error('Error creating Plaid link token:', error);
      throw new Error('Failed to create link token');
    }
  }

  async exchangePublicToken(publicToken) {
    try {
      const response = await this.client.itemPublicTokenExchange({
        public_token: publicToken,
      });
      
      return response.data.access_token;
    } catch (error) {
      console.error('Error exchanging public token:', error);
      throw new Error('Failed to exchange public token');
    }
  }

  async getAccounts(accessToken) {
    try {
      const response = await this.client.accountsGet({
        access_token: accessToken,
      });
      
      return response.data.accounts.map(account => ({
        id: account.account_id,
        name: account.name,
        type: account.type,
        subtype: account.subtype,
        mask: account.mask,
        balance: {
          available: account.balances.available,
          current: account.balances.current,
          limit: account.balances.limit,
          currency: account.balances.iso_currency_code || 'USD'
        }
      }));
    } catch (error) {
      console.error('Error fetching accounts:', error);
      throw new Error('Failed to fetch accounts');
    }
  }

  async getTransactions(accessToken, startDate, endDate, accountIds = null) {
    try {
      const request = {
        access_token: accessToken,
        start_date: startDate.toISOString().split('T')[0], // YYYY-MM-DD format
        end_date: endDate.toISOString().split('T')[0],
        count: 500,
        offset: 0,
      };

      if (accountIds && accountIds.length > 0) {
        request.account_ids = accountIds;
      }

      const response = await this.client.transactionsGet(request);
      
      return response.data.transactions.map(transaction => ({
        id: transaction.transaction_id,
        account_id: transaction.account_id,
        amount: transaction.amount,
        date: transaction.date,
        name: transaction.name,
        merchant_name: transaction.merchant_name,
        category: transaction.category,
        category_id: transaction.category_id,
        type: transaction.transaction_type,
        pending: transaction.pending,
        currency: transaction.iso_currency_code || 'USD',
        location: transaction.location,
        payment_meta: transaction.payment_meta
      }));
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw new Error('Failed to fetch transactions');
    }
  }

  async getInstitution(institutionId) {
    try {
      const response = await this.client.institutionsGetById({
        institution_id: institutionId,
        country_codes: ['US'],
      });
      
      return {
        id: response.data.institution.institution_id,
        name: response.data.institution.name,
        logo: response.data.institution.logo,
        primary_color: response.data.institution.primary_color,
        url: response.data.institution.url
      };
    } catch (error) {
      console.error('Error fetching institution:', error);
      throw new Error('Failed to fetch institution details');
    }
  }

  async removeItem(accessToken) {
    try {
      await this.client.itemRemove({
        access_token: accessToken,
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error removing Plaid item:', error);
      throw new Error('Failed to remove item');
    }
  }

  async getItemStatus(accessToken) {
    try {
      const response = await this.client.itemGet({
        access_token: accessToken,
      });
      
      return {
        item_id: response.data.item.item_id,
        institution_id: response.data.item.institution_id,
        webhook: response.data.item.webhook,
        error: response.data.item.error,
        available_products: response.data.item.available_products,
        billed_products: response.data.item.billed_products,
        consent_expiration_time: response.data.item.consent_expiration_time,
        update_type: response.data.item.update_type
      };
    } catch (error) {
      console.error('Error getting item status:', error);
      throw new Error('Failed to get item status');
    }
  }

  async refreshTransactions(accessToken) {
    try {
      const response = await this.client.transactionsRefresh({
        access_token: accessToken,
      });
      
      return {
        request_id: response.data.request_id
      };
    } catch (error) {
      console.error('Error refreshing transactions:', error);
      throw new Error('Failed to refresh transactions');
    }
  }

  // Webhook handler for Plaid events
  async handleWebhook(webhookBody) {
    try {
      const { webhook_type, webhook_code, item_id, new_transactions } = webhookBody;
      
      switch (webhook_type) {
        case 'TRANSACTIONS':
          if (webhook_code === 'INITIAL_UPDATE') {
            console.log(`Initial transaction update for item ${item_id}`);
            // Handle initial transaction load
          } else if (webhook_code === 'HISTORICAL_UPDATE') {
            console.log(`Historical transaction update for item ${item_id}`);
            // Handle historical transaction load
          } else if (webhook_code === 'DEFAULT_UPDATE') {
            console.log(`New transactions available for item ${item_id}: ${new_transactions}`);
            // Handle new transaction updates
          }
          break;
          
        case 'ITEM':
          if (webhook_code === 'ERROR') {
            console.error(`Item error for ${item_id}:`, webhookBody.error);
            // Handle item errors
          } else if (webhook_code === 'PENDING_EXPIRATION') {
            console.log(`Item ${item_id} access will expire soon`);
            // Handle pending expiration
          }
          break;
          
        case 'AUTH':
          if (webhook_code === 'AUTOMATICALLY_VERIFIED') {
            console.log(`Auth automatically verified for item ${item_id}`);
          }
          break;
          
        default:
          console.log(`Unhandled webhook type: ${webhook_type}`);
      }
      
      return { processed: true };
    } catch (error) {
      console.error('Error handling Plaid webhook:', error);
      throw new Error('Failed to process webhook');
    }
  }
}

module.exports = new PlaidService();
