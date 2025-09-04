// YouTube Integration Test Script
// Run this in your browser's developer console after logging into the frontend

console.log('🧪 Testing YouTube Integration...');

// Test 1: Check if YouTube is connected
async function testYouTubeConnection() {
  try {
    const response = await fetch('/api/integrations/platforms', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const platforms = await response.json();
    
    const youtubeIntegration = platforms.find(p => p.platform === 'youtube');
    
    if (youtubeIntegration) {
      console.log('✅ YouTube Integration Found:', youtubeIntegration);
      return youtubeIntegration;
    } else {
      console.log('❌ YouTube integration not found');
      return null;
    }
  } catch (error) {
    console.error('🚨 Error checking YouTube connection:', error);
    return null;
  }
}

// Test 2: Test YouTube Data Sync
async function testYouTubeSync(integrationId) {
  try {
    console.log('🔄 Testing YouTube data sync...');
    
    const response = await fetch(`/api/integrations/platforms/${integrationId}/sync`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ YouTube sync successful:', result);
    } else {
      console.log('❌ YouTube sync failed:', result);
    }
    
    return result;
  } catch (error) {
    console.error('🚨 Error syncing YouTube data:', error);
    return null;
  }
}

// Test 3: Check for YouTube revenue data
async function testYouTubeData() {
  try {
    console.log('📊 Checking for YouTube revenue data...');
    
    const response = await fetch('/api/transactions?platform=youtube', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    const transactions = await response.json();
    
    console.log('💰 YouTube transactions found:', transactions.length);
    
    if (transactions.length > 0) {
      console.log('📈 Sample YouTube transaction:', transactions[0]);
    }
    
    return transactions;
  } catch (error) {
    console.error('🚨 Error fetching YouTube data:', error);
    return null;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting YouTube Integration Tests...');
  
  const youtubeIntegration = await testYouTubeConnection();
  
  if (youtubeIntegration) {
    await testYouTubeSync(youtubeIntegration._id);
    await testYouTubeData();
  }
  
  console.log('✅ YouTube integration tests completed!');
}

// Auto-run tests
runAllTests();
