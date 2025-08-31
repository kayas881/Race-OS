const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const notificationScheduler = require('../services/notificationScheduler');
const emailService = require('../services/emailService');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const Branding = require('../models/Branding');

// @route   GET /api/notifications/status
// @desc    Get notification scheduler status
// @access  Private
router.get('/status', auth, async (req, res) => {
  try {
    const status = notificationScheduler.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting notification status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/notifications/test/invoice-reminder
// @desc    Send test invoice reminder
// @access  Private
router.post('/test/invoice-reminder', auth, async (req, res) => {
  try {
    const { invoiceId, clientEmail } = req.body;
    
    if (!invoiceId) {
      return res.status(400).json({ message: 'Invoice ID is required' });
    }

    const invoice = await Invoice.findOne({
      _id: invoiceId,
      user: req.user.id
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const branding = await Branding.getOrCreateForUser(req.user.id);
    
    // Use provided email or invoice client email
    const targetEmail = clientEmail || invoice.client.email;
    const clientData = {
      ...invoice.client,
      email: targetEmail
    };

    const result = await emailService.sendInvoiceReminder(
      invoice,
      clientData,
      branding.getEmailBranding()
    );

    if (result.success) {
      res.json({
        message: 'Test invoice reminder sent successfully',
        testUrl: result.testUrl
      });
    } else {
      res.status(500).json({
        message: 'Failed to send test reminder',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error sending test invoice reminder:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/notifications/test/overdue-notice
// @desc    Send test overdue notice
// @access  Private
router.post('/test/overdue-notice', auth, async (req, res) => {
  try {
    const { invoiceId, clientEmail } = req.body;
    
    if (!invoiceId) {
      return res.status(400).json({ message: 'Invoice ID is required' });
    }

    const invoice = await Invoice.findOne({
      _id: invoiceId,
      user: req.user.id
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const branding = await Branding.getOrCreateForUser(req.user.id);
    
    // Use provided email or invoice client email
    const targetEmail = clientEmail || invoice.client.email;
    const clientData = {
      ...invoice.client,
      email: targetEmail
    };

    const result = await emailService.sendOverdueNotice(
      invoice,
      clientData,
      branding.getEmailBranding()
    );

    if (result.success) {
      res.json({
        message: 'Test overdue notice sent successfully',
        testUrl: result.testUrl
      });
    } else {
      res.status(500).json({
        message: 'Failed to send test overdue notice',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error sending test overdue notice:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mock notification storage (in production, this would be in database)
const notifications = [];

// Get recent notifications
router.get('/recent', auth, async (req, res) => {
  try {
    // Get recent notifications for the user (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const userNotifications = notifications
      .filter(notification => 
        notification.userId === req.user.id && 
        new Date(notification.sentAt) >= thirtyDaysAgo
      )
      .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
    
    res.json(userNotifications);
  } catch (error) {
    console.error('Error fetching recent notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

// Store notification (helper function)
const storeNotification = (userId, type, subject, recipient, status = 'sent') => {
  notifications.push({
    id: Date.now() + Math.random(),
    userId,
    type,
    subject,
    recipient,
    status,
    sentAt: new Date()
  });
  
  // Keep only last 100 notifications per user to prevent memory issues
  const userNotifications = notifications.filter(n => n.userId === userId);
  if (userNotifications.length > 100) {
    const oldestNotification = userNotifications[userNotifications.length - 1];
    const index = notifications.indexOf(oldestNotification);
    if (index > -1) {
      notifications.splice(index, 1);
    }
  }
};

// Test weekly summary email
router.post('/test/weekly-summary', auth, async (req, res) => {
  try {
    const result = await emailService.sendWeeklySummary(req.user.id);
    
    // Store notification
    storeNotification(
      req.user.id,
      'weekly-summary',
      'Weekly Financial Summary',
      req.user.email,
      'sent'
    );
    
    res.json({
      message: 'Weekly summary email sent successfully',
      testUrl: result.testUrl
    });
  } catch (error) {
    console.error('Error sending weekly summary:', error);
    
    // Store failed notification
    storeNotification(
      req.user.id,
      'weekly-summary',
      'Weekly Financial Summary',
      req.user.email,
      'failed'
    );
    
    res.status(500).json({ message: 'Error sending weekly summary email' });
  }
});

// Test invoice reminder email
router.post('/test/invoice-reminder', auth, async (req, res) => {
  try {
    // Create a mock invoice for testing
    const mockInvoice = {
      _id: 'test-invoice-123',
      invoiceNumber: 'INV-TEST-001',
      client: {
        name: 'Test Client',
        email: req.user.email
      },
      amount: 1500,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      status: 'pending'
    };
    
    const result = await emailService.sendInvoiceReminder(mockInvoice);
    
    // Store notification
    storeNotification(
      req.user.id,
      'invoice-reminder',
      `Invoice Reminder - ${mockInvoice.invoiceNumber}`,
      req.user.email,
      'sent'
    );
    
    res.json({
      message: 'Invoice reminder email sent successfully',
      testUrl: result.testUrl
    });
  } catch (error) {
    console.error('Error sending invoice reminder:', error);
    
    // Store failed notification
    storeNotification(
      req.user.id,
      'invoice-reminder',
      'Invoice Reminder - Test',
      req.user.email,
      'failed'
    );
    
    res.status(500).json({ message: 'Error sending invoice reminder email' });
  }
});

// Test overdue invoice email
router.post('/test/overdue-invoice', auth, async (req, res) => {
  try {
    // Create a mock overdue invoice for testing
    const mockInvoice = {
      _id: 'test-overdue-123',
      invoiceNumber: 'INV-TEST-002',
      client: {
        name: 'Test Client',
        email: req.user.email
      },
      amount: 2500,
      dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      status: 'overdue'
    };
    
    const result = await emailService.sendOverdueInvoiceNotice(mockInvoice, 5);
    
    // Store notification
    storeNotification(
      req.user.id,
      'overdue-invoice',
      `Overdue Invoice - ${mockInvoice.invoiceNumber}`,
      req.user.email,
      'sent'
    );
    
    res.json({
      message: 'Overdue invoice email sent successfully',
      testUrl: result.testUrl
    });
  } catch (error) {
    console.error('Error sending overdue invoice email:', error);
    
    // Store failed notification
    storeNotification(
      req.user.id,
      'overdue-invoice',
      'Overdue Invoice - Test',
      req.user.email,
      'failed'
    );
    
    res.status(500).json({ message: 'Error sending overdue invoice email' });
  }
});

// Test payment confirmation email
router.post('/test/payment-confirmation', auth, async (req, res) => {
  try {
    // Create a mock payment for testing
    const mockPayment = {
      invoice: {
        _id: 'test-invoice-456',
        invoiceNumber: 'INV-TEST-003',
        amount: 1200
      },
      client: {
        name: 'Test Client',
        email: req.user.email
      },
      amount: 1200,
      paidDate: new Date()
    };
    
    const result = await emailService.sendPaymentConfirmation(mockPayment);
    
    // Store notification
    storeNotification(
      req.user.id,
      'payment-confirmation',
      `Payment Confirmation - ${mockPayment.invoice.invoiceNumber}`,
      req.user.email,
      'sent'
    );
    
    res.json({
      message: 'Payment confirmation email sent successfully',
      testUrl: result.testUrl
    });
  } catch (error) {
    console.error('Error sending payment confirmation email:', error);
    
    // Store failed notification
    storeNotification(
      req.user.id,
      'payment-confirmation',
      'Payment Confirmation - Test',
      req.user.email,
      'failed'
    );
    
    res.status(500).json({ message: 'Error sending payment confirmation email' });
  }
});

// @route   POST /api/notifications/trigger/reminders
// @desc    Manually trigger invoice reminders check
// @access  Private (Admin only in production)
router.post('/trigger/reminders', auth, async (req, res) => {
  try {
    // In production, you might want to restrict this to admin users
    if (process.env.NODE_ENV === 'production' && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    await notificationScheduler.triggerInvoiceReminders();
    
    res.json({
      message: 'Invoice reminders check triggered successfully'
    });
  } catch (error) {
    console.error('Error triggering invoice reminders:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/notifications/trigger/overdue
// @desc    Manually trigger overdue invoices check
// @access  Private (Admin only in production)
router.post('/trigger/overdue', auth, async (req, res) => {
  try {
    // In production, you might want to restrict this to admin users
    if (process.env.NODE_ENV === 'production' && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    await notificationScheduler.triggerOverdueCheck();
    
    res.json({
      message: 'Overdue invoices check triggered successfully'
    });
  } catch (error) {
    console.error('Error triggering overdue check:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/notifications/trigger/weekly-summary
// @desc    Manually trigger weekly summary emails
// @access  Private (Admin only in production)
router.post('/trigger/weekly-summary', auth, async (req, res) => {
  try {
    // In production, you might want to restrict this to admin users
    if (process.env.NODE_ENV === 'production' && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    await notificationScheduler.triggerWeeklySummary();
    
    res.json({
      message: 'Weekly summary emails triggered successfully'
    });
  } catch (error) {
    console.error('Error triggering weekly summary:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/notifications/preferences
// @desc    Update user notification preferences
// @access  Private
router.put('/preferences', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { notifications } = req.body;
    
    if (notifications) {
      user.notifications = { ...user.notifications, ...notifications };
      await user.save();
    }

    res.json({
      message: 'Notification preferences updated successfully',
      notifications: user.notifications
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/notifications/preferences
// @desc    Get user notification preferences
// @access  Private
router.get('/preferences', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const branding = await Branding.getOrCreateForUser(req.user.id);
    
    res.json({
      user: user.notifications || {},
      branding: branding.notifications || {}
    });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
