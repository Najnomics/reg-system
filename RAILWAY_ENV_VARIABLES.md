# Railway Environment Variables Guide

Complete list of environment variables required for Railway deployment.

## Required Environment Variables

### Database (Required)
```env
DATABASE_URL=postgresql://user:password@host:5432/database
DIRECT_URL=postgresql://user:password@host:5432/database
```
**Note:** Railway automatically provides `DATABASE_URL` when you add PostgreSQL. Use the same value for `DIRECT_URL`.

### Authentication (Required)
```env
JWT_SECRET=your-strong-random-secret-key-minimum-32-characters
JWT_EXPIRES_IN=7d
```
**How to generate JWT_SECRET:**
```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or using OpenSSL
openssl rand -hex 32
```

### Server Configuration (Required)
```env
PORT=5000
NODE_ENV=production
```
**Note:** Railway automatically sets `PORT`. You can set it explicitly or let Railway handle it.

### Frontend URL (Required)
```env
FRONTEND_URL=https://your-frontend-domain.com
```
**Examples:**
- `https://your-app.vercel.app`
- `https://your-app.netlify.app`
- `https://yourchurch.com`

### CORS (Required if different from FRONTEND_URL)
```env
CORS_ORIGIN=https://your-frontend-domain.com
```
**Note:** If not set, defaults to `FRONTEND_URL`. Set this if your frontend is on a different domain.

## Email Configuration (Choose One Option)

### Option 1: SendGrid (Recommended)
```env
SENDGRID_API_KEY=SG.your-sendgrid-api-key-here
```
**Note:** When using SendGrid, the system automatically configures:
- Host: `smtp.sendgrid.net`
- Port: `587`
- User: `apikey`
- Pass: Your SendGrid API key

### Option 2: SMTP (Generic)
```env
SMTP_HOST=smtp.your-email-provider.com
SMTP_PORT=587
SMTP_USER=your-email@yourchurch.com
SMTP_PASS=your-email-password
SMTP_SECURE=false
```
**Common SMTP Providers:**
- **Gmail**: `smtp.gmail.com` (port 587, secure=false) - Requires App Password
- **Namecheap Private Email**: `mail.privateemail.com` (port 587, secure=false)
- **Outlook**: `smtp-mail.outlook.com` (port 587, secure=false)
- **Custom**: Use your email provider's SMTP settings

### Email From Settings (Optional but Recommended)
```env
FROM_EMAIL=noreply@yourchurch.com
FROM_NAME=Your Church Name
CHURCH_NAME=Your Church Name
```
**Note:** These are used in email templates. If not set, defaults are used.

## Complete Railway Environment Variables List

Copy and paste this into Railway's environment variables section:

```env
# Database (Auto-provided by Railway PostgreSQL)
DATABASE_URL=${{Postgres.DATABASE_URL}}
DIRECT_URL=${{Postgres.DATABASE_URL}}

# Authentication
JWT_SECRET=generate-a-strong-random-secret-key-here-minimum-32-characters
JWT_EXPIRES_IN=7d

# Server
PORT=5000
NODE_ENV=production

# Frontend
FRONTEND_URL=https://your-frontend-domain.com
CORS_ORIGIN=https://your-frontend-domain.com

# Email - Option 1: SendGrid (Recommended)
SENDGRID_API_KEY=SG.your-sendgrid-api-key-here

# Email - Option 2: SMTP (Alternative)
# SMTP_HOST=smtp.sendgrid.net
# SMTP_PORT=587
# SMTP_USER=apikey
# SMTP_PASS=your-sendgrid-api-key
# SMTP_SECURE=false

# Email From Settings
FROM_EMAIL=noreply@yourchurch.com
FROM_NAME=Your Church Name
CHURCH_NAME=Your Church Name
```

## How to Add Environment Variables in Railway

1. **Go to your Railway project dashboard**
2. **Click on your service** (backend service)
3. **Click on the "Variables" tab**
4. **Click "New Variable"**
5. **Add each variable** one by one:
   - Name: `DATABASE_URL`
   - Value: Railway will auto-populate this if you added PostgreSQL
   - Click "Add"

6. **Repeat for all variables**

## Quick Setup Checklist

- [ ] Add PostgreSQL service in Railway
- [ ] Copy `DATABASE_URL` from PostgreSQL service
- [ ] Set `DIRECT_URL` to same value as `DATABASE_URL`
- [ ] Generate and set `JWT_SECRET` (32+ characters)
- [ ] Set `JWT_EXPIRES_IN` (default: `7d`)
- [ ] Set `NODE_ENV=production`
- [ ] Set `FRONTEND_URL` to your frontend domain
- [ ] Set `CORS_ORIGIN` (same as FRONTEND_URL if frontend is on same domain)
- [ ] Configure email (SendGrid API key OR SMTP settings)
- [ ] Set `FROM_EMAIL`, `FROM_NAME`, `CHURCH_NAME` (optional but recommended)

## Testing Your Configuration

After setting up environment variables, check the logs:

1. **Deploy your service**
2. **Check Railway logs** for:
   - ✅ Database connection successful
   - ✅ Email service initialized
   - ✅ Server started on port XXXX

If you see errors, check:
- Database URL is correct
- JWT_SECRET is set
- Email credentials are correct
- FRONTEND_URL matches your frontend domain

## Common Issues

### Database Connection Failed
- Check `DATABASE_URL` is correct
- Ensure PostgreSQL service is running
- Verify `DIRECT_URL` matches `DATABASE_URL`

### Email Not Sending
- Verify SendGrid API key is correct (starts with `SG.`)
- OR check SMTP credentials are correct
- Check email service logs in Railway

### CORS Errors
- Ensure `FRONTEND_URL` matches your frontend domain exactly
- Set `CORS_ORIGIN` if frontend is on different domain
- Check frontend is using correct API URL

### Authentication Errors
- Verify `JWT_SECRET` is set and is strong (32+ characters)
- Check `JWT_EXPIRES_IN` is valid format (e.g., `7d`, `24h`)

## Security Best Practices

1. **Never commit `.env` files** to git
2. **Use strong JWT_SECRET** (32+ random characters)
3. **Rotate secrets regularly** (especially JWT_SECRET)
4. **Use Railway's secret management** - don't hardcode secrets
5. **Limit CORS_ORIGIN** to your actual frontend domain
6. **Use SendGrid API keys** instead of SMTP passwords when possible

## Railway-Specific Notes

- Railway automatically provides `DATABASE_URL` when PostgreSQL is added
- Railway sets `PORT` automatically - you can override it
- Railway provides `RAILWAY_ENVIRONMENT` variable automatically
- Use Railway's variable references: `${{Postgres.DATABASE_URL}}`
