# Deploy to Railway - Step-by-Step Guide

## Prerequisites
✅ Railway CLI is installed (`railway --version` shows 4.23.3)
✅ Code is pushed to GitHub
✅ Environment files are configured

## Step 1: Authenticate with Railway
```bash
cd "/Users/najnomics/jan 2025/reg system"
railway login
```
This will open your browser to log in to Railway.

## Step 2: Initialize Railway Project
```bash
railway init
```
- Choose a project name (e.g., "church-attendance-system")
- Select your team/personal account

## Step 3: Add PostgreSQL Database
```bash
railway add postgresql
```
This creates a PostgreSQL database and sets up the DATABASE_URL automatically.

## Step 4: Configure Environment Variables
```bash
# Set production environment variables
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set JWT_SECRET="your-super-secure-jwt-secret-change-this"
railway variables set JWT_EXPIRES_IN="7d"
railway variables set FRONTEND_URL="https://your-app.vercel.app"
railway variables set ADMIN_EMAIL="admin@yourchurch.com" 
railway variables set ADMIN_PASSWORD="your-secure-admin-password"

# Email configuration (choose one option)
# Option A: SendGrid
railway variables set SENDGRID_API_KEY="your-sendgrid-api-key"
railway variables set FROM_EMAIL="noreply@yourchurch.com"
railway variables set FROM_NAME="Your Church Name"
railway variables set CHURCH_NAME="Your Church Name"

# Option B: SMTP (Alternative)
# railway variables set SMTP_HOST="smtp.gmail.com"
# railway variables set SMTP_PORT="587"
# railway variables set SMTP_SECURE="false"
# railway variables set SMTP_USER="your-email@gmail.com"
# railway variables set SMTP_PASS="your-app-password"
```

## Step 5: Set Root Directory to Server
```bash
railway service
```
Select your backend service, then:
```bash
railway settings
```
Set the root directory to `server` (since your backend is in the server folder).

## Step 6: Deploy the Application
```bash
railway up --detach
```

## Step 7: Run Database Migrations
```bash
railway run npx prisma migrate deploy
```

## Step 8: Generate Prisma Client (if needed)
```bash
railway run npx prisma generate
```

## Step 9: Get Your Backend URL
```bash
railway status
```
Copy the URL (something like `https://church-attendance-system-production.up.railway.app`)

## Step 10: Update Frontend Environment
Update your Vercel environment variables with the Railway backend URL:
- `VITE_API_URL=https://your-backend-url.up.railway.app/api`
- `VITE_API_BASE_URL=https://your-backend-url.up.railway.app`

## Alternative: Quick Deploy Script
If you prefer, you can run this script after authentication:

```bash
#!/bin/bash
# Quick Railway deployment script
echo "🚀 Starting Railway deployment..."

# Initialize project
echo "📦 Initializing Railway project..."
railway init

# Add database
echo "🗃️ Adding PostgreSQL database..."
railway add postgresql

# Set environment variables
echo "⚙️ Setting environment variables..."
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set JWT_SECRET="$(openssl rand -base64 32)"
railway variables set JWT_EXPIRES_IN="7d"
railway variables set FRONTEND_URL="https://your-app.vercel.app"
railway variables set ADMIN_EMAIL="admin@yourchurch.com"
railway variables set ADMIN_PASSWORD="ChangeMePlease123!"

echo "🎯 Please set your email configuration:"
echo "For SendGrid: railway variables set SENDGRID_API_KEY='your-key'"
echo "For SMTP: railway variables set SMTP_HOST='smtp.gmail.com' SMTP_PORT='587' SMTP_USER='your-email' SMTP_PASS='your-password'"

# Deploy
echo "🚀 Deploying application..."
railway up --detach

# Run migrations
echo "🗄️ Running database migrations..."
sleep 30 # Wait for deployment
railway run npx prisma migrate deploy

echo "✅ Deployment complete! Check 'railway status' for your URL"
```

## Troubleshooting

### If deployment fails:
```bash
railway logs
```

### If database connection fails:
```bash
railway variables
```
Check that DATABASE_URL is set automatically by the PostgreSQL service.

### To redeploy:
```bash
railway up --detach
```

### To check service status:
```bash
railway status
```

## Next Steps After Successful Deployment

1. **Test the backend** by visiting `https://your-backend-url/health`
2. **Update frontend** environment variables in Vercel with your Railway URL
3. **Test the full application** end-to-end
4. **Set up monitoring** and alerts in Railway dashboard

Your church attendance system will be fully deployed and ready for production use!