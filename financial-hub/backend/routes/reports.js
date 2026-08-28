const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const taxCalculationService = require('../services/taxCalculation');

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
      user: userId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });

    // Generate cashflow data by month
    const cashflowData = generateCashflowData(transactions, startDate, endDate);

    // Generate category breakdown
    const categoryBreakdown = generateCategoryBreakdown(transactions);
    
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

  // Aggregate transactions by month. Amounts are always stored as positive values
  // (see routes/transactions.js and services/csvImportService.js) - `type` is the
  // actual income/expense indicator, not the sign of `amount`.
  transactions.forEach(transaction => {
    const monthKey = transaction.date.toISOString().slice(0, 7);

    if (monthlyData[monthKey]) {
      if (transaction.type === 'income') {
        monthlyData[monthKey].income += transaction.amount;
      } else if (transaction.type === 'expense') {
        monthlyData[monthKey].expenses += transaction.amount;
      }
    }
  });

  // Calculate net for each month
  Object.values(monthlyData).forEach(month => {
    month.net = month.income - month.expenses;
  });

  return Object.values(monthlyData);
}

// Turn a category slug like "office_supplies" into a readable label "Office Supplies".
// Bucketing directly on the slug (rather than matching against the separate Category
// collection's display names) means this always reflects real transaction data instead
// of silently dumping everything into "Uncategorized" when the wording doesn't line up.
function humanizeCategorySlug(slug) {
  return slug
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Helper function to generate category breakdown
function generateCategoryBreakdown(transactions) {
  const categoryTotals = {};

  // Aggregate expenses by category
  transactions.forEach(transaction => {
    if (transaction.type === 'expense') {
      const primary = transaction.category?.primary?.toLowerCase().trim();
      const key = primary || 'uncategorized';

      if (!categoryTotals[key]) {
        categoryTotals[key] = {
          name: key === 'uncategorized' ? 'Uncategorized' : humanizeCategorySlug(key),
          amount: 0,
          count: 0
        };
      }

      categoryTotals[key].amount += transaction.amount;
      categoryTotals[key].count += 1;
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
    if (transaction.type === 'income') {
      summary.totalIncome += transaction.amount;
    } else if (transaction.type === 'expense') {
      summary.totalExpenses += transaction.amount;
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

// Tax forecasting function. Previously computed its own numbers from a flat
// 25%-of-net-cashflow heuristic over ALL transactions (including personal
// ones, unlike the real engine which only taxes business-classified income) -
// that meant this page could show a materially different "tax owed" figure
// than the Tax Center for the exact same period, with no indication the two
// were even measuring different things. Now sourced from the same engine
// (services/taxCalculation.js) so the numbers agree everywhere they're shown.
async function generateTaxForecast(transactions, userId, summary) {
  try {
    const currentYear = new Date().getFullYear();

    const [user, quarterlySummary, ytdLiability] = await Promise.all([
      User.findById(userId),
      taxCalculationService.getQuarterlyTaxSummary(userId, currentYear),
      taxCalculationService.calculateYTDLiability(userId, currentYear)
    ]);

    const currentQuarterKey = taxCalculationService.getCurrentQuarter();
    const currentQuarterTax = quarterlySummary[currentQuarterKey]?.estimatedTax || 0;

    // Project full-year business net income from YTD business income/expenses
    // (not the unfiltered "all transactions" total), then run it through the
    // real bracket/state/self-employment engine instead of a flat 25%.
    const monthsElapsed = new Date().getMonth() + 1;
    const projectedYearIncome = (ytdLiability.totalIncome / monthsElapsed) * 12;
    const projectedYearExpenses = (ytdLiability.totalDeductions / monthsElapsed) * 12;
    const projectedYearNet = Math.max(0, projectedYearIncome - projectedYearExpenses);
    const yearEndTax = user ? taxCalculationService.calculateAnnualTaxLiability(projectedYearNet, user) : 0;

    // Recommendation heuristics stay based on the selected report-period summary
    // (unfiltered) - these are suggestion prompts, not dollar-exact tax figures.
    const recommendations = generateTaxRecommendations(summary, projectedYearNet);

    // Upcoming tax dates - computed relative to today, never hardcoded to a specific year
    const upcomingDates = taxCalculationService.getUpcomingQuarterlyDates().map(d => ({
      description: `${d.quarter} Estimated Tax`,
      date: new Date(d.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }));

    return {
      currentQuarter: currentQuarterTax,
      yearEnd: yearEndTax,
      confidence: calculateConfidence(summary.transactionCount),
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
