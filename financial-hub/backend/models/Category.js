const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: true
  },
  isBusinessRelated: {
    type: Boolean,
    default: false
  },
  isTaxDeductible: {
    type: Boolean,
    default: false
  },
  taxDeductionType: {
    type: String,
    enum: ['business_expense', 'office_supplies', 'equipment', 'software', 'marketing', 'travel', 'meals', 'other']
  },
  keywords: [String], // For ML categorization
  patterns: [String], // Regex patterns for categorization
  description: String,
  icon: String,
  color: String,
  parentCategory: String,
  isDefault: {
    type: Boolean,
    default: false
  },
  creatorSpecific: {
    type: Boolean,
    default: false
  },
  platforms: [String], // Which platforms this category applies to
  confidence_threshold: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.7
  },
  usage_count: {
    type: Number,
    default: 0
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
CategorySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient searches
CategorySchema.index({ type: 1, isBusinessRelated: 1 });
CategorySchema.index({ isTaxDeductible: 1 });
CategorySchema.index({ creatorSpecific: 1 });

module.exports = mongoose.model('Category', CategorySchema);
