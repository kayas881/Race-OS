const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const PlaidService = require('../services/plaidService');
const PlatformIntegrationService = require('../services/PlatformIntegrationService');
const CSVImportService = require('../services/csvImportService');
const CategorizationService = require('../services/categorization');
const SubstackService = require('../services/SubstackService');
const BankIntegration = require('../models/BankIntegration');
const User = require('../models/User');
const PlatformIntegration = require('../models/PlatformIntegration');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const multer = require('multer');

// Find-or-create the Account a platform's synced revenue should be recorded against.
async function getOrCreatePlatformAccount(userId, platform, channelName) {
  let account = await Account.findOne({ user: userId, platform, accountType: 'creator_platform' });
  if (!account) {
    account = new Account({
      user: userId,
      accountId: `${platform}-${userId}`,
      accountName: channelName ? `${channelName} (${platform})` : `${platform} account`,
      accountType: 'creator_platform',
      platform,
      isActive: true
    });
    await account.save();
  }
  return account;
}

// Upsert one Transaction per day of a platform's daily revenue breakdown, keyed by a
// stable transactionId - re-syncing the same day updates the amount instead of creating
// a duplicate, since sync always re-covers the last 30 days on every call.
async function upsertDailyRevenueTransactions(userId, platform, account, dailyBreakdown) {
  let created = 0, updated = 0;
  for (const day of dailyBreakdown) {
    if (!day.revenue || day.revenue <= 0) continue;

    const transactionId = `${platform}-${account._id}-${day.date}`;
    const existed = await Transaction.exists({ transactionId });

    await Transaction.findOneAndUpdate(
      { transactionId },
      {
        user: userId,
        account: account._id,
        transactionId,
        amount: day.revenue,
        description: `${platform.charAt(0).toUpperCase() + platform.slice(1)} revenue - ${day.date}`,
        date: new Date(day.date),
        type: 'income',
        // 'youtube'/'twitch'/'patreon' match the business-income category list
        // in services/taxCalculation.js's calculateIncome(), so this counts toward tax.
        category: { primary: platform, confidence: 1 },
        businessClassification: 'business',
        isManual: false
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (existed) updated++;
    else created++;
  }
  return { created, updated };
}

// Configure multer for CSV upload
const upload = multer({ 
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// @route   GET /api/integrations
// @desc    Get available integrations
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const integrations = [
      {
        id: 'plaid',
        name: 'Bank Accounts',
        description: 'Connect your bank accounts and credit cards',
        category: 'banking',
        isActive: true,
        setup_required: false,
        // Automatic bank sync needs Plaid production access, which isn't live yet -
        // CSV import is the primary way to get bank data in until then.
        comingSoon: true
      },
      {
        id: 'youtube',
        name: 'YouTube',
        description: 'Connect your YouTube channel for ad revenue tracking',
        category: 'creator_platform',
        isActive: true,
        setup_required: true
      },
      {
        id: 'twitch',
        name: 'Twitch',
        description: 'Track Twitch subscriptions, bits, and donations',
        category: 'creator_platform',
        isActive: true,
        setup_required: true
      },
      {
        id: 'patreon',
        name: 'Patreon',
        description: 'Monitor Patreon subscription income',
        category: 'creator_platform',
        isActive: true,
        setup_required: true
      },
      {
        id: 'substack',
        name: 'Substack',
        description: 'Track Substack newsletter revenue',
        category: 'creator_platform',
        isActive: true,
        setup_required: true
      }
    ];

    res.json(integrations);
  } catch (error) {
    console.error('Error fetching integrations:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Plaid Integration Routes

// Record interest in bank auto-connect (Plaid) while it's gated behind production access.
router.post('/plaid/waitlist', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.bankConnectWaitlist?.requested) {
      user.bankConnectWaitlist = { requested: true, requestedAt: new Date() };
      await user.save();
    }
    res.json({ bankConnectWaitlist: user.bankConnectWaitlist });
  } catch (error) {
    console.error('Error recording bank connect waitlist request:', error);
    res.status(500).json({ error: 'Failed to record request' });
  }
});

// Create Plaid link token
router.post('/plaid/link-token', auth, async (req, res) => {
  try {
    const linkToken = await PlaidService.createLinkToken(req.user.id);
    res.json({ linkToken });
  } catch (error) {
    console.error('Error creating Plaid link token:', error);
    res.status(500).json({ error: 'Failed to create link token' });
  }
});

// Create a Plaid Link token in "update mode" to re-authenticate an existing bank
// connection (e.g. after the bank requires a fresh login, surfaced via status:'error').
router.post('/plaid/link-token/update', auth, async (req, res) => {
  try {
    const { bankIntegrationId } = req.body;
    const bankIntegration = await BankIntegration.findOne({
      _id: bankIntegrationId,
      user: req.user.id,
      provider: 'plaid'
    });

    if (!bankIntegration) {
      return res.status(404).json({ error: 'Bank integration not found' });
    }

    const linkToken = await PlaidService.createUpdateLinkToken(req.user.id, bankIntegration.accessToken);
    res.json({ linkToken });
  } catch (error) {
    console.error('Error creating Plaid update link token:', error);
    res.status(500).json({ error: 'Failed to start reconnect' });
  }
});

// Map Plaid's account type/subtype to our Account schema's accountType enum
function mapPlaidAccountType(plaidType, plaidSubtype) {
  if (plaidSubtype === 'savings') return 'savings';
  if (plaidType === 'credit') return 'credit';
  if (plaidType === 'investment') return 'investment';
  return 'checking';
}

// Exchange public token for access token
router.post('/plaid/exchange-token', auth, async (req, res) => {
  try {
    const { publicToken } = req.body;

    if (!publicToken) {
      return res.status(400).json({ error: 'Public token is required' });
    }

    const { accessToken, itemId } = await PlaidService.exchangePublicToken(publicToken);
    const plaidAccounts = await PlaidService.getAccounts(accessToken);

    let institutionId = null;
    let institutionName = null;
    try {
      const itemStatus = await PlaidService.getItemStatus(accessToken);
      institutionId = itemStatus.institution_id;
      if (institutionId) {
        const institution = await PlaidService.getInstitution(institutionId);
        institutionName = institution.name;
      }
    } catch (lookupError) {
      // Non-fatal - institution name is cosmetic, the connection itself still works.
      console.error('Error looking up Plaid institution:', lookupError.message);
    }

    // Find-or-create + save (not findOneAndUpdate) - Mongoose's update-path casting
    // mishandles this array-of-subdocuments schema and throws "Cast to string failed"
    // on the whole accounts array; .save() casts the full document correctly instead.
    // itemId is the real dedup key - a re-connect for the same bank item must update
    // tokens/accounts, not create a duplicate integration.
    let bankIntegration = await BankIntegration.findOne({ user: req.user.id, provider: 'plaid', itemId });
    if (!bankIntegration) {
      bankIntegration = new BankIntegration({ user: req.user.id, provider: 'plaid', itemId });
    }
    bankIntegration.accessToken = accessToken;
    bankIntegration.institutionId = institutionId;
    bankIntegration.institutionName = institutionName;
    bankIntegration.accounts = plaidAccounts.map(a => ({
      accountId: a.id,
      name: a.name,
      accountType: a.type,
      accountSubtype: a.subtype,
      mask: a.mask,
      balances: { current: a.balance.current, available: a.balance.available, limit: a.balance.limit },
      isActive: true
    }));
    bankIntegration.status = 'connected';
    await bankIntegration.save();

    // Create a local Account per Plaid sub-account so synced transactions have
    // something real to attach to (Transaction.account is a required ref).
    for (const plaidAccount of plaidAccounts) {
      await Account.findOneAndUpdate(
        { user: req.user.id, accountId: plaidAccount.id },
        {
          user: req.user.id,
          accountId: plaidAccount.id,
          accountName: plaidAccount.name,
          accountType: mapPlaidAccountType(plaidAccount.type, plaidAccount.subtype),
          platform: 'plaid',
          institutionName,
          balance: {
            current: plaidAccount.balance.current,
            available: plaidAccount.balance.available,
            currency: plaidAccount.balance.currency
          },
          isActive: true
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    res.json({
      message: 'Bank connected successfully',
      accounts: plaidAccounts,
      integrationId: bankIntegration._id
    });
  } catch (error) {
    console.error('Error exchanging Plaid token:', error);
    res.status(500).json({ error: 'Failed to connect bank account' });
  }
});

// Get connected banks
router.get('/banks', auth, async (req, res) => {
  try {
    const banks = await BankIntegration.find({ 
      user: req.user.id,
      isActive: true 
    }).select('-accessToken');
    
    res.json(banks);
  } catch (error) {
    console.error('Error fetching banks:', error);
    res.status(500).json({ error: 'Failed to fetch connected banks' });
  }
});

// Pulls latest Plaid transactions for one bank integration and upserts them as real
// Transaction documents. Shared by the manual "Sync" button and the Plaid webhook
// handler below, so both paths behave identically.
async function syncPlaidBankTransactions(bankIntegration) {
  const plaidTransactions = await PlaidService.getTransactions(
    bankIntegration.accessToken,
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    new Date()
  );

  // Turn Plaid transactions into real Transaction documents, upserted by Plaid's own
  // transaction id so re-syncing overlapping days updates instead of duplicating -
  // otherwise this data never reaches Dashboard/Reports/Tax Center at all.
  let created = 0, updated = 0, skipped = 0;
  for (const txn of plaidTransactions) {
    const account = await Account.findOne({ user: bankIntegration.user, accountId: txn.account_id });
    if (!account) { skipped++; continue; }

    const existed = await Transaction.exists({ transactionId: txn.id });
    // Plaid convention: positive amount = money OUT (expense), negative = money IN (income) -
    // opposite of how amounts are stored elsewhere in this app (always positive + separate type).
    const type = txn.amount > 0 ? 'expense' : 'income';

    // Run the same rule-based/ML categorization used for manual + CSV transactions
    // instead of dumping Plaid's raw (differently-shaped) category taxonomy straight
    // into the schema - that's what fed the tax deduction math and Reports breakdown.
    const categorization = await CategorizationService.categorizeTransaction({
      description: txn.name,
      merchantName: txn.merchant_name,
      amount: txn.amount,
      type,
      categories: txn.category
    }, bankIntegration.user);

    await Transaction.findOneAndUpdate(
      { transactionId: txn.id },
      {
        user: bankIntegration.user,
        account: account._id,
        transactionId: txn.id,
        amount: Math.abs(txn.amount),
        description: txn.name,
        merchantName: txn.merchant_name,
        date: new Date(txn.date),
        type,
        category: categorization.category,
        businessClassification: categorization.businessClassification,
        taxDeductible: categorization.taxDeductible,
        isManual: false
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (existed) updated++; else created++;
  }

  bankIntegration.lastSyncAt = new Date();
  // A successful sync means the item is healthy again - clear any stale error status
  // (e.g. set by a prior ITEM/ERROR webhook) so the UI stops prompting to reconnect.
  bankIntegration.status = 'connected';
  bankIntegration.errorMessage = undefined;
  await bankIntegration.save();

  return {
    transactionCount: plaidTransactions.length,
    transactionsSynced: { created, updated, skipped },
    transactions: plaidTransactions
  };
}

// Sync bank transactions
router.post('/banks/:id/sync', auth, async (req, res) => {
  try {
    const bankIntegration = await BankIntegration.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!bankIntegration) {
      return res.status(404).json({ error: 'Bank integration not found' });
    }

    if (bankIntegration.provider === 'plaid') {
      const result = await syncPlaidBankTransactions(bankIntegration);

      res.json({
        message: 'Sync completed',
        transactionCount: result.transactionCount,
        transactionsSynced: result.transactionsSynced,
        transactions: result.transactions.slice(0, 10) // Return first 10 for preview
      });
    } else {
      res.status(400).json({ error: 'Unsupported provider for sync' });
    }
  } catch (error) {
    console.error('Error syncing bank transactions:', error);
    res.status(500).json({ error: 'Failed to sync transactions' });
  }
});

// Plaid webhook - called directly by Plaid's servers, not the frontend, so there's no
// auth header to check. The item_id in the payload is how we find the right integration.
// Always responds 200 (even on internal errors) since a non-2xx makes Plaid retry the
// same webhook repeatedly.
router.post('/plaid/webhook', async (req, res) => {
  try {
    const { webhook_type, webhook_code, item_id, error: webhookError } = req.body;
    console.log(`Plaid webhook received: ${webhook_type}/${webhook_code} for item ${item_id}`);

    const bankIntegration = await BankIntegration.findOne({ provider: 'plaid', itemId: item_id });
    if (!bankIntegration) {
      console.warn(`Plaid webhook for unknown item ${item_id} - no matching BankIntegration`);
      return res.status(200).json({ received: true });
    }

    if (webhook_type === 'TRANSACTIONS' &&
        ['INITIAL_UPDATE', 'HISTORICAL_UPDATE', 'DEFAULT_UPDATE', 'SYNC_UPDATES_AVAILABLE'].includes(webhook_code)) {
      await syncPlaidBankTransactions(bankIntegration);
    } else if (webhook_type === 'ITEM' && (webhook_code === 'ERROR' || webhook_code === 'PENDING_EXPIRATION')) {
      // Most commonly ITEM_LOGIN_REQUIRED - the user needs to go through Plaid Link's
      // "update mode" to re-authenticate. Surface it so the UI can prompt for that.
      bankIntegration.status = 'error';
      bankIntegration.errorMessage = webhookError?.error_message
        || (webhook_code === 'PENDING_EXPIRATION' ? 'Access to this bank is expiring soon - please reconnect.' : 'Plaid reported an error with this connection - please reconnect.');
      await bankIntegration.save();
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error handling Plaid webhook:', error);
    res.status(200).json({ received: true });
  }
});

// CSV Import Routes

// Upload and import CSV
router.post('/csv/upload', auth, upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'CSV file is required' });
    }
    
    const { bankName, accountType, dateFormat } = req.body;
    
    const result = await CSVImportService.importBankStatement(
      req.file.path,
      req.user.id,
      {
        bankName,
        accountType,
        dateFormat
      }
    );
    
    // Clean up uploaded file
    const fs = require('fs');
    fs.unlinkSync(req.file.path);
    
    res.json(result);
  } catch (error) {
    console.error('Error importing CSV:', error);
    res.status(500).json({ error: 'Failed to import CSV file' });
  }
});

// Get supported CSV formats
router.get('/csv/formats', auth, (req, res) => {
  const formats = CSVImportService.getSupportedFormats();
  res.json(formats);
});

// Platform Integration Routes

// Connect YouTube
router.post('/platforms/youtube/connect', auth, async (req, res) => {
  try {
    const authUrl = await PlatformIntegrationService.getYouTubeAuthUrl(req.user.id);
    res.json({ authUrl });
  } catch (error) {
    console.error('Error creating YouTube auth URL:', error);
    res.status(500).json({ error: 'Failed to create YouTube authorization URL' });
  }
});

// YouTube OAuth callback
router.post('/platforms/youtube/callback', auth, async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }
    
    const integration = await PlatformIntegrationService.handleYouTubeCallback(code, req.user.id);
    
    res.json({
      message: 'YouTube connected successfully',
      integration: {
        id: integration._id,
        platform: integration.platform,
        channelName: integration.channelName,
        status: integration.status
      }
    });
  } catch (error) {
    console.error('Error handling YouTube callback:', error);
    res.status(500).json({ error: 'Failed to connect YouTube account' });
  }
});

