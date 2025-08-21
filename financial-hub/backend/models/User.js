const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
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
    // US-specific tax info
    federalTaxRate: {
      type: Number,
      default: 0.22 // Default 22% bracket
    },
    stateTaxRate: {
      type: Number,
      default: 0.05 // Default 5% state tax
    },
    selfEmploymentTaxRate: {
      type: Number,
      default: 0.1413 // 14.13% for self-employment
    },
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
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update updatedAt on save
UserSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Get full name
UserSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('User', UserSchema);
