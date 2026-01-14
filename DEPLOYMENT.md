# Deployment Guide

This guide will help you deploy the Church Attendance Management System to production.

## Prerequisites

- Git repository (GitHub, GitLab, etc.)
- Vercel account (for frontend)
- Railway account (for backend and database)
- Email service (SendGrid or SMTP)

## Backend Deployment (Railway)

### 1. Create Railway Account
- Go to [Railway.app](https://railway.app)
- Sign up with GitHub

### 2. Deploy Backend
1. In Railway dashboard, click "New Project"
2. Select "Deploy from GitHub repo"
3. Connect your repository
4. Select the root directory (it will auto-detect the server folder)
5. Railway will automatically deploy your backend

### 3. Add PostgreSQL Database
1. In your Railway project, click "New Service"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically create a database and provide the `DATABASE_URL`

### 4. Configure Environment Variables
In Railway dashboard, go to your backend service → Variables tab and add:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=(automatically provided by Railway)
JWT_SECRET=your-super-secure-jwt-secret-key
JWT_EXPIRES_IN=7d
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@yourchurch.com
FROM_NAME=Your Church Name
CHURCH_NAME=Your Church Name
FRONTEND_URL=https://your-app.vercel.app
ADMIN_EMAIL=admin@yourchurch.com
ADMIN_PASSWORD=your-secure-admin-password
```

### 5. Run Database Migrations
1. Go to your Railway service → Settings → Deploy
2. Set custom start command: `npm run migrate:deploy && npm start`
3. Redeploy the service

### 6. Note Your Backend URL
- Railway will provide a URL like: `https://your-app-name.up.railway.app`
- Save this for frontend configuration

## Frontend Deployment (Vercel)

### 1. Create Vercel Account
- Go to [Vercel.com](https://vercel.com)
- Sign up with GitHub

### 2. Deploy Frontend
1. In Vercel dashboard, click "New Project"
2. Import your Git repository
3. Vercel will auto-detect it's a Vite project
4. Set the root directory to your project root (not the server folder)

### 3. Configure Environment Variables
In Vercel project settings → Environment Variables, add:

```env
VITE_API_URL=https://your-backend-app.up.railway.app/api
VITE_API_BASE_URL=https://your-backend-app.up.railway.app
VITE_APP_NAME=Church Attendance System
VITE_APP_VERSION=1.0.0
VITE_NODE_ENV=production
```

### 4. Update Backend CORS
1. Go back to Railway backend environment variables
2. Update `FRONTEND_URL` to your Vercel URL: `https://your-app.vercel.app`
3. Redeploy the backend service

## Email Configuration

### Option 1: SendGrid (Recommended)
1. Create account at [SendGrid.com](https://sendgrid.com)
2. Get API key from Settings → API Keys
3. Verify sender identity
4. Add `SENDGRID_API_KEY` to Railway environment variables

### Option 2: SMTP (Gmail, etc.)
Add these variables to Railway instead of SendGrid:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## Post-Deployment Steps

### 1. Test the Application
1. Visit your Vercel URL
2. Try logging in with admin credentials
3. Test member creation and PIN email sending
4. Test session creation and QR code generation
5. Test check-in functionality

### 2. Create Admin Account
1. Use the admin credentials from environment variables
2. Or modify the seed script to create your admin user
3. Run seed script: Add `npm run seed` to Railway deploy command

### 3. Domain Setup (Optional)
1. In Vercel: Settings → Domains → Add custom domain
2. In Railway: Settings → Domains → Add custom domain

## Environment Variables Summary

### Backend (Railway)
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=(auto-provided)
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d
SENDGRID_API_KEY=your-sendgrid-key
FROM_EMAIL=noreply@yourchurch.com
FROM_NAME=Your Church Name
CHURCH_NAME=Your Church Name
FRONTEND_URL=https://your-app.vercel.app
ADMIN_EMAIL=admin@yourchurch.com
ADMIN_PASSWORD=your-admin-password
```

### Frontend (Vercel)
```env
VITE_API_URL=https://your-backend.up.railway.app/api
VITE_API_BASE_URL=https://your-backend.up.railway.app
VITE_APP_NAME=Church Attendance System
VITE_APP_VERSION=1.0.0
VITE_NODE_ENV=production
```

## Troubleshooting

### Common Issues
1. **CORS errors**: Check `FRONTEND_URL` in backend matches Vercel URL
2. **Database connection**: Ensure `DATABASE_URL` is set correctly
3. **API not found**: Verify `VITE_API_URL` points to correct backend
4. **Email not sending**: Check SendGrid API key and sender verification

### Logs
- **Railway**: Service → Deployments → View logs
- **Vercel**: Project → Functions → View logs

## Monitoring

### Railway
- Built-in metrics and logs
- Set up alerts for downtime

### Vercel
- Analytics and performance metrics
- Real-time error tracking

## Backup Strategy

### Database
- Railway provides automatic daily backups
- Consider additional backup strategy for critical data

### Code
- Use Git for version control
- Tag releases for easy rollback