// Connect Twitch
router.post('/platforms/twitch/connect', auth, async (req, res) => {
  try {
    const authUrl = await PlatformIntegrationService.getTwitchAuthUrl(req.user.id);
    res.json({ authUrl });
  } catch (error) {
    console.error('Error creating Twitch auth URL:', error);
    res.status(500).json({ error: 'Failed to create Twitch authorization URL' });
  }
});

// Twitch OAuth callback
router.post('/platforms/twitch/callback', auth, async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }
    
    const integration = await PlatformIntegrationService.handleTwitchCallback(code, req.user.id);
    
    res.json({
      message: 'Twitch connected successfully',
      integration: {
        id: integration._id,
        platform: integration.platform,
        channelName: integration.channelName,
        status: integration.status
      }
    });
  } catch (error) {
    console.error('Error handling Twitch callback:', error);
    res.status(500).json({ error: 'Failed to connect Twitch account' });
  }
});

// Connect Patreon
router.post('/platforms/patreon/connect', auth, async (req, res) => {
  try {
    const authUrl = await PlatformIntegrationService.getPatreonAuthUrl(req.user.id);
    res.json({ authUrl });
  } catch (error) {
    console.error('Error creating Patreon auth URL:', error);
    res.status(500).json({ error: 'Failed to create Patreon authorization URL' });
  }
});

