const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/encryption');

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
  // Encrypted at rest (see utils/encryption.js) - set/get transparently encrypt on
  // write and decrypt on read for any in-memory document access (doc.accessToken).
  // decrypt() passes through unchanged values that don't look encrypted, so tokens
  // written before this was added still work without a migration.
  accessToken: {
    type: String,
    required: function() { return this.provider === 'plaid'; },
    set: encrypt,
    get: decrypt
  },
  itemId: {
    type: String,
    required: function() { return this.provider === 'plaid'; }
  },
  institutionId: String,
  institutionName: String,
  
  // Connected accounts
  // NOTE: subdocument fields must never be named "type" - Mongoose treats a
  // `type: String` key as a shorthand type declaration for the WHOLE object
  // (turning this into `[String]` instead of a document array) rather than as
  // a field named "type". Use accountType/accountSubtype instead.
  accounts: [{
    accountId: String,
    name: String,
    officialName: String,
    accountType: String,
    accountSubtype: String,
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
