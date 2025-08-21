const express = require('express');
const { PlaidApi, Configuration, PlaidEnvironments } = require('plaid');
const { body, validationResult } = require('express-validator');
const Account = require('../models/Account');
const auth = require('../middleware/auth');

const router = express.Router();

// Initialize Plaid client
const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});
const plaidClient = new PlaidApi(configuration);

// @route   POST /api/accounts/plaid/create-link-token
// @desc    Create Plaid Link token
// @access  Private
router.post('/plaid/create-link-token', auth, async (req, res) => {
  try {
    const request = {
      user: {
        client_user_id: req.user.id,
      },
      client_name: 'Financial Hub',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en',
    };

    const response = await plaidClient.linkTokenCreate(request);
    res.json({ link_token: response.data.link_token });
  } catch (error) {
    console.error('Error creating link token:', error);
    res.status(500).json({ error: 'Failed to create link token' });
  }
});

// @route   POST /api/accounts/plaid/exchange-public-token
// @desc    Exchange public token for access token
// @access  Private
router.post('/plaid/exchange-public-token', auth, [
  body('public_token').notEmpty(),
  body('metadata').isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { public_token, metadata } = req.body;

    // Exchange public token for access token
    const exchangeRequest = {
      public_token,
    };

    const exchangeResponse = await plaidClient.itemPublicTokenExchange(exchangeRequest);
    const { access_token, item_id } = exchangeResponse.data;

    // Get account information
    const accountsRequest = {
      access_token,
    };

    const accountsResponse = await plaidClient.accountsGet(accountsRequest);
    const accounts = accountsResponse.data.accounts;

    // Save accounts to database
    const savedAccounts = [];
    for (const account of accounts) {
      const newAccount = new Account({
        user: req.user.id,
        accountId: account.account_id,
        institutionId: metadata.institution?.institution_id,
        institutionName: metadata.institution?.name,
        accountName: account.name,
        accountType: account.type,
        accountSubtype: account.subtype,
        platform: 'plaid',
        balance: {
          available: account.balances.available,
          current: account.balances.current,
          currency: account.balances.iso_currency_code || 'USD'
        },
        credentials: {
          accessToken: access_token, // Should be encrypted in production
          itemId: item_id
        },
        syncStatus: 'connected',
        lastSynced: new Date()
      });

      await newAccount.save();
      savedAccounts.push(newAccount);
    }

    res.json({ 
      success: true, 
      accounts: savedAccounts,
      message: `Successfully connected ${savedAccounts.length} accounts`
    });
  } catch (error) {
    console.error('Error exchanging public token:', error);
    res.status(500).json({ error: 'Failed to connect accounts' });
  }
});

// @route   GET /api/accounts
// @desc    Get all user accounts
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const accounts = await Account.find({ 
      user: req.user.id, 
      isActive: true 
    }).sort({ createdAt: -1 });

    res.json(accounts);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/accounts/manual
// @desc    Add manual account
// @access  Private
router.post('/manual', auth, [
  body('accountName').notEmpty().trim(),
  body('accountType').isIn(['checking', 'savings', 'credit', 'business', 'creator_platform']),
  body('platform').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { accountName, accountType, platform, balance, metadata } = req.body;

    const account = new Account({
      user: req.user.id,
      accountId: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      accountName,
      accountType,
      platform,
      balance: balance || { current: 0, available: 0, currency: 'USD' },
      metadata: metadata || {},
      syncStatus: 'connected',
      lastSynced: new Date()
    });

    await account.save();
    res.json(account);
  } catch (error) {
    console.error('Error creating manual account:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/accounts/:id
// @desc    Update account
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const account = await Account.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const updateFields = ['accountName', 'balance', 'metadata', 'syncFrequency'];
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'balance' || field === 'metadata') {
          account[field] = { ...account[field].toObject(), ...req.body[field] };
        } else {
          account[field] = req.body[field];
        }
      }
    });

    await account.save();
    res.json(account);
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/accounts/:id
// @desc    Deactivate account
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const account = await Account.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    account.isActive = false;
    account.syncStatus = 'disconnected';
    await account.save();

    res.json({ message: 'Account disconnected successfully' });
  } catch (error) {
    console.error('Error deactivating account:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/accounts/:id/sync
// @desc    Manually sync account
// @access  Private
router.post('/:id/sync', auth, async (req, res) => {
  try {
    const account = await Account.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // TODO: Implement sync logic based on platform
    if (account.platform === 'plaid') {
      // Sync with Plaid
      const accountsRequest = {
        access_token: account.credentials.accessToken,
      };

      const accountsResponse = await plaidClient.accountsGet(accountsRequest);
      const plaidAccount = accountsResponse.data.accounts.find(
        acc => acc.account_id === account.accountId
      );

      if (plaidAccount) {
        account.balance = {
          available: plaidAccount.balances.available,
          current: plaidAccount.balances.current,
          currency: plaidAccount.balances.iso_currency_code || 'USD'
        };
        account.lastSynced = new Date();
        account.syncStatus = 'connected';
        await account.save();
      }
    }

    res.json({ 
      success: true, 
      account,
      message: 'Account synced successfully' 
    });
  } catch (error) {
    console.error('Error syncing account:', error);
    account.syncStatus = 'error';
    account.syncError = {
      message: error.message,
      lastOccurred: new Date()
    };
    await account.save();
    res.status(500).json({ error: 'Failed to sync account' });
  }
});

module.exports = router;
