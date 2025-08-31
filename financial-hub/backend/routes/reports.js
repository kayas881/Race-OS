const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');

// @route   GET /api/reports/analytics
// @desc    Get comprehensive analytics data
// @access  Private
router.get('/analytics', auth, async (req, res) => {
  try {
    const { period = '6months' } = req.query;
    const userId = req.user.id;

    // Calculate date range based on period
    const endDate = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '3months':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(endDate.getMonth() - 6);
        break;
      case '12months':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case 'ytd':
        startDate = new Date(endDate.getFullYear(), 0, 1);
        break;
      default:
        startDate.setMonth(endDate.getMonth() - 6);
    }

    // Get all transactions in the period
    const transactions = await Transaction.find({
      userId,
      date: { $gte: startDate, $lte: endDate }
    }).populate('category').sort({ date: 1 });

    // Get categories for reference
    const categories = await Category.find({ userId });

    // Generate cashflow data by month
    const cashflowData = generateCashflowData(transactions, startDate, endDate);
    
    // Generate category breakdown
    const categoryBreakdown = generateCategoryBreakdown(transactions, categories);
    
    // Calculate summary statistics
    const summary = calculateSummary(transactions);
    
    // Calculate trends
    const trends = calculateTrends(transactions, startDate, endDate);
    
    // Generate AI tax forecast
    const taxForecast = await generateTaxForecast(transactions, userId, summary);

    res.json({
      cashflow: cashflowData,
      categoryBreakdown,
      summary,
      trends,
      taxForecast
    });

  } catch (error) {
    console.error('Error generating analytics:', error);
    res.status(500).json({ message: 'Error generating analytics' });
  }
});

// Helper function to generate monthly cashflow data
function generateCashflowData(transactions, startDate, endDate) {
  const monthlyData = {};
  
  // Initialize months
  const current = new Date(startDate);
  while (current <= endDate) {
    const monthKey = current.toISOString().slice(0, 7); // YYYY-MM format
    const monthLabel = current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    
    monthlyData[monthKey] = {
      month: monthLabel,
      income: 0,
      expenses: 0,
      net: 0
    };
    
    current.setMonth(current.getMonth() + 1);
  }

  // Aggregate transactions by month
  transactions.forEach(transaction => {
    const monthKey = transaction.date.toISOString().slice(0, 7);
    
    if (monthlyData[monthKey]) {
      if (transaction.amount > 0) {
        monthlyData[monthKey].income += transaction.amount;
      } else {
        monthlyData[monthKey].expenses += Math.abs(transaction.amount);
      }
    }
  });

  // Calculate net for each month
  Object.values(monthlyData).forEach(month => {
    month.net = month.income - month.expenses;
  });

  return Object.values(monthlyData);
}

