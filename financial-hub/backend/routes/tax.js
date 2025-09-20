const express = require('express');
const auth = require('../middleware/auth');
const appwriteService = require('../config/appwrite');

const router = express.Router();

// @route   GET /api/tax/quarterly-dates
// @desc    Get quarterly tax payment dates
// @access  Private
router.get('/quarterly-dates', auth, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const currentDate = new Date();
    
    // Quarterly due dates for the year
    const quarterlyDates = [
      { quarter: 'Q1', date: new Date(currentYear, 3, 15) }, // April 15
      { quarter: 'Q2', date: new Date(currentYear, 5, 15) }, // June 15
      { quarter: 'Q3', date: new Date(currentYear, 8, 15) }, // September 15
      { quarter: 'Q4', date: new Date(currentYear + 1, 0, 15) } // January 15 (next year)
    ];

    const upcomingDates = quarterlyDates.map(q => {
      const daysUntil = Math.ceil((q.date - currentDate) / (1000 * 60 * 60 * 24));
      return {
        quarter: q.quarter,
        date: q.date.toLocaleDateString(),
        daysUntil: daysUntil,
        isPastDue: daysUntil < 0,
        isUrgent: daysUntil > 0 && daysUntil <= 30
      };
    }).filter(q => q.daysUntil > -90); // Show past due items up to 90 days

    const reminders = [];
    upcomingDates.forEach(date => {
      if (date.isPastDue) {
        reminders.push({
          type: 'error',
          message: `${date.quarter} tax payment is ${Math.abs(date.daysUntil)} days overdue`,
          action: 'Pay immediately to avoid penalties'
        });
      } else if (date.isUrgent) {
        reminders.push({
          type: 'warning',
          message: `${date.quarter} tax payment due in ${date.daysUntil} days`,
          action: 'Prepare payment soon'
        });
      }
    });

    res.json({
      upcomingDates,
      reminders
    });
  } catch (error) {
    console.error('Error fetching quarterly dates:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/tax/settings
// @desc    Get user tax settings
// @access  Private
router.get('/settings', auth, async (req, res) => {
  try {
    // Try to get user's tax settings from Appwrite
    try {
      const settingsResult = await appwriteService.listDocuments(
        appwriteService.collections.taxCalculations || 'tax-calculations',
        [
          appwriteService.Query.equal('userId', req.user.id),
          appwriteService.Query.orderDesc('createdAt'),
          appwriteService.Query.limit(1)
        ]
      );

      if (settingsResult.documents.length > 0) {
        const settings = settingsResult.documents[0];
        return res.json({
          federalIncome: settings.federalIncome || 0.22,
          stateIncome: settings.stateIncome || 0.05,
          selfEmployment: settings.selfEmployment || 0.1413,
          totalRecommended: settings.totalRecommended || 0.30
        });
      }
    } catch (error) {
      console.log('No existing tax settings found');
    }

    // Return default settings if none found
    res.json({
      federalIncome: 0.22,
      stateIncome: 0.05,
      selfEmployment: 0.1413,
      totalRecommended: 0.30
    });
  } catch (error) {
    console.error('Error getting user tax settings:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/tax/settings
// @desc    Update user tax settings
// @access  Private
router.put('/settings', auth, async (req, res) => {
  try {
    const { federalIncome, stateIncome, selfEmployment, totalRecommended } = req.body;

    const settingsData = {
      userId: req.user.id,
      federalIncome: parseFloat(federalIncome) || 0.22,
      stateIncome: parseFloat(stateIncome) || 0.05,
      selfEmployment: parseFloat(selfEmployment) || 0.1413,
      totalRecommended: parseFloat(totalRecommended) || 0.30,
      year: new Date().getFullYear()
    };

    const settings = await appwriteService.createDocument(
      appwriteService.collections.taxCalculations || 'tax-calculations',
      settingsData
    );

    res.json({ settings });
  } catch (error) {
    console.error('Error updating tax settings:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/tax/calculate-set-aside
// @desc    Calculate tax set-aside for income
// @access  Private
router.post('/calculate-set-aside', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    const income = parseFloat(amount);

    if (!income || income <= 0) {
      return res.status(400).json({ error: 'Invalid income amount' });
    }

    // Get user's tax settings
    const settingsResult = await appwriteService.listDocuments(
      appwriteService.collections.taxCalculations || 'tax-calculations',
      [
        appwriteService.Query.equal('userId', req.user.id),
        appwriteService.Query.orderDesc('createdAt'),
        appwriteService.Query.limit(1)
      ]
    );

    const settings = settingsResult.documents.length > 0 
      ? settingsResult.documents[0]
      : {
          federalIncome: 0.22,
          stateIncome: 0.05,
          selfEmployment: 0.1413,
          totalRecommended: 0.30
        };

    // Calculate tax amounts
    const federalTax = income * settings.federalIncome;
    const stateTax = income * settings.stateIncome;
    const selfEmploymentTax = income * settings.selfEmployment;
    const totalTax = federalTax + stateTax + selfEmploymentTax;
    const recommendedSetAside = income * settings.totalRecommended;
    const netIncome = income - recommendedSetAside;

    const notification = {
      message: `Set aside $${recommendedSetAside.toFixed(2)} for taxes`,
      breakdown: [
        `Federal Income: $${federalTax.toFixed(2)}`,
        `State Income: $${stateTax.toFixed(2)}`,
        `Self-Employment: $${selfEmploymentTax.toFixed(2)}`,
        `Total Tax Estimate: $${totalTax.toFixed(2)}`,
        `Recommended Buffer: $${(recommendedSetAside - totalTax).toFixed(2)}`
      ],
      netIncome: `Net after taxes: $${netIncome.toFixed(2)}`
    };

    res.json({ notification });
  } catch (error) {
    console.error('Error calculating set-aside:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;