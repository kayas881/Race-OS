const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  description: {
    type: String,
    required: true
  },
  merchantName: String,
  date: {
    type: Date,
    required: true
  },
  type: {
    type: String,
    enum: ['income', 'expense', 'transfer'],
    required: true
  },
  category: {
    primary: {
      type: String,
      required: true
    },
    detailed: String,
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    }
  },
  businessClassification: {
    type: String,
    enum: ['business', 'personal', 'mixed', 'unknown'],
    default: 'unknown'
  },
  taxDeductible: {
    isDeductible: {
      type: Boolean,
      default: false
    },
    deductionType: {
      type: String,
      enum: ['business_expense', 'office_supplies', 'equipment', 'software', 'marketing', 'travel', 'meals', 'other']
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    },
    notes: String
  },
  platformData: {
    // Creator platform specific data
    platform: String,
    revenue_type: {
      type: String,
      enum: ['ad_revenue', 'sponsorship', 'subscription', 'donation', 'merchandise', 'affiliate', 'other']
    },
    viewer_metrics: {
      views: Number,
      engagement_rate: Number,
      subscriber_change: Number
    },
    payout_period: String
  },
  tags: [String],
  notes: String,
  isManual: {
    type: Boolean,
    default: false
  },
  isReviewed: {
    type: Boolean,
    default: false
  },
  reviewedAt: Date,
  reviewedBy: String,
  attachments: [{
    filename: String,
    url: String,
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update updatedAt on save
TransactionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes for efficient queries
TransactionSchema.index({ user: 1, date: -1 });
TransactionSchema.index({ user: 1, 'category.primary': 1 });
TransactionSchema.index({ user: 1, businessClassification: 1 });
TransactionSchema.index({ user: 1, 'taxDeductible.isDeductible': 1 });
TransactionSchema.index({ account: 1, date: -1 });

// Virtual for formatted amount
TransactionSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: this.currency
  }).format(this.amount);
});

module.exports = mongoose.model('Transaction', TransactionSchema);
