const mongoose = require('mongoose');

const platformIntegrationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  platform: {
    type: String,
    enum: ['youtube', 'twitch', 'patreon', 'substack', 'other'],
    required: true
  },
  
  // OAuth tokens
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: String,
  tokenExpiresAt: Date,
  
  // Platform-specific identifiers
  platformUserId: String,
  platformUsername: String,
  channelId: String,
  channelName: String,
  
  // Platform-specific data
  platformData: {
    // YouTube
    subscriberCount: Number,
    videoCount: Number,
    totalViews: Number,
    
    // Twitch
    followerCount: Number,
    totalBits: Number,
    subscriberTier: String,
    
    // Patreon
    patronCount: Number,
    pledgeSum: Number,
    campaignId: String,
    
    // Custom fields for extensibility
    customFields: mongoose.Schema.Types.Mixed
  },
  
  // Revenue tracking
  revenueData: [{
    date: {
      type: Date,
      required: true
    },
    totalRevenue: Number,
    adRevenue: Number,
    subscriptionRevenue: Number,
    donationRevenue: Number,
    membershipRevenue: Number,
    other: Number,
    currency: {
      type: String,
      default: 'USD'
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
platformIntegrationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
platformIntegrationSchema.index({ user: 1, platform: 1 });
platformIntegrationSchema.index({ user: 1, isActive: 1 });
platformIntegrationSchema.index({ 'revenueData.date': 1 });

module.exports = mongoose.model('PlatformIntegration', platformIntegrationSchema);
