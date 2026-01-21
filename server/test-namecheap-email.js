// Test script to send PIN emails to all members using Namecheap SMTP
// Run: node test-namecheap-email.js admin@example.com admin123

require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

// Rate limiting for Namecheap (optimized for faster sending)
const EMAILS_PER_BATCH = 100; // Send 100 at a time
const DELAY_BETWEEN_BATCHES = 5000; // 5 seconds delay between batches (reduced from 30s)
const DELAY_BETWEEN_EMAILS = 100; // 0.1 seconds between individual emails (reduced from 0.5s)
const CONCURRENT_EMAILS = 5; // Send 5 emails in parallel for faster processing

async function testNamecheapEmail() {
  try {
    console.log('🧪 Testing Namecheap Email Configuration');
    console.log('='.repeat(60));
    console.log(`SMTP Host: ${process.env.SMTP_HOST || 'NOT SET'}`);
    console.log(`SMTP Port: ${process.env.SMTP_PORT || 'NOT SET'}`);
    console.log(`SMTP User: ${process.env.SMTP_USER || 'NOT SET'}`);
    console.log(`From Email: ${process.env.FROM_EMAIL || 'NOT SET'}`);
    console.log(`From Name: ${process.env.FROM_NAME || 'NOT SET'}`);
    console.log('='.repeat(60));
    console.log('');

    // Check if server is running
    try {
      await axios.get(`${API_BASE_URL.replace('/api', '')}/health`);
      console.log('✅ Server is running\n');
    } catch (error) {
      console.error('❌ Server is not running!');
      console.error('   Please start the server first: cd server && npm start');
      return;
    }

    console.log('🔐 Step 1: Logging in as admin...');
    
    // Login
    const adminEmail = process.argv[2] || 'admin@example.com';
    const adminPassword = process.argv[3] || 'admin123';
    
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: adminEmail,
      password: adminPassword
    });
    
    if (!loginResponse.data.token) {
      console.error('❌ Login failed:', loginResponse.data);
      return;
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful\n');
    
    console.log('📋 Step 2: Fetching all active members...');
    
    // Fetch all members with pagination (API limit is 100 per page)
    let allMembers = [];
    let page = 1;
    let hasMore = true;
    const limit = 100;
    
    while (hasMore) {
      const membersResponse = await axios.get(`${API_BASE_URL}/members?page=${page}&limit=${limit}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const pageMembers = membersResponse.data.data.members || [];
      allMembers = allMembers.concat(pageMembers.filter(m => m.isActive !== false));
      
      const pagination = membersResponse.data.data.pagination;
      hasMore = pagination && pagination.hasNext && pageMembers.length === limit;
      page++;
      
      console.log(`   Fetched page ${page - 1}: ${pageMembers.length} members (total so far: ${allMembers.length})`);
    }
    
    const members = allMembers;
    const totalMembers = members.length;
    
    console.log(`✅ Found ${totalMembers} active members\n`);
    
    if (totalMembers === 0) {
      console.log('No active members to send PINs to.');
      return;
    }

    // Ask for confirmation
    console.log('⚠️  WARNING: This will send PIN emails to ALL active members!');
    console.log(`   Total members: ${totalMembers}`);
    console.log(`   Estimated time: ~${Math.ceil((totalMembers / EMAILS_PER_BATCH) * (DELAY_BETWEEN_BATCHES / 60000))} minutes`);
    console.log('');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n📧 Step 3: Sending PIN emails in batches...');
    console.log(`   Batch size: ${EMAILS_PER_BATCH} emails`);
    console.log(`   Delay between batches: ${DELAY_BETWEEN_BATCHES / 1000} seconds`);
    console.log(`   Delay between emails: ${DELAY_BETWEEN_EMAILS / 1000} seconds\n`);
    
    const results = {
      successful: [],
      failed: [],
    };
    
    const startTime = Date.now();
    
    // Process in batches
    for (let i = 0; i < members.length; i += EMAILS_PER_BATCH) {
      const batch = members.slice(i, i + EMAILS_PER_BATCH);
      const batchNumber = Math.floor(i / EMAILS_PER_BATCH) + 1;
      const totalBatches = Math.ceil(members.length / EMAILS_PER_BATCH);
      
      console.log(`\n📦 Batch ${batchNumber}/${totalBatches} (${batch.length} members)...`);
      
      // Send emails in this batch (with limited concurrency for faster sending)
      const sendPromises = batch.map(async (member, j) => {
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
            console.log(`   ✅ [${emailNumber}/${totalMembers}] ${member.name} (${member.email})`);
            return { success: true, member };
          } else {
            results.failed.push({
              id: member.id,
              email: member.email,
              name: member.name,
              error: resendResponse.data.message || 'Unknown error'
            });
            console.log(`   ❌ [${emailNumber}/${totalMembers}] ${member.email} - ${resendResponse.data.message}`);
            return { success: false, member, error: resendResponse.data.message };
          }
        } catch (error) {
          results.failed.push({
            id: member.id,
            email: member.email,
            name: member.name,
            error: error.response?.data?.message || error.message
          });
          console.log(`   ❌ [${emailNumber}/${totalMembers}] ${member.email} - ${error.response?.data?.message || error.message}`);
          return { success: false, member, error: error.message };
        }
      });
      
      // Process emails with limited concurrency (5 at a time)
      for (let k = 0; k < sendPromises.length; k += CONCURRENT_EMAILS) {
        const chunk = sendPromises.slice(k, k + CONCURRENT_EMAILS);
        await Promise.all(chunk);
        // Small delay between chunks to avoid overwhelming the server
        if (k + CONCURRENT_EMAILS < sendPromises.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_EMAILS));
        }
      }
      
      // Delay between batches (except for the last batch)
      if (i + EMAILS_PER_BATCH < members.length) {
        console.log(`\n⏳ Waiting ${DELAY_BETWEEN_BATCHES / 1000} seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Members: ${totalMembers}`);
    console.log(`✅ Successful: ${results.successful.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    console.log(`⏱️  Total Time: ${Math.floor(duration / 60)}m ${duration % 60}s`);
    console.log(`📧 Emails Sent From: ${process.env.FROM_EMAIL || 'NOT SET'}`);
    
    if (results.failed.length > 0) {
      console.log('\n❌ Failed Emails:');
      results.failed.forEach(f => {
        console.log(`   - ${f.name} (${f.email}): ${f.error}`);
      });
    }
    
    if (results.successful.length > 0) {
      console.log('\n✅ Successfully sent emails to:');
      results.successful.slice(0, 10).forEach(s => {
        console.log(`   - ${s.name} (${s.email})`);
      });
      if (results.successful.length > 10) {
        console.log(`   ... and ${results.successful.length - 10} more`);
      }
    }
    
    console.log('\n✅ Done! Check email inboxes for PIN emails.');
    console.log(`📬 Check the inbox at: ${process.env.FROM_EMAIL || 'your-email@domain.com'}`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

testNamecheapEmail();
