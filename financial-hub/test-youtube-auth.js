#!/usr/bin/env node

/**
 * Test YouTube Integration with Real Authentication
 */

const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

async function testYouTubeIntegration() {
  console.log('🧪 Testing YouTube Integration with Real Auth\n');
  
  // Create a test JWT token
  const testUser = { id: 'test-user-123' };
  const token = jwt.sign({ user: testUser }, process.env.JWT_SECRET, { expiresIn: '1h' });
  
  console.log('🔑 Generated test JWT token');
  console.log('📍 Testing against:', 'http://localhost:5000');
  
  try {
    // Test the YouTube connect endpoint
    console.log('\n📺 Testing YouTube OAuth URL generation...');
    
    const response = await axios.post('http://localhost:5000/api/integrations/platforms/youtube/connect', {}, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Response received:');
    console.log('📊 Status:', response.status);
    console.log('🔗 Auth URL:', response.data.authUrl);
    
    // Check if it's a real OAuth URL
    if (response.data.authUrl && response.data.authUrl.includes(process.env.GOOGLE_CLIENT_ID)) {
      console.log('\n🎉 SUCCESS: Real Google OAuth URL generated!');
      console.log('✅ Contains real Client ID');
      console.log('✅ Real integration is working');
      
      // Parse the URL to show details
      const url = new URL(response.data.authUrl);
      console.log('\n📋 OAuth URL Details:');
      console.log('   Client ID:', url.searchParams.get('client_id'));
      console.log('   Redirect URI:', url.searchParams.get('redirect_uri'));
      console.log('   Scopes:', url.searchParams.get('scope'));
      
    } else if (response.data.authUrl && response.data.authUrl.includes('demo')) {
      console.log('\n⚠️  Still in demo mode');
      console.log('🔧 Check your Google credentials in .env');
    } else {
      console.log('\n❓ Unexpected response format');
    }
    
  } catch (error) {
    console.log('\n❌ Error testing YouTube integration:');
    if (error.response) {
      console.log('📊 Status:', error.response.status);
      console.log('📝 Error:', error.response.data);
    } else {
      console.log('📝 Error:', error.message);
    }
  }
}

// Check environment setup
console.log('🔧 Environment Check:');
console.log('📍 JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'MISSING');
console.log('📍 GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? `${process.env.GOOGLE_CLIENT_ID.substring(0, 20)}...` : 'MISSING');
console.log('📍 GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'MISSING');

testYouTubeIntegration().catch(console.error);
