const mongoose = require('mongoose');

const InvoiceItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 1
  },
  rate: {
    type: Number,
    required: true,
    min: 0
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  }
});

const ClientSchema = new mongoose.Schema({
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
  company: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  phone: String,
  taxId: String // Tax ID or VAT number
});

const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  client: {
    type: ClientSchema,
    required: true
  },
  items: [InvoiceItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  taxRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 1 // Percentage as decimal (e.g., 0.08 for 8%)
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  discountRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 1
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    enum: ['USD', 'INR', 'EUR', 'GBP'],
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
    default: 'draft',
    index: true
  },
  issueDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  paidDate: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  },
  terms: {
    type: String,
    default: 'Payment due within 30 days',
    trim: true
  },
  // Email tracking
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentDate: {
    type: Date
  },
  emailOpenCount: {
    type: Number,
    default: 0
  },
  lastEmailOpened: {
    type: Date
  },
  // PDF generation
  pdfGenerated: {
    type: Boolean,
    default: false
  },
  pdfPath: String,
  // Payment tracking
  paymentMethod: {
    type: String,
    enum: ['cash', 'check', 'bank_transfer', 'credit_card', 'paypal', 'other']
  },
  paymentReference: String,
  // Recurring invoice support
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringFrequency: {
    type: String,
    enum: ['weekly', 'monthly', 'quarterly', 'annually']
  },
  nextInvoiceDate: Date,
  originalInvoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  }
}, {
  timestamps: true
});

// Calculate amounts before validation and saving
InvoiceSchema.pre('validate', function(next) {
  // Ensure items have calculated amounts
  this.items.forEach(item => {
    if (item.quantity && item.rate) {
      item.amount = item.quantity * item.rate;
    }
  });
  
  // Calculate subtotal
  this.subtotal = this.items.reduce((sum, item) => sum + (item.amount || 0), 0);
  
  // Convert percentage rates to decimals if needed (25 -> 0.25)
  if (this.taxRate && this.taxRate > 1) {
    this.taxRate = this.taxRate / 100;
  }
  if (this.discountRate && this.discountRate > 1) {
    this.discountRate = this.discountRate / 100;
  }
  
  // Calculate discount amount
  this.discountAmount = this.subtotal * (this.discountRate || 0);
  
  // Calculate tax amount (after discount)
  const taxableAmount = this.subtotal - this.discountAmount;
  this.taxAmount = taxableAmount * (this.taxRate || 0);
  
  // Calculate total
  this.total = this.subtotal - this.discountAmount + this.taxAmount;
  
  next();
});

// Calculate item amounts before saving
InvoiceItemSchema.pre('save', function(next) {
  this.amount = this.quantity * this.rate;
  next();
});

// Generate invoice number
InvoiceSchema.statics.generateInvoiceNumber = async function(userId) {
  const year = new Date().getFullYear();
  const count = await this.countDocuments({ 
    user: userId,
    createdAt: {
      $gte: new Date(year, 0, 1),
      $lt: new Date(year + 1, 0, 1)
    }
  });
  
  return `INV-${year}-${String(count + 1).padStart(4, '0')}`;
};

// Check if invoice is overdue
InvoiceSchema.virtual('isOverdue').get(function() {
  if (this.status === 'paid' || this.status === 'cancelled') {
    return false;
  }
  return new Date() > this.dueDate;
});

// Days until due/overdue
InvoiceSchema.virtual('daysToDue').get(function() {
  const today = new Date();
  const timeDiff = this.dueDate.getTime() - today.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
});

// Indexes for performance
InvoiceSchema.index({ user: 1, status: 1 });
InvoiceSchema.index({ user: 1, issueDate: -1 });
InvoiceSchema.index({ user: 1, dueDate: 1 });
// Note: invoiceNumber unique index is created by the unique: true in schema definition

module.exports = mongoose.model('Invoice', InvoiceSchema);