// Quick test to send email to one member using Namecheap
require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

async function testSingleEmail() {
  try {
    console.log('🧪 Testing Namecheap Email - Single Member');
    console.log('='.repeat(60));
    console.log(`SMTP Host: ${process.env.SMTP_HOST || 'NOT SET'}`);
    console.log(`SMTP User: ${process.env.SMTP_USER || 'NOT SET'}`);
    console.log(`From Email: ${process.env.FROM_EMAIL || 'NOT SET'}`);
    console.log('='.repeat(60));
    console.log('');

    // Login
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: process.argv[2] || 'admin@example.com',
      password: process.argv[3] || 'admin123'
    });
    
    if (!loginResponse.data.token) {
      console.error('❌ Login failed');
      return;
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful\n');
    
    // Get first member
    const membersResponse = await axios.get(`${API_BASE_URL}/members?limit=1`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const member = membersResponse.data.data.members[0];
    if (!member) {
      console.log('No members found');
      return;
    }
    
    console.log(`📧 Sending PIN email to: ${member.name} (${member.email})`);
    console.log('');
    
    const resendResponse = await axios.post(
      `${API_BASE_URL}/members/${member.id}/resend-pin`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );
    
    if (resendResponse.data.success) {
      console.log('✅ Email sent successfully!');
      console.log(`📬 Check inbox: ${member.email}`);
      console.log(`📧 Sent from: ${process.env.FROM_EMAIL || 'NOT SET'}`);
    } else {
      console.log('❌ Failed:', resendResponse.data.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testSingleEmail();
