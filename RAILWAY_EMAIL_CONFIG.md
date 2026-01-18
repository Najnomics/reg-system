# Railway Email Configuration - Namecheap Business Email

## Your Email Details
- **Email**: grace_edge@homecomming26.com
- **Domain**: homecomming26.com

## Step 1: Get Namecheap SMTP Settings

For Namecheap Business Email, the SMTP settings are typically:

**Option 1: Using mail.privateemail.com (if using Private Email)**
```
SMTP Host: mail.privateemail.com
SMTP Port: 587 (TLS) or 465 (SSL)
```

**Option 2: Using your domain's mail server**
```
SMTP Host: mail.homecomming26.com
SMTP Port: 587 (TLS) or 465 (SSL)
```

**Option 3: Using smtp.privateemail.com**
```
SMTP Host: smtp.privateemail.com
SMTP Port: 587 (TLS) or 465 (SSL)
```

## Step 2: Add Environment Variables to Railway

Go to your Railway project → **Variables** tab → Add these:

### Required Variables:

```env
SMTP_HOST=mail.privateemail.com
SMTP_PORT=587
SMTP_USER=grace_edge@homecomming26.com
SMTP_PASS=price873
SMTP_SECURE=false
FROM_EMAIL=grace_edge@homecomming26.com
FROM_NAME=Grace Edge Ministries
CHURCH_NAME=Grace Edge Ministries
```

### If Port 587 Doesn't Work, Try Port 465:

```env
SMTP_HOST=mail.privateemail.com
SMTP_PORT=465
SMTP_USER=grace_edge@homecomming26.com
SMTP_PASS=price873
SMTP_SECURE=true
FROM_EMAIL=grace_edge@homecomming26.com
FROM_NAME=Grace Edge Ministries
CHURCH_NAME=Grace Edge Ministries
```

## Step 3: Verify SMTP Host

To find the correct SMTP host for your Namecheap email:

1. Log into Namecheap account
2. Go to **Domain List** → Select `homecomming26.com`
3. Click **Manage** → **Email** or **Private Email**
4. Look for **SMTP Settings** or **Mail Client Configuration**
5. You'll see the SMTP server address

Common options:
- `mail.privateemail.com` (most common)
- `smtp.privateemail.com`
- `mail.homecomming26.com` (if using cPanel email)

## Step 4: Test the Configuration

After adding variables to Railway:

1. **Redeploy** your Railway service (or it will auto-redeploy)
2. **Check Railway logs** for:
   ```
   ✅ Email service initialized with SMTP (mail.privateemail.com)
   ```
3. **Test by**:
   - Creating a new member
   - Or resending a PIN to an existing member
4. **Check the email inbox** at grace_edge@homecomming26.com

## Step 5: Troubleshooting

### If emails don't send:

1. **Check Railway logs** for SMTP errors
2. **Try different SMTP hosts**:
   - `mail.privateemail.com`
   - `smtp.privateemail.com`
   - `mail.homecomming26.com`
3. **Try different ports**:
   - Port 587 with `SMTP_SECURE=false` (TLS)
   - Port 465 with `SMTP_SECURE=true` (SSL)
4. **Verify credentials** are correct
5. **Check DNS records** are set up correctly

### Common Errors:

**"Connection timeout"**
- Try port 465 with SSL instead of 587
- Check if Railway allows outbound SMTP connections

**"Authentication failed"**
- Verify email and password are correct
- Check if 2FA is enabled (may need app password)

**"Host not found"**
- Try alternative SMTP hosts listed above
- Check Namecheap email settings for correct host

## Step 6: DNS Records (Important!)

Make sure these DNS records are set for `homecomming26.com`:

### MX Record (for receiving emails):
```
Type: MX
Host: @
Value: mail.privateemail.com
Priority: 10
TTL: Automatic
```

### SPF Record (for sending emails):
```
Type: TXT
Host: @
Value: v=spf1 include:spf.privateemail.com ~all
TTL: Automatic
```

### DKIM Record:
- Get this from Namecheap email settings
- Usually found in Email → Advanced → DKIM

## Security Note

⚠️ **Important**: The password is stored securely in Railway's environment variables (encrypted). Never commit passwords to git or share them publicly.

## Next Steps

1. Add the environment variables to Railway
2. Redeploy the service
3. Test email sending
4. Monitor Railway logs for any errors
5. Check email inbox for test emails
