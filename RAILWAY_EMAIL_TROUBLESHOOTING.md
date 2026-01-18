# Railway Email Connection Timeout - Troubleshooting Guide

## Current Error
```
Connection timeout
POST /api/members/.../resend-pin 500 (Internal Server Error)
```

## Problem
Railway cannot connect to Namecheap's SMTP server (`mail.privateemail.com`) on port 587.

## Solutions (Try in Order)

### Solution 1: Switch to Port 465 with SSL

Railway may block port 587. Try port 465 with SSL instead:

**Update these Railway variables:**

```env
SMTP_PORT=465
SMTP_SECURE=true
SMTP_HOST=mail.privateemail.com
```

Keep all other variables the same.

---

### Solution 2: Try Alternative SMTP Host

Namecheap may have multiple SMTP endpoints:

**Update Railway variable:**

```env
SMTP_HOST=smtp.privateemail.com
SMTP_PORT=587
SMTP_SECURE=false
```

Or try:

```env
SMTP_HOST=mail.homecomming26.com
SMTP_PORT=587
SMTP_SECURE=false
```

---

### Solution 3: Verify Namecheap Email Settings

1. **Log into Namecheap account**
2. Go to **Domain List** → `homecomming26.com`
3. Click **Manage** → **Email** or **Private Email**
4. Check **SMTP Settings**:
   - Verify SMTP server address
   - Check if port 587 or 465 is recommended
   - Verify email account is active

---

### Solution 4: Check Railway Network Restrictions

Railway may have firewall rules blocking SMTP:

1. **Check Railway logs** for detailed error messages
2. Look for: `ETIMEDOUT`, `ECONNECTION`, `EHLO`, `AUTH`
3. Railway's IP addresses might be blocked by Namecheap

**If Railway IPs are blocked:**
- Contact Namecheap support to whitelist Railway IPs
- Or use a different email service (SendGrid, Resend, etc.)

---

### Solution 5: Test SMTP Connection Locally

Verify Namecheap SMTP works outside Railway:

```bash
# Test SMTP connection
telnet mail.privateemail.com 587
# or
telnet mail.privateemail.com 465
```

If this works locally but not on Railway, it's a Railway network issue.

---

## Recommended Configuration (Try This First)

**Option A: Port 465 with SSL (Most Reliable)**

```env
SMTP_HOST=mail.privateemail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=grace_edge@homecomming26.com
SMTP_PASS=YOUR_SMTP_PASSWORD
FROM_EMAIL=grace_edge@homecomming26.com
FROM_NAME=Grace Edge Ministries
```

**Option B: Alternative Host**

```env
SMTP_HOST=smtp.privateemail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=grace_edge@homecomming26.com
SMTP_PASS=YOUR_SMTP_PASSWORD
FROM_EMAIL=grace_edge@homecomming26.com
FROM_NAME=Grace Edge Ministries
```

---

## After Updating Variables

1. **Save variables** in Railway (auto-redeploys)
2. **Wait for deployment** to complete
3. **Check Railway logs** for:
   ```
   ✅ Email service initialized with SMTP (mail.privateemail.com)
   ```
4. **Test email sending** by resending a PIN
5. **Check logs** for any new error messages

---

## If Nothing Works

### Alternative Email Services:

**1. SendGrid (Free tier: 100 emails/day)**
```env
SENDGRID_API_KEY=your_sendgrid_api_key
# Remove SMTP_* variables
```

**2. Resend (Free tier: 3,000 emails/month)**
- Would require code changes to integrate Resend API

**3. AWS SES (Pay as you go)**
- More complex setup, but very reliable

---

## Debugging Steps

1. **Check Railway logs** for detailed SMTP errors:
   ```bash
   # Look for these patterns:
   - "Connection timeout"
   - "ETIMEDOUT"
   - "ECONNECTION"
   - "EHLO"
   - "AUTH"
   ```

2. **Verify environment variables** are set correctly:
   - Check Railway → Variables tab
   - Ensure no typos
   - Ensure no extra spaces

3. **Test email account** directly:
   - Try logging into `grace_edge@homecomming26.com` via webmail
   - Verify password is correct
   - Check if account is suspended

4. **Check DNS records**:
   - MX records should point to Namecheap
   - SPF records should include Namecheap

---

## Expected Log Messages

**Success:**
```
✅ Email service initialized with SMTP (mail.privateemail.com)
📧 Attempting to send PIN email to...
✅ PIN email sent successfully to...
```

**Failure:**
```
❌ Error sending PIN email to...
Error details: { code: 'ETIMEDOUT', ... }
📧 Namecheap SMTP Connection Timeout:
   Railway may not be able to reach Namecheap SMTP on port 587.
```

---

## Quick Fix Checklist

- [ ] Try port 465 with `SMTP_SECURE=true`
- [ ] Try `SMTP_HOST=smtp.privateemail.com`
- [ ] Verify email credentials are correct
- [ ] Check Railway logs for detailed errors
- [ ] Test SMTP connection locally
- [ ] Contact Namecheap support if needed
- [ ] Consider alternative email service if Railway IPs are blocked
