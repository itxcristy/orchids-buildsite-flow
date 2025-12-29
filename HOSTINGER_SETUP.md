# 🚀 Hostinger Docker Manager Setup Guide

## Quick Setup Instructions

### Step 1: Copy the YAML Configuration

Copy the contents of `docker-compose.hostinger-ready.yml` and paste it into Hostinger's **YAML Editor**.

### Step 2: Set Environment Variables

Copy the environment variables from `.env.hostinger-ready` and add them to Hostinger's **Environment Variables** section.

**OR** if Hostinger supports file upload, upload the `.env.hostinger-ready` file.

## 🔐 Critical Variables (Must Set)

These variables have been pre-configured with secure defaults, but you should change them:

1. **POSTGRES_PASSWORD** - Currently: `T0qSw1+UzLhLohHQi9WNE4T0W3t02YndRx3w5KtQPIE=`
   - Generate new: `openssl rand -base64 32`
   - Must be 32+ characters

2. **VITE_JWT_SECRET** - Currently: `7VEfW3OgaWRzOU85cGpVf60YCkusjOXZASouFPzI/gs=`
   - Generate new: `openssl rand -base64 32`
   - Must be 32+ characters

## 🌐 Domain Configuration

Update these with your actual domain:

- `VITE_API_URL` - Currently set to: `http://dezignbuild.site:3000/api`
- `FRONTEND_URL` - Currently set to: `http://dezignbuild.site`
- `CORS_ORIGINS` - Currently includes: `dezignbuild.site`

**After setting up SSL**, update to HTTPS:
- `VITE_API_URL=https://dezignbuild.site/api`
- `FRONTEND_URL=https://dezignbuild.site`

## ✅ What's Fixed

1. ✅ **POSTGRES_PASSWORD** - Changed from `admin` (5 chars) to secure 44-char password
2. ✅ **VITE_JWT_SECRET** - Changed from `your-secret-key-change-this` (24 chars) to secure 44-char secret
3. ✅ **Domain placeholders** - Updated to `dezignbuild.site`
4. ✅ **CORS_ORIGINS** - Includes all necessary domains
5. ✅ **All variables** - Properly formatted and ready to use

## 📋 Environment Variables Checklist

Copy these to Hostinger's Environment Variables section:

```
POSTGRES_PASSWORD=T0qSw1+UzLhLohHQi9WNE4T0W3t02YndRx3w5KtQPIE=
POSTGRES_PORT=5432
DATABASE_PORT=5432
VITE_JWT_SECRET=7VEfW3OgaWRzOU85cGpVf60YCkusjOXZASouFPzI/gs=
VITE_API_URL=http://dezignbuild.site:3000/api
FRONTEND_URL=http://dezignbuild.site
CORS_ORIGINS=http://dezignbuild.site,http://www.dezignbuild.site,https://dezignbuild.site,https://www.dezignbuild.site,http://localhost:5173,http://localhost:3000,http://72.61.243.152,http://72.61.243.152:80,http://72.61.243.152:3000
PORT=3000
BACKEND_PORT=3000
FRONTEND_PORT=80
REDIS_PORT=6379
VITE_APP_NAME=Drena - Agency Management Platform
VITE_APP_VERSION=1.0.0
VITE_APP_ENVIRONMENT=production
REDIS_HOST=redis
REDIS_PASSWORD=
REDIS_DB=0
EMAIL_PROVIDER=smtp
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
VITE_FILE_STORAGE_PATH=/app/storage
FILE_STORAGE_PATH=/app/storage
VITE_ENABLE_AI_FEATURES=true
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_PROJECT_MANAGEMENT=true
VITE_ENABLE_FINANCIAL_MANAGEMENT=true
VITE_ENABLE_HR_MANAGEMENT=true
VITE_ENABLE_CRM=true
VITE_STRIPE_PUBLISHABLE_KEY=
VITE_GOOGLE_MAPS_API_KEY=
VITE_ANALYTICS_TRACKING_ID=
```

## 🚨 Important Notes

1. **Change the secrets** - The POSTGRES_PASSWORD and VITE_JWT_SECRET are secure defaults but should be changed for production
2. **Domain updates** - Make sure to update `VITE_API_URL` and `FRONTEND_URL` with your actual domain
3. **SSL/HTTPS** - After setting up SSL, update URLs to use `https://`
4. **Email configuration** - Update SMTP settings if you want email functionality

## 🎯 Next Steps

1. Copy YAML to Hostinger YAML Editor
2. Copy environment variables to Hostinger Environment Variables section
3. Deploy!
4. After deployment, change the secrets to your own secure values

