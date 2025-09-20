const express = require('express');
const auth = require('../middleware/auth');
const appwriteService = require('../config/appwrite');

const router = express.Router();

// @route   GET /api/invoices
// @desc    Get all invoices for user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      clientId,
      dateFrom,
      dateTo,
      search
    } = req.query;

    // Build Appwrite queries
    const queries = [
      appwriteService.Query.equal('userId', req.user.id),
      appwriteService.Query.orderDesc('createdAt'),
      appwriteService.Query.limit(parseInt(limit)),
      appwriteService.Query.offset((parseInt(page) - 1) * parseInt(limit))
    ];

    // Add status filter
    if (status) {
      queries.push(appwriteService.Query.equal('status', status));
    }

    // Add client filter
    if (clientId) {
      queries.push(appwriteService.Query.equal('clientId', clientId));
    }

    // Add date range filters
    if (dateFrom) {
      queries.push(appwriteService.Query.greaterThanEqual('createdAt', new Date(dateFrom).toISOString()));
    }
    if (dateTo) {
      queries.push(appwriteService.Query.lessThanEqual('createdAt', new Date(dateTo).toISOString()));
    }

    // Add search filter (for invoice number or client name)
    if (search) {
      queries.push(appwriteService.Query.search('invoiceNumber', search));
    }

    const result = await appwriteService.listDocuments(
      appwriteService.collections.invoices || 'invoices',
      queries
    );

    // Get total count for pagination
    const totalResult = await appwriteService.listDocuments(
      appwriteService.collections.invoices || 'invoices',
      [appwriteService.Query.equal('userId', req.user.id)]
    );

    const invoices = result.documents;
    const total = totalResult.total;
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      invoices,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        total,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/invoices/:id
// @desc    Get single invoice
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const invoice = await appwriteService.getDocument(
      appwriteService.collections.invoices || 'invoices',
      req.params.id
    );

    // Check if invoice belongs to user
    if (invoice.userId !== req.user.id) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (error) {
    if (error.code === 404) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/invoices
// @desc    Create new invoice
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const {
      clientId,
      invoiceNumber,
      items,
      dueDate,
      notes,
      terms
    } = req.body;

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const tax = subtotal * 0.1; // 10% tax rate - could be configurable
    const total = subtotal + tax;

    const invoiceData = {
      userId: req.user.id,
      clientId,
      invoiceNumber,
      items: JSON.stringify(items),
      subtotal,
      tax,
      total,
      status: 'pending',
      dueDate: new Date(dueDate).toISOString(),
      notes: notes || '',
      terms: terms || '',
      sentAt: null,
      paidAt: null
    };

    const invoice = await appwriteService.createDocument(
      appwriteService.collections.invoices || 'invoices',
      invoiceData
    );

    res.status(201).json(invoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/invoices/:id
// @desc    Update invoice
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const invoice = await appwriteService.getDocument(
      appwriteService.collections.invoices || 'invoices',
      req.params.id
    );

    // Check if invoice belongs to user
    if (invoice.userId !== req.user.id) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Prepare update data
    const updateData = { ...req.body };
    
    // Recalculate totals if items changed
    if (updateData.items) {
      const items = Array.isArray(updateData.items) ? updateData.items : JSON.parse(updateData.items);
      updateData.items = JSON.stringify(items);
      updateData.subtotal = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
      updateData.tax = updateData.subtotal * 0.1;
      updateData.total = updateData.subtotal + updateData.tax;
    }

    // Handle status changes
    if (updateData.status === 'sent' && !invoice.sentAt) {
      updateData.sentAt = new Date().toISOString();
    }
    if (updateData.status === 'paid' && !invoice.paidAt) {
      updateData.paidAt = new Date().toISOString();
    }

    const updatedInvoice = await appwriteService.updateDocument(
      appwriteService.collections.invoices || 'invoices',
      req.params.id,
      updateData
    );

    res.json(updatedInvoice);
  } catch (error) {
    if (error.code === 404) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    console.error('Error updating invoice:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/invoices/:id
// @desc    Delete invoice
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const invoice = await appwriteService.getDocument(
      appwriteService.collections.invoices || 'invoices',
      req.params.id
    );

    // Check if invoice belongs to user
    if (invoice.userId !== req.user.id) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    await appwriteService.deleteDocument(
      appwriteService.collections.invoices || 'invoices',
      req.params.id
    );

    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    if (error.code === 404) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;