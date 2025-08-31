const express = require('express');
const { body, validationResult } = require('express-validator');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const auth = require('../middleware/auth');
const PDFGenerator = require('../utils/pdfGenerator');
const fs = require('fs').promises;
const path = require('path');
const nodemailer = require('nodemailer');

const router = express.Router();

// Validation rules
const invoiceValidation = [
  body('client.name').trim().notEmpty().withMessage('Client name is required'),
  body('client.email').isEmail().withMessage('Valid client email is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.description').trim().notEmpty().withMessage('Item description is required'),
  body('items.*.quantity').isFloat({ min: 0 }).withMessage('Item quantity must be positive'),
  body('items.*.rate').isFloat({ min: 0 }).withMessage('Item rate must be positive'),
  body('dueDate').isISO8601().withMessage('Valid due date is required'),
];

// @route   GET /api/invoices
// @desc    Get user invoices
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      search,
      sortBy = 'issueDate',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = { user: req.user.id };
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { 'client.name': { $regex: search, $options: 'i' } },
        { 'client.company': { $regex: search, $options: 'i' } }
      ];
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const invoices = await Invoice.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Invoice.countDocuments(query);

    // Add virtual fields
    const invoicesWithVirtuals = invoices.map(invoice => ({
      ...invoice,
      isOverdue: invoice.status !== 'paid' && invoice.status !== 'cancelled' && new Date() > invoice.dueDate,
      daysToDue: Math.ceil((invoice.dueDate - new Date()) / (1000 * 3600 * 24))
    }));

    res.json({
      invoices: invoicesWithVirtuals,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/invoices/stats
// @desc    Get invoice statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const stats = await Invoice.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total: { $sum: '$total' }
        }
      }
    ]);

    const overdue = await Invoice.countDocuments({
      user: userId,
      status: { $nin: ['paid', 'cancelled'] },
      dueDate: { $lt: new Date() }
    });

    const thisMonth = await Invoice.aggregate([
      {
        $match: {
          user: userId,
          issueDate: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          total: { $sum: '$total' }
        }
      }
    ]);

    res.json({
      byStatus: stats,
      overdue,
      thisMonth: thisMonth[0] || { count: 0, total: 0 }
    });
  } catch (error) {
    console.error('Error fetching invoice stats:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/invoices/:id
// @desc    Get single invoice
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    }).lean();

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Add virtual fields
    invoice.isOverdue = invoice.status !== 'paid' && invoice.status !== 'cancelled' && new Date() > invoice.dueDate;
    invoice.daysToDue = Math.ceil((invoice.dueDate - new Date()) / (1000 * 3600 * 24));

    res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/invoices
