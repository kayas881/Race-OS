const express = require('express');
const auth = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');

const router = express.Router();

// @route   POST /api/demo/seed
// @desc    Seed demo data for testing
// @access  Private
router.post('/seed', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Clean existing data for this user
    await Transaction.deleteMany({ user: userId });
    await Account.deleteMany({ user: userId });

    // Create demo accounts
    const accounts = await Account.insertMany([
      {
        user: userId,
        accountId: 'demo_bank_1',
        accountName: 'Chase Business Checking',
        platform: 'bank',
        accountType: 'checking',
        balance: {
          current: 12500.75,
          available: 12500.75
        },
        isActive: true
      },
      {
        user: userId,
        accountId: 'demo_youtube_1',
        accountName: 'YouTube Channel',
        platform: 'youtube',
        accountType: 'creator',
        balance: {
          current: 2840.30,
          available: 2840.30
        },
        isActive: true
      },
      {
        user: userId,
        accountId: 'demo_patreon_1',
        accountName: 'Patreon',
        platform: 'patreon',
        accountType: 'creator',
        balance: {
          current: 1250.00,
          available: 1250.00
        },
        isActive: true
      }
    ]);

    // Create demo transactions
    const currentDate = new Date();
    const transactions = [];

    // Income transactions
    for (let i = 0; i < 15; i++) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() - (i * 3));

      transactions.push({
        user: userId,
        account: accounts[1]._id, // YouTube account
        transactionId: `demo_income_${i}`,
        amount: Math.floor(Math.random() * 500) + 100,
        type: 'income',
        description: `YouTube Ad Revenue - ${date.toLocaleDateString()}`,
        date: date,
        category: {
          primary: 'ad_revenue',
          detailed: 'YouTube AdSense',
          confidence: 0.9
        },
        businessClassification: 'business',
        taxDeductible: {
          isDeductible: false,
          confidence: 0.1
        }
      });
    }

    // Patreon income
    for (let i = 0; i < 6; i++) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() - (i * 7));

      transactions.push({
        user: userId,
        account: accounts[2]._id, // Patreon account
        transactionId: `demo_patreon_${i}`,
        amount: Math.floor(Math.random() * 300) + 150,
        type: 'income',
        description: `Patreon Subscription Revenue`,
        date: date,
        category: {
          primary: 'subscription',
          detailed: 'Patreon Subscriptions',
          confidence: 0.95
        },
        businessClassification: 'business',
        taxDeductible: {
          isDeductible: false,
          confidence: 0.1
        }
      });
    }

    // Business expense transactions
    const expenses = [
      { desc: 'Adobe Creative Cloud', amount: 52.99, category: 'software', deductible: true },
      { desc: 'Sony Alpha Camera', amount: 1299.99, category: 'equipment', deductible: true },
      { desc: 'Blue Yeti Microphone', amount: 99.99, category: 'equipment', deductible: true },
      { desc: 'OBS Studio Pro', amount: 29.99, category: 'software', deductible: true },
      { desc: 'Business Internet', amount: 79.99, category: 'internet_phone', deductible: true },
      { desc: 'Office Supplies', amount: 45.67, category: 'office_supplies', deductible: true },
      { desc: 'Facebook Ads', amount: 150.00, category: 'marketing', deductible: true },
      { desc: 'Conference Ticket', amount: 299.00, category: 'education', deductible: true }
    ];

    for (let i = 0; i < expenses.length; i++) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() - (i * 4));
      const expense = expenses[i];

      transactions.push({
        user: userId,
        account: accounts[0]._id, // Bank account
        transactionId: `demo_expense_${i}`,
        amount: expense.amount,
        type: 'expense',
        description: expense.desc,
        date: date,
        category: {
          primary: expense.category,
          detailed: expense.desc,
          confidence: 0.8
        },
        businessClassification: 'business',
        taxDeductible: {
          isDeductible: expense.deductible,
          deductionType: expense.category,
          confidence: 0.9,
          deductionPercentage: 1.0
        }
      });
    }

    // Personal expenses
    const personalExpenses = [
      { desc: 'Grocery Store', amount: 87.45, category: 'groceries' },
      { desc: 'Gas Station', amount: 42.30, category: 'transportation' },
      { desc: 'Restaurant', amount: 65.89, category: 'dining' },
      { desc: 'Electric Bill', amount: 120.45, category: 'utilities' }
    ];

    for (let i = 0; i < personalExpenses.length; i++) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() - (i * 5));
      const expense = personalExpenses[i];

      transactions.push({
        user: userId,
        account: accounts[0]._id,
        transactionId: `demo_personal_${i}`,
        amount: expense.amount,
        type: 'expense',
        description: expense.desc,
        date: date,
        category: {
          primary: expense.category,
          detailed: expense.desc,
          confidence: 0.7
        },
        businessClassification: 'personal',
        taxDeductible: {
          isDeductible: false,
          confidence: 0.1
        }
      });
    }

    await Transaction.insertMany(transactions);

    res.json({
      message: 'Demo data seeded successfully',
      summary: {
        accounts: accounts.length,
        transactions: transactions.length,
        totalIncome: transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
        totalExpenses: transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
      }
    });
  } catch (error) {
    console.error('Error seeding demo data:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/demo/clear
// @desc    Clear demo data
// @access  Private
router.delete('/clear', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    await Transaction.deleteMany({ user: userId });
    await Account.deleteMany({ user: userId });
    
    res.json({ message: 'Demo data cleared successfully' });
  } catch (error) {
    console.error('Error clearing demo data:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
