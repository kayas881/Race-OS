const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Registration, login, password reset, and email verification are all handled by
// Clerk now (see middleware/auth.js and routes/webhooks.js for how Clerk users get
// synced into the Mongo User doc these routes read/update).

// @route   GET /api/auth/me
// @desc    Get current user's app profile (tax info, preferences, etc.)
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update app-specific profile fields (business info, tax settings, preferences).
//          Name/email changes belong to Clerk (via its own UserProfile UI), not here.
// @access  Private
router.put('/profile', auth, [
  body('businessName').optional().trim(),
  body('businessType').optional().isIn(['sole_proprietorship', 'llc', 'corporation', 's_corp', 'partnership'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updateFields = ['businessName', 'businessType', 'taxInfo', 'preferences'];
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'taxInfo' || field === 'preferences') {
          user[field] = { ...user[field].toObject(), ...req.body[field] };
        } else {
          user[field] = req.body[field];
        }
      }
    });

    await user.save();

    res.json({ user });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
