// Script to send PINs to all members locally using Gmail SMTP
// This respects Gmail rate limits by sending in batches with delays

const axios = require('axios');
const API_BASE_URL = 'http://localhost:3000/api';

// Gmail rate limits (conservative settings)
const EMAILS_PER_BATCH = 50; // Send 50 at a time
const DELAY_BETWEEN_BATCHES = 60000; // 1 minute delay between batches
const DELAY_BETWEEN_EMAILS = 1200; // 1.2 seconds between individual emails

async function sendBulkPinsLocally() {
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
    
    console.log('📋 Step 2: Fetching all active members...');
    const membersResponse = await axios.get(`${API_BASE_URL}/members?limit=10000`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const members = membersResponse.data.data.members.filter(m => m.isActive !== false);
    const totalMembers = members.length;
    
    console.log(`✅ Found ${totalMembers} active members\n`);
    
    if (totalMembers === 0) {
      console.log('No active members to send PINs to.');
      return;
    }
    
    console.log('📧 Step 3: Sending PIN emails in batches...');
    console.log(`   Batch size: ${EMAILS_PER_BATCH} emails`);
    console.log(`   Delay between batches: ${DELAY_BETWEEN_BATCHES / 1000} seconds`);
    console.log(`   Delay between emails: ${DELAY_BETWEEN_EMAILS / 1000} seconds`);
    console.log(`   Estimated time: ~${Math.ceil((totalMembers / EMAILS_PER_BATCH) * (DELAY_BETWEEN_BATCHES / 60000))} minutes\n`);
    
    const results = {
      successful: [],
      failed: [],
    };
    
    // Process in batches
    for (let i = 0; i < members.length; i += EMAILS_PER_BATCH) {
      const batch = members.slice(i, i + EMAILS_PER_BATCH);
      const batchNumber = Math.floor(i / EMAILS_PER_BATCH) + 1;
      const totalBatches = Math.ceil(members.length / EMAILS_PER_BATCH);
      
      console.log(`\n📦 Batch ${batchNumber}/${totalBatches} (${batch.length} members)...`);
      
      // Send emails in this batch
      for (let j = 0; j < batch.length; j++) {
        const member = batch[j];
        const emailNumber = i + j + 1;
        
        try {
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
            results.successful.push({
              id: member.id,
              email: member.email,
              name: member.name,
            });
            console.log(`   ✅ [${emailNumber}/${totalMembers}] ${member.email}`);
          } else {
            results.failed.push({
              id: member.id,
              email: member.email,
              name: member.name,
              error: resendResponse.data.message || 'Unknown error'
            });
            console.log(`   ❌ [${emailNumber}/${totalMembers}] ${member.email} - ${resendResponse.data.message}`);
          }
        } catch (error) {
          results.failed.push({
            id: member.id,
            email: member.email,
            name: member.name,
            error: error.response?.data?.message || error.message
          });
          console.log(`   ❌ [${emailNumber}/${totalMembers}] ${member.email} - ${error.response?.data?.message || error.message}`);
        }
        
        // Delay between individual emails (except for the last one in batch)
        if (j < batch.length - 1) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_EMAILS));
        }
      }
      
      // Delay between batches (except for the last batch)
      if (i + EMAILS_PER_BATCH < members.length) {
        console.log(`\n⏳ Waiting ${DELAY_BETWEEN_BATCHES / 1000} seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }
    
    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Members: ${totalMembers}`);
    console.log(`✅ Successful: ${results.successful.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    
    if (results.failed.length > 0) {
      console.log('\n❌ Failed Emails:');
      results.failed.forEach(f => {
        console.log(`   - ${f.email}: ${f.error}`);
      });
    }
    
    console.log('\n✅ Done! Check your email inboxes for PIN emails.');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

sendBulkPinsLocally();