// Patreon OAuth callback
router.post('/platforms/patreon/callback', auth, async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }
    
    const integration = await PlatformIntegrationService.handlePatreonCallback(code, req.user.id);
    
    res.json({
      message: 'Patreon connected successfully',
      integration: {
        id: integration._id,
        platform: integration.platform,
        channelName: integration.channelName,
        status: integration.status
      }
    });
  } catch (error) {
    console.error('Error handling Patreon callback:', error);
    res.status(500).json({ error: 'Failed to connect Patreon account' });
  }
});

// Get connected platforms
router.get('/platforms', auth, async (req, res) => {
  try {
    const platforms = await PlatformIntegration.find({ 
      user: req.user.id,
      isActive: true 
    }).select('-accessToken -refreshToken');
    
    res.json(platforms);
  } catch (error) {
    console.error('Error fetching platforms:', error);
    res.status(500).json({ error: 'Failed to fetch connected platforms' });
  }
});

// Sync platform data
router.post('/platforms/:id/sync', auth, async (req, res) => {
  try {
    const platform = await PlatformIntegration.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!platform) {
      return res.status(404).json({ error: 'Platform integration not found' });
    }
    
    let revenueData;
    
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
 switch (platform.platform) {
      case 'youtube':
        revenueData = await PlatformIntegrationService.getYouTubeRevenue(
          platform.accessToken, 
          platform.refreshToken,
          startDate, 
          endDate
        );
        break;
      case 'twitch':
        revenueData = await PlatformIntegrationService.getTwitchRevenue(platform.accessToken, startDate, endDate);
        break;
      case 'patreon':
        revenueData = await PlatformIntegrationService.getPatreonRevenue(platform.accessToken);
        break;
      default:
        return res.status(400).json({ error: 'Unsupported platform' });
    }
    
    // Update platform with new revenue data
    platform.revenueData.push(revenueData);
    platform.lastSyncAt = new Date();
    await platform.save();

    // Turn synced revenue into real Transactions so it actually flows into the
    // Dashboard/Reports/Tax Center - otherwise it just sits in this record, invisible
    // everywhere else in the app.
    let transactionsSynced = { created: 0, updated: 0 };
    if (platform.platform === 'youtube' && revenueData.dailyBreakdown?.length) {
      const account = await getOrCreatePlatformAccount(req.user.id, 'youtube', revenueData.channelName);
      transactionsSynced = await upsertDailyRevenueTransactions(req.user.id, 'youtube', account, revenueData.dailyBreakdown);
    }

    res.json({
      message: 'Platform data synced successfully',
      revenueData,
      transactionsSynced
    });
  } catch (error) {
    console.error('Error syncing platform data:', error);
    res.status(500).json({ error: 'Failed to sync platform data' });
  }
});

