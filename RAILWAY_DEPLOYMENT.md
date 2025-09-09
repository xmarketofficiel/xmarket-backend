# 🚀 XMarket Railway Deployment Guide (Updated)

## Prerequisites
- Railway account (sign up at railway.app)
- GitHub repository access
- Your environment variables ready

## ✅ Recent Fixes Applied
- **Fixed npm ci lock file sync errors** - Updated package-lock.json
- **Added nixpacks.toml** - Better Railway build compatibility  
- **Created Railway-optimized Dockerfile** - Alternative build method
- **Added .railwayignore** - Excludes unnecessary files from deployment
- **Simplified dependencies** - Removed conflicting version requirements

## Step-by-Step Deployment

### 1. Create Railway Project
1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Empty Project"
4. Name it: `xmarket-backend`

### 2. Add PostgreSQL Database
1. In your project, click "New Service"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically provision the database
4. Note: DATABASE_URL will be automatically injected into your backend service

### 3. Add Backend Service
1. Click "New Service" → "GitHub Repo"
2. Connect your GitHub account if not already connected
3. Select your `xmarket-backend` repository
4. Choose branch: `dev` (latest with fixes)
5. Railway will automatically detect it's a Node.js app

### 4. Configure Environment Variables
Go to your backend service → Variables tab and add these:

```bash
NODE_ENV=production
JWT_SECRET=4FiCqZ3C94byaemaHb029ZI9veRQB1+wBxasnLNFCp4=
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=KD4KOK4ozs3k6FrovF+TYp0LY2hvf02pj98y2mMEs7Q=
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=https://your-frontend.vercel.app
ADMIN_PANEL_URL=https://your-admin-panel.vercel.app
CLOUDINARY_CLOUD_NAME=dvkdhxivw
CLOUDINARY_API_KEY=846262536178211
CLOUDINARY_API_SECRET=S4IN5KzqCF2EKPCa58lN8SZyRVU
MAX_FILE_SIZE=5242880
MAX_FILES_PER_ITEM=6
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=oussamarabi3i02@gmail.com
SMTP_PASS=avpx kmtn qluc hrau
FROM_EMAIL=oussamarabi3i02@gmail.com
OTP_EXPIRES_IN=300000
```

### 5. Deploy and Monitor
1. Railway will automatically build using **Nixpacks** (faster than Docker)
2. Build process: `npm install` → `npm run build` → `npm run start:prod`
3. Monitor the deployment logs in Railway dashboard
4. Once deployed, you'll get a URL like: `https://xmarket-backend-production-xxxx.up.railway.app`

### 6. Test Your Deployment
1. Visit your backend URL + `/api` to see Swagger docs
2. Test a simple endpoint like `/categories`
3. Check logs for any errors

### 7. Update Frontend URLs
Update your frontend applications to use the new Railway backend URL.

## 🔧 Build Process Details

### Nixpacks (Recommended)
Railway will use the `nixpacks.toml` configuration:
- Node.js 20.x runtime
- npm 9.x package manager
- Automatic dependency installation and build

### Alternative: Docker
If needed, Railway can use `Dockerfile.railway` instead of Nixpacks.

## Important Notes
- **Fresh package-lock.json**: Fixed dependency sync issues
- **DATABASE_URL**: Automatically injected by Railway PostgreSQL service
- **SSL**: Automatically handled by Railway
- **Node.js Version**: Railway uses Node.js 20+ by default

## Cost Estimate
- PostgreSQL Database: ~$5-10/month
- Backend Service: ~$5-10/month
- Total: ~$10-20/month

## Troubleshooting

### If Build Still Fails:
1. Check Railway deployment logs for specific errors
2. Ensure all environment variables are set
3. Try redeploying from the Railway dashboard

### Common Issues:
- **CORS Errors**: Verify FRONTEND_URL and ADMIN_PANEL_URL values
- **Database Connection**: DATABASE_URL should be auto-injected (don't set manually)
- **Build Timeouts**: Railway builds should be faster with nixpacks.toml

### Success Indicators:
- ✅ Build completes successfully
- ✅ Health check passes (visits `/categories` endpoint)
- ✅ Swagger docs accessible at `/api`
- ✅ No errors in Railway logs
