const express = require('express');
const { body, validationResult } = require('express-validator');
const appwrite = require('../config/appwrite');
const appwriteAuth = require('../middleware/appwriteAuth');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register user with Appwrite
// @access  Public
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, businessName, businessType } = req.body;

    try {
      // Create user in Appwrite
      const user = await appwrite.createUser(email, password, name);

      // Create additional user profile data
      const userProfile = await appwrite.createDocument(appwrite.collections.users, {
        userId: user.$id,
        email: user.email,
        name: user.name,
        businessName: businessName || '',
        businessType: businessType || '',
        role: 'user'
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: {
          id: user.$id,
          email: user.email,
          name: user.name,
          emailVerification: user.emailVerification
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.code === 409) {
        return res.status(400).json({ error: 'User already exists' });
      }
      
      res.status(500).json({ error: 'Failed to create user' });
    }
  } catch (error) {
    console.error('Register route error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user with Appwrite
// @access  Public
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // Create session with Appwrite
      const session = await appwrite.account.createEmailPasswordSession(email, password);
      
      // Get user details
      const user = await appwrite.account.get();

      res.json({
        success: true,
        message: 'Login successful',
        token: session.secret, // Use session secret as token
        user: {
          id: user.$id,
          email: user.email,
          name: user.name,
          emailVerification: user.emailVerification
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.code === 401) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      res.status(500).json({ error: 'Login failed' });
    }
  } catch (error) {
    console.error('Login route error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', appwriteAuth, async (req, res) => {
  try {
    // Get user profile from database
    const userProfile = await appwrite.listDocuments(appwrite.collections.users, [
      appwrite.Query.equal('userId', req.user.id)
    ]);

    const profile = userProfile.documents[0] || {};

    res.json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        emailVerification: req.user.emailVerification,
        businessName: profile.businessName || '',
        businessType: profile.businessType || '',
        role: profile.role || 'user'
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user data' });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', appwriteAuth, async (req, res) => {
  try {
    // Delete current session
    await appwrite.account.deleteSession('current');
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', [
  appwriteAuth,
  body('currentPassword').exists(),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    try {
      await appwrite.account.updatePassword(newPassword, currentPassword);
      
      res.json({
        success: true,
        message: 'Password updated successfully'
      });
    } catch (error) {
      console.error('Password change error:', error);
      
      if (error.code === 401) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      
      res.status(500).json({ error: 'Failed to update password' });
    }
  } catch (error) {
    console.error('Change password route error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    try {
      await appwrite.account.createRecovery(
        email,
        `${process.env.FRONTEND_URL}/reset-password`
      );
      
      res.json({
        success: true,
        message: 'Password reset email sent'
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ error: 'Failed to send reset email' });
    }
  } catch (error) {
    console.error('Forgot password route error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/auth/reset-password
// @desc    Reset password with recovery token
// @access  Public
router.put('/reset-password', [
  body('userId').notEmpty(),
  body('secret').notEmpty(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId, secret, password } = req.body;

    try {
      await appwrite.account.updateRecovery(userId, secret, password);
      
      res.json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error) {
      console.error('Reset password error:', error);
      
      if (error.code === 401) {
        return res.status(401).json({ error: 'Invalid or expired reset token' });
      }
      
      res.status(500).json({ error: 'Failed to reset password' });
    }
  } catch (error) {
    console.error('Reset password route error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;