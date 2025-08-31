const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const Branding = require('../models/Branding');
const auth = require('../middleware/auth');

// Configure multer for logo uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/logos');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `logo-${req.user.id}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, svg)'));
    }
  }
});

// @route   GET /api/branding
// @desc    Get user's branding settings
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const branding = await Branding.getOrCreateForUser(req.user.id);
    res.json(branding);
  } catch (error) {
    console.error('Error fetching branding:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/branding
// @desc    Update branding settings
// @access  Private
router.put('/', auth, async (req, res) => {
  try {
    const branding = await Branding.getOrCreateForUser(req.user.id);
    
    // Update allowed fields
    const allowedUpdates = [
      'companyName',
      'colors',
      'contact',
      'invoice',
      'email',
      'notifications'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'colors' || field === 'contact' || field === 'invoice' || field === 'email' || field === 'notifications') {
          // Merge nested objects
          branding[field] = { ...branding[field], ...req.body[field] };
        } else {
          branding[field] = req.body[field];
        }
      }
    });

    await branding.save();

    res.json({
      message: 'Branding updated successfully',
      branding
    });
  } catch (error) {
    console.error('Error updating branding:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/branding/logo
// @desc    Upload company logo
// @access  Private
router.post('/logo', auth, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const branding = await Branding.getOrCreateForUser(req.user.id);
    
    // Delete old logo file if exists
    if (branding.logo && branding.logo.filename) {
      try {
        const oldPath = path.join(__dirname, '../uploads/logos', branding.logo.filename);
        await fs.unlink(oldPath);
      } catch (error) {
        console.log('Could not delete old logo file:', error.message);
      }
    }

    // Generate URL for the uploaded logo
    const logoUrl = `/uploads/logos/${req.file.filename}`;

    // Update branding with new logo
    await branding.updateLogo({
      url: logoUrl,
      filename: req.file.filename,
      fileSize: req.file.size
    });

    res.json({
      message: 'Logo uploaded successfully',
      logo: {
        url: logoUrl,
        filename: req.file.filename,
        fileSize: req.file.size
      }
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/branding/logo
// @desc    Remove company logo
// @access  Private
router.delete('/logo', auth, async (req, res) => {
  try {
    const branding = await Branding.getOrCreateForUser(req.user.id);
    
    // Delete logo file if exists
    if (branding.logo && branding.logo.filename) {
      try {
        const logoPath = path.join(__dirname, '../uploads/logos', branding.logo.filename);
        await fs.unlink(logoPath);
      } catch (error) {
        console.log('Could not delete logo file:', error.message);
      }
    }

    // Remove logo from branding
    await branding.removeLogo();

    res.json({
      message: 'Logo removed successfully'
    });
  } catch (error) {
    console.error('Error removing logo:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/branding/preview
// @desc    Get branding preview data
// @access  Private
router.get('/preview', auth, async (req, res) => {
  try {
    const branding = await Branding.getOrCreateForUser(req.user.id);
    
    const preview = {
      email: branding.getEmailBranding(),
      invoice: branding.getInvoiceBranding()
    };

    res.json(preview);
  } catch (error) {
    console.error('Error generating preview:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/branding/test-email
// @desc    Send test email with current branding
// @access  Private
router.post('/test-email', auth, async (req, res) => {
  try {
    const { type = 'weekly-summary', email } = req.body;
    const branding = await Branding.getOrCreateForUser(req.user.id);
    const emailService = require('../services/emailService');

    let result;
    const targetEmail = email || req.user.email;

    switch (type) {
      case 'weekly-summary':
        const testSummaryData = {
          summary: {
            weeklyIncome: 2500,
            weeklyExpenses: 800,
            ytdIncome: 45000,
            ytdExpenses: 15000
          },
          weekStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          weekEnd: new Date(),
          transactions: [
            {
              date: new Date(),
              description: 'Test Invoice Payment',
              category: 'Consulting',
              type: 'income',
              amount: 1500
            },
            {
              date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
              description: 'Office Supplies',
              category: 'Office Expenses',
              type: 'expense',
              amount: 250
            }
          ],
          taxInfo: {
            weeklyTaxSetAside: 750,
            ytdTaxLiability: 13500,
            nextQuarterlyDue: new Date(2025, 9, 15) // Oct 15, 2025
          }
        };
        
        result = await emailService.sendWeeklySummary(
          targetEmail,
          testSummaryData,
          branding.getEmailBranding()
        );
        break;

      case 'invoice-reminder':
        const testInvoiceData = {
          invoiceNumber: 'INV-2025-0001',
          issueDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          total: 2500,
          _id: 'test-invoice-id'
        };
        
        const testClientData = {
          name: 'John Doe',
          email: targetEmail,
          company: 'Test Company LLC'
        };

        result = await emailService.sendInvoiceReminder(
          testInvoiceData,
          testClientData,
          branding.getEmailBranding()
        );
        break;

      default:
        return res.status(400).json({ message: 'Invalid email type' });
    }

    if (result.success) {
      res.json({
        message: 'Test email sent successfully',
        testUrl: result.testUrl
      });
    } else {
      res.status(500).json({
        message: 'Failed to send test email',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/branding/color-palette
// @desc    Get predefined color palettes
// @access  Private
router.get('/color-palette', auth, (req, res) => {
  const palettes = [
    {
      name: 'Professional Blue',
      primary: '#3B82F6',
      secondary: '#1F2937',
      accent: '#10B981'
    },
    {
      name: 'Modern Purple',
      primary: '#8B5CF6',
      secondary: '#374151',
      accent: '#F59E0B'
    },
    {
      name: 'Corporate Green',
      primary: '#059669',
      secondary: '#111827',
      accent: '#DC2626'
    },
    {
      name: 'Creative Orange',
      primary: '#EA580C',
      secondary: '#1F2937',
      accent: '#0891B2'
    },
    {
      name: 'Elegant Teal',
      primary: '#0D9488',
      secondary: '#374151',
      accent: '#7C3AED'
    },
    {
      name: 'Classic Navy',
      primary: '#1E40AF',
      secondary: '#111827',
      accent: '#DC2626'
    }
  ];

  res.json(palettes);
});

module.exports = router;
