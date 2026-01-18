# Vercel Serverless Functions - Email Setup Guide

## Overview

This setup uses Vercel Serverless Functions to send emails, bypassing Railway's SMTP blocking. Emails are sent from Vercel's infrastructure instead of Railway.

## Architecture

```
Frontend (Vercel) → Vercel Serverless Function → SMTP Server (Namecheap/Gmail)
```

Instead of:
```
Frontend → Railway Backend → SMTP Server (BLOCKED)
```

## Setup Steps

### 1. Install Dependencies

The `nodemailer` package is already added to `package.json`. Install it:

```bash
npm install
```

### 2. Add Environment Variables to Vercel

Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

Add these variables:

```env
SMTP_HOST=mail.privateemail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=grace_edge@homecomming26.com
SMTP_PASS=YOUR_SMTP_PASSWORD
FROM_EMAIL=grace_edge@homecomming26.com
FROM_NAME=Grace Edge Ministries
CHURCH_NAME=Grace Edge Ministries
```

**For SSL (port 465):**
```env
SMTP_PORT=465
SMTP_SECURE=true
```

### 3. Deploy to Vercel

The serverless functions are automatically deployed when you push to GitHub:

```bash
git add api/
git commit -m "feat: Add Vercel serverless functions for email"
git push
```

Vercel will automatically detect and deploy the functions.

### 4. Test the Functions

After deployment, test the endpoints:

**Test PIN Email:**
```bash
curl -X POST https://reg-system-mu.vercel.app/api/send-pin-email \
  -H "Content-Type: application/json" \
  -d '{
    "memberId": "test-id",
    "memberName": "Test User",
    "memberEmail": "test@example.com",
    "memberPin": "1234"
  }'
```

**Test Generic Email:**
```bash
curl -X POST https://reg-system-mu.vercel.app/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "html": "<h1>Test</h1>",
    "text": "Test"
  }'
```

## Integration with Backend

### Option 1: Use Vercel Email Service from Frontend

Update your frontend code to use Vercel email service:

```javascript
import vercelEmailService from './services/vercelEmailService';

// Send PIN email
await vercelEmailService.sendPinEmail({
  id: member.id,
  name: member.name,
  email: member.email,
  pin: member.pin
});
```

### Option 2: Backend Calls Vercel API

Update Railway backend to call Vercel API when SMTP fails:

```javascript
// In memberController.js or emailService.js
async function sendPinEmailViaVercel(member) {
  try {
    const response = await fetch('https://reg-system-mu.vercel.app/api/send-pin-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberId: member.id,
        memberName: member.name,
        memberEmail: member.email,
        memberPin: member.pin,
      }),
    });
    return await response.json();
  } catch (error) {
    console.error('Vercel email fallback failed:', error);
    throw error;
  }
}
```

## API Endpoints

### POST `/api/send-pin-email`

Send a PIN email to a member.

**Request Body:**
```json
{
  "memberId": "uuid",
  "memberName": "John Doe",
  "memberEmail": "john@example.com",
  "memberPin": "1234"
}
```

**Response:**
```json
{
  "success": true,
  "message": "PIN email sent successfully",
  "data": {
    "messageId": "email-message-id",
    "memberEmail": "john@example.com",
    "memberName": "John Doe",
    "memberId": "uuid"
  }
}
```

### POST `/api/send-email`

Send a generic email.

**Request Body:**
```json
{
  "to": "recipient@example.com",
  "subject": "Email Subject",
  "html": "<h1>HTML Content</h1>",
  "text": "Plain text content",
  "memberId": "uuid (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email sent successfully",
  "data": {
    "messageId": "email-message-id",
    "to": "recipient@example.com",
    "subject": "Email Subject"
  }
}
```

## Troubleshooting

### Function Not Found (404)

- Ensure `api/` directory is in the root of your project
- Check that files are named `index.js`
- Redeploy on Vercel

### SMTP Connection Timeout

If Vercel also blocks SMTP:
- Try port 465 with SSL
- Consider using SendGrid API instead (modify functions to use SendGrid)
- Check Vercel logs for detailed error messages

### Environment Variables Not Found

- Ensure variables are set in Vercel dashboard
- Redeploy after adding variables
- Check variable names match exactly (case-sensitive)

### CORS Errors

- Vercel functions should handle CORS automatically
- If issues persist, add CORS headers in the function

## Advantages

✅ **Bypasses Railway SMTP blocking**  
✅ **Server-side execution** (credentials stay secure)  
✅ **Automatic scaling** (Vercel handles load)  
✅ **No additional infrastructure** needed  
✅ **Fast deployment** (deploys with frontend)

## Disadvantages

⚠️ **Vercel may also block SMTP** (needs testing)  
⚠️ **Function timeout limits** (10s on free tier, 60s on Pro)  
⚠️ **Cold starts** (first request may be slower)  
⚠️ **Cost** (if exceeding free tier limits)

## Next Steps

1. Add environment variables to Vercel
2. Deploy and test
3. If Vercel also blocks SMTP, consider SendGrid API integration
4. Update backend to use Vercel email as fallback