// Helper function to generate category breakdown
function generateCategoryBreakdown(transactions, categories) {
  const categoryTotals = {};

  // Initialize categories
  categories.forEach(category => {
    categoryTotals[category._id] = {
      name: category.name,
      amount: 0,
      count: 0
    };
  });

  // Add uncategorized
  categoryTotals['uncategorized'] = {
    name: 'Uncategorized',
    amount: 0,
    count: 0
  };

  // Aggregate expenses by category (only negative amounts)
  transactions.forEach(transaction => {
    if (transaction.amount < 0) {
      const categoryId = transaction.category?._id || 'uncategorized';
      
      if (categoryTotals[categoryId]) {
        categoryTotals[categoryId].amount += Math.abs(transaction.amount);
        categoryTotals[categoryId].count += 1;
      }
    }
  });

  // Convert to array and filter out zero amounts
  return Object.values(categoryTotals)
    .filter(category => category.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

// Helper function to calculate summary statistics
function calculateSummary(transactions) {
  const summary = {
    totalIncome: 0,
    totalExpenses: 0,
    netCashflow: 0,
    transactionCount: transactions.length,
    estimatedTax: 0
  };

  transactions.forEach(transaction => {
    if (transaction.amount > 0) {
      summary.totalIncome += transaction.amount;
    } else {
      summary.totalExpenses += Math.abs(transaction.amount);
    }
  });

  summary.netCashflow = summary.totalIncome - summary.totalExpenses;
  
  // Rough tax estimate (25% of net income)
  if (summary.netCashflow > 0) {
    summary.estimatedTax = summary.netCashflow * 0.25;
  }

  return summary;
}

// Helper function to calculate trends
function calculateTrends(transactions, startDate, endDate) {
  const midPoint = new Date((startDate.getTime() + endDate.getTime()) / 2);
  
  const firstHalf = transactions.filter(t => t.date <= midPoint);
  const secondHalf = transactions.filter(t => t.date > midPoint);

  const firstHalfSummary = calculateSummary(firstHalf);
  const secondHalfSummary = calculateSummary(secondHalf);

  const incomeGrowth = firstHalfSummary.totalIncome > 0 
    ? ((secondHalfSummary.totalIncome - firstHalfSummary.totalIncome) / firstHalfSummary.totalIncome) * 100 
    : 0;

  const expenseGrowth = firstHalfSummary.totalExpenses > 0 
    ? ((secondHalfSummary.totalExpenses - firstHalfSummary.totalExpenses) / firstHalfSummary.totalExpenses) * 100 
    : 0;

  return {
    incomeGrowth,
    expenseGrowth
  };
}

// AI-powered tax forecasting function
async function generateTaxForecast(transactions, userId, summary) {
  try {
    // Get current year transactions for better forecasting
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31);

    const yearTransactions = await Transaction.find({
      userId,
      date: { $gte: yearStart, $lte: yearEnd }
    });

    const yearSummary = calculateSummary(yearTransactions);
    
    // Current quarter calculation
    const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;
    const quarterProgress = (new Date().getMonth() % 3 + 1) / 3;
    
    // Project quarterly income based on current progress
    const projectedQuarterlyIncome = yearSummary.totalIncome / quarterProgress;
    const currentQuarterTax = projectedQuarterlyIncome * 0.25; // 25% estimated rate

    // Project year-end based on current trends
    const monthsElapsed = new Date().getMonth() + 1;
    const projectedYearIncome = (yearSummary.totalIncome / monthsElapsed) * 12;
    const projectedYearExpenses = (yearSummary.totalExpenses / monthsElapsed) * 12;
    const projectedYearNet = projectedYearIncome - projectedYearExpenses;
    const yearEndTax = Math.max(0, projectedYearNet * 0.25);

    // Generate AI recommendations
    const recommendations = generateTaxRecommendations(yearSummary, projectedYearNet);

    // Upcoming tax dates
    const upcomingDates = [
      { description: 'Q4 2025 Estimated Tax', date: 'Jan 15, 2026' },
      { description: 'Annual Tax Return', date: 'Apr 15, 2026' },
      { description: 'Q1 2026 Estimated Tax', date: 'Apr 15, 2026' }
    ];

    return {
      currentQuarter: currentQuarterTax,
      yearEnd: yearEndTax,
      confidence: calculateConfidence(yearTransactions.length),
      recommendations,
      upcomingDates,
      projectedIncome: projectedYearIncome,
      projectedExpenses: projectedYearExpenses
    };

  } catch (error) {
    console.error('Error generating tax forecast:', error);
    return {
      currentQuarter: 0,
      yearEnd: 0,
      confidence: 0,
      recommendations: [],
      upcomingDates: []
    };
  }
}

// Generate AI-powered tax recommendations
function generateTaxRecommendations(summary, projectedNet) {
  const recommendations = [];

  // High-priority recommendations
  if (projectedNet > 50000) {
    recommendations.push({
      priority: 'high',
      title: 'Consider Quarterly Payments',
      description: 'Your projected income suggests you should make quarterly estimated tax payments to avoid penalties.',
      potentialSavings: 2500
    });
  }

  if (summary.totalExpenses / summary.totalIncome < 0.3) {
    recommendations.push({
      priority: 'high',
      title: 'Track Business Expenses',
      description: 'Your expense ratio is low. Consider tracking more business deductions to reduce taxable income.',
      potentialSavings: projectedNet * 0.1
    });
  }

  // Medium-priority recommendations
  if (projectedNet > 25000) {
    recommendations.push({
      priority: 'medium',
      title: 'Retirement Contributions',
      description: 'Consider maximizing IRA or 401(k) contributions to reduce current year tax liability.',
      potentialSavings: 6000 * 0.25
    });
  }

  if (summary.transactionCount > 100) {
    recommendations.push({
      priority: 'medium',
      title: 'Expense Categories',
      description: 'Review and properly categorize all transactions for maximum deduction accuracy.',
      potentialSavings: 1000
    });
  }

  // Low-priority recommendations
  recommendations.push({
    priority: 'low',
    title: 'Tax Professional Consultation',
    description: 'Consider consulting with a tax professional for personalized strategies.',
    potentialSavings: null
  });

  return recommendations.slice(0, 5); // Limit to 5 recommendations
}

// Calculate confidence score based on data availability
function calculateConfidence(transactionCount) {
  if (transactionCount >= 100) return 95;
  if (transactionCount >= 50) return 85;
  if (transactionCount >= 25) return 75;
  if (transactionCount >= 10) return 65;
  return 50;
}

module.exports = router;
