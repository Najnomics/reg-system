# Environment Variables Quick Reference

## 🚀 Current Deployment URLs

- **Railway Backend**: `https://reg-system-production.up.railway.app`
- **Vercel Frontend**: `https://reg-system-mu.vercel.app`

---

## ✅ Vercel Environment Variables (Frontend)

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

Add/Update this variable:

```env
VITE_API_URL=https://reg-system-production.up.railway.app/api
```

**Important:**
- ✅ Select all environments: **Production**, **Preview**, **Development**
- ✅ Click **Save**
- ✅ **Redeploy** your project after setting the variable

---

## ✅ Railway Environment Variables (Backend)

Go to: **Railway Dashboard → Your Service → Variables**

### Required Variables:

```env
# Database (Supabase)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.ncablrtbpijqsxtsplyz.supabase.co:5432/postgres?schema=public&sslmode=require
DIRECT_URL=postgresql://postgres:[PASSWORD]@db.ncablrtbpijqsxtsplyz.supabase.co:5432/postgres?schema=public&sslmode=require

# Authentication
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_EXPIRES_IN=7d

# Application
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://church-attendance-app-rouge.vercel.app

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
FROM_EMAIL=noreply@yourchurch.com
FROM_NAME=Your Church Name
CHURCH_NAME=Your Church Name
```

**Important:**
- Replace `[PASSWORD]` with your actual Supabase database password
- Replace email credentials with your actual Gmail App Password
- After updating `FRONTEND_URL`, Railway will auto-redeploy

---

## 🔍 Verification Steps

### 1. Check Railway Backend:
```bash
curl https://reg-system-production.up.railway.app/health
```
Should return: `{"status":"OK",...}`

### 2. Check Vercel Frontend:
- Open browser console (F12)
- Look for: `🔗 API Base URL: https://reg-system-production.up.railway.app/api`
- If you see `NOT SET`, the environment variable wasn't included in the build

### 3. Test Login:
- Go to: `https://reg-system-mu.vercel.app/admin/login`
- Try logging in
- Check browser console for errors

---

## 🐛 Troubleshooting

### Frontend still calling `localhost:3000`:
1. ✅ Verify `VITE_API_URL` is set in Vercel
2. ✅ Check it's set for **Production** environment
3. ✅ **Redeploy** Vercel after setting the variable
4. ✅ Check browser console for debug logs

### CORS Errors:
1. ✅ Verify `FRONTEND_URL` in Railway matches your Vercel URL exactly
2. ✅ Railway will auto-redeploy after updating `FRONTEND_URL`
3. ✅ Wait for Railway deployment to complete

### Database Connection Failed:
1. ✅ Verify `DATABASE_URL` includes `&sslmode=require`
2. ✅ Check Supabase database is running
3. ✅ Verify password is correct

---

## 📝 Quick Checklist

- [ ] `VITE_API_URL` set in Vercel → `https://reg-system-production.up.railway.app/api`
- [ ] Vercel redeployed after setting `VITE_API_URL`
- [ ] `FRONTEND_URL` set in Railway → `https://reg-system-mu.vercel.app`
- [ ] Railway `DATABASE_URL` includes `&sslmode=require`
- [ ] Railway service is running (check Railway dashboard)
- [ ] Test health endpoint: `https://reg-system-production.up.railway.app/health`
- [ ] Test frontend: `https://reg-system-mu.vercel.app`

---

## 🎯 Exact Values to Copy-Paste

### Vercel:
```
VITE_API_URL=https://reg-system-production.up.railway.app/api
```

### Railway:
```
FRONTEND_URL=https://reg-system-mu.vercel.app
```
