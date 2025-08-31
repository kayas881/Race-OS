const express = require('express');
const router = express.Router();
const PlatformIntegrationService = require('../services/PlatformIntegrationService');

// Test route to verify OAuth URL generation (no auth required)
router.get('/test/youtube-oauth', async (req, res) => {
  try {
    console.log('🧪 Test route: Generating YouTube OAuth URL...');
    
    const testUserId = 'test-user-123';
    const authUrl = await PlatformIntegrationService.getYouTubeAuthUrl(testUserId);
    
    console.log('📍 Generated URL:', authUrl);
    
    res.json({
      success: true,
      authUrl: authUrl,
      isDemo: authUrl.includes('demo'),
      containsClientId: authUrl.includes(process.env.GOOGLE_CLIENT_ID || 'not-set'),
      clientIdInEnv: process.env.GOOGLE_CLIENT_ID ? `${process.env.GOOGLE_CLIENT_ID.substring(0, 20)}...` : 'NOT SET'
    });
  } catch (error) {
    console.error('❌ Error in test route:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      clientIdInEnv: process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET'
    });
  }
});

// Test route to check environment variables
router.get('/test/env-check', (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID ? `${process.env.GOOGLE_CLIENT_ID.substring(0, 20)}...` : 'NOT SET',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET',
    googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'NOT SET',
    jwtSecret: process.env.JWT_SECRET ? 'SET' : 'NOT SET'
  });
});

module.exports = router;
