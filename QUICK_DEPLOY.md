# 🚀 Quick Deploy to Railway

## Option 1: Use the Automated Script (Recommended)

1. **Authenticate with Railway:**
   ```bash
   railway login
   ```

2. **Run the deployment script:**
   ```bash
   ./railway-deploy.sh
   ```

The script will:
- ✅ Create a Railway project
- ✅ Add PostgreSQL database
- ✅ Set up environment variables
- ✅ Deploy your backend
- ✅ Run database migrations

## Option 2: Manual Deployment

Follow the detailed guide in `DEPLOY_TO_RAILWAY.md`

## What You'll Need

1. **Railway Account** - Sign up at [railway.app](https://railway.app)
2. **Email Service** - Choose either:
   - SendGrid API key (recommended)
   - SMTP credentials (Gmail, etc.)

## After Deployment

1. Get your Railway URL from the output
2. Update your Vercel environment variables with the Railway backend URL
3. Test your application!

## Troubleshooting

- **View logs:** `railway logs`
- **Check status:** `railway status`  
- **Redeploy:** `railway up --detach`
- **View variables:** `railway variables`

Your church attendance system will be live in minutes! 🎉