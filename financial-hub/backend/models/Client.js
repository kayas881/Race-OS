const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  
  // Business Information
  company: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  industry: {
    type: String,
    trim: true
  },
  
  // Address Information
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: {
      type: String,
      default: 'US'
    }
  },
  
  // Billing Information
  billingInfo: {
    defaultRate: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    paymentTerms: {
      type: String,
      enum: ['net-15', 'net-30', 'net-45', 'net-60', 'due-on-receipt'],
      default: 'net-30'
    },
    preferredPaymentMethod: {
      type: String,
      enum: ['bank-transfer', 'check', 'paypal', 'stripe', 'other'],
      default: 'bank-transfer'
    }
  },
  
  // Financial Summary
  totalBilled: {
    type: Number,
    default: 0
  },
  totalPaid: {
    type: Number,
    default: 0
  },
  outstandingBalance: {
    type: Number,
    default: 0
  },
  
  // Status and Notes
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'blocked'],
    default: 'active'
  },
  notes: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  
  // Metadata
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastContactDate: {
    type: Date
  }
});

// Indexes for performance
clientSchema.index({ userId: 1, email: 1 });
clientSchema.index({ userId: 1, status: 1 });
clientSchema.index({ userId: 1, outstandingBalance: -1 });

// Pre-save middleware to update timestamps
clientSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for full name display
clientSchema.virtual('displayName').get(function() {
  if (this.company) {
    return `${this.name} (${this.company})`;
  }
  return this.name;
});

// Method to calculate outstanding balance
clientSchema.methods.calculateOutstandingBalance = async function() {
  const Invoice = mongoose.model('Invoice');
  const result = await Invoice.aggregate([
    {
      $match: {
        clientId: this._id,
        status: { $in: ['sent', 'overdue', 'partial'] }
      }
    },
    {
      $group: {
        _id: null,
        totalOutstanding: { $sum: '$amount' },
        totalPaid: { $sum: '$paidAmount' }
      }
    }
  ]);
  
  if (result.length > 0) {
    this.outstandingBalance = result[0].totalOutstanding - (result[0].totalPaid || 0);
  } else {
    this.outstandingBalance = 0;
  }
  
  return this.outstandingBalance;
};

// Method to get payment status
clientSchema.methods.getPaymentStatus = function() {
  if (this.outstandingBalance === 0) return 'paid';
  if (this.outstandingBalance > 0) return 'outstanding';
  return 'overpaid';
};

module.exports = mongoose.model('Client', clientSchema);
