const mongoose = require('mongoose');

const AccountSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  accountId: {
    type: String,
    required: true,
    unique: true
  },
  institutionId: String,
  institutionName: String,
  accountName: {
    type: String,
    required: true
  },
  accountType: {
    type: String,
    enum: ['checking', 'savings', 'credit', 'investment', 'business', 'creator_platform'],
    required: true
  },
  accountSubtype: String,
  platform: {
    type: String,
    enum: ['plaid', 'youtube', 'twitch', 'patreon', 'substack', 'stripe', 'paypal', 'manual'],
    required: true
  },
  balance: {
    available: Number,
    current: Number,
    currency: {
      type: String,
      default: 'USD'
    }
  },
  credentials: {
    // Encrypted credentials for API access
    accessToken: String,
    refreshToken: String,
    itemId: String, // For Plaid
    channelId: String, // For YouTube
    userId: String, // For Twitch/Patreon
    apiKey: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastSynced: Date,
  syncFrequency: {
    type: String,
    enum: ['real-time', 'hourly', 'daily', 'weekly'],
    default: 'daily'
  },
  syncStatus: {
    type: String,
    enum: ['connected', 'error', 'pending', 'disconnected'],
    default: 'pending'
  },
  syncError: {
    message: String,
    code: String,
    lastOccurred: Date
  },
  metadata: {
    // Additional platform-specific data
    subscriberCount: Number,
    followerCount: Number,
    averageViewership: Number,
    platformFees: Number
  },
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
AccountSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
AccountSchema.index({ user: 1, platform: 1 });
AccountSchema.index({ user: 1, isActive: 1 });

module.exports = mongoose.model('Account', AccountSchema);
