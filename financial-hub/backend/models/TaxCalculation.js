const mongoose = require('mongoose');

const TaxCalculationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  period: {
    year: {
      type: Number,
      required: true
    },
    quarter: {
      type: Number,
      min: 1,
      max: 4
    },
    month: {
      type: Number,
      min: 1,
      max: 12
    }
  },
  income: {
    totalIncome: {
      type: Number,
      default: 0
    },
    businessIncome: {
      type: Number,
      default: 0
    },
    personalIncome: {
      type: Number,
      default: 0
    },
    breakdown: {
      adRevenue: { type: Number, default: 0 },
      sponsorships: { type: Number, default: 0 },
      subscriptions: { type: Number, default: 0 },
      donations: { type: Number, default: 0 },
      merchandise: { type: Number, default: 0 },
      affiliate: { type: Number, default: 0 },
      other: { type: Number, default: 0 }
    }
  },
  expenses: {
    totalExpenses: {
      type: Number,
      default: 0
    },
    deductibleExpenses: {
      type: Number,
      default: 0
    },
    breakdown: {
      equipment: { type: Number, default: 0 },
      software: { type: Number, default: 0 },
      office: { type: Number, default: 0 },
      marketing: { type: Number, default: 0 },
      travel: { type: Number, default: 0 },
      meals: { type: Number, default: 0 },
      other: { type: Number, default: 0 }
    }
  },
  taxCalculations: {
    adjustedGrossIncome: {
      type: Number,
      default: 0
    },
    selfEmploymentIncome: {
      type: Number,
      default: 0
    },
    federalTaxOwed: {
      type: Number,
      default: 0
    },
    stateTaxOwed: {
      type: Number,
      default: 0
    },
    selfEmploymentTax: {
      type: Number,
      default: 0
    },
    totalTaxOwed: {
      type: Number,
      default: 0
    },
    estimatedQuarterlyPayment: {
      type: Number,
      default: 0
    }
  },
  recommendations: {
    taxJarAmount: {
      type: Number,
      default: 0
    },
    nextQuarterlyDue: Date,
    suggestedDeductions: [{
      category: String,
      amount: Number,
      description: String
    }],
    taxStrategy: String
  },
  calculatedAt: {
    type: Date,
    default: Date.now
  },
  isEstimate: {
    type: Boolean,
    default: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.8
  }
});

// Index for efficient queries
TaxCalculationSchema.index({ user: 1, 'period.year': 1, 'period.quarter': 1 });
TaxCalculationSchema.index({ user: 1, calculatedAt: -1 });

module.exports = mongoose.model('TaxCalculation', TaxCalculationSchema);
