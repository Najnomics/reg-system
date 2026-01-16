# Complete Deployment Guide: Railway (Backend) + Vercel (Frontend)

## 🚀 Quick Start

### Railway Configuration Answers

Fill in these settings in Railway:

| Setting | Value |
|---------|-------|
| **Root Directory** | `/server` |
| **Start Command** | `npm run deploy` |
| **Healthcheck Path** | `/health` |
| **Builder** | `Railpack` (Default) |
| **Build Command** | (Leave empty - auto-detected) |
| **Public Networking** | ✅ Enabled |
| **Generate Domain** | Click to generate |

---

## 📋 All Environment Variables

### Railway (Backend) - Copy All These:

```env
# ============================================
# DATABASE (Required)
# ============================================
DATABASE_URL=postgresql://user:password@host:port/database?schema=public
DIRECT_URL=postgresql://user:password@host:port/database?schema=public

# ============================================
# AUTHENTICATION (Required)
# ============================================
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long-change-this-in-production
JWT_EXPIRES_IN=7d

# ============================================
# APPLICATION (Required)
# ============================================
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-vercel-app.vercel.app

# ============================================
# EMAIL - SendGrid (Choose ONE email option)
# ============================================
SENDGRID_API_KEY=SG.your-sendgrid-api-key-here
FROM_EMAIL=noreply@yourchurch.com
FROM_NAME=Your Church Name
CHURCH_NAME=Your Church Name

# ============================================
# EMAIL - OR Custom SMTP (Alternative)
# ============================================
# Uncomment and use these if NOT using SendGrid:
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
# FROM_EMAIL=noreply@yourchurch.com
# FROM_NAME=Your Church Name
# CHURCH_NAME=Your Church Name

# ============================================
# OPTIONAL SETTINGS
# ============================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
ADMIN_EMAIL=admin@yourchurch.com
ADMIN_PASSWORD=your-secure-admin-password
```

### Vercel (Frontend) - Add This:

```env
VITE_API_URL=https://your-railway-domain.railway.app/api
```

**Note**: Replace `your-railway-domain.railway.app` with your actual Railway domain after deployment.

---

## 🔧 Step-by-Step Deployment

### Part 1: Deploy Backend to Railway

1. **Go to Railway Dashboard** → Your Project → `reg-system` service

2. **Configure Settings**:
   - ✅ Root Directory: `/server`
   - ✅ Start Command: `npm run deploy`
   - ✅ Healthcheck Path: `/health`
   - ✅ Click "Generate Domain" to get your Railway URL

3. **Add Environment Variables**:
   - Go to Variables tab
   - Add ALL variables from the list above
   - **Important**: Leave `FRONTEND_URL` as placeholder for now

4. **Provision Database** (if not done):
   - Click "+ New" → Database → PostgreSQL
   - Railway will auto-set `DATABASE_URL`

5. **Deploy**:
   - Railway will auto-deploy on push to `main` branch
   - Or click "Deploy" manually

6. **Get Railway URL**:
   - Copy your Railway domain (e.g., `reg-system-production.up.railway.app`)
   - Test: `https://your-railway-domain.railway.app/health`

### Part 2: Deploy Frontend to Vercel

1. **Go to Vercel Dashboard** → Add New Project

2. **Import Repository**:
   - Select `Najnomics/reg-system`
   - Framework: `Vite` (auto-detected)

3. **Configure Build Settings**:
   - Root Directory: Leave empty
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `dist` (auto-detected)
   - Install Command: `npm install` (auto-detected)

4. **Add Environment Variable**:
   - Variable: `VITE_API_URL`
   - Value: `https://your-railway-domain.railway.app/api`
   - Replace `your-railway-domain` with your actual Railway domain
   - Environment: Production, Preview, Development (select all)

5. **Deploy**:
   - Click "Deploy"
   - Wait for build to complete

6. **Get Vercel URL**:
   - Copy your Vercel domain (e.g., `reg-system.vercel.app`)

