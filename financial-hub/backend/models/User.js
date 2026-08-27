const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  // Clerk is the source of truth for identity/auth - this links a Clerk user to
  // their app data. Populated by the auth middleware on first sight of a new Clerk
  // session (find-or-create), and kept in sync by the Clerk webhook thereafter.
  clerkId: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  // Not required - Clerk doesn't guarantee these are populated (e.g. email-only
  // sign-up, some OAuth providers), and the auth middleware must be able to create
  // this record synchronously on first sight rather than fail the request.
  firstName: {
    type: String,
    trim: true,
    default: ''
  },
  lastName: {
    type: String,
    trim: true,
    default: ''
  },
  businessName: {
    type: String,
    trim: true
  },
  businessType: {
    type: String,
    enum: ['sole_proprietorship', 'llc', 'corporation', 's_corp', 'partnership'],
    default: 'sole_proprietorship'
  },
  taxInfo: {
    filingStatus: {
      type: String,
      enum: ['single', 'married_joint', 'married_separate', 'head_of_household'],
      default: 'single'
    },
    country: {
      type: String,
      enum: ['US', 'IN'],
      default: 'US'
    },
    // US-specific tax info. These are OPTIONAL user overrides - when unset, the tax
    // engine (services/taxCalculation.js) uses its real progressive brackets / per-state
    // table / standard SE rate instead. They must have no default: a truthy default here
    // would silently override the accurate calculation for every user, always.
    federalTaxRate: Number,
    stateTaxRate: Number,
    selfEmploymentTaxRate: Number,
    state: String,
    ein: String, // Employer Identification Number
    
    // India-specific tax info
    taxRegime: {
      type: String,
      enum: ['new', 'old'],
      default: 'new' // New tax regime is default
    },
    panNumber: String, // PAN card number for Indian users
    gstNumber: String, // GST registration number
    presumptiveTaxation: {
      type: Boolean,
      default: false // Whether using Section 44ADA
    },
    stateIndia: {
      type: String,
      enum: [
        'AN', 'AP', 'AR', 'AS', 'BR', 'CH', 'CT', 'DN', 'DD', 'DL', 'GA', 'GJ', 'HR', 'HP', 'JK', 'JH', 
        'KA', 'KL', 'LD', 'MP', 'MH', 'MN', 'ML', 'MZ', 'NL', 'OR', 'PY', 'PB', 'RJ', 'SK', 'TN', 'TG', 'TR', 'UP', 'UT', 'WB'
      ]
    }
  },
  preferences: {
    currency: {
      type: String,
      enum: ['USD', 'INR'],
      default: 'USD'
    },
    timezone: {
      type: String,
      default: 'America/New_York'
    },
    language: {
      type: String,
      enum: ['en', 'hi', 'es', 'fr'],
      default: 'en'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      taxReminders: {
        type: Boolean,
        default: true
      },
      weeklyReports: {
        type: Boolean,
        default: true
      },
      gstReminders: {
        type: Boolean,
        default: true // For Indian users
      }
    }
  },
  // Set when a user asks to be notified once bank auto-connect (Plaid) ships -
  // it's gated behind Plaid production approval, so this doubles as a demand signal.
  bankConnectWaitlist: {
    requested: {
      type: Boolean,
      default: false
    },
    requestedAt: Date
  },
  lastLogin: Date,
  // Set by the Clerk webhook on user.deleted. Not acted on anywhere yet (no cascading
  // delete/anonymization of their financial records) - purely a record for now.
  deletedAt: Date,
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
UserSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Get full name
UserSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('User', UserSchema);
