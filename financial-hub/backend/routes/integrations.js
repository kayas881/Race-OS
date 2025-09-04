const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const PlaidService = require('../services/PlaidService');
const PlatformIntegrationService = require('../services/PlatformIntegrationService');
const CSVImportService = require('../services/CSVImportService');
const SubstackService = require('../services/SubstackService');
const BankIntegration = require('../models/BankIntegration');
const PlatformIntegration = require('../models/PlatformIntegration');
const multer = require('multer');

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
        setup_required: false
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

// Exchange public token for access token
router.post('/plaid/exchange-token', auth, async (req, res) => {
  try {
    const { publicToken, institutionId, accountIds } = req.body;
    
    if (!publicToken) {
      return res.status(400).json({ error: 'Public token is required' });
    }

    const accessToken = await PlaidService.exchangePublicToken(publicToken);
    
    // Store bank integration
    const bankIntegration = new BankIntegration({
      user: req.user.id,
      provider: 'plaid',
      institutionId,
      accessToken,
      accountIds: accountIds || [],
      status: 'connected'
    });
    
    await bankIntegration.save();
    
    // Fetch initial account data
    const accounts = await PlaidService.getAccounts(accessToken);
    
    res.json({ 
      message: 'Bank connected successfully',
      accounts,
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
      const transactions = await PlaidService.getTransactions(
        bankIntegration.accessToken,
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        new Date()
      );
      
      // Update last sync time
      bankIntegration.lastSyncAt = new Date();
      await bankIntegration.save();
      
      res.json({ 
        message: 'Sync completed',
        transactionCount: transactions.length,
        transactions: transactions.slice(0, 10) // Return first 10 for preview
      });
    } else {
      res.status(400).json({ error: 'Unsupported provider for sync' });
    }
  } catch (error) {
    console.error('Error syncing bank transactions:', error);
    res.status(500).json({ error: 'Failed to sync transactions' });
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
    
    // Calculate date range (last 30 days)
    const endDate = new Date().toISOString().split('T')[0]; // Today in YYYY-MM-DD format
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days ago
    
    switch (platform.platform) {
      case 'youtube':
        revenueData = await PlatformIntegrationService.getYouTubeRevenue(platform.accessToken, startDate, endDate);
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
    
    res.json({
      message: 'Platform data synced successfully',
      revenueData
    });
  } catch (error) {
    console.error('Error syncing platform data:', error);
    res.status(500).json({ error: 'Failed to sync platform data' });
  }
});

// Disconnect integration
router.delete('/banks/:id', auth, async (req, res) => {
  try {
    await BankIntegration.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { isActive: false, status: 'disconnected' }
    );
    
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