// @desc    Create new invoice
// @access  Private
router.post('/', auth, invoiceValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate item amounts
    const items = req.body.items.map(item => ({
      ...item,
      amount: item.quantity * item.rate
    }));

    // Generate invoice number
    const invoiceNumber = await Invoice.generateInvoiceNumber(req.user.id);

    const invoiceData = {
      ...req.body,
      user: req.user.id,
      invoiceNumber,
      items,
      currency: req.body.currency || user.preferences.currency || 'USD'
    };

    const invoice = new Invoice(invoiceData);
    await invoice.save();

    res.status(201).json(invoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Invoice number already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/invoices/:id
// @desc    Update invoice
// @access  Private
router.put('/:id', auth, invoiceValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const invoice = await Invoice.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Prevent editing paid invoices
    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Cannot edit paid invoices' });
    }

    // Calculate item amounts
    const items = req.body.items.map(item => ({
      ...item,
      amount: item.quantity * item.rate
    }));

    Object.assign(invoice, { ...req.body, items });
    await invoice.save();

    res.json(invoice);
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PATCH /api/invoices/:id/status
// @desc    Update invoice status (mark as paid, etc.)
// @access  Private
router.patch('/:id/status', auth, [
  body('status').isIn(['draft', 'sent', 'paid', 'overdue', 'cancelled']).withMessage('Invalid status'),
  body('paymentMethod').optional().isIn(['cash', 'check', 'bank_transfer', 'credit_card', 'paypal', 'other']),
  body('paymentReference').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const invoice = await Invoice.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const { status, paymentMethod, paymentReference } = req.body;

    invoice.status = status;

    if (status === 'paid') {
      invoice.paidDate = new Date();
      if (paymentMethod) invoice.paymentMethod = paymentMethod;
      if (paymentReference) invoice.paymentReference = paymentReference;
    } else {
      invoice.paidDate = undefined;
      invoice.paymentMethod = undefined;
      invoice.paymentReference = undefined;
    }

    await invoice.save();

    res.json(invoice);
  } catch (error) {
    console.error('Error updating invoice status:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/invoices/:id
// @desc    Delete invoice
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Prevent deleting paid invoices
    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Cannot delete paid invoices' });
    }

    await Invoice.findByIdAndDelete(req.params.id);

    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/invoices/:id/pdf
// @desc    Generate and download PDF
// @access  Private
router.get('/:id/pdf', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const user = await User.findById(req.user.id);

    // Generate PDF HTML template
    const html = generateInvoicePDF(invoice, user);

    // Generate PDF using the robust PDF generator
    const pdf = await PDFGenerator.generatePDF(html);

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`);
    
    res.send(pdf);

    // Update invoice as PDF generated
    invoice.pdfGenerated = true;
    await invoice.save();

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Error generating PDF' });
  }
});

// @route   POST /api/invoices/:id/email
// @desc    Send invoice via email
// @access  Private
router.post('/:id/email', auth, [
  body('to').optional().isEmail().withMessage('Valid recipient email required'),
  body('subject').optional().trim(),
  body('message').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const invoice = await Invoice.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const user = await User.findById(req.user.id);

    // Generate PDF for attachment
    const html = generateInvoicePDF(invoice, user);
    const pdf = await PDFGenerator.generatePDF(html);

    // Setup email
    if (!process.env.EMAIL_USER && !process.env.SENDGRID_API_KEY) {
      return res.status(400).json({ 
        error: 'Email service not configured. Please set EMAIL_USER and EMAIL_PASS or SENDGRID_API_KEY in environment variables.' 
      });
    }

    let transporter;
    
    if (process.env.SENDGRID_API_KEY) {
      // Use SendGrid
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      
      const recipientEmail = req.body.to || invoice.client.email;
      const subject = req.body.subject || `Invoice ${invoice.invoiceNumber} from ${user.businessName || user.fullName}`;
      const message = req.body.message || generateEmailMessage(invoice, user);

      const msg = {
        to: recipientEmail,
        from: process.env.FROM_EMAIL || user.email,
        subject,
        html: message,
        attachments: [
          {
            content: pdf.toString('base64'),
            filename: `invoice-${invoice.invoiceNumber}.pdf`,
            type: 'application/pdf',
            disposition: 'attachment'
          }
        ]
      };

      await sgMail.send(msg);
    } else {
      // Use SMTP (Gmail, etc.)
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      const recipientEmail = req.body.to || invoice.client.email;
      const subject = req.body.subject || `Invoice ${invoice.invoiceNumber} from ${user.businessName || user.fullName}`;
      const message = req.body.message || generateEmailMessage(invoice, user);

      const mailOptions = {
        from: process.env.EMAIL_USER || user.email,
        to: recipientEmail,
        subject,
        html: message,
        attachments: [
          {
            filename: `invoice-${invoice.invoiceNumber}.pdf`,
            content: pdf,
            contentType: 'application/pdf'
          }
        ]
      };

      await transporter.sendMail(mailOptions);
    }

    // Update invoice email tracking
    invoice.emailSent = true;
    invoice.emailSentDate = new Date();
    invoice.status = 'sent';
    await invoice.save();

    res.json({ message: 'Invoice sent successfully' });

  } catch (error) {
    console.error('Error sending invoice email:', error);
    res.status(500).json({ error: 'Error sending email' });
  }
});

// Helper function to generate PDF HTML
function generateInvoicePDF(invoice, user) {
  const formatDate = (date) => new Date(date).toLocaleDateString();
  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount);
  };

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice ${invoice.invoiceNumber}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
        .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .company-info h1 { margin: 0; color: #2563eb; }
        .invoice-info { text-align: right; }
        .invoice-info h2 { margin: 0; font-size: 24px; color: #2563eb; }
        .client-info { margin-bottom: 30px; }
        .invoice-details { display: flex; justify-content: space-between; margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: bold; }
        .text-right { text-align: right; }
        .totals-section { margin-left: auto; width: 300px; }
        .total-row { font-weight: bold; font-size: 18px; border-top: 2px solid #333; }
        .notes { margin-top: 30px; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-info">
            <h1>${user.businessName || user.fullName}</h1>
            <div>${user.email}</div>
        </div>
        <div class="invoice-info">
            <h2>INVOICE</h2>
            <div><strong>${invoice.invoiceNumber}</strong></div>
        </div>
    </div>

    <div class="client-info">
        <h3>Bill To:</h3>
        <div><strong>${invoice.client.name}</strong></div>
        ${invoice.client.company ? `<div>${invoice.client.company}</div>` : ''}
        <div>${invoice.client.email}</div>
        ${invoice.client.address ? `
            <div>${invoice.client.address.street}</div>
            <div>${invoice.client.address.city}, ${invoice.client.address.state} ${invoice.client.address.zipCode}</div>
            <div>${invoice.client.address.country}</div>
        ` : ''}
    </div>

    <div class="invoice-details">
        <div>
            <div><strong>Issue Date:</strong> ${formatDate(invoice.issueDate)}</div>
            <div><strong>Due Date:</strong> ${formatDate(invoice.dueDate)}</div>
        </div>
        <div>
            <div><strong>Status:</strong> ${invoice.status.toUpperCase()}</div>
            ${invoice.paidDate ? `<div><strong>Paid Date:</strong> ${formatDate(invoice.paidDate)}</div>` : ''}
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Description</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Rate</th>
                <th class="text-right">Amount</th>
            </tr>
        </thead>
        <tbody>
            ${invoice.items.map(item => `
                <tr>
                    <td>${item.description}</td>
                    <td class="text-right">${item.quantity}</td>
                    <td class="text-right">${formatCurrency(item.rate, invoice.currency)}</td>
                    <td class="text-right">${formatCurrency(item.amount, invoice.currency)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="totals-section">
        <table>
            <tr>
                <td>Subtotal:</td>
                <td class="text-right">${formatCurrency(invoice.subtotal, invoice.currency)}</td>
            </tr>
            ${invoice.discountAmount > 0 ? `
                <tr>
                    <td>Discount (${(invoice.discountRate * 100).toFixed(1)}%):</td>
                    <td class="text-right">-${formatCurrency(invoice.discountAmount, invoice.currency)}</td>
                </tr>
            ` : ''}
            ${invoice.taxAmount > 0 ? `
                <tr>
                    <td>Tax (${(invoice.taxRate * 100).toFixed(1)}%):</td>
                    <td class="text-right">${formatCurrency(invoice.taxAmount, invoice.currency)}</td>
                </tr>
            ` : ''}
            <tr class="total-row">
                <td>Total:</td>
                <td class="text-right">${formatCurrency(invoice.total, invoice.currency)}</td>
            </tr>
        </table>
    </div>

    ${invoice.notes ? `
        <div class="notes">
            <h3>Notes:</h3>
            <p>${invoice.notes}</p>
        </div>
    ` : ''}

    <div class="footer">
        <div><strong>Payment Terms:</strong> ${invoice.terms}</div>
        <div>Thank you for your business!</div>
    </div>
</body>
</html>
  `;
}

// Helper function to generate email message
function generateEmailMessage(invoice, user) {
  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount);
  };

  return `
    <h2>Invoice ${invoice.invoiceNumber}</h2>
    <p>Dear ${invoice.client.name},</p>
    <p>Please find attached invoice ${invoice.invoiceNumber} for ${formatCurrency(invoice.total, invoice.currency)}.</p>
    <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
    <p>Thank you for your business!</p>
    <br>
    <p>Best regards,<br>
    ${user.businessName || user.fullName}<br>
    ${user.email}</p>
  `;
}

module.exports = router;
