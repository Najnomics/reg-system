# Railway Email Setup - SendGrid Solution

## Problem
Railway is **blocking outbound SMTP connections** to Namecheap's servers. This is a common network restriction on cloud platforms.

## Solution: Use SendGrid (Recommended)

SendGrid is a transactional email service that works reliably on Railway and offers:
- ✅ **Free tier**: 100 emails/day forever
- ✅ **Reliable**: Works on all cloud platforms
- ✅ **No SMTP blocking issues**
- ✅ **Easy setup**: Just add API key

---

## Step 1: Create SendGrid Account

1. Go to https://sendgrid.com
2. Sign up for free account
3. Verify your email
4. Complete account setup

---

## Step 2: Create API Key

1. Log into SendGrid dashboard
2. Go to **Settings** → **API Keys**
3. Click **Create API Key**
4. Name it: `Railway Email Service`
5. Select **Full Access** permissions (or at least **Mail Send**)
6. Click **Create & View**
7. **Copy the API key** (you'll only see it once!)

---

## Step 3: Update Railway Variables

Go to Railway → **Variables** tab → **Add/Update** these:

### Remove/Update SMTP Variables:

**Remove these** (or leave them, SendGrid takes priority):
```
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_PASS
```

### Add SendGrid Variable:

```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Replace `SG.xxx...` with your actual SendGrid API key.

### Keep These Variables:

```env
FROM_EMAIL=grace_edge@homecomming26.com
FROM_NAME=Grace Edge Ministries
CHURCH_NAME=Grace Edge Ministries
```

**Note**: `FROM_EMAIL` can be your Namecheap email - SendGrid will send from it once verified.

---

## Step 4: Verify Sender Email (Important!)

SendGrid requires sender verification:

1. Go to SendGrid → **Settings** → **Sender Authentication**
2. Click **Verify a Single Sender**
3. Enter:
   - **From Email**: `grace_edge@homecomming26.com`
   - **From Name**: `Grace Edge Ministries`
   - **Reply To**: `grace_edge@homecomming26.com`
   - **Company Address**: Your church address
4. Click **Create**
5. **Check your email** (`grace_edge@homecomming26.com`)
6. **Click the verification link** in the email

**Alternative**: Verify your entire domain (better for production):
1. Go to **Domain Authentication**
2. Add `homecomming26.com`
3. Add DNS records to Namecheap
4. Wait for verification (can take 24-48 hours)

---

## Step 5: Test Email Sending

After updating Railway variables:

1. **Railway will auto-redeploy**
2. **Check logs** for: `✅ Email service initialized with SendGrid SMTP`
3. **Test** by resending a PIN to a member
4. **Check email inbox** for the PIN email

---

## Complete Railway Variables (SendGrid)

```env
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=YOUR_ADMIN_PASSWORD
CHURCH_NAME=Grace Edge Ministries
DATABASE_URL=postgresql://postgres.ncablrtbpijqsxtsplyz:YOUR_DATABASE_PASSWORD@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&schema=public&sslmode=require
DIRECT_URL=postgresql://postgres:YOUR_DATABASE_PASSWORD@db.ncablrtbpijqsxtsplyz.supabase.co:5432/postgres?schema=public&sslmode=require
FROM_EMAIL=grace_edge@homecomming26.com
FROM_NAME=Grace Edge Ministries
FRONTEND_URL=https://reg-system-mu.vercel.app
JWT_EXPIRES_IN=7d
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long-change-this-in-production
NODE_ENV=production
PORT=3000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000
SENDGRID_API_KEY=SG.your-actual-api-key-here
```

---

## SendGrid Pricing

- **Free**: 100 emails/day forever
- **Essentials**: $19.95/month for 50,000 emails/month
- **Pro**: $89.95/month for 100,000 emails/month

For your use case (5,000 emails/day for 14 days = 70,000 emails):
- **Free tier**: Not enough (only 1,400 emails over 14 days)
- **Essentials**: Perfect! $19.95/month covers it

**Note**: After the 14-day period, you can downgrade to free tier if you don't need more than 100/day.

---

## Why SendGrid Works on Railway

- Uses **API-based sending** (not SMTP)
- Railway doesn't block API calls
- More reliable than SMTP
- Better deliverability rates
- Built-in analytics

---

## Troubleshooting

### "Sender not verified" error:
- Make sure you verified the sender email in SendGrid dashboard
- Check spam folder for verification email

### "API key invalid" error:
- Regenerate API key in SendGrid
- Make sure you copied the full key (starts with `SG.`)

### Emails going to spam:
- Verify sender email/domain
- Set up SPF/DKIM records (SendGrid provides instructions)
- Use a verified domain instead of single sender

---

## Alternative: Try Different SMTP Hosts First

If you want to try Namecheap one more time, try these in order:

### Option 1: smtp.privateemail.com
```env
SMTP_HOST=smtp.privateemail.com
SMTP_PORT=587
SMTP_SECURE=false
```

### Option 2: mail.homecomming26.com
```env
SMTP_HOST=mail.homecomming26.com
SMTP_PORT=587
SMTP_SECURE=false
```

### Option 3: Port 2525 (Alternative)
```env
SMTP_HOST=mail.privateemail.com
SMTP_PORT=2525
SMTP_SECURE=false
```

**But honestly, SendGrid is the most reliable solution for Railway.**
