const TaxCalculation = require('../models/TaxCalculation');
const Transaction = require('../models/Transaction');

class TaxService {
  constructor() {
    // US Quarterly tax due dates for 2025
    this.quarterlyDueDates = {
      Q1: new Date('2025-04-15'), // Q1 2025 due April 15, 2025
      Q2: new Date('2025-06-16'), // Q2 2025 due June 16, 2025 (June 15 is Sunday)
      Q3: new Date('2025-09-15'), // Q3 2025 due September 15, 2025
      Q4: new Date('2026-01-15')  // Q4 2025 due January 15, 2026
    };

    // Default tax rates for freelancers/creators
    this.defaultTaxRates = {
      federalIncome: 0.22,     // 22% federal income tax bracket
      stateIncome: 0.05,       // 5% average state income tax
      selfEmployment: 0.1413,  // 14.13% SE tax (reduced by deduction)
      totalRecommended: 0.30   // 30% recommended set-aside
    };

    // Indian tax rates for comparison
    this.indianTaxRates = {
      incomeTax: 0.20,         // 20% for higher income brackets
      gst: 0.18,               // 18% GST on services
      totalRecommended: 0.25   // 25% recommended set-aside
    };
  }

  // Get upcoming quarterly due dates
  getUpcomingQuarterlyDates() {
    const now = new Date();
    const upcoming = [];

    Object.entries(this.quarterlyDueDates).forEach(([quarter, dueDate]) => {
      if (dueDate > now) {
        const daysUntil = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
        upcoming.push({
          quarter,
          dueDate: dueDate.toISOString(),
          daysUntil,
          isUrgent: daysUntil <= 30,
          isPastDue: false
        });
      }
    });

    // Also check for recently past due dates (within 30 days)
    Object.entries(this.quarterlyDueDates).forEach(([quarter, dueDate]) => {
      if (dueDate <= now) {
        const daysPast = Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24));
        if (daysPast <= 30) {
          upcoming.push({
            quarter,
            dueDate: dueDate.toISOString(),
            daysUntil: -daysPast,
            isUrgent: true,
            isPastDue: true
          });
        }
      }
    });

    return upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
  }

  // Calculate current quarter
  getCurrentQuarter() {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12

    if (month <= 3) return 'Q1';
    if (month <= 6) return 'Q2';
    if (month <= 9) return 'Q3';
    return 'Q4';
  }

  // Calculate tax set-aside for new income
  calculateTaxSetAside(amount, userTaxSettings = null, country = 'US') {
    const rates = country === 'US' ? this.defaultTaxRates : this.indianTaxRates;
    const userRates = userTaxSettings || {};

    const federalRate = userRates.federalIncome || rates.federalIncome || rates.incomeTax;
    const stateRate = userRates.stateIncome || rates.stateIncome || 0;
    const seRate = userRates.selfEmployment || rates.selfEmployment || rates.gst;
    const totalRate = userRates.totalRecommended || rates.totalRecommended;

    const federalTax = amount * federalRate;
    const stateTax = amount * stateRate;
    const seTax = amount * seRate;
    const totalSetAside = amount * totalRate;

    return {
      grossIncome: amount,
      breakdown: {
        federal: federalTax,
        state: stateTax,
        selfEmployment: seTax
      },
      totalSetAside: totalSetAside,
      netIncome: amount - totalSetAside,
      recommendedRate: totalRate,
      country
    };
  }

  // Get quarterly tax summary
  async getQuarterlyTaxSummary(userId, year = new Date().getFullYear()) {
    try {
      const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
      const summary = {};

      for (const quarter of quarters) {
        const { startDate, endDate } = this.getQuarterDateRange(quarter, year);
        
        // Get business income for the quarter
        const incomeTransactions = await Transaction.find({
          user: userId,
          type: 'income',
          businessClassification: 'business',
          date: { $gte: startDate, $lte: endDate }
        });

        // Get business expenses for the quarter
        const expenseTransactions = await Transaction.find({
          user: userId,
          type: 'expense',
          businessClassification: 'business',
          date: { $gte: startDate, $lte: endDate }
        });

        // Get tax deductible expenses
        const deductibleExpenses = await Transaction.find({
          user: userId,
          type: 'expense',
          'taxDeductible.isDeductible': true,
          date: { $gte: startDate, $lte: endDate }
        });

        const grossIncome = incomeTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const businessExpenses = expenseTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const deductibleAmount = deductibleExpenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const netIncome = grossIncome - businessExpenses;

        // Calculate estimated taxes
        const taxEstimate = this.calculateTaxSetAside(netIncome);

        summary[quarter] = {
          period: { startDate, endDate },
          grossIncome,
          businessExpenses,
          deductibleAmount,
          netIncome,
          estimatedTax: taxEstimate.totalSetAside,
          dueDate: this.quarterlyDueDates[quarter],
          transactionCount: incomeTransactions.length + expenseTransactions.length
        };
      }

      return summary;
    } catch (error) {
      console.error('Error calculating quarterly tax summary:', error);
      throw error;
    }
  }

  // Get quarter date range
  getQuarterDateRange(quarter, year) {
    const ranges = {
      Q1: { start: [0, 1], end: [2, 31] },   // Jan 1 - Mar 31
      Q2: { start: [3, 1], end: [5, 30] },   // Apr 1 - Jun 30
      Q3: { start: [6, 1], end: [8, 30] },   // Jul 1 - Sep 30
      Q4: { start: [9, 1], end: [11, 31] }   // Oct 1 - Dec 31
    };

    const range = ranges[quarter];
    const startDate = new Date(year, range.start[0], range.start[1]);
    const endDate = new Date(year, range.end[0], range.end[1]);

    return { startDate, endDate };
  }

  // Generate tax reminder notifications
  generateTaxReminders(upcomingDates, quarterlyIncome) {
    const reminders = [];

    upcomingDates.forEach(date => {
      if (date.isPastDue) {
        reminders.push({
          type: 'error',
          priority: 'high',
          message: `${date.quarter} taxes are ${Math.abs(date.daysUntil)} days overdue!`,
          action: 'File and pay immediately to avoid penalties',
          quarter: date.quarter,
          dueDate: date.dueDate
        });
      } else if (date.isUrgent) {
        reminders.push({
          type: 'warning',
          priority: 'high',
          message: `${date.quarter} taxes due in ${date.daysUntil} days`,
          action: 'Prepare your quarterly tax payment',
          quarter: date.quarter,
          dueDate: date.dueDate
        });
      } else if (date.daysUntil <= 60) {
        reminders.push({
          type: 'info',
          priority: 'medium',
          message: `${date.quarter} taxes due in ${date.daysUntil} days`,
          action: 'Start gathering tax documents',
          quarter: date.quarter,
          dueDate: date.dueDate
        });
      }
    });

    return reminders;
  }

  // Calculate year-to-date tax liability
  async calculateYTDTaxLiability(userId, year = new Date().getFullYear()) {
    try {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);

      // Get all business income for the year
      const incomeTransactions = await Transaction.find({
        user: userId,
        type: 'income',
        businessClassification: 'business',
        date: { $gte: startDate, $lte: endDate }
      });

      // Get all deductible expenses for the year
      const deductibleExpenses = await Transaction.find({
        user: userId,
        type: 'expense',
        'taxDeductible.isDeductible': true,
        date: { $gte: startDate, $lte: endDate }
      });

      const totalIncome = incomeTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const totalDeductions = deductibleExpenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const netIncome = totalIncome - totalDeductions;

      const taxCalculation = this.calculateTaxSetAside(netIncome);

      return {
        year,
        totalIncome,
        totalDeductions,
        netIncome,
        estimatedTax: taxCalculation.totalSetAside,
        effectiveRate: netIncome > 0 ? (taxCalculation.totalSetAside / netIncome) : 0,
        breakdown: taxCalculation.breakdown,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error calculating YTD tax liability:', error);
      throw error;
    }
  }

  // Save user tax settings
  async saveUserTaxSettings(userId, settings) {
    try {
      const taxCalc = await TaxCalculation.findOneAndUpdate(
        { user: userId, year: new Date().getFullYear() },
        {
          userTaxSettings: settings,
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );

      return taxCalc;
    } catch (error) {
      console.error('Error saving user tax settings:', error);
      throw error;
    }
  }

  // Get user tax settings
  async getUserTaxSettings(userId) {
    try {
      const taxCalc = await TaxCalculation.findOne({
        user: userId,
        year: new Date().getFullYear()
      });

      return taxCalc?.userTaxSettings || this.defaultTaxRates;
    } catch (error) {
      console.error('Error getting user tax settings:', error);
      return this.defaultTaxRates;
    }
  }
}

module.exports = new TaxService();
