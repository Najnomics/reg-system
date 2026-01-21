# Deployment Guide

Complete deployment guide for the Church Attendance Management System.

## Table of Contents

- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Backend Deployment](#backend-deployment)
- [Frontend Deployment](#frontend-deployment)
- [Email Configuration](#email-configuration)
- [Post-Deployment Tasks](#post-deployment-tasks)

## Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] Email service configured
- [ ] Domain names configured
- [ ] SSL certificates ready
- [ ] Backup strategy in place
- [ ] Monitoring set up

## Environment Variables

### Backend Environment Variables

Create a `.env` file in the `server/` directory:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/database"
DIRECT_URL="postgresql://user:password@host:5432/database"

# JWT
JWT_SECRET="generate-a-strong-random-secret-key"
JWT_EXPIRES_IN="7d"

# Server
PORT=5000
NODE_ENV=production

# CORS
CORS_ORIGIN="https://your-frontend-domain.com"

# Email (Nodemailer with SendGrid)
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=your-sendgrid-api-key
EMAIL_FROM=noreply@yourchurch.com

# Frontend URL (for email links)
FRONTEND_URL="https://your-frontend-domain.com"
```

### Frontend Environment Variables

Create a `.env.production` file in the root directory:

```env
VITE_API_URL=https://your-backend-domain.com/api
```

**Important:** Variables must be prefixed with `VITE_` to be accessible in the frontend.

## Database Setup

### Option 1: Railway PostgreSQL

1. Create a new Railway project
2. Add PostgreSQL service
3. Copy the `DATABASE_URL` from Railway dashboard
4. Use the same URL for `DIRECT_URL`

### Option 2: Supabase

1. Create a new Supabase project
2. Go to Settings → Database
3. Copy the connection string
4. Use it as `DATABASE_URL` and `DIRECT_URL`

### Option 3: Self-Hosted PostgreSQL

1. Set up PostgreSQL server
2. Create database:
```sql
CREATE DATABASE church_attendance;
CREATE USER app_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE church_attendance TO app_user;
```

3. Update connection string:
```
postgresql://app_user:secure_password@your-server:5432/church_attendance
```

### Running Migrations

```bash
cd server
npx prisma migrate deploy
npx prisma generate
```

This will apply all pending migrations to the production database.

## Backend Deployment

### Option 1: Railway (Recommended)

1. **Connect Repository**
   - Go to Railway dashboard
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

2. **Configure Service**
   - Set root directory to `server/`
   - Set start command: `npm start`
   - Add environment variables

3. **Deploy**
   - Railway will automatically deploy on push to main branch
   - Or manually trigger deployment

4. **Get Domain**
   - Railway provides a default domain
   - Or add custom domain in settings

### Option 2: Render

1. **Create Web Service**
   - Go to Render dashboard
   - Click "New" → "Web Service"
   - Connect your repository

2. **Configure**
   - Build Command: `cd server && npm install && npx prisma generate`
   - Start Command: `cd server && npm start`
   - Environment: Node
   - Root Directory: `server/`

3. **Add Environment Variables**
   - Add all required variables from `.env`

4. **Deploy**
   - Render will build and deploy automatically

### Option 3: Heroku

1. **Install Heroku CLI**
```bash
npm install -g heroku
```

2. **Login and Create App**
```bash
heroku login
heroku create your-app-name
```

3. **Add PostgreSQL**
```bash
heroku addons:create heroku-postgresql:hobby-dev
```

4. **Configure Environment Variables**
```bash
heroku config:set JWT_SECRET=your-secret
heroku config:set EMAIL_HOST=smtp.sendgrid.net
# ... add all other variables
```

5. **Deploy**
```bash
git push heroku main
```

6. **Run Migrations**
```bash
heroku run npx prisma migrate deploy
```

### Option 4: Docker

1. **Create Dockerfile** (`server/Dockerfile`)
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npx prisma generate

EXPOSE 5000

CMD ["npm", "start"]
```

2. **Build and Run**
```bash
docker build -t church-attendance-backend ./server
docker run -p 5000:5000 --env-file ./server/.env church-attendance-backend
```

### Option 5: VPS (Ubuntu/Debian)

1. **Install Node.js**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. **Install PM2**
```bash
sudo npm install -g pm2
```

3. **Clone Repository**
```bash
cd /var/www
git clone https://github.com/your-org/reg-system.git
cd reg-system/server
```

4. **Install Dependencies**
```bash
npm install
npx prisma generate
```

5. **Configure Environment**
```bash
cp .env.example .env
nano .env  # Edit with your values
```

6. **Run Migrations**
```bash
npx prisma migrate deploy
```

7. **Start with PM2**
```bash
pm2 start src/index.js --name church-attendance-api
pm2 save
pm2 startup
```

8. **Setup Nginx Reverse Proxy**
```nginx
server {
    listen 80;
    server_name api.yourchurch.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Frontend Deployment

### Option 1: Vercel (Recommended)

1. **Connect Repository**
   - Go to Vercel dashboard
   - Click "New Project"
   - Import your GitHub repository

2. **Configure**
   - Framework Preset: Vite
   - Root Directory: `./` (root)
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. **Environment Variables**
   - Add `VITE_API_URL` with your backend URL

4. **Deploy**
   - Vercel will deploy automatically on push
   - Or manually trigger deployment

5. **Custom Domain**
   - Add your domain in project settings
   - Configure DNS records as instructed

### Option 2: Netlify

1. **Connect Repository**
   - Go to Netlify dashboard
   - Click "New site from Git"
   - Connect your repository

2. **Configure Build**
   - Build command: `npm run build`
   - Publish directory: `dist`

3. **Environment Variables**
   - Add `VITE_API_URL` in site settings

4. **Deploy**
   - Netlify will deploy automatically

### Option 3: GitHub Pages

1. **Install gh-pages**
```bash
npm install --save-dev gh-pages
```

2. **Update package.json**
```json
{
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

3. **Deploy**
```bash
npm run deploy
```

### Option 4: Static Hosting (AWS S3 + CloudFront)

1. **Build Frontend**
```bash
npm run build
```

2. **Upload to S3**
```bash
aws s3 sync dist/ s3://your-bucket-name --delete
```

3. **Configure CloudFront**
   - Create distribution
   - Set S3 bucket as origin
   - Configure caching

## Email Configuration

### SendGrid Setup

1. **Create SendGrid Account**
   - Sign up at sendgrid.com
   - Verify your account

2. **Create API Key**
   - Go to Settings → API Keys
   - Click "Create API Key"
   - Name it (e.g., "Church Attendance")
   - Copy the API key

3. **Verify Sender**
   - Go to Settings → Sender Authentication
   - Verify single sender or domain

4. **Configure Backend**
   - Set `EMAIL_USER=apikey`
   - Set `EMAIL_PASS=your-api-key`
   - Set `EMAIL_FROM=verified-email@yourchurch.com`

### Alternative: SMTP (Gmail, Outlook, etc.)

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com
```

**Note:** For Gmail, you need to generate an "App Password" in your Google Account settings.

## Post-Deployment Tasks

### 1. Verify Deployment

- [ ] Backend API is accessible
- [ ] Frontend loads correctly
- [ ] Database connection works
- [ ] Authentication works
- [ ] Email sending works

### 2. Create Initial Admin

```bash
# Using seed script
cd server
npm run seed

# Or manually via API/DB
```

### 3. Test Critical Flows

- [ ] Admin login
- [ ] Create member
- [ ] Create session
- [ ] Member check-in
- [ ] View attendance

### 4. Setup Monitoring

- **Error Tracking**: Sentry, LogRocket
- **Uptime Monitoring**: UptimeRobot, Pingdom
- **Performance**: New Relic, Datadog

### 5. Setup Backups

- **Database Backups**: Daily automated backups
- **File Backups**: If storing files locally
- **Backup Retention**: Keep 30 days of backups

### 6. Security Hardening

- [ ] Enable HTTPS/SSL
- [ ] Set secure CORS origins
- [ ] Use strong JWT secret
- [ ] Enable rate limiting
- [ ] Set secure cookie flags
- [ ] Regular security updates

### 7. Performance Optimization

- [ ] Enable database connection pooling
- [ ] Setup CDN for static assets
- [ ] Enable compression (gzip)
- [ ] Optimize images
- [ ] Enable caching headers

## Troubleshooting

### Backend Won't Start

- Check environment variables
- Verify database connection
- Check port availability
- Review logs for errors

### Database Connection Errors

- Verify `DATABASE_URL` is correct
- Check database is accessible
- Verify credentials
- Check firewall rules

### Email Not Sending

- Verify SendGrid API key
- Check sender verification
- Review email logs
- Test SMTP connection

### Frontend Can't Connect to API

- Verify `VITE_API_URL` is set
- Check CORS configuration
- Verify backend is running
- Check network/firewall

## Maintenance

### Regular Tasks

- **Weekly**: Review error logs
- **Monthly**: Update dependencies
- **Quarterly**: Security audit
- **Annually**: Review and update documentation

### Updates

1. Pull latest changes
2. Run tests
3. Run migrations
4. Deploy backend
5. Deploy frontend
6. Verify functionality

## Support

For deployment issues:
1. Check logs (backend and frontend)
2. Review error messages
3. Check environment variables
4. Verify database connectivity
5. Test API endpoints directly
