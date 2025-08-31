const mongoose = require('mongoose');

const CategorizationTrainingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Original transaction data used for training
  transactionData: {
    description: { type: String, required: true },
    merchantName: String,
    amount: Number,
    type: { type: String, enum: ['income', 'expense', 'transfer'] }
  },
  
  // User's manual classification
  userClassification: {
    category: {
      primary: { type: String, required: true },
      detailed: String
    },
    businessClassification: {
      type: String,
      enum: ['business', 'personal', 'mixed'],
      required: true
    },
    taxDeductible: {
      isDeductible: { type: Boolean, default: false },
      deductionType: String,
      notes: String
    }
  },
  
  // System's original prediction
  systemPrediction: {
    category: {
      primary: String,
      detailed: String,
      confidence: Number
    },
    businessClassification: String,
    taxDeductible: {
      isDeductible: Boolean,
      confidence: Number
    }
  },
  
  // Training metrics
  correctionType: {
    type: String,
    enum: ['category_correction', 'business_classification_correction', 'tax_deductible_correction', 'new_classification'],
    required: true
  },
  
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 1.0 // User corrections have high confidence
  },
  
  // Extracted features for ML training
  features: {
    keywords: [String],
    stems: [String],
    patterns: [String],
    merchant_type: String,
    amount_range: String // 'low', 'medium', 'high'
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for efficient training queries
CategorizationTrainingSchema.index({ user: 1, createdAt: -1 });
CategorizationTrainingSchema.index({ user: 1, correctionType: 1 });
CategorizationTrainingSchema.index({ user: 1, 'userClassification.category.primary': 1 });

module.exports = mongoose.model('CategorizationTraining', CategorizationTrainingSchema);
