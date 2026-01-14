#!/bin/bash

# Railway Deployment Script for Church Attendance System
# Run this script after you've authenticated with 'railway login'

set -e

echo "🚀 Starting Railway deployment for Church Attendance System..."

# Check if user is authenticated
if ! railway status &>/dev/null; then
    echo "❌ Not authenticated with Railway. Please run 'railway login' first."
    exit 1
fi

echo "✅ Railway authentication confirmed"

# Initialize project if not already done
echo "📦 Initializing Railway project..."
if ! railway status &>/dev/null; then
    railway init
else
    echo "Project already initialized"
fi

# Add PostgreSQL database
echo "🗃️ Adding PostgreSQL database..."
railway add postgresql

# Generate a secure JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# Set environment variables
echo "⚙️ Setting environment variables..."
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set JWT_SECRET="$JWT_SECRET"
railway variables set JWT_EXPIRES_IN="7d"
railway variables set ADMIN_EMAIL="admin@yourchurch.com"
railway variables set ADMIN_PASSWORD="ChangeThisPassword123!"

# Prompt for email configuration
echo ""
echo "📧 Email Configuration Required:"
echo "Choose your email service:"
echo "1) SendGrid (Recommended)"
echo "2) SMTP (Gmail, etc.)"
read -p "Enter choice (1 or 2): " email_choice

if [ "$email_choice" = "1" ]; then
    read -p "Enter your SendGrid API Key: " sendgrid_key
    read -p "Enter your from email (e.g., noreply@yourchurch.com): " from_email
    read -p "Enter your church name: " church_name
    
    railway variables set SENDGRID_API_KEY="$sendgrid_key"
    railway variables set FROM_EMAIL="$from_email"
    railway variables set FROM_NAME="$church_name"
    railway variables set CHURCH_NAME="$church_name"
elif [ "$email_choice" = "2" ]; then
    read -p "Enter SMTP host (e.g., smtp.gmail.com): " smtp_host
    read -p "Enter SMTP port (e.g., 587): " smtp_port
    read -p "Enter SMTP username: " smtp_user
    read -s -p "Enter SMTP password: " smtp_pass
    echo
    
    railway variables set SMTP_HOST="$smtp_host"
    railway variables set SMTP_PORT="$smtp_port"
    railway variables set SMTP_SECURE="false"
    railway variables set SMTP_USER="$smtp_user"
    railway variables set SMTP_PASS="$smtp_pass"
fi

# Set root directory to server folder
echo "📁 Configuring service to use server directory..."
railway service

echo ""
echo "🚀 Deploying application..."
railway up --detach

echo "⏳ Waiting for deployment to complete..."
sleep 45

echo "🗄️ Running database migrations..."
railway run npx prisma migrate deploy

echo "🔧 Generating Prisma client..."
railway run npx prisma generate

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Checking deployment status..."
railway status

echo ""
echo "🎯 Next Steps:"
echo "1. Copy your Railway URL from above"
echo "2. Update your Vercel environment variables:"
echo "   - VITE_API_URL=https://your-railway-url.up.railway.app/api"
echo "   - VITE_API_BASE_URL=https://your-railway-url.up.railway.app"
echo "3. Update your Railway FRONTEND_URL variable with your Vercel URL"
echo "4. Test your application!"
echo ""
echo "🔍 To view logs: railway logs"
echo "🔄 To redeploy: railway up --detach"
echo "⚙️ To view variables: railway variables"
echo ""
echo "Happy deploying! 🚀"