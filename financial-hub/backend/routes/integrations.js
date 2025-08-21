const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/integrations
// @desc    Get available integrations
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const integrations = [
      {
        id: 'plaid',
        name: 'Bank Accounts',
        description: 'Connect your bank accounts and credit cards',
        category: 'banking',
        isActive: true,
        setup_required: false
      },
      {
        id: 'youtube',
        name: 'YouTube',
        description: 'Connect your YouTube channel for ad revenue tracking',
        category: 'creator_platform',
        isActive: true,
        setup_required: true
      },
      {
        id: 'twitch',
        name: 'Twitch',
        description: 'Track Twitch subscriptions, bits, and donations',
        category: 'creator_platform',
        isActive: true,
        setup_required: true
      },
      {
        id: 'patreon',
        name: 'Patreon',
        description: 'Monitor Patreon subscription income',
        category: 'creator_platform',
        isActive: true,
        setup_required: true
      },
      {
        id: 'substack',
        name: 'Substack',
        description: 'Track Substack newsletter revenue',
        category: 'creator_platform',
        isActive: true,
        setup_required: true
      }
    ];

    res.json(integrations);
  } catch (error) {
    console.error('Error fetching integrations:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