// Disconnect integration
router.delete('/banks/:id', auth, async (req, res) => {
  try {
    const bankIntegration = await BankIntegration.findOne({ _id: req.params.id, user: req.user.id });
    if (!bankIntegration) {
      return res.status(404).json({ error: 'Bank integration not found' });
    }

    if (bankIntegration.provider === 'plaid' && bankIntegration.accessToken) {
      try {
        // Revoke the token at Plaid too - otherwise the Item stays live (and billable)
        // on Plaid's side forever after a user "disconnects" in the app.
        await PlaidService.removeItem(bankIntegration.accessToken);
      } catch (removeError) {
        // Already-revoked/invalid tokens shouldn't block the user from disconnecting
        // locally - log it and continue.
        console.error('Error removing Plaid item during disconnect:', removeError.message);
      }
    }

    bankIntegration.isActive = false;
    bankIntegration.status = 'disconnected';
    await bankIntegration.save();

    res.json({ message: 'Bank disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting bank:', error);
    res.status(500).json({ error: 'Failed to disconnect bank' });
  }
});

router.delete('/platforms/:id', auth, async (req, res) => {
  try {
    await PlatformIntegration.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { isActive: false, status: 'disconnected' }
    );
    
    res.json({ message: 'Platform disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting platform:', error);
    res.status(500).json({ error: 'Failed to disconnect platform' });
  }
});

// Substack Integration Routes

// Get Substack export instructions
router.get('/platforms/substack/instructions', auth, (req, res) => {
  try {
    const instructions = SubstackService.getExportInstructions();
    res.json(instructions);
  } catch (error) {
    console.error('Error getting Substack instructions:', error);
    res.status(500).json({ error: 'Failed to get export instructions' });
  }
});

// Connect Substack via CSV upload
router.post('/platforms/substack/csv', auth, upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'CSV file is required' });
    }
    
    const { publicationName } = req.body;
    
    if (!publicationName) {
      return res.status(400).json({ error: 'Publication name is required' });
    }
    
    const integration = await SubstackService.connectViaCSV(
      req.user.id,
      req.file.path,
      publicationName
    );
    
    // Clean up uploaded file
    const fs = require('fs');
    fs.unlinkSync(req.file.path);
    
    res.json({
      message: 'Substack connected successfully via CSV',
      integration: {
        id: integration._id,
        platform: integration.platform,
        publicationName: integration.channelName,
        subscriberCount: integration.platformData.totalSubscribers,
        paidSubscribers: integration.platformData.paidSubscribers,
        status: integration.status
      }
    });
  } catch (error) {
    console.error('Error connecting Substack via CSV:', error);
    res.status(500).json({ error: 'Failed to connect Substack account' });
  }
});

