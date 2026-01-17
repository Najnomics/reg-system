# Namecheap Custom Email Setup Guide

## Why Use Namecheap Custom Email?

✅ **Professional appearance** - Use `admin@yourchurchdomain.com` instead of Gmail  
✅ **Better deliverability** - Less likely to be marked as spam  
✅ **No IP blocking** - Avoids Railway/Gmail connection issues  
✅ **Higher sending limits** - Better for bulk emails  
✅ **More reliable** - Dedicated email hosting  

## Step 1: Set Up Namecheap Email Account

1. Log in to your Namecheap account
2. Go to **Domain List** → Select your domain
3. Click **Manage** → **Private Email** (or **Email** if using cPanel)
4. Create an email account (e.g., `admin@yourdomain.com` or `noreply@yourdomain.com`)
5. Set a strong password
6. **Enable 2FA** (recommended for security)

## Step 2: Get SMTP Settings

Namecheap Private Email SMTP settings:

```
SMTP Host: mail.privateemail.com
SMTP Port: 587 (TLS) or 465 (SSL)
SMTP User: your-email@yourdomain.com
SMTP Pass: your-email-password
Security: TLS (port 587) or SSL (port 465)
```

**Alternative (if using cPanel Email):**
```
SMTP Host: mail.yourdomain.com
SMTP Port: 587 (TLS) or 465 (SSL)
SMTP User: your-email@yourdomain.com
SMTP Pass: your-email-password
Security: TLS (port 587) or SSL (port 465)
```

## Step 3: Configure Environment Variables

Add these to your Railway `.env` file:

```env
# Namecheap Custom Email Configuration
SMTP_HOST=mail.privateemail.com
SMTP_PORT=587
SMTP_USER=admin@yourdomain.com
SMTP_PASS=your-email-password
SMTP_SECURE=false
```

**For SSL (port 465):**
```env
SMTP_HOST=mail.privateemail.com
SMTP_PORT=465
SMTP_USER=admin@yourdomain.com
SMTP_PASS=your-email-password
SMTP_SECURE=true
```

## Step 4: Update Email From Address

Update the "From" name in your email service. The system will use:
- **From Name**: "Grace Edge Ministries" (or your church name)
- **From Email**: Your Namecheap email address (e.g., `admin@yourdomain.com`)

## Step 5: Test Email Sending

After deployment, test by:
1. Creating a new member
2. Resending a PIN to an existing member
3. Check the email inbox to confirm delivery

## DNS Records (Important!)

Make sure your domain has proper DNS records:

1. **MX Records** (for receiving emails):
   ```
   Type: MX
   Host: @
   Value: mail.privateemail.com
   Priority: 10
   ```

2. **SPF Record** (for sending emails):
   ```
   Type: TXT
   Host: @
   Value: v=spf1 include:spf.privateemail.com ~all
   ```

3. **DKIM Record** (for email authentication):
   - Get this from Namecheap Private Email settings
   - Usually found in Email → Advanced → DKIM

4. **DMARC Record** (optional but recommended):
   ```
   Type: TXT
   Host: _dmarc
   Value: v=DMARC1; p=none; rua=mailto:admin@yourdomain.com
   ```

## Troubleshooting

### Emails Not Sending
- Check SMTP credentials are correct
- Verify port 587 (TLS) or 465 (SSL) is not blocked
- Check Railway logs for SMTP connection errors
- Ensure DNS records are properly configured

### Emails Going to Spam
- Verify SPF, DKIM, and DMARC records are set
- Use a professional "From" name
- Avoid spam trigger words in subject/content
- Warm up the domain by sending gradually

### Connection Timeout
- Try port 465 with SSL instead of 587 with TLS
- Check if Railway allows outbound SMTP connections
- Verify SMTP_HOST is correct (mail.privateemail.com)

## Cost Comparison

- **Gmail**: Free but unreliable on Railway (IP blocking)
- **Namecheap Private Email**: ~$1.88/month per mailbox (very affordable!)
- **SendGrid**: Free tier (100 emails/day), then paid

## Benefits Over Gmail

1. ✅ No connection timeout issues
2. ✅ Professional email address
3. ✅ Better for bulk emails (5000+ per day)
4. ✅ No IP blocking by cloud providers
5. ✅ Better deliverability rates
6. ✅ Custom domain branding

## Next Steps

1. Set up Namecheap email account
2. Add environment variables to Railway
3. Deploy and test
4. Monitor email delivery rates
5. Adjust DNS records if needed
