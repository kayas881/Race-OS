const mongoose = require('mongoose');

const brandingSchema = new mongoose.Schema({
  // User association
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Company Information
  companyName: {
    type: String,
    required: true,
    trim: true,
    default: 'Your Business'
  },
  
  // Logo and Visual Identity
  logo: {
    url: {
      type: String,
      trim: true
    },
    filename: {
      type: String,
      trim: true
    },
    fileSize: {
      type: Number
    },
    uploadDate: {
      type: Date,
      default: Date.now
    }
  },
  
  // Color Scheme
  colors: {
    primary: {
      type: String,
      default: '#3B82F6',
      validate: {
        validator: function(v) {
          return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
        },
        message: 'Primary color must be a valid hex color'
      }
    },
    secondary: {
      type: String,
      default: '#1F2937',
      validate: {
        validator: function(v) {
          return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
        },
        message: 'Secondary color must be a valid hex color'
      }
    },
    accent: {
      type: String,
      default: '#10B981',
      validate: {
        validator: function(v) {
          return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
        },
        message: 'Accent color must be a valid hex color'
      }
    }
  },
  
  // Contact Information
  contact: {
    website: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      trim: true
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: {
        type: String,
        default: 'US'
      }
    }
  },
  
  // Invoice Customization
  invoice: {
    footer: {
      type: String,
      trim: true,
      default: 'Thank you for your business!'
    },
    terms: {
      type: String,
      trim: true,
      default: 'Payment due within 30 days'
    },
    notes: {
      type: String,
      trim: true
    },
    showLogo: {
      type: Boolean,
      default: true
    },
    headerText: {
      type: String,
      trim: true
    }
  },
  
  // Email Settings
  email: {
    signature: {
      type: String,
      trim: true
    },
    fromName: {
      type: String,
      trim: true
    },
    replyTo: {
      type: String,
      trim: true,
      lowercase: true
    }
  },
  
  // Notification Preferences
  notifications: {
    emailReminders: {
      enabled: {
        type: Boolean,
        default: true
      },
      daysBefore: {
        type: Number,
        default: 3,
        min: 1,
        max: 30
      }
    },
    overdueNotices: {
      enabled: {
        type: Boolean,
        default: true
      },
      daysAfter: [
        {
          type: Number,
          default: [1, 7, 14, 30]
        }
      ]
    },
    weeklySummary: {
      enabled: {
        type: Boolean,
        default: true
      },
      dayOfWeek: {
        type: Number,
        default: 1, // Monday
        min: 0,
        max: 6
      },
      includeTransactions: {
        type: Boolean,
        default: true
      },
      includeTaxInfo: {
        type: Boolean,
        default: true
      }
    }
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastLogoUpdate: {
    type: Date
  }
});

// Indexes
brandingSchema.index({ userId: 1 });

// Pre-save middleware
brandingSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  if (this.isModified('logo')) {
    this.lastLogoUpdate = new Date();
  }
  next();
});

// Virtual for logo URL with fallback
brandingSchema.virtual('logoUrl').get(function() {
  if (this.logo && this.logo.url) {
    return this.logo.url;
  }
  return null;
});

// Method to get email branding data
brandingSchema.methods.getEmailBranding = function() {
  return {
    companyName: this.companyName,
    logo: this.logoUrl,
    primaryColor: this.colors.primary,
    secondaryColor: this.colors.secondary,
    website: this.contact.website || '#',
    email: this.contact.email,
    signature: this.email.signature
  };
};

// Method to get invoice branding data
brandingSchema.methods.getInvoiceBranding = function() {
  return {
    companyName: this.companyName,
    logo: this.logoUrl,
    colors: this.colors,
    contact: this.contact,
    invoice: this.invoice,
    showLogo: this.invoice.showLogo
  };
};

// Static method to get or create default branding for user
brandingSchema.statics.getOrCreateForUser = async function(userId) {
  let branding = await this.findOne({ userId });
  
  if (!branding) {
    branding = new this({
      userId,
      companyName: 'Your Business'
    });
    await branding.save();
  }
  
  return branding;
};

// Method to update logo
brandingSchema.methods.updateLogo = function(logoData) {
  this.logo = {
    url: logoData.url,
    filename: logoData.filename,
    fileSize: logoData.fileSize,
    uploadDate: new Date()
  };
  this.lastLogoUpdate = new Date();
  return this.save();
};

// Method to remove logo
brandingSchema.methods.removeLogo = function() {
  this.logo = {
    url: null,
    filename: null,
    fileSize: null,
    uploadDate: null
  };
  return this.save();
};

module.exports = mongoose.model('Branding', brandingSchema);
