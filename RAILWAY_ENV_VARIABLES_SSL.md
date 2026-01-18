# Railway Environment Variables - Complete List (SSL Configuration)

## All Variables for Railway Deployment

Copy these **exact values** to your Railway project → **Variables** tab:

---

## Complete Environment Variables List

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
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=grace_edge@homecomming26.com
```

---

## Quick Copy-Paste (No Quotes)

For Railway, copy these without quotes:

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
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=grace_edge@homecomming26.com
```

---

## Variable Descriptions

| Variable | Value | Purpose |
|----------|-------|---------|
| `ADMIN_EMAIL` | `admin@example.com` | Default admin login email |
| `ADMIN_PASSWORD` | `admin123` | Default admin password (change in production!) |
| `CHURCH_NAME` | `Grace Edge Ministries` | Church name used in emails |
| `DATABASE_URL` | `postgresql://...` | Supabase connection string (pooler) |
| `DIRECT_URL` | `postgresql://...` | Supabase direct connection for migrations |
| `FROM_EMAIL` | `grace_edge@homecomming26.com` | Sender email address |
| `FROM_NAME` | `Grace Edge Ministries` | Display name for emails |
| `FRONTEND_URL` | `https://reg-system-mu.vercel.app` | Frontend domain (for CORS) |
| `JWT_EXPIRES_IN` | `7d` | JWT token expiration (7 days) |
| `JWT_SECRET` | `your-super-secret...` | Secret key for JWT tokens |
| `NODE_ENV` | `production` | Environment mode |
| `PORT` | `3000` | Server port |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per window |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window (15 minutes) |
| `SMTP_HOST` | `mail.privateemail.com` | Namecheap SMTP server |
| `SMTP_PASS` | `price873` | Email account password |
| `SMTP_PORT` | `465` | **SSL port** (changed from 587) |
| `SMTP_SECURE` | `true` | **SSL enabled** (changed from false) |
| `SMTP_USER` | `grace_edge@homecomming26.com` | Email account username |

---

## Key Changes for SSL

✅ **SMTP_PORT**: Changed from `587` → `465`  
✅ **SMTP_SECURE**: Changed from `false` → `true`

This uses SSL encryption instead of TLS, which is more reliable on Railway.

---

## After Adding Variables

1. **Save** all variables in Railway
2. Railway will **auto-redeploy**
3. **Check logs** for: `✅ Email service initialized with SMTP (mail.privateemail.com)`
4. **Test** by resending a PIN to a member
5. **Check** `grace_edge@homecomming26.com` inbox

---

## Troubleshooting

### If port 465 doesn't work, try:

**Option 1: Alternative host**
```env
SMTP_HOST=smtp.privateemail.com
SMTP_PORT=587
SMTP_SECURE=false
```

**Option 2: Domain-based host**
```env
SMTP_HOST=mail.homecomming26.com
SMTP_PORT=587
SMTP_SECURE=false
```

---

## Security Note

⚠️ **Never commit this file to git!** These contain production credentials.  
Always set variables directly in Railway's UI, never commit `.env` files.