// Add manual Substack revenue entry
router.post('/platforms/substack/manual', auth, async (req, res) => {
  try {
    const { publicationName, revenueData } = req.body;
    
    if (!publicationName || !revenueData) {
      return res.status(400).json({ error: 'Publication name and revenue data are required' });
    }
    
    const result = await SubstackService.addManualRevenue(
      req.user.id,
      publicationName,
      revenueData
    );
    
    res.json({
      message: 'Revenue data added successfully',
      revenueData: result
    });
  } catch (error) {
    console.error('Error adding manual Substack revenue:', error);
    res.status(500).json({ error: 'Failed to add revenue data' });
  }
});

// Get Substack revenue summary
router.get('/platforms/substack/:publicationName/summary', auth, async (req, res) => {
  try {
    const { publicationName } = req.params;
    const { startDate, endDate } = req.query;
    
    // Default to last 30 days if no date range provided
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    const summary = await SubstackService.getRevenueSummary(
      req.user.id,
      publicationName,
      start,
      end
    );
    
    res.json(summary);
  } catch (error) {
    console.error('Error getting Substack summary:', error);
    res.status(500).json({ error: 'Failed to get revenue summary' });
  }
});

// Get integration summary
router.get('/summary', auth, async (req, res) => {
  try {
    const banks = await BankIntegration.countDocuments({ 
      user: req.user.id, 
      isActive: true 
    });
    
    const platforms = await PlatformIntegration.countDocuments({ 
      user: req.user.id, 
      isActive: true 
    });
    
    // Get recent revenue data across all platforms
    const recentRevenue = await PlatformIntegration.aggregate([
      { $match: { user: req.user.id, isActive: true } },
      { $unwind: '$revenueData' },
      { $sort: { 'revenueData.date': -1 } },
      { $limit: 30 },
      { $group: {
        _id: null,
        totalRevenue: { $sum: '$revenueData.totalRevenue' },
        platforms: { $addToSet: '$platform' }
      }}
    ]);
    
    res.json({
      connectedBanks: banks,
      connectedPlatforms: platforms,
      recentRevenue: recentRevenue[0] || { totalRevenue: 0, platforms: [] }
    });
  } catch (error) {
    console.error('Error fetching integration summary:', error);
    res.status(500).json({ error: 'Failed to fetch integration summary' });
  }
});

module.exports = router;
