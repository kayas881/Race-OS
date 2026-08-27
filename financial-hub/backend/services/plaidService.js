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
        client_name: 'Race-OS',
        products: ['transactions'],
        country_codes: ['US'],
        language: 'en',
        webhook: process.env.PLAID_WEBHOOK_URL,
      };

      // redirect_uri is only needed for OAuth-based institutions, and Plaid rejects the
      // whole request if it's set but not yet registered in the developer dashboard -
      // only include it once PLAID_REDIRECT_URI_REGISTERED confirms that's been done.
      if (process.env.PLAID_REDIRECT_URI && process.env.PLAID_REDIRECT_URI_REGISTERED === 'true') {
        configs.redirect_uri = process.env.PLAID_REDIRECT_URI;
      }

      const response = await this.client.linkTokenCreate(configs);
      return response.data.link_token;
    } catch (error) {
      console.error('Error creating Plaid link token:', error);
      throw new Error('Failed to create link token');
    }
  }

  // "Update mode" - used to re-authenticate an existing Item (e.g. after the bank
  // requires a fresh login) without creating a new Item/access_token. Passing
  // access_token (and omitting `products`) is what puts Link into this mode.
  async createUpdateLinkToken(userId, accessToken) {
    try {
      const configs = {
        user: { client_user_id: userId.toString() },
        client_name: 'Race-OS',
        country_codes: ['US'],
        language: 'en',
        access_token: accessToken,
        webhook: process.env.PLAID_WEBHOOK_URL,
      };

      if (process.env.PLAID_REDIRECT_URI && process.env.PLAID_REDIRECT_URI_REGISTERED === 'true') {
        configs.redirect_uri = process.env.PLAID_REDIRECT_URI;
      }

      const response = await this.client.linkTokenCreate(configs);
      return response.data.link_token;
    } catch (error) {
      console.error('Error creating Plaid update-mode link token:', error);
      throw new Error('Failed to create update link token');
    }
  }

  async exchangePublicToken(publicToken) {
    try {
      const response = await this.client.itemPublicTokenExchange({
        public_token: publicToken,
      });

      // BankIntegration.itemId is required for provider 'plaid' - callers must
      // persist this, not just access_token, or the integration fails to save.
      return { accessToken: response.data.access_token, itemId: response.data.item_id };
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
        // count/offset/account_ids must live under `options` - Plaid rejects them
        // as top-level fields with UNKNOWN_FIELDS.
        options: {
          count: 500,
          offset: 0,
        },
      };

      if (accountIds && accountIds.length > 0) {
        request.options.account_ids = accountIds;
      }

      // A single request caps out at 500 transactions - page through offset until
      // we've pulled everything the query matched, or a high-volume account/date
      // range silently loses everything past the first page.
      const allTransactions = [];
      let totalTransactions = Infinity;

      while (allTransactions.length < totalTransactions) {
        const response = await this.client.transactionsGet(request);
        totalTransactions = response.data.total_transactions;
        allTransactions.push(...response.data.transactions);
        request.options.offset = allTransactions.length;

        if (response.data.transactions.length === 0) break; // safety net against an infinite loop
      }

      return allTransactions.map(transaction => ({
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

}

module.exports = new PlaidService();
