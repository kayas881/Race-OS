const express = require('express');
const auth = require('../middleware/auth');
const appwriteService = require('../config/appwrite');

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

    // Get account balances using Appwrite
    const accountsResult = await appwriteService.listDocuments(
      appwriteService.collections.accounts,
      [
        appwriteService.Query.equal('userId', req.user.id),
        appwriteService.Query.equal('isActive', true)
      ]
    );
    
    const accounts = accountsResult.documents;
    const totalBalance = accounts.reduce((sum, account) => {
      return sum + (account.balance || 0);
    }, 0);

    // Get monthly transactions using Appwrite
    const monthlyTransactionsResult = await appwriteService.listDocuments(
      appwriteService.collections.transactions,
      [
        appwriteService.Query.equal('userId', req.user.id),
        appwriteService.Query.greaterThanEqual('date', monthStart.toISOString()),
        appwriteService.Query.lessThanEqual('date', monthEnd.toISOString())
      ]
    );

    // Process monthly transactions
    const monthlyTransactions = monthlyTransactionsResult.documents;
    const monthlySummary = {
      income: 0,
      expenses: 0,
      net: 0,
      transactionCount: monthlyTransactions.length
    };

    monthlyTransactions.forEach(transaction => {
      if (transaction.type === 'income') {
        monthlySummary.income += transaction.amount;
      } else {
        monthlySummary.expenses += Math.abs(transaction.amount);
      }
    });
    monthlySummary.net = monthlySummary.income - monthlySummary.expenses;

    // Get quarterly transactions using Appwrite
    const quarterlyTransactionsResult = await appwriteService.listDocuments(
      appwriteService.collections.transactions,
      [
        appwriteService.Query.equal('userId', req.user.id),
        appwriteService.Query.greaterThanEqual('date', quarterStart.toISOString()),
        appwriteService.Query.lessThanEqual('date', quarterEnd.toISOString())
      ]
    );

    const quarterlyTransactions = quarterlyTransactionsResult.documents;
    const quarterlySummary = {
      income: 0,
      expenses: 0,
      businessIncome: 0,
      businessExpenses: 0,
      net: 0
    };

    quarterlyTransactions.forEach(transaction => {
      const amount = Math.abs(transaction.amount);
      if (transaction.type === 'income') {
        quarterlySummary.income += amount;
        if (transaction.businessClassification === 'business') {
          quarterlySummary.businessIncome += amount;
        }
      } else {
        quarterlySummary.expenses += amount;
        if (transaction.businessClassification === 'business') {
          quarterlySummary.businessExpenses += amount;
        }
      }
    });
    quarterlySummary.net = quarterlySummary.income - quarterlySummary.expenses;

    // Get recent transactions
    const recentTransactionsResult = await appwriteService.listDocuments(
      appwriteService.collections.transactions,
      [
        appwriteService.Query.equal('userId', req.user.id),
        appwriteService.Query.orderDesc('date'),
        appwriteService.Query.limit(10)
      ]
    );

    const recentTransactions = recentTransactionsResult.documents;

    // Calculate tax jar status (simplified)
    const taxJarStatus = {
      currentBalance: quarterlySummary.businessIncome * 0.25, // 25% estimate
      recommendedAmount: quarterlySummary.businessIncome * 0.30,
      nextPaymentDate: new Date(currentYear, currentQuarter * 3, 15), // Quarterly payment
      isOnTrack: true
    };

    // Generate income trend (last 6 months)
    const incomeTrend = [];
    for (let i = 5; i >= 0; i--) {
      const trendMonth = new Date(currentYear, currentMonth - i, 1);
      const trendMonthEnd = new Date(currentYear, currentMonth - i + 1, 0);
      
      const monthTransactionsResult = await appwriteService.listDocuments(
        appwriteService.collections.transactions,
        [
          appwriteService.Query.equal('userId', req.user.id),
          appwriteService.Query.equal('type', 'income'),
          appwriteService.Query.greaterThanEqual('date', trendMonth.toISOString()),
          appwriteService.Query.lessThanEqual('date', trendMonthEnd.toISOString())
        ]
      );

      const monthIncome = monthTransactionsResult.documents.reduce((sum, t) => sum + t.amount, 0);
      incomeTrend.push({
        _id: {
          year: trendMonth.getFullYear(),
          month: trendMonth.getMonth() + 1
        },
        total: monthIncome,
        count: monthTransactionsResult.documents.length
      });
    }

    // Generate alerts
    const alerts = [];
    if (monthlySummary.expenses > monthlySummary.income) {
      alerts.push({
        type: 'warning',
        message: 'Monthly expenses exceed income',
        action: 'Review your spending patterns'
      });
    }

    const dashboardData = {
      accounts,
      totalBalance,
      monthlySummary,
      quarterlySummary,
      taxJarStatus,
      recentTransactions,
      incomeTrend,
      alerts,
      lastUpdated: new Date().toISOString()
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;