### Part 3: Connect Frontend and Backend

1. **Update Railway**:
   - Go back to Railway → Variables
   - Update `FRONTEND_URL` to your Vercel URL: `https://reg-system.vercel.app`
   - Railway will auto-redeploy

2. **Verify CORS**:
   - Railway CORS is configured to accept requests from `FRONTEND_URL`
   - Should work automatically after updating `FRONTEND_URL`

3. **Test**:
   - Frontend: `https://your-vercel-app.vercel.app`
   - Backend Health: `https://your-railway-domain.railway.app/health`
   - API: `https://your-railway-domain.railway.app/api/health`

---

## 🔐 Generating Secure Secrets

### Generate JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and use it as your `JWT_SECRET`.

---

## 📝 Environment Variables Reference

### Required Variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `JWT_SECRET` | Secret key for JWT tokens | `abc123...` (32+ chars) |
| `NODE_ENV` | Environment | `production` |
| `PORT` | Server port | `3000` |
| `FRONTEND_URL` | Vercel deployment URL | `https://app.vercel.app` |

### Email Variables (Choose ONE option):

**Option 1: SendGrid**
- `SENDGRID_API_KEY`
- `FROM_EMAIL`
- `FROM_NAME`
- `CHURCH_NAME`

**Option 2: Custom SMTP**
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `FROM_EMAIL`
- `FROM_NAME`
- `CHURCH_NAME`

### Optional Variables:
- `JWT_EXPIRES_IN` (default: `7d`)
- `RATE_LIMIT_WINDOW_MS` (default: `900000`)
- `RATE_LIMIT_MAX_REQUESTS` (default: `100`)
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

---

## 🐛 Troubleshooting

### Backend Issues:

**Database Connection Failed**:
- Verify `DATABASE_URL` is set correctly
- Check Railway database is running
- Ensure database is accessible

**Build Fails**:
- Check Root Directory is `/server`
- Verify `package.json` exists in `/server`
- Check build logs in Railway

**Emails Not Sending**:
- Verify `SENDGRID_API_KEY` or SMTP credentials
- Check email service logs
- Test email configuration

### Frontend Issues:

**Can't Connect to API**:
- Verify `VITE_API_URL` is set correctly in Vercel
- Check Railway CORS settings include Vercel domain
- Ensure Railway service is running
- Check browser console for CORS errors

**Build Fails**:
- Check `package.json` has correct build script
- Verify all dependencies are listed
- Check Vercel build logs

**CORS Errors**:
- Update `FRONTEND_URL` in Railway to match Vercel URL
- Ensure Railway CORS includes Vercel domain
- Redeploy Railway after updating `FRONTEND_URL`

---

## ✅ Deployment Checklist

- [ ] Railway service created
- [ ] Root directory set to `/server`
- [ ] Start command set to `npm run deploy`
- [ ] Healthcheck path set to `/health`
- [ ] Railway domain generated
- [ ] All environment variables added to Railway
- [ ] Database provisioned (if needed)
- [ ] Railway deployment successful
- [ ] Vercel project created
- [ ] `VITE_API_URL` set in Vercel
- [ ] Vercel deployment successful
- [ ] `FRONTEND_URL` updated in Railway
- [ ] Railway redeployed with new `FRONTEND_URL`
- [ ] Health endpoints tested
- [ ] Frontend can connect to backend
- [ ] Login functionality tested

---

## 📞 Support

If you encounter issues:
1. Check Railway logs: Service → Deployments → View Logs
2. Check Vercel logs: Project → Deployments → View Logs
3. Verify all environment variables are set correctly
4. Test health endpoints manually
5. Check CORS configuration

---

## 🎉 Success!

Once deployed:
- **Backend**: `https://your-railway-domain.railway.app`
- **Frontend**: `https://your-vercel-app.vercel.app`
- **API**: `https://your-railway-domain.railway.app/api`
- **Health**: `https://your-railway-domain.railway.app/health`

Your Church Attendance System is now live! 🎊
