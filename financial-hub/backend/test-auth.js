const fetch = require('node-fetch');

const baseUrl = 'http://localhost:5000/api';

async function testAuth() {
  try {
    console.log('Testing user registration...');
    
    // Test registration
    const registerResponse = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `testuser${Date.now()}@example.com`,
        password: 'testpass123',
        firstName: 'Test',
        lastName: 'User'
      })
    });

    if (registerResponse.ok) {
      const registerData = await registerResponse.json();
      console.log('✅ Registration successful');
      console.log('User:', registerData.user);
      console.log('Token preview:', registerData.token.substring(0, 50) + '...');

      // Test dashboard access with the token
      const dashboardResponse = await fetch(`${baseUrl}/dashboard`, {
        headers: { 
          'Authorization': `Bearer ${registerData.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (dashboardResponse.ok) {
        const dashboardData = await dashboardResponse.json();
        console.log('✅ Dashboard access successful');
        console.log('Dashboard data keys:', Object.keys(dashboardData));
      } else {
        const error = await dashboardResponse.text();
        console.log('❌ Dashboard access failed:', error);
      }
    } else {
      const error = await registerResponse.text();
      console.log('❌ Registration failed:', error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAuth();