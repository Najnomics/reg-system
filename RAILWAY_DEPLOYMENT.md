# Railway Deployment Configuration Guide

## Railway Settings Configuration

### Source
- **Source Repo**: `Najnomics/reg-system`
- **Root Directory**: `/server` ✅ (Already configured correctly)
- **Branch connected to production**: `main` ✅

### Build Settings
- **Builder**: `Railpack` (Default) ✅
- **Build Command**: Leave empty (Railway will auto-detect from package.json)
- **Watch Paths**: Add `/server/**` (optional, to trigger rebuilds only when server code changes)

### Deploy Settings
- **Start Command**: `npm run deploy` (This runs migrations and starts the server)
  - OR use: `npx prisma migrate deploy && npm start`
- **Healthcheck Path**: `/health` ✅
- **Restart Policy**: `On Failure` ✅
- **Max restart retries**: `10` ✅

### Resource Limits
- **CPU**: `1-2 vCPU` (sufficient for most use cases)
- **Memory**: `1-2 GB` (sufficient for most use cases)

### Networking
- **Public Networking**: ✅ Enabled
- **Generate Domain**: Click to generate a public domain (e.g., `reg-system-production.up.railway.app`)

---

## Environment Variables for Railway

Add these in Railway → Your Service → Variables tab:

### Database (Required)
```env
DATABASE_URL=postgresql://user:password@host:port/database?schema=public
DIRECT_URL=postgresql://user:password@host:port/database?schema=public
```
**Note**: Railway can auto-provision a PostgreSQL database. If you do, Railway will automatically set `DATABASE_URL`. You may need to set `DIRECT_URL` manually if using connection pooling.

### Authentication (Required)
```env
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_EXPIRES_IN=7d
```

### Application Settings (Required)
```env
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-vercel-app.vercel.app
```

### Email Configuration (Choose ONE option)

**Option 1: SendGrid (Recommended)**
```env
SENDGRID_API_KEY=SG.your-sendgrid-api-key-here
FROM_EMAIL=noreply@yourchurch.com
FROM_NAME=Your Church Name
CHURCH_NAME=Your Church Name
```

**Option 2: Custom SMTP**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@yourchurch.com
FROM_NAME=Your Church Name
CHURCH_NAME=Your Church Name
```

**Option 3: No Email (Development/Testing)**
```env
# Leave email variables empty - emails will be logged but not sent
```

### Optional Settings
```env
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
ADMIN_EMAIL=admin@yourchurch.com
ADMIN_PASSWORD=your-secure-admin-password
```

---

## Complete Environment Variables List

Copy and paste this into Railway Variables (fill in your actual values):

```env
# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Authentication
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long-change-this-in-production
JWT_EXPIRES_IN=7d

# Application
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-vercel-app.vercel.app

# Email (SendGrid)
SENDGRID_API_KEY=SG.your-sendgrid-api-key
FROM_EMAIL=noreply@yourchurch.com
FROM_NAME=Your Church Name
CHURCH_NAME=Your Church Name

# Optional
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
ADMIN_EMAIL=admin@yourchurch.com
ADMIN_PASSWORD=your-secure-admin-password
```

---

## Deployment Steps

1. **Connect Repository**: Already done ✅
2. **Set Root Directory**: `/server` ✅
3. **Add Environment Variables**: Copy all variables above
4. **Set Start Command**: `npm run deploy` or `npx prisma migrate deploy && npm start`
5. **Set Healthcheck**: `/health`
6. **Generate Public Domain**: Click "Generate Domain"
7. **Deploy**: Railway will automatically deploy on push to `main` branch

---

## Post-Deployment

1. **Get Railway URL**: Copy the generated domain (e.g., `https://reg-system-production.up.railway.app`)
2. **Update Frontend**: Update `FRONTEND_URL` in Railway to match your Vercel URL
3. **Test Health Endpoint**: Visit `https://your-railway-url.railway.app/health`
4. **Run Database Migrations**: Should run automatically with `npm run deploy`

---

## Troubleshooting

- **Build fails**: Check that Root Directory is `/server`
- **Database connection fails**: Verify `DATABASE_URL` is set correctly
- **Emails not sending**: Check `SENDGRID_API_KEY` or SMTP credentials
- **Frontend can't connect**: Update `FRONTEND_URL` in Railway and add Railway URL to Vercel's allowed origins
