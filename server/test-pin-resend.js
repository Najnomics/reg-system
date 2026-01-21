// Test script to resend PINs to all members
// This will help us debug the Gmail SMTP issue

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

// Get admin credentials from command line args or use defaults
const adminEmail = process.argv[2] || process.env.ADMIN_EMAIL || 'admin@church.com';
const adminPassword = process.argv[3] || process.env.ADMIN_PASSWORD || 'admin123';

async function testResendPinToAll() {
  try {
    console.log('🔐 Step 1: Logging in as admin...');
    console.log(`   Email: ${adminEmail}`);
    
    // Login
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: adminEmail,
      password: adminPassword
    });
    
    if (!loginResponse.data.token) {
      console.error('❌ Login failed:', loginResponse.data);
      return;
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    console.log('\n📧 Step 2: Resending PINs to all active members...');
    console.log('This will use Gmail SMTP config from .env file');
    console.log('Watch the server logs for detailed email sending information...\n');
    
    // Resend PIN to all
    const resendResponse = await axios.post(
      `${API_BASE_URL}/members/resend-pin-all`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 60 second timeout
      }
    );
    
    console.log('✅ Response:', JSON.stringify(resendResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.code === 'ECONNABORTED') {
      console.error('⚠️ Request timed out - emails may still be sending in background');
    }
  }
}

testResendPinToAll();
