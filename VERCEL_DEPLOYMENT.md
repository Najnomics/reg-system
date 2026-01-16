# Vercel Deployment Configuration Guide

## Vercel Settings

### General
- **Framework Preset**: `Vite`
- **Root Directory**: Leave empty (or `/` if needed)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Environment Variables

Add these in Vercel → Your Project → Settings → Environment Variables:

```env
VITE_API_URL=https://your-railway-app.railway.app/api
```

**Important**: Replace `your-railway-app.railway.app` with your actual Railway domain after deployment.

---

## Deployment Steps

1. **Import Project**: 
   - Go to Vercel Dashboard
   - Click "Add New Project"
   - Import `Najnomics/reg-system` repository

2. **Configure Build Settings**:
   - Framework Preset: `Vite`
   - Root Directory: Leave empty
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Add Environment Variable**:
   - Variable Name: `VITE_API_URL`
   - Value: `https://your-railway-app.railway.app/api`
   - Environment: Production, Preview, Development (select all)

4. **Deploy**: Click "Deploy"

---

## Post-Deployment

1. **Get Vercel URL**: Copy your Vercel deployment URL (e.g., `https://reg-system.vercel.app`)

2. **Update Railway**:
   - Go back to Railway
   - Update `FRONTEND_URL` environment variable to your Vercel URL
   - Railway will automatically redeploy

3. **Update Vercel**:
   - Update `VITE_API_URL` if Railway URL changed
   - Redeploy Vercel if needed

4. **CORS Configuration**:
   - Railway CORS is already configured to accept requests from common Vercel domains
   - If you have a custom domain, add it to Railway's CORS settings

---

## Environment Variables Summary

### Vercel (Frontend)
```env
VITE_API_URL=https://your-railway-app.railway.app/api
```

### Railway (Backend)
See `RAILWAY_DEPLOYMENT.md` for complete list.

**Key Backend Variables**:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `FRONTEND_URL` - Your Vercel URL (update after Vercel deployment)
- `SENDGRID_API_KEY` - For email sending
- `NODE_ENV=production`

---

## Custom Domain Setup

### Vercel Custom Domain
1. Go to Vercel Project → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

### Railway Custom Domain
1. Go to Railway Service → Settings → Networking
2. Add custom domain
3. Configure DNS records as instructed

---

## Testing Deployment

1. **Backend Health Check**: `https://your-railway-app.railway.app/health`
2. **Frontend**: `https://your-vercel-app.vercel.app`
3. **API Test**: `https://your-railway-app.railway.app/api/health`

---

## Troubleshooting

- **Frontend can't connect to API**: 
  - Verify `VITE_API_URL` is set correctly in Vercel
  - Check Railway CORS settings include Vercel domain
  - Ensure Railway service is running

- **Build fails on Vercel**:
  - Check that `package.json` has correct build script
  - Verify all dependencies are listed in `package.json`
  - Check build logs in Vercel dashboard

- **CORS errors**:
  - Add Vercel domain to Railway CORS origins
  - Update `FRONTEND_URL` in Railway to match Vercel URL
