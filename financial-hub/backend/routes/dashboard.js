const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const TaxCalculation = require('../models/TaxCalculation');
const taxCalculationService = require('../services/taxCalculation');

const router = express.Router();

// @route   GET /api/dashboard
// @desc    Get dashboard data
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const currentQuarter = Math.ceil((currentMonth + 1) / 3);

    // Date ranges
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0);
    const quarterStart = new Date(currentYear, (currentQuarter - 1) * 3, 1);
    const quarterEnd = new Date(currentYear, currentQuarter * 3, 0);
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31);

    // Get account balances
    const accounts = await Account.find({ 
      user: req.user.id, 
      isActive: true 
    });

    const totalBalance = accounts.reduce((sum, account) => {
      return sum + (account.balance?.current || 0);
    }, 0);

    // Get monthly transactions summary
    const monthlyTransactions = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.user.id),
          date: { $gte: monthStart, $lte: monthEnd }
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Get quarterly summary
    const quarterlyTransactions = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.user.id),
          date: { $gte: quarterStart, $lte: quarterEnd }
        }
      },
      {
        $group: {
          _id: {
            type: '$type',
            businessClassification: '$businessClassification'
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Get current tax calculation
    let taxCalculation = await TaxCalculation.findOne({
      user: req.user.id,
      'period.year': currentYear,
      'period.quarter': { $exists: false }
    }).sort({ calculatedAt: -1 });

    if (!taxCalculation) {
      taxCalculation = await taxCalculationService.calculateTaxes(req.user.id, currentYear);
    }

    // Get recent transactions
    const recentTransactions = await Transaction.find({
      user: req.user.id
    })
    .populate('account', 'accountName platform')
    .sort({ date: -1 })
    .limit(10);

    // Calculate summaries
    const monthlySummary = {
      income: 0,
      expenses: 0,
      net: 0,
      transactionCount: 0
    };

    const quarterlySummary = {
      businessIncome: 0,
      businessExpenses: 0,
      personalIncome: 0,
      personalExpenses: 0,
      deductibleExpenses: 0
    };

    monthlyTransactions.forEach(item => {
      monthlySummary.transactionCount += item.count;
      if (item._id === 'income') {
        monthlySummary.income = item.total;
      } else if (item._id === 'expense') {
        monthlySummary.expenses = item.total;
      }
    });
    monthlySummary.net = monthlySummary.income - monthlySummary.expenses;

    quarterlyTransactions.forEach(item => {
      if (item._id.type === 'income') {
        if (item._id.businessClassification === 'business') {
          quarterlySummary.businessIncome += item.total;
        } else {
          quarterlySummary.personalIncome += item.total;
        }
      } else if (item._id.type === 'expense') {
        if (item._id.businessClassification === 'business') {
          quarterlySummary.businessExpenses += item.total;
        } else {
          quarterlySummary.personalExpenses += item.total;
        }
      }
    });

    // Get deductible expenses for the quarter
    const deductibleExpenses = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.user.id),
          date: { $gte: quarterStart, $lte: quarterEnd },
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
      quarterlySummary.deductibleExpenses = deductibleExpenses[0].total;
    }

    // Income trend (last 6 months)
    const incomeTrend = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.user.id),
          type: 'income',
          businessClassification: 'business',
          date: { 
            $gte: new Date(currentYear, currentMonth - 5, 1),
            $lte: monthEnd
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Category breakdown for current month
    const categoryBreakdown = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.user.id),
          date: { $gte: monthStart, $lte: monthEnd }
        }
      },
      {
        $group: {
          _id: {
            category: '$category.primary',
            type: '$type'
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { total: -1 }
      }
    ]);

    // Platform performance (for creator income)
    const platformPerformance = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.user.id),
          type: 'income',
          businessClassification: 'business',
          date: { $gte: quarterStart, $lte: quarterEnd }
        }
      },
      {
        $lookup: {
          from: 'accounts',
          localField: 'account',
          foreignField: '_id',
          as: 'accountInfo'
        }
      },
      {
        $unwind: '$accountInfo'
      },
      {
        $group: {
          _id: '$accountInfo.platform',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          avgTransaction: { $avg: '$amount' }
        }
      },
      {
        $sort: { total: -1 }
      }
    ]);

    // Tax jar status
    const taxJarStatus = {
      currentAmount: taxCalculation?.recommendations?.taxJarAmount?.amount || 0,
      targetPercentage: taxCalculation?.recommendations?.taxJarAmount?.percentage || 0.25,
      nextQuarterlyDue: taxCalculation?.recommendations?.nextQuarterlyDue,
      estimatedQuarterlyPayment: taxCalculation?.taxCalculations?.estimatedQuarterlyPayment || 0,
      recommendations: taxCalculation?.recommendations?.taxStrategy || ''
    };

    // Alerts and notifications
    const alerts = [];
    
    // Check for upcoming quarterly payments
    const nextDue = new Date(taxJarStatus.nextQuarterlyDue);
    const daysUntilDue = Math.ceil((nextDue - new Date()) / (1000 * 60 * 60 * 24));
    if (daysUntilDue <= 30 && daysUntilDue > 0) {
      alerts.push({
        type: 'warning',
        message: `Quarterly tax payment due in ${daysUntilDue} days`,
        action: 'Review estimated payment amount'
      });
    }

    // Check for uncategorized transactions
    const uncategorizedCount = await Transaction.countDocuments({
      user: req.user.id,
      'category.confidence': { $lt: 0.5 },
      isReviewed: false
    });

    if (uncategorizedCount > 0) {
      alerts.push({
        type: 'info',
        message: `${uncategorizedCount} transactions need review`,
        action: 'Review and categorize transactions'
      });
    }

    // Check tax jar sufficiency
    if (taxJarStatus.currentAmount < taxJarStatus.estimatedQuarterlyPayment * 0.8) {
      alerts.push({
        type: 'warning',
        message: 'Tax jar may be insufficient for next quarterly payment',
        action: 'Consider increasing tax savings rate'
      });
    }

    const dashboardData = {
      accounts: {
        total: accounts.length,
        totalBalance,
        byPlatform: accounts.reduce((acc, account) => {
          acc[account.platform] = (acc[account.platform] || 0) + 1;
          return acc;
        }, {})
      },
      monthlySummary,
      quarterlySummary,
      taxJarStatus,
      recentTransactions,
      incomeTrend,
      categoryBreakdown,
      platformPerformance,
      alerts,
      lastUpdated: new Date()
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/dashboard/quick-stats
// @desc    Get quick stats for header/widget
// @access  Private
router.get('/quick-stats', auth, async (req, res) => {
  try {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0);

    // Current month income
    const monthlyIncome = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.user.id),
          type: 'income',
          businessClassification: 'business',
          date: { $gte: monthStart, $lte: monthEnd }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Total account balances
    const totalBalance = await Account.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.user.id),
          isActive: true
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$balance.current' }
        }
      }
    ]);

    // Current tax jar amount
    const currentTaxCalc = await TaxCalculation.findOne({
      user: req.user.id,
      'period.year': currentYear,
      'period.quarter': { $exists: false }
    }).sort({ calculatedAt: -1 });

    const quickStats = {
      monthlyIncome: monthlyIncome[0]?.total || 0,
      totalBalance: totalBalance[0]?.total || 0,
      taxJarAmount: currentTaxCalc?.recommendations?.taxJarAmount?.amount || 0,
      nextQuarterlyDue: currentTaxCalc?.recommendations?.nextQuarterlyDue
    };

    res.json(quickStats);
  } catch (error) {
    console.error('Error fetching quick stats:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
