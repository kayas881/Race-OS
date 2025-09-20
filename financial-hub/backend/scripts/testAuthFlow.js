require('dotenv').config();
const axios = require('axios');

// Test the Appwrite authentication endpoints
async function testAuthFlow() {
  console.log('🧪 Testing Appwrite Authentication Flow...');
  
  const baseURL = 'http://localhost:5000';
  const testUser = {
    email: 'test@example.com',
    password: 'testpassword123',
    name: 'Test User',
    businessName: 'Test Business',
    businessType: 'consulting'
  };

  try {
    // Test 1: Register a new user
    console.log('\n1️⃣ Testing user registration...');
    try {
      const registerResponse = await axios.post(`${baseURL}/api/auth/register`, testUser);
      console.log('✅ Registration successful:', registerResponse.data.message);
      console.log('📋 User ID:', registerResponse.data.user?.id);
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.error === 'User already exists') {
        console.log('⚠️ User already exists, proceeding with login test');
      } else {
        console.log('❌ Registration failed:', error.response?.data?.error || error.message);
        return;
      }
    }

    // Test 2: Login with the user
    console.log('\n2️⃣ Testing user login...');
    try {
      const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
        email: testUser.email,
        password: testUser.password
      });
      console.log('✅ Login successful:', loginResponse.data.message);
      console.log('🔑 Session token received');
      
      const token = loginResponse.data.token;

      // Test 3: Get current user info
      console.log('\n3️⃣ Testing get current user...');
      try {
        const meResponse = await axios.get(`${baseURL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log('✅ Get user info successful');
        console.log('👤 User info:', {
          id: meResponse.data.user.id,
          email: meResponse.data.user.email,
          name: meResponse.data.user.name
        });

        // Test 4: Logout
        console.log('\n4️⃣ Testing logout...');
        try {
          const logoutResponse = await axios.post(`${baseURL}/api/auth/logout`, {}, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          console.log('✅ Logout successful:', logoutResponse.data.message);
        } catch (error) {
          console.log('❌ Logout failed:', error.response?.data?.error || error.message);
        }

      } catch (error) {
        console.log('❌ Get user info failed:', error.response?.data?.error || error.message);
      }

    } catch (error) {
      console.log('❌ Login failed:', error.response?.data?.error || error.message);
    }

    console.log('\n🎉 Authentication flow test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

if (require.main === module) {
  testAuthFlow();
}

module.exports = testAuthFlow;