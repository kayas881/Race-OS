const mongoose = require('mongoose');

const bankIntegrationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  provider: {
    type: String,
    enum: ['plaid', 'manual'],
    required: true
  },
  // Plaid specific fields
  accessToken: {
    type: String,
    required: function() { return this.provider === 'plaid'; }
  },
  itemId: {
    type: String,
    required: function() { return this.provider === 'plaid'; }
  },
  institutionId: String,
  institutionName: String,
  
  // Connected accounts
  accounts: [{
    accountId: String,
    name: String,
    officialName: String,
    type: String,
    subtype: String,
    mask: String,
    balances: {
      current: Number,
      available: Number,
      limit: Number
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  
  // Sync settings
  autoSync: {
    type: Boolean,
    default: true
  },
  syncFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: 'daily'
  },
  lastSyncAt: Date,
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['connected', 'error', 'disconnected', 'pending'],
    default: 'pending'
  },
  errorMessage: String,
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
bankIntegrationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
bankIntegrationSchema.index({ user: 1, provider: 1 });
bankIntegrationSchema.index({ user: 1, isActive: 1 });

module.exports = mongoose.model('BankIntegration', bankIntegrationSchema);
