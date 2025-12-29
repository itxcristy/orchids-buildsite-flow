# 🚀 Vercel Deployment - Quick Start

## Step 1: Push to Git
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

## Step 2: Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New Project"**
3. Import your Git repository
4. Vercel will auto-detect Vite settings ✅

## Step 3: Set Environment Variables

In Vercel project settings → Environment Variables, add:

### Required:
- `VITE_API_URL` = `https://your-backend-api.com/api`
- `VITE_DATABASE_URL` = `postgresql://user:pass@host:5432/db`

### Recommended:
- `VITE_APP_ENVIRONMENT` = `production`
- `VITE_APP_NAME` = `BuildFlow Agency Management`

## Step 4: Deploy

Click **"Deploy"** and wait ~2 minutes! 🎉

Your app will be live at: `https://your-project.vercel.app`

---

## ⚠️ Important Notes

1. **Backend Required**: Your backend API must be deployed separately
2. **CORS**: Configure backend to allow your Vercel domain
3. **Database**: Ensure database is accessible from the internet

## 📚 Full Guide

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed instructions.

