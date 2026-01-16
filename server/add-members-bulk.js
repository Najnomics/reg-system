// Script to add multiple members and send PIN emails
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

const members = [
  {
    name: 'Naomi Omoruyi',
    email: 'writernaomiomoruyi@gmail.com',
    phone: '08162001861'
  },
  {
    name: 'Diamond Erheriada',
    email: 'erheriadadiamond@gmail.com',
    phone: '07033579674'
  },
  {
    name: 'Mark John',
    email: 'Markzeal555@gmail.com',
    phone: '07049241559'
  },
  {
    name: 'Peace Uloh',
    email: 'peaceuloh2003@gmail.com',
    phone: '09022116083'
  }
];

async function addMembers() {
  try {
    console.log('🔐 Step 1: Logging in as admin...');
    
    // Login
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: process.argv[2] || 'admin@example.com',
      password: process.argv[3] || 'admin123'
    });
    
    if (!loginResponse.data.token) {
      console.error('❌ Login failed:', loginResponse.data);
      return;
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful\n');
    
    console.log(`📝 Step 2: Adding ${members.length} members...\n`);
    
    const results = {
      successful: [],
      failed: []
    };
    
    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      console.log(`[${i + 1}/${members.length}] Adding ${member.name}...`);
      
      try {
        const response = await axios.post(
          `${API_BASE_URL}/members`,
          {
            name: member.name,
            email: member.email,
            phone: member.phone
          },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (response.data.success) {
          results.successful.push({
            name: member.name,
            email: member.email,
            pin: response.data.data?.member?.pin || 'N/A'
          });
          console.log(`   ✅ Success! PIN email sent to ${member.email}`);
          if (response.data.data?.member?.pin) {
            console.log(`   📌 PIN: ${response.data.data.member.pin}`);
          }
        } else {
          results.failed.push({
            name: member.name,
            email: member.email,
            error: response.data.message || 'Unknown error'
          });
          console.log(`   ❌ Failed: ${response.data.message}`);
        }
      } catch (error) {
        const errorMsg = error.response?.data?.message || error.message;
        results.failed.push({
          name: member.name,
          email: member.email,
          error: errorMsg
        });
        
        if (error.response?.status === 409) {
          console.log(`   ⚠️  Member already exists: ${member.email}`);
        } else {
          console.log(`   ❌ Error: ${errorMsg}`);
        }
      }
      
      // Small delay between requests to avoid overwhelming the server
      if (i < members.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total: ${members.length}`);
    console.log(`✅ Successful: ${results.successful.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    
    if (results.successful.length > 0) {
      console.log('\n✅ Successfully Added Members:');
      results.successful.forEach(m => {
        console.log(`   - ${m.name} (${m.email}) - PIN: ${m.pin}`);
      });
    }
    
    if (results.failed.length > 0) {
      console.log('\n❌ Failed Members:');
      results.failed.forEach(m => {
        console.log(`   - ${m.name} (${m.email}): ${m.error}`);
      });
    }
    
    console.log('\n✅ Done! Check email inboxes for PIN emails.');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

addMembers();
