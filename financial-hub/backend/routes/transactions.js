const express = require('express');
const mongoose = require('mongoose');
const { PlaidApi, Configuration, PlaidEnvironments } = require('plaid');
const { body, validationResult } = require('express-validator');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const auth = require('../middleware/auth');
const categorizationService = require('../services/categorization');

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

// @route   GET /api/transactions
// @desc    Get user transactions
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      startDate, 
      endDate, 
      category, 
      type, 
      accountId,
      businessOnly,
      deductibleOnly 
    } = req.query;

    // Build query
    let query = { user: req.user.id };
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    if (category) query['category.primary'] = category;
    if (type) query.type = type;
    if (accountId) query.account = accountId;
    if (businessOnly === 'true') query.businessClassification = 'business';
    if (deductibleOnly === 'true') query['taxDeductible.isDeductible'] = true;

    const transactions = await Transaction.find(query)
      .populate('account', 'accountName platform')
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Transaction.countDocuments(query);

    res.json({
      transactions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/transactions/sync/:accountId
// @desc    Sync transactions for an account
// @access  Private
router.post('/sync/:accountId', auth, async (req, res) => {
  try {
    const account = await Account.findOne({ 
      _id: req.params.accountId, 
      user: req.user.id 
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    let newTransactions = [];

    if (account.platform === 'plaid') {
      // Sync Plaid transactions
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // Last 30 days

      const request = {
        access_token: account.credentials.accessToken,
        start_date: startDate.toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        account_ids: [account.accountId]
      };

      const response = await plaidClient.transactionsGet(request);
      const plaidTransactions = response.data.transactions;

      for (const plaidTxn of plaidTransactions) {
        // Check if transaction already exists
        const existingTxn = await Transaction.findOne({ 
          transactionId: plaidTxn.transaction_id 
        });

        if (!existingTxn) {
          // Categorize transaction
          const categorization = await categorizationService.categorizeTransaction({
            description: plaidTxn.name,
            merchantName: plaidTxn.merchant_name,
            amount: plaidTxn.amount,
            categories: plaidTxn.category
          });

          const transaction = new Transaction({
            user: req.user.id,
            account: account._id,
            transactionId: plaidTxn.transaction_id,
            amount: Math.abs(plaidTxn.amount),
            description: plaidTxn.name,
            merchantName: plaidTxn.merchant_name,
            date: new Date(plaidTxn.date),
            type: plaidTxn.amount > 0 ? 'expense' : 'income',
            category: categorization.category,
            businessClassification: categorization.businessClassification,
            taxDeductible: categorization.taxDeductible
          });

          await transaction.save();
          newTransactions.push(transaction);
        }
      }
    }

    // Update account sync status
    account.lastSynced = new Date();
    account.syncStatus = 'connected';
    await account.save();

    res.json({ 
      success: true, 
      newTransactions: newTransactions.length,
      transactions: newTransactions 
    });
  } catch (error) {
    console.error('Error syncing transactions:', error);
    res.status(500).json({ error: 'Failed to sync transactions' });
  }
});

// @route   POST /api/transactions/manual
// @desc    Add manual transaction
// @access  Private
router.post('/manual', auth, [
  body('accountId').notEmpty(),
  body('amount').isNumeric(),
  body('description').notEmpty().trim(),
  body('date').isISO8601(),
  body('type').isIn(['income', 'expense', 'transfer'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      accountId, 
      amount, 
      description, 
      merchantName, 
      date, 
      type, 
      category,
      tags,
      notes 
    } = req.body;

    // Verify account ownership
    const account = await Account.findOne({ 
      _id: accountId, 
      user: req.user.id 
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Auto-categorize if not provided
    let finalCategory = category;
    let businessClassification = 'unknown';
    let taxDeductible = { isDeductible: false };

    if (!category) {
      const categorization = await categorizationService.categorizeTransaction({
        description,
        merchantName,
        amount: parseFloat(amount),
        type
      });
      finalCategory = categorization.category;
      businessClassification = categorization.businessClassification;
      taxDeductible = categorization.taxDeductible;
    }

    const transaction = new Transaction({
      user: req.user.id,
      account: accountId,
      transactionId: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: parseFloat(amount),
      description,
      merchantName,
      date: new Date(date),
      type,
      category: finalCategory,
      businessClassification,
      taxDeductible,
      tags: tags || [],
      notes,
      isManual: true
    });

    await transaction.save();
    
    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('account', 'accountName platform');

    res.json(populatedTransaction);
  } catch (error) {
    console.error('Error creating manual transaction:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/transactions/:id
// @desc    Update transaction
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const updateFields = [
      'description', 'merchantName', 'category', 'businessClassification', 
      'taxDeductible', 'tags', 'notes', 'isReviewed'
    ];

    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'category' || field === 'taxDeductible') {
          transaction[field] = { ...transaction[field].toObject(), ...req.body[field] };
        } else {
          transaction[field] = req.body[field];
        }
      }
    });

    if (req.body.isReviewed) {
      transaction.reviewedAt = new Date();
      transaction.reviewedBy = req.user.id;
    }

    await transaction.save();
    
    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('account', 'accountName platform');

    res.json(populatedTransaction);
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/transactions/:id
// @desc    Delete transaction
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Only allow deletion of manual transactions
    if (!transaction.isManual) {
      return res.status(400).json({ error: 'Cannot delete synced transactions' });
    }

    await Transaction.findByIdAndDelete(req.params.id);
    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/transactions/:id/categorize
// @desc    Re-categorize transaction
// @access  Private
router.post('/:id/categorize', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const categorization = await categorizationService.categorizeTransaction({
      description: transaction.description,
      merchantName: transaction.merchantName,
      amount: transaction.amount,
      type: transaction.type
    });

    transaction.category = categorization.category;
    transaction.businessClassification = categorization.businessClassification;
    transaction.taxDeductible = categorization.taxDeductible;

    await transaction.save();
    
    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('account', 'accountName platform');

    res.json(populatedTransaction);
  } catch (error) {
    console.error('Error re-categorizing transaction:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/transactions/analytics
// @desc    Get transaction analytics
// @access  Private
router.get('/analytics', auth, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    let startDate = new Date();
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (period === 'quarter') {
      startDate.setMonth(startDate.getMonth() - 3);
    } else if (period === 'year') {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    const pipeline = [
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.user.id),
          date: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            type: '$type',
            category: '$category.primary',
            businessClassification: '$businessClassification'
          },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
          avgAmount: { $avg: '$amount' }
        }
      },
      {
        $sort: { totalAmount: -1 }
      }
    ];

    const analytics = await Transaction.aggregate(pipeline);

    // Calculate totals
    const totals = {
      income: 0,
      expenses: 0,
      businessIncome: 0,
      businessExpenses: 0,
      deductibleExpenses: 0
    };

    analytics.forEach(item => {
      if (item._id.type === 'income') {
        totals.income += item.totalAmount;
        if (item._id.businessClassification === 'business') {
          totals.businessIncome += item.totalAmount;
        }
      } else if (item._id.type === 'expense') {
        totals.expenses += item.totalAmount;
        if (item._id.businessClassification === 'business') {
          totals.businessExpenses += item.totalAmount;
        }
      }
    });

    // Get deductible expenses
    const deductibleExpenses = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.user.id),
          date: { $gte: startDate },
          'taxDeductible.isDeductible': true
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    if (deductibleExpenses.length > 0) {
      totals.deductibleExpenses = deductibleExpenses[0].total;
    }

    res.json({
      analytics,
      totals,
      period,
      startDate
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
