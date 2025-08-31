#!/usr/bin/env node

/**
 * Quick Integration Test - Shows which APIs are configured vs demo mode
 */

const axios = require('axios');

async function testIntegrations() {
  console.log('🧪 Testing Integration Configuration\n');
  
  const baseUrl = 'http://localhost:5000/api';
  
  try {
    // Test if server is running
    console.log('1. Testing server connection...');
    await axios.get(`${baseUrl}/integrations`);
    console.log('   ✅ Server is running\n');
    
    // Test Plaid configuration
    console.log('2. Testing Plaid configuration...');
    try {
      const plaidResponse = await axios.post(`${baseUrl}/integrations/plaid/link-token`, {}, {
        headers: { 'Authorization': 'Bearer test-token' }
      });
      
      if (plaidResponse.data.linkToken && plaidResponse.data.linkToken !== 'demo-link-token') {
        console.log('   ✅ Plaid: REAL API configured');
        console.log(`   📝 Link token: ${plaidResponse.data.linkToken.substring(0, 20)}...`);
      } else {
        console.log('   ⚠️  Plaid: Demo mode (missing credentials)');
      }
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('   ⚠️  Plaid: Authentication required (normal)');
      } else {
        console.log('   ❌ Plaid: Error -', error.response?.data?.error || error.message);
      }
    }
    console.log();
    
    // Test YouTube configuration
    console.log('3. Testing YouTube configuration...');
    try {
      const youtubeResponse = await axios.post(`${baseUrl}/integrations/platforms/youtube/connect`, {}, {
        headers: { 'Authorization': 'Bearer test-token' }
      });
      
      if (youtubeResponse.data.authUrl && !youtubeResponse.data.authUrl.includes('demo')) {
        console.log('   ✅ YouTube: REAL OAuth configured');
        console.log(`   📝 OAuth URL: ${youtubeResponse.data.authUrl.substring(0, 50)}...`);
      } else {
        console.log('   ⚠️  YouTube: Demo mode (missing Google credentials)');
        console.log(`   📝 Demo URL: ${youtubeResponse.data.authUrl}`);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('   ⚠️  YouTube: Authentication required (normal)');
      } else {
        console.log('   ❌ YouTube: Error -', error.response?.data?.error || error.message);
      }
    }
    console.log();
    
    // Test Twitch configuration
    console.log('4. Testing Twitch configuration...');
    try {
      const twitchResponse = await axios.post(`${baseUrl}/integrations/platforms/twitch/connect`, {}, {
        headers: { 'Authorization': 'Bearer test-token' }
      });
      
      if (twitchResponse.data.authUrl && !twitchResponse.data.authUrl.includes('demo')) {
        console.log('   ✅ Twitch: REAL OAuth configured');
        console.log(`   📝 OAuth URL: ${twitchResponse.data.authUrl.substring(0, 50)}...`);
      } else {
        console.log('   ⚠️  Twitch: Demo mode or error');
      }
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('   ⚠️  Twitch: Authentication required (normal)');
      } else {
        console.log('   ❌ Twitch: Error -', error.response?.data?.error || error.message);
      }
    }
    console.log();
    
    console.log('🔧 How to Fix Demo Mode:');
    console.log('========================');
    console.log('1. Get real API credentials from:');
    console.log('   • Plaid: https://dashboard.plaid.com/team/keys');
    console.log('   • Google: https://console.developers.google.com/');
    console.log('   • Twitch: https://dev.twitch.tv/console/apps');
    console.log('   • Patreon: https://www.patreon.com/portal/registration/register-clients');
    console.log();
    console.log('2. Add them to your .env file');
    console.log('3. Restart the backend: npm run dev');
    console.log('4. Real OAuth URLs will replace demo URLs!');
    console.log();
    console.log('📋 Current .env status:');
    
    // Check environment variables
    const envVars = [
      'PLAID_CLIENT_ID',
      'PLAID_SECRET', 
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'TWITCH_CLIENT_ID',
      'TWITCH_CLIENT_SECRET',
      'PATREON_CLIENT_ID',
      'PATREON_CLIENT_SECRET'
    ];
    
    envVars.forEach(varName => {
      const value = process.env[varName];
      if (value && value !== 'your_' + varName.toLowerCase()) {
        console.log(`   ✅ ${varName}: Set (${value.substring(0, 10)}...)`);
      } else {
        console.log(`   ❌ ${varName}: Missing or placeholder`);
      }
    });
    
  } catch (error) {
    console.log('❌ Server connection failed:', error.message);
    console.log('   Make sure backend is running: npm run dev');
  }
}

// Load environment variables
require('dotenv').config({ path: './backend/.env' });

testIntegrations().catch(console.error);
