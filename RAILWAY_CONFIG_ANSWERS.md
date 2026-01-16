# Railway Configuration Quick Answers

## Railway Settings - Fill These In:

### Source
- ✅ **Source Repo**: `Najnomics/reg-system` (already connected)
- ✅ **Root Directory**: `/server`
- ✅ **Branch**: `main`

### Build
- **Builder**: `Railpack` (Default) ✅
- **Build Command**: Leave empty (auto-detected)
- **Watch Paths**: `/server/**` (optional)

### Deploy
- **Start Command**: `npm run deploy`
  - OR: `npx prisma migrate deploy && npm start`
- **Healthcheck Path**: `/health`
- **Restart Policy**: `On Failure` ✅
- **Max restart retries**: `10` ✅

### Resource Limits
- **CPU**: `1-2 vCPU` (start with 1, scale up if needed)
- **Memory**: `1-2 GB` (start with 1, scale up if needed)

### Networking
- ✅ **Public Networking**: Enabled
- **Generate Domain**: Click to generate (e.g., `reg-system-production.up.railway.app`)

---

## All Environment Variables (Copy & Paste into Railway Variables)

```env
# Database (Railway will auto-set if you provision PostgreSQL)
DATABASE_URL=postgresql://user:password@host:port/database?schema=public
DIRECT_URL=postgresql://user:password@host:port/database?schema=public

# Authentication (REQUIRED - Generate a secure random string)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long-change-this-in-production
JWT_EXPIRES_IN=7d

# Application (REQUIRED)
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-vercel-app.vercel.app

# Email - SendGrid (Choose ONE email option)
SENDGRID_API_KEY=SG.your-sendgrid-api-key-here
FROM_EMAIL=noreply@yourchurch.com
FROM_NAME=Your Church Name
CHURCH_NAME=Your Church Name

# Email - OR Custom SMTP (Alternative to SendGrid)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
# FROM_EMAIL=noreply@yourchurch.com
# FROM_NAME=Your Church Name
# CHURCH_NAME=Your Church Name

# Optional Settings
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
ADMIN_EMAIL=admin@yourchurch.com
ADMIN_PASSWORD=your-secure-admin-password
```

---

## Step-by-Step Railway Setup

1. **Root Directory**: Set to `/server` ✅

2. **Start Command**: 
   ```
   npm run deploy
   ```
   This runs database migrations and starts the server.

3. **Healthcheck Path**: 
   ```
   /health
   ```

4. **Generate Domain**: Click "Generate Domain" button

5. **Add Environment Variables**: 
   - Go to Variables tab
   - Add all variables from the list above
   - **Important**: Update `FRONTEND_URL` after deploying to Vercel

6. **Deploy**: Railway will auto-deploy on push to `main` branch

---

## Vercel Environment Variables

After Railway is deployed, add this to Vercel:

```env
VITE_API_URL=https://your-railway-domain.railway.app/api
```

Replace `your-railway-domain.railway.app` with your actual Railway domain.

---

## Important Notes

1. **Database**: Railway can auto-provision PostgreSQL. If you do, `DATABASE_URL` will be auto-set.

2. **JWT_SECRET**: Generate a secure random string (minimum 32 characters). You can use:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. **FRONTEND_URL**: Update this AFTER deploying to Vercel with your Vercel URL.

4. **Email**: Choose either SendGrid OR Custom SMTP. Don't set both.

5. **CORS**: Railway CORS is configured to accept requests from `FRONTEND_URL`. Make sure it matches your Vercel URL.

---

## Deployment Order

1. ✅ Deploy Backend to Railway first
2. ✅ Get Railway domain (e.g., `reg-system-production.up.railway.app`)
3. ✅ Deploy Frontend to Vercel with `VITE_API_URL=https://reg-system-production.up.railway.app/api`
4. ✅ Get Vercel URL (e.g., `reg-system.vercel.app`)
5. ✅ Update Railway `FRONTEND_URL` to `https://reg-system.vercel.app`
6. ✅ Railway will auto-redeploy with updated CORS settings

---

## Testing

- **Backend Health**: `https://your-railway-domain.railway.app/health`
- **Frontend**: `https://your-vercel-app.vercel.app`
- **API Test**: `https://your-railway-domain.railway.app/api/health`
