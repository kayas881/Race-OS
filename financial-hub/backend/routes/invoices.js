const express = require('express');
const auth = require('../middleware/auth');
const Invoice = require('../models/Invoice');
const mongoose = require('mongoose');

const router = express.Router();

// Utility: calculate totals robustly
function normalizeRate(raw) {
  if (raw === undefined || raw === null || raw === '') return 0;
  const n = Number(raw);
  if (Number.isNaN(n) || n < 0) return 0;
  // Accept either decimal (0.08) or percent (8) -> convert percent to decimal
  return n > 1 ? n / 100 : n;
}

function calculateTotals(items = [], taxRate = 0, discountRate = 0) {
  const safeItems = Array.isArray(items) ? items : [];
  const subtotal = safeItems.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    return sum + qty * rate;
  }, 0);
  const discountAmount = subtotal * discountRate;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount * taxRate;
  const total = taxableAmount + taxAmount;
  return { subtotal, discountAmount, taxableAmount, taxAmount, total };
}

// --------------------------------------------------
// List Invoices with pagination + inline stats
// --------------------------------------------------
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 10, 100);

    const query = { user: req.user.id };
    if (status && status !== 'all') query.status = status;
    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { 'client.name': { $regex: search, $options: 'i' } },
        { 'client.email': { $regex: search, $options: 'i' } }
      ];
    }

    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .skip((pageNum - 1) * limitNum),
      Invoice.countDocuments(query)
    ]);

    const statsAgg = await Invoice.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(req.user.id) } },
      { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$total' } } }
    ]);

    const stats = { total: 0, paid: 0, pending: 0, overdue: 0, totalAmount: 0, paidAmount: 0, pendingAmount: 0 };
    statsAgg.forEach(s => {
      stats.total += s.count;
      stats.totalAmount += s.total;
      if (s._id === 'paid') { stats.paid = s.count; stats.paidAmount = s.total; }
      if (s._id === 'pending') { stats.pending = s.count; stats.pendingAmount = s.total; }
      if (s._id === 'overdue') { stats.overdue = s.count; }
    });

    res.json({
      invoices,
      pagination: {
        current: pageNum,
        total: Math.ceil(total / limitNum),
        hasNext: pageNum * limitNum < total,
        hasPrev: pageNum > 1
      },
      stats
    });
  } catch (err) {
    console.error('Error fetching invoices:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --------------------------------------------------
// Standalone Stats Endpoint
// --------------------------------------------------
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const byStatus = await Invoice.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$total' } } },
      { $sort: { _id: 1 } }
    ]);

    const totals = await Invoice.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, totalAmount: { $sum: '$total' }, count: { $sum: 1 } } }
    ]);

    res.json({ byStatus, overall: totals[0] || { totalAmount: 0, count: 0 } });
  } catch (err) {
    console.error('Error fetching invoice stats:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/invoices
// @desc    Create a new invoice
router.post('/', auth, async (req, res) => {
  try {
    const { client, items, dueDate, notes, terms, taxRate, discountRate } = req.body;

    if (!client || !client.name || !client.email) {
      return res.status(400).json({ error: 'Client name and email are required' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }
    if (!dueDate) {
      return res.status(400).json({ error: 'dueDate is required' });
    }

    const normTaxRate = normalizeRate(taxRate);
    const normDiscountRate = normalizeRate(discountRate);
    const { subtotal, discountAmount, taxAmount, total } = calculateTotals(items, normTaxRate, normDiscountRate);

    const invoiceCount = await Invoice.countDocuments({ user: req.user.id });
    const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(4, '0')}`;

    const invoice = new Invoice({
      user: req.user.id,
      invoiceNumber,
      client,
      items,
      subtotal,
      taxRate: normTaxRate,
      taxAmount,
      discountRate: normDiscountRate,
      discountAmount,
      total,
      dueDate: new Date(dueDate),
      notes,
      terms // status left to schema default 'draft'
    });

    await invoice.save();
    res.status(201).json(invoice);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: 'Validation failed', details: err.message });
    }
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Duplicate invoice number' });
    }
    console.error('Error creating invoice:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/invoices/:id
// @desc    Get a specific invoice
router.get('/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, user: req.user.id })
      .populate('client', 'name email');
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json(invoice);
  } catch (err) {
    console.error('Error fetching invoice:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/invoices/:id
// @desc    Update an invoice
router.put('/:id', auth, async (req, res) => {
  try {
    const { client, items, dueDate, notes, terms, taxRate, discountRate, status } = req.body;
    const invoice = await Invoice.findOne({ _id: req.params.id, user: req.user.id });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    if (client && (!client.name || !client.email)) {
      return res.status(400).json({ error: 'Client name and email are required' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }
    if (!dueDate) {
      return res.status(400).json({ error: 'dueDate is required' });
    }

    const normTaxRate = normalizeRate(taxRate);
    const normDiscountRate = normalizeRate(discountRate);
    const { subtotal, discountAmount, taxAmount, total } = calculateTotals(items, normTaxRate, normDiscountRate);

    invoice.client = client;
    invoice.items = items;
    invoice.subtotal = subtotal;
    invoice.taxRate = normTaxRate;
    invoice.taxAmount = taxAmount;
    invoice.discountRate = normDiscountRate;
    invoice.discountAmount = discountAmount;
    invoice.total = total;
    invoice.dueDate = new Date(dueDate);
    invoice.notes = notes;
    invoice.terms = terms;
    invoice.updatedAt = new Date();

    if (status) {
      const allowed = ['draft','sent','paid','overdue','cancelled'];
      if (!allowed.includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }
      invoice.status = status;
      if (status === 'paid') invoice.paidAt = new Date();
    }

    await invoice.save();
    res.json(invoice);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: 'Validation failed', details: err.message });
    }
    console.error('Error updating invoice:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PATCH /api/invoices/:id/status
// @desc    Update status (e.g., mark paid)
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status, paidAt } = req.body;
    const invoice = await Invoice.findOne({ _id: req.params.id, user: req.user.id });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (status) {
      invoice.status = status;
      if (status === 'paid') invoice.paidAt = paidAt ? new Date(paidAt) : new Date();
    }
    invoice.updatedAt = new Date();
    await invoice.save();
    res.json({ message: 'Status updated', invoice });
  } catch (err) {
    console.error('Error updating invoice status:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper for send/email logic
async function markAsSent(invoice) {
  if (!invoice.sentAt) {
    invoice.sentAt = new Date();
    if (invoice.status === 'pending') invoice.status = 'sent';
  }
  invoice.updatedAt = new Date();
  await invoice.save();
  return invoice;
}

// @route   POST /api/invoices/:id/email
// @desc    Send invoice via email (placeholder)
router.post('/:id/email', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, user: req.user.id });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    await markAsSent(invoice);
    res.json({ message: 'Email dispatch simulated (placeholder)', invoice });
  } catch (err) {
    console.error('Error emailing invoice:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/invoices/:id/send
// @desc    Alias for sending invoice (legacy)
router.post('/:id/send', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, user: req.user.id }).populate('client', 'name email');
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    await markAsSent(invoice);
    res.json({ message: 'Invoice sent successfully', invoice });
  } catch (err) {
    console.error('Error sending invoice:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/invoices/:id/pdf
// @desc    Generate PDF (placeholder)
router.get('/:id/pdf', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, user: req.user.id });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ message: 'PDF generation placeholder', invoiceId: invoice._id, invoiceNumber: invoice.invoiceNumber });
  } catch (err) {
    console.error('Error generating invoice PDF:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/invoices/:id
// @desc    Delete an invoice
router.delete('/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, user: req.user.id });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    await Invoice.deleteOne({ _id: req.params.id });
    res.json({ message: 'Invoice deleted successfully' });
  } catch (err) {
    console.error('Error deleting invoice:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
