const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const BankIntegration = require('../models/BankIntegration');
const PlatformIntegration = require('../models/PlatformIntegration');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');

// Mock data for testing integrations
const mockIntegrationData = {
  banks: [
    {
      _id: 'mock_bank_1',
      institutionName: 'Demo Bank',
      accountIds: ['acc_1', 'acc_2'],
      status: 'connected',
      lastSyncAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      provider: 'plaid'
    },
    {
      _id: 'mock_bank_2',
      institutionName: 'Test Credit Union',
      accountIds: ['acc_3'],
      status: 'error',
      lastSyncAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      provider: 'plaid',
      errorMessage: 'Authentication required'
    }
  ],
  platforms: [
    {
      _id: 'mock_platform_1',
      platform: 'youtube',
      channelName: 'Demo Tech Channel',
      platformUsername: 'demotech',
      status: 'connected',
      lastSyncAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      platformData: {
        subscriberCount: 15420,
        videoCount: 87,
        totalViews: 1250000
      },
      revenueData: [
        {
          date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          totalRevenue: 2450.30,
          adRevenue: 2100.50,
          membershipRevenue: 349.80,
          currency: 'USD'
        }
      ]
    },
    {
      _id: 'mock_platform_2',
      platform: 'twitch',
      channelName: 'DemoGamer',
      platformUsername: 'demogamer123',
      status: 'connected',
      lastSyncAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      platformData: {
        followerCount: 8750,
        totalBits: 125000,
        subscriberTier: 'Partner'
      },
      revenueData: [
        {
          date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          totalRevenue: 1820.75,
          subscriptionRevenue: 1200.00,
          donationRevenue: 420.75,
          adRevenue: 200.00,
          currency: 'USD'
        }
      ]
    }
  ]
};

// Get actual stored integrations or return mock data
router.get('/test/banks', auth, async (req, res) => {
  try {
    // Try to get real data first
    let banks = await BankIntegration.find({ 
      user: req.user.id,
      isActive: true 
    }).select('-accessToken');
    
    // If no real data, add mock data to database
    if (banks.length === 0) {
      for (const mockBank of mockIntegrationData.banks) {
        const existingBank = await BankIntegration.findOne({
          user: req.user.id,
          institutionName: mockBank.institutionName
        });
        
        if (!existingBank) {
          const bankIntegration = new BankIntegration({
            user: req.user.id,
            provider: mockBank.provider,
            institutionName: mockBank.institutionName,
            accountIds: mockBank.accountIds,
            status: mockBank.status,
            lastSyncAt: mockBank.lastSyncAt,
            errorMessage: mockBank.errorMessage,
            isActive: true
          });
          await bankIntegration.save();
        }
      }
      
      // Fetch again after adding mock data
      banks = await BankIntegration.find({ 
        user: req.user.id,
        isActive: true 
      }).select('-accessToken');
    }
    
    res.json(banks);
  } catch (error) {
    console.error('Error fetching banks:', error);
    res.status(500).json({ error: 'Failed to fetch banks' });
  }
});

router.get('/test/platforms', auth, async (req, res) => {
  try {
    // Try to get real data first
    let platforms = await PlatformIntegration.find({ 
      user: req.user.id,
      isActive: true 
    }).select('-accessToken -refreshToken');
    
    // If no real data, add mock data to database
    if (platforms.length === 0) {
      for (const mockPlatform of mockIntegrationData.platforms) {
        const existingPlatform = await PlatformIntegration.findOne({
          user: req.user.id,
          platform: mockPlatform.platform
        });
        
        if (!existingPlatform) {
          const platformIntegration = new PlatformIntegration({
            user: req.user.id,
            platform: mockPlatform.platform,
            accessToken: 'demo_token_' + mockPlatform.platform,
            channelName: mockPlatform.channelName,
            platformUsername: mockPlatform.platformUsername,
            status: mockPlatform.status,
            lastSyncAt: mockPlatform.lastSyncAt,
            platformData: mockPlatform.platformData,
            revenueData: mockPlatform.revenueData,
            isActive: true
          });
          await platformIntegration.save();
        }
      }
      
      // Fetch again after adding mock data
      platforms = await PlatformIntegration.find({ 
        user: req.user.id,
        isActive: true 
      }).select('-accessToken -refreshToken');
    }
    
    res.json(platforms);
  } catch (error) {
    console.error('Error fetching platforms:', error);
    res.status(500).json({ error: 'Failed to fetch platforms' });
  }
});

