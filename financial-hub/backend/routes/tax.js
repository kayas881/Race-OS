const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const taxCalculationService = require('../services/taxCalculation');
const TaxCalculation = require('../models/TaxCalculation');

const router = express.Router();

// @route   GET /api/tax/current
// @desc    Get current year tax calculation
// @access  Private
router.get('/current', auth, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    
    let taxCalculation = await TaxCalculation.findOne({
      user: req.user.id,
      'period.year': currentYear,
      'period.quarter': { $exists: false }
    }).sort({ calculatedAt: -1 });

    if (!taxCalculation) {
      // Calculate if doesn't exist
      taxCalculation = await taxCalculationService.calculateTaxes(req.user.id, currentYear);
    }

    res.json(taxCalculation);
  } catch (error) {
    console.error('Error fetching current tax calculation:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/tax/quarterly/:year/:quarter
// @desc    Get quarterly tax calculation
// @access  Private
router.get('/quarterly/:year/:quarter', auth, async (req, res) => {
  try {
    const { year, quarter } = req.params;
    
    if (quarter < 1 || quarter > 4) {
      return res.status(400).json({ error: 'Quarter must be between 1 and 4' });
    }

    let taxCalculation = await TaxCalculation.findOne({
      user: req.user.id,
      'period.year': parseInt(year),
      'period.quarter': parseInt(quarter)
    });

    if (!taxCalculation) {
      taxCalculation = await taxCalculationService.calculateTaxes(
        req.user.id, 
        parseInt(year), 
        parseInt(quarter)
      );
    }

    res.json(taxCalculation);
  } catch (error) {
    console.error('Error fetching quarterly tax calculation:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/tax/calculate
// @desc    Force recalculation of taxes
// @access  Private
router.post('/calculate', auth, [
  body('year').optional().isInt({ min: 2020, max: 2030 }),
  body('quarter').optional().isInt({ min: 1, max: 4 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { year = new Date().getFullYear(), quarter } = req.body;

    const taxCalculation = await taxCalculationService.calculateTaxes(
      req.user.id, 
      year, 
      quarter
    );

    res.json(taxCalculation);
  } catch (error) {
    console.error('Error calculating taxes:', error);
    res.status(500).json({ error: 'Failed to calculate taxes' });
  }
});

// @route   POST /api/tax/real-time-jar
// @desc    Calculate real-time tax jar amount for new transaction
// @access  Private
router.post('/real-time-jar', auth, [
  body('amount').isNumeric(),
  body('type').isIn(['income', 'expense'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, type } = req.body;

    const taxJarCalculation = await taxCalculationService.calculateRealTimeTaxJar(
      req.user.id,
      parseFloat(amount),
      type
    );

    res.json(taxJarCalculation);
  } catch (error) {
    console.error('Error calculating real-time tax jar:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/tax/summary
// @desc    Get tax summary for dashboard
// @access  Private
router.get('/summary', auth, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

    // Get current year calculation
    const yearlyTax = await TaxCalculation.findOne({
      user: req.user.id,
      'period.year': currentYear,
      'period.quarter': { $exists: false }
    }).sort({ calculatedAt: -1 });

    // Get current quarter calculation
    const quarterlyTax = await TaxCalculation.findOne({
      user: req.user.id,
      'period.year': currentYear,
      'period.quarter': currentQuarter
    }).sort({ calculatedAt: -1 });

    // Get all quarterly calculations for the year
    const allQuarters = await TaxCalculation.find({
      user: req.user.id,
      'period.year': currentYear,
      'period.quarter': { $exists: true }
    }).sort({ 'period.quarter': 1 });

    // Calculate year-to-date totals
    const ytdTotals = {
      income: 0,
      expenses: 0,
      deductibleExpenses: 0,
      taxOwed: 0
    };

    allQuarters.forEach(quarter => {
      ytdTotals.income += quarter.income.businessIncome;
      ytdTotals.expenses += quarter.expenses.totalExpenses;
      ytdTotals.deductibleExpenses += quarter.expenses.deductibleExpenses;
      ytdTotals.taxOwed += quarter.taxCalculations.totalTaxOwed;
    });

    const summary = {
      currentYear,
      currentQuarter,
      yearly: yearlyTax,
      quarterly: quarterlyTax,
      yearToDate: ytdTotals,
      quarterlyBreakdown: allQuarters,
      nextQuarterlyDue: yearlyTax?.recommendations?.nextQuarterlyDue || null,
      taxJarRecommendation: yearlyTax?.recommendations?.taxJarAmount || { percentage: 0.25, amount: 0 }
    };

    res.json(summary);
  } catch (error) {
    console.error('Error fetching tax summary:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/tax/history
// @desc    Get tax calculation history
// @access  Private
router.get('/history', auth, async (req, res) => {
  try {
    const { year, limit = 10 } = req.query;
    
    let query = { user: req.user.id };
    if (year) {
      query['period.year'] = parseInt(year);
    }

    const calculations = await TaxCalculation.find(query)
      .sort({ calculatedAt: -1 })
      .limit(parseInt(limit));

    res.json(calculations);
  } catch (error) {
    console.error('Error fetching tax history:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/tax/deductions
// @desc    Get potential tax deductions analysis
// @access  Private
router.get('/deductions', auth, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    
    // Get current year calculation for recommendations
    const taxCalculation = await TaxCalculation.findOne({
      user: req.user.id,
      'period.year': currentYear,
      'period.quarter': { $exists: false }
    }).sort({ calculatedAt: -1 });

    if (!taxCalculation) {
      return res.status(404).json({ error: 'No tax calculation found for current year' });
    }

    const deductionAnalysis = {
      currentDeductions: {
        total: taxCalculation.expenses.deductibleExpenses,
        breakdown: taxCalculation.expenses.breakdown
      },
      suggestions: taxCalculation.recommendations.suggestedDeductions,
      potentialSavings: taxCalculation.recommendations.suggestedDeductions.reduce(
        (total, suggestion) => total + (suggestion.potentialSavings || 0), 
        0
      ),
      deductionRate: taxCalculation.income.businessIncome > 0 
        ? (taxCalculation.expenses.deductibleExpenses / taxCalculation.income.businessIncome) * 100
        : 0
    };

    res.json(deductionAnalysis);
  } catch (error) {
    console.error('Error fetching deduction analysis:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/tax/quarterly-schedule
// @desc    Get quarterly payment schedule and amounts
// @access  Private
router.get('/quarterly-schedule', auth, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    
    const schedule = [];
    
    for (let quarter = 1; quarter <= 4; quarter++) {
      let quarterlyCalc = await TaxCalculation.findOne({
        user: req.user.id,
        'period.year': currentYear,
        'period.quarter': quarter
      });

      // If no calculation exists for future quarters, estimate based on current data
      if (!quarterlyCalc && quarter > Math.ceil((new Date().getMonth() + 1) / 3)) {
        quarterlyCalc = await taxCalculationService.calculateTaxes(req.user.id, currentYear, quarter);
      }

      const dueDate = taxCalculationService.quarterlyDueDates?.[quarter] || 
                     new Date(currentYear, quarter * 3 - 1, 15);

      schedule.push({
        quarter,
        year: currentYear,
        dueDate,
        estimatedPayment: quarterlyCalc?.taxCalculations?.estimatedQuarterlyPayment || 0,
        actualPayment: 0, // TODO: Track actual payments made
        isPaid: false, // TODO: Track payment status
        isOverdue: new Date() > dueDate
      });
    }

    res.json(schedule);
  } catch (error) {
    console.error('Error fetching quarterly schedule:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
