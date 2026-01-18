# Railway Environment Variables - Production Configuration

## Updated with Namecheap Email Settings

Copy these exact values to your Railway project → **Variables** tab:

---

## Required Variables

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
SMTP_HOST=mail.privateemail.com
SMTP_PASS=YOUR_SMTP_PASSWORD
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=grace_edge@homecomming26.com
```

---

## Changes Made

### Email Configuration (Updated):
- ✅ `SMTP_HOST`: Changed from `smtp.gmail.com` → `mail.privateemail.com`
- ✅ `SMTP_USER`: Changed from `graceedgeministry@gmail.com` → `grace_edge@homecomming26.com`
- ✅ `SMTP_PASS`: Changed from Gmail app password → `YOUR_SMTP_PASSWORD`
- ✅ `FROM_EMAIL`: Changed from `graceedgeministry@gmail.com` → `grace_edge@homecomming26.com`

### Unchanged:
- `SMTP_PORT`: `587` (TLS)
- `SMTP_SECURE`: `false` (for port 587)
- All other variables remain the same

---

## Quick Copy-Paste (No Quotes)

For Railway, you can copy these without quotes:

```
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
SMTP_HOST=mail.privateemail.com
SMTP_PASS=YOUR_SMTP_PASSWORD
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=grace_edge@homecomming26.com
```

---

## ⚠️ Connection Timeout Fix

If you're getting "Connection timeout" errors, **try port 465 with SSL**:

### Solution 1: Port 465 with SSL (Recommended for Railway)

```env
SMTP_HOST=mail.privateemail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=grace_edge@homecomming26.com
SMTP_PASS=YOUR_SMTP_PASSWORD
```

### Solution 2: Alternative SMTP Host

If port 465 doesn't work, try:

```env
SMTP_HOST=smtp.privateemail.com
SMTP_PORT=587
SMTP_SECURE=false
```

Or:

```env
SMTP_HOST=mail.homecomming26.com
SMTP_PORT=587
SMTP_SECURE=false
```

---

## After Updating Variables

1. Railway will automatically redeploy
2. Check Railway logs for: `✅ Email service initialized with SMTP (mail.privateemail.com)`
3. Test by resending a PIN to a member
4. Check `grace_edge@homecomming26.com` inbox for test emails

---

## Security Note

⚠️ **Never commit this file to git!** These are production credentials.
This file is for reference only. Always set variables directly in Railway's UI.