router.get('/test/summary', auth, async (req, res) => {
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
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// Mock sync endpoint
router.post('/test/:type/:id/sync', auth, (req, res) => {
  const { type, id } = req.params;
  
  // Simulate sync delay
  setTimeout(() => {
    if (type === 'banks') {
      res.json({
        message: 'Bank sync completed successfully',
        transactionCount: Math.floor(Math.random() * 50) + 10,
        transactions: [
          {
            id: 'tx_' + Date.now(),
            date: new Date().toISOString(),
            description: 'Demo Transaction',
            amount: 125.50,
            type: 'debit'
          }
        ]
      });
    } else if (type === 'platforms') {
      res.json({
        message: 'Platform sync completed successfully',
        revenueData: {
          date: new Date(),
          totalRevenue: Math.floor(Math.random() * 1000) + 500,
          adRevenue: Math.floor(Math.random() * 800) + 300,
          currency: 'USD'
        }
      });
    } else {
      res.status(400).json({ error: 'Invalid sync type' });
    }
  }, 1000); // 1 second delay to simulate real API call
});

// Mock connection endpoints
router.post('/test/plaid/link-token', auth, (req, res) => {
  res.json({
    linkToken: 'link-sandbox-test-token-' + Date.now()
  });
});

router.post('/test/plaid/exchange-token', auth, async (req, res) => {
  try {
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Create actual bank integration in database
    const bankIntegration = new BankIntegration({
      user: req.user.id,
      provider: 'plaid',
      institutionName: 'New Demo Bank',
      institutionId: 'demo_institution_' + Date.now(),
      itemId: 'demo_item_' + Date.now(),
      accessToken: 'demo_access_token_' + Date.now(),
      accountIds: ['demo_acc_' + Date.now()],
      status: 'connected',
      lastSyncAt: new Date(),
      isActive: true
    });
    
    await bankIntegration.save();
    
    // Create a demo account
    const account = new Account({
      user: req.user.id,
      accountName: 'Demo Checking Account',
      accountType: 'checking',
      platform: 'plaid',
      accountId: 'demo_acc_' + Date.now(),
      balance: {
        current: 2450.30,
        available: 2450.30
      },
      currency: 'USD',
      bankName: 'New Demo Bank',
      isActive: true
    });
    
    await account.save();
    
    res.json({
      message: 'Bank connected successfully',
      accounts: [{
        id: account._id,
        name: 'Demo Checking Account',
        type: 'depository',
        subtype: 'checking',
        mask: '0000',
        balance: {
          available: 2450.30,
          current: 2450.30,
          currency: 'USD'
        }
      }],
      integrationId: bankIntegration._id
    });
  } catch (error) {
    console.error('Error creating bank integration:', error);
    res.status(500).json({ error: 'Failed to connect bank' });
  }
});

router.post('/test/platforms/:platform/connect', auth, (req, res) => {
  const { platform } = req.params;
  
  const authUrls = {
    youtube: 'https://accounts.google.com/oauth/authorize?client_id=demo&redirect_uri=http://localhost:3002&scope=youtube.readonly',
    twitch: 'https://id.twitch.tv/oauth2/authorize?client_id=demo&redirect_uri=http://localhost:3002&scope=channel:read:subscriptions',
    patreon: 'https://www.patreon.com/oauth2/authorize?client_id=demo&redirect_uri=http://localhost:3002&scope=identity'
  };

  res.json({
    authUrl: authUrls[platform] || 'https://example.com/oauth'
  });
});

router.post('/test/platforms/:platform/callback', auth, async (req, res) => {
  try {
    const { platform } = req.params;
    
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create actual platform integration in database
    const platformData = {
      youtube: {
        channelName: 'New Demo Tech Channel',
        platformUsername: 'nemdemotech',
        platformData: {
          subscriberCount: Math.floor(Math.random() * 50000) + 10000,
          videoCount: Math.floor(Math.random() * 200) + 50,
          totalViews: Math.floor(Math.random() * 2000000) + 500000
        },
        revenueData: [{
          date: new Date(),
          totalRevenue: Math.floor(Math.random() * 3000) + 1000,
          adRevenue: Math.floor(Math.random() * 2500) + 800,
          membershipRevenue: Math.floor(Math.random() * 500) + 100,
          currency: 'USD'
        }]
      },
      twitch: {
        channelName: 'New DemoGamer',
        platformUsername: 'newdemogamer',
        platformData: {
          followerCount: Math.floor(Math.random() * 20000) + 5000,
          totalBits: Math.floor(Math.random() * 200000) + 50000,
          subscriberTier: 'Partner'
        },
        revenueData: [{
          date: new Date(),
          totalRevenue: Math.floor(Math.random() * 2500) + 800,
          subscriptionRevenue: Math.floor(Math.random() * 1500) + 600,
          donationRevenue: Math.floor(Math.random() * 800) + 200,
          adRevenue: Math.floor(Math.random() * 300) + 100,
          currency: 'USD'
        }]
      },
      patreon: {
        channelName: 'New Demo Creator',
        platformUsername: 'newdemocreator',
        platformData: {
          patronCount: Math.floor(Math.random() * 500) + 100,
          pledgeSum: Math.floor(Math.random() * 5000) + 1000,
          campaignId: 'demo_campaign_' + Date.now()
        },
        revenueData: [{
          date: new Date(),
          totalRevenue: Math.floor(Math.random() * 2000) + 500,
          subscriptionRevenue: Math.floor(Math.random() * 2000) + 500,
          currency: 'USD'
        }]
      }
    };
    
    const data = platformData[platform];
    if (!data) {
      return res.status(400).json({ error: 'Unsupported platform' });
    }
    
    const platformIntegration = new PlatformIntegration({
      user: req.user.id,
      platform,
      accessToken: 'demo_token_' + platform + '_' + Date.now(),
      channelName: data.channelName,
      platformUsername: data.platformUsername,
      status: 'connected',
      lastSyncAt: new Date(),
      platformData: data.platformData,
      revenueData: data.revenueData,
      isActive: true
    });
    
    await platformIntegration.save();
    
    res.json({
      message: `${platform.charAt(0).toUpperCase() + platform.slice(1)} connected successfully`,
      integration: {
        id: platformIntegration._id,
        platform,
        channelName: data.channelName,
        status: 'connected'
      }
    });
  } catch (error) {
    console.error('Error creating platform integration:', error);
    res.status(500).json({ error: 'Failed to connect platform' });
  }
});

// Mock CSV upload - actually process and save data
router.post('/test/csv/upload', auth, async (req, res) => {
  try {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Create demo account for CSV import
    let account = await Account.findOne({
      user: req.user.id,
      accountName: 'CSV Import Account'
    });
    
    if (!account) {
      account = new Account({
        user: req.user.id,
        accountName: 'CSV Import Account',
        accountType: 'checking',
        platform: 'csv_import',
        accountId: 'csv_import_' + Date.now(),
        balance: {
          current: 14049.54,
          available: 14049.54
        },
        currency: 'USD',
        bankName: 'CSV Import',
        isActive: true
      });
      await account.save();
    }
    
    // Sample transactions from the CSV
    const csvTransactions = [
      { date: '2025-08-01', description: 'Salary Credit', amount: 5000.00, type: 'credit' },
      { date: '2025-08-02', description: 'Grocery Store', amount: 125.50, type: 'debit' },
      { date: '2025-08-03', description: 'Gas Station', amount: 45.75, type: 'debit' },
      { date: '2025-08-04', description: 'Coffee Shop', amount: 8.25, type: 'debit' },
      { date: '2025-08-05', description: 'Online Purchase', amount: 89.99, type: 'debit' },
      { date: '2025-08-06', description: 'ATM Withdrawal', amount: 100.00, type: 'debit' },
      { date: '2025-08-07', description: 'Rent Payment', amount: 1200.00, type: 'debit' },
      { date: '2025-08-08', description: 'Freelance Income', amount: 750.00, type: 'credit' },
      { date: '2025-08-09', description: 'Electricity Bill', amount: 85.30, type: 'debit' },
      { date: '2025-08-10', description: 'Restaurant Dinner', amount: 45.67, type: 'debit' }
    ];
    
    let imported = 0;
    let skipped = 0;
    
    for (const txnData of csvTransactions) {
      // Check if transaction already exists
      const existingTxn = await Transaction.findOne({
        user: req.user.id,
        account: account._id,
        date: new Date(txnData.date),
        amount: txnData.amount,
        description: txnData.description
      });
      
      if (existingTxn) {
        skipped++;
        continue;
      }
      
      // Create new transaction
      const transaction = new Transaction({
        user: req.user.id,
        account: account._id,
        date: new Date(txnData.date),
        description: txnData.description,
        amount: txnData.amount,
        type: txnData.type,
        category: categorizeTransaction(txnData.description),
        currency: 'USD',
        source: 'csv_import',
        metadata: {
          importDate: new Date(),
          originalDescription: txnData.description
        }
      });
      
      await transaction.save();
      imported++;
    }
    
    // Update account balance
    account.balance = {
      current: 14049.54,
      available: 14049.54
    };
    account.lastUpdated = new Date();
    await account.save();
    
    res.json({
      success: true,
      imported,
      skipped,
      errors: [],
      accountId: account._id,
      format: 'Generic CSV Format'
    });
    
  } catch (error) {
    console.error('Error uploading CSV:', error);
    res.status(500).json({ error: 'Failed to process CSV file' });
  }
});

// Helper function for categorization
function categorizeTransaction(description) {
  const desc = description.toLowerCase();
  
  if (desc.includes('salary') || desc.includes('freelance')) return 'income';
  if (desc.includes('grocery') || desc.includes('store')) return 'groceries';
  if (desc.includes('gas') || desc.includes('fuel')) return 'transportation';
  if (desc.includes('restaurant') || desc.includes('coffee') || desc.includes('dinner')) return 'dining';
  if (desc.includes('atm') || desc.includes('withdrawal')) return 'cash';
  if (desc.includes('rent') || desc.includes('payment')) return 'housing';
  if (desc.includes('electricity') || desc.includes('bill')) return 'bills';
  if (desc.includes('online') || desc.includes('purchase')) return 'shopping';
  
  return 'other';
}

router.get('/test/csv/formats', auth, (req, res) => {
  res.json([
    {
      id: 'sbi',
      name: 'State Bank of India',
      country: 'IN',
      currency: 'INR'
    },
    {
      id: 'chase',
      name: 'Chase Bank',
      country: 'US',
      currency: 'USD'
    },
    {
      id: 'hdfc',
      name: 'HDFC Bank',
      country: 'IN',
      currency: 'INR'
    },
    {
      id: 'generic',
      name: 'Generic CSV Format',
      country: 'GLOBAL',
      currency: 'USD'
    }
  ]);
});

// Mock disconnect - actually remove from database
router.delete('/test/:type/:id', auth, async (req, res) => {
  try {
    const { type, id } = req.params;
    
    if (type === 'banks') {
      await BankIntegration.findOneAndUpdate(
        { _id: id, user: req.user.id },
        { isActive: false, status: 'disconnected' }
      );
      res.json({ message: 'Bank disconnected successfully' });
    } else if (type === 'platforms') {
      await PlatformIntegration.findOneAndUpdate(
        { _id: id, user: req.user.id },
        { isActive: false, status: 'disconnected' }
      );
      res.json({ message: 'Platform disconnected successfully' });
    } else {
      res.status(400).json({ error: 'Invalid type' });
    }
  } catch (error) {
    console.error('Error disconnecting:', error);
    res.status(500).json({ error: 'Failed to disconnect integration' });
  }
});

module.exports = router;
