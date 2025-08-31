const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const Invoice = require('../models/Invoice');
const auth = require('../middleware/auth');

// @route   GET /api/clients
// @desc    Get all clients for user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // Build query
    const query = { userId: req.user.id };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      query.status = status;
    }

    const clients = await Client.find(query)
      .sort({ [sortBy]: sortOrder })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Client.countDocuments(query);

    // Update outstanding balances for each client
    for (let client of clients) {
      await client.calculateOutstandingBalance();
      await client.save();
    }

    res.json({
      clients,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/clients/dashboard
// @desc    Get client dashboard data
// @access  Private
router.get('/dashboard', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get clients with outstanding balances
    const clientsWithDebt = await Client.find({
      userId,
      outstandingBalance: { $gt: 0 },
      status: 'active'
    }).sort({ outstandingBalance: -1 }).limit(10);

    // Get recent clients
    const recentClients = await Client.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5);

    // Get overdue invoices grouped by client
    const overdueInvoices = await Invoice.aggregate([
      {
        $match: {
          user: userId,
          status: { $in: ['sent', 'overdue'] },
          dueDate: { $lt: new Date() }
        }
      },
      {
        $group: {
          _id: '$client.email',
          clientName: { $first: '$client.name' },
          company: { $first: '$client.company' },
          totalOverdue: { $sum: '$total' },
          invoiceCount: { $sum: 1 },
          oldestDueDate: { $min: '$dueDate' }
        }
      },
      {
        $sort: { totalOverdue: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Calculate summary statistics
    const stats = await Client.aggregate([
      {
        $match: { userId }
      },
      {
        $group: {
          _id: null,
          totalClients: { $sum: 1 },
          activeClients: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          totalOutstanding: { $sum: '$outstandingBalance' },
          totalBilled: { $sum: '$totalBilled' },
          totalPaid: { $sum: '$totalPaid' }
        }
      }
    ]);

    const summary = stats[0] || {
      totalClients: 0,
      activeClients: 0,
      totalOutstanding: 0,
      totalBilled: 0,
      totalPaid: 0
    };

    res.json({
      summary,
      clientsWithDebt,
      recentClients,
      overdueInvoices
    });
  } catch (error) {
    console.error('Error fetching client dashboard:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/clients/:id
// @desc    Get single client
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const client = await Client.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Get client's invoices
    const invoices = await Invoice.find({
      user: req.user.id,
      'client.email': client.email
    }).sort({ issueDate: -1 });

    // Update outstanding balance
    await client.calculateOutstandingBalance();
    await client.save();

    res.json({
      client,
      invoices,
      invoiceCount: invoices.length,
      paidInvoices: invoices.filter(inv => inv.status === 'paid').length,
      overdueInvoices: invoices.filter(inv => inv.isOverdue && inv.status !== 'paid').length
    });
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/clients
// @desc    Create new client
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      company,
      website,
      industry,
      address,
      billingInfo,
      notes,
      tags
    } = req.body;

    // Check if client with this email already exists
    const existingClient = await Client.findOne({
      userId: req.user.id,
      email: email.toLowerCase()
    });

    if (existingClient) {
      return res.status(400).json({ message: 'Client with this email already exists' });
    }

    const client = new Client({
      name,
      email: email.toLowerCase(),
      phone,
      company,
      website,
      industry,
      address,
      billingInfo,
      notes,
      tags,
      userId: req.user.id
    });

    await client.save();

    res.status(201).json({
      message: 'Client created successfully',
      client
    });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/clients/:id
// @desc    Update client
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const client = await Client.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (key !== 'userId' && key !== '_id') {
        client[key] = req.body[key];
      }
    });

    await client.save();

    res.json({
      message: 'Client updated successfully',
      client
    });
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/clients/:id
// @desc    Delete client (soft delete - set status to inactive)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const client = await Client.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Check if client has outstanding invoices
    const outstandingInvoices = await Invoice.countDocuments({
      user: req.user.id,
      'client.email': client.email,
      status: { $in: ['sent', 'overdue', 'partial'] }
    });

    if (outstandingInvoices > 0) {
      // Soft delete - set status to inactive
      client.status = 'inactive';
      await client.save();
      
      return res.json({
        message: 'Client marked as inactive due to outstanding invoices',
        client
      });
    }

    // Hard delete if no outstanding invoices
    await Client.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Client deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/clients/:id/quick-invoice
// @desc    Create quick invoice for client
// @access  Private
router.post('/:id/quick-invoice', auth, async (req, res) => {
  try {
    const client = await Client.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    const { description, amount, dueInDays = 30 } = req.body;

    // Generate invoice number
    const invoiceNumber = await Invoice.generateInvoiceNumber(req.user.id);
    
    // Calculate due date
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueInDays);

    // Create invoice with client data
    const invoice = new Invoice({
      invoiceNumber,
      user: req.user.id,
      client: {
        name: client.name,
        email: client.email,
        company: client.company,
        address: client.address,
        phone: client.phone
      },
      items: [{
        description,
        quantity: 1,
        rate: amount,
        amount
      }],
      subtotal: amount,
      total: amount,
      dueDate,
      status: 'draft'
    });

    await invoice.save();

    // Update client's total billed
    client.totalBilled += amount;
    await client.save();

    res.status(201).json({
      message: 'Quick invoice created successfully',
      invoice
    });
  } catch (error) {
    console.error('Error creating quick invoice:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
