const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const taxCalculationService = require('../services/taxCalculation');
const taxService = require('../services/taxService');
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

// @route   GET /api/tax/quarterly-dates
// @desc    Get upcoming quarterly tax due dates
// @access  Private
router.get('/quarterly-dates', auth, async (req, res) => {
  try {
    const upcomingDates = taxService.getUpcomingQuarterlyDates();
    const quarterlyIncome = await taxService.getQuarterlyTaxSummary(req.user.id);
    const reminders = taxService.generateTaxReminders(upcomingDates, quarterlyIncome);

    res.json({
      upcomingDates,
      reminders,
      currentQuarter: taxService.getCurrentQuarter()
    });
  } catch (error) {
    console.error('Error fetching quarterly dates:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/tax/calculate-set-aside
// @desc    Calculate tax set-aside for new income
// @access  Private
router.post('/calculate-set-aside', auth, [
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('country').optional().isIn(['US', 'IN']).withMessage('Country must be US or IN')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, country = 'US' } = req.body;
    const userTaxSettings = await taxService.getUserTaxSettings(req.user.id);
    
    const calculation = taxService.calculateTaxSetAside(amount, userTaxSettings, country);

    res.json({
      ...calculation,
      notification: {
        type: 'info',
        message: `Set aside ${(calculation.recommendedRate * 100).toFixed(1)}% ($${calculation.totalSetAside.toFixed(2)}) for taxes`,
        breakdown: [
          `Federal: $${calculation.breakdown.federal.toFixed(2)}`,
          `State: $${calculation.breakdown.state.toFixed(2)}`,
          `Self-Employment: $${calculation.breakdown.selfEmployment.toFixed(2)}`
        ],
        netIncome: `Your net income: $${calculation.netIncome.toFixed(2)}`
      }
    });
  } catch (error) {
    console.error('Error calculating tax set-aside:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/tax/quarterly-summary
// @desc    Get quarterly tax summary
// @access  Private
router.get('/quarterly-summary', auth, async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const summary = await taxService.getQuarterlyTaxSummary(req.user.id, parseInt(year));

    res.json({
      year: parseInt(year),
      quarters: summary,
      upcomingDates: taxService.getUpcomingQuarterlyDates()
    });
  } catch (error) {
    console.error('Error fetching quarterly summary:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/tax/ytd-liability
// @desc    Get year-to-date tax liability
// @access  Private
router.get('/ytd-liability', auth, async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const liability = await taxService.calculateYTDTaxLiability(req.user.id, parseInt(year));

    res.json(liability);
  } catch (error) {
    console.error('Error calculating YTD liability:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/tax/settings
// @desc    Update user tax settings
// @access  Private
router.put('/settings', auth, [
  body('federalIncome').optional().isFloat({ min: 0, max: 1 }).withMessage('Federal rate must be between 0 and 1'),
  body('stateIncome').optional().isFloat({ min: 0, max: 1 }).withMessage('State rate must be between 0 and 1'),
  body('selfEmployment').optional().isFloat({ min: 0, max: 1 }).withMessage('SE rate must be between 0 and 1'),
  body('totalRecommended').optional().isFloat({ min: 0, max: 1 }).withMessage('Total rate must be between 0 and 1')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const settings = await taxService.saveUserTaxSettings(req.user.id, req.body);

    res.json({
      message: 'Tax settings updated successfully',
      settings: settings.userTaxSettings
    });
  } catch (error) {
    console.error('Error updating tax settings:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/tax/settings
// @desc    Get user tax settings
// @access  Private
router.get('/settings', auth, async (req, res) => {
  try {
    const settings = await taxService.getUserTaxSettings(req.user.id);
    res.json(settings);
  } catch (error) {
    console.error('Error fetching tax settings:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
