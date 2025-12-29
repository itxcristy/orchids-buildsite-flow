# Vercel Deployment Guide

This guide will help you deploy the BuildFlow frontend to Vercel.

## Prerequisites

1. A Vercel account ([sign up here](https://vercel.com/signup))
2. Your repository pushed to GitHub, GitLab, or Bitbucket
3. Your backend API deployed and accessible (separate deployment)

## Quick Deployment

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Connect Repository**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"
   - Import your Git repository
   - Select the repository containing this project

2. **Configure Project**
   - **Framework Preset:** Vite (auto-detected)
   - **Root Directory:** `./` (root of the repo)
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `dist` (auto-detected)
   - **Install Command:** `npm install` (auto-detected)

3. **Environment Variables**
   Add the following environment variables in Vercel dashboard:

   **Required:**
   ```
   VITE_DATABASE_URL=postgresql://postgres:admin@your-db-host:5432/buildflow_db
   VITE_API_URL=https://your-api-domain.com/api
   ```

   **Optional (with defaults):**
   ```
   VITE_APP_NAME=BuildFlow Agency Management
   VITE_APP_VERSION=1.0.0
   VITE_APP_ENVIRONMENT=production
   VITE_ENABLE_AI_FEATURES=true
   VITE_ENABLE_ANALYTICS=true
   VITE_ENABLE_PROJECT_MANAGEMENT=true
   VITE_ENABLE_FINANCIAL_MANAGEMENT=true
   VITE_ENABLE_HR_MANAGEMENT=true
   VITE_ENABLE_CRM=true
   ```

   **Third-party Services (if used):**
   ```
   VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
   VITE_GOOGLE_MAPS_API_KEY=...
   VITE_ANALYTICS_TRACKING_ID=...
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for the build to complete
   - Your app will be live at `https://your-project.vercel.app`

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   # Deploy to production
   vercel --prod

   # Or deploy to preview
   vercel
   ```

4. **Set Environment Variables**
   ```bash
   vercel env add VITE_API_URL
   vercel env add VITE_DATABASE_URL
   # ... add other variables as needed
   ```

## Environment Variables Configuration

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `VITE_API_URL` | Backend API URL | `https://api.yourdomain.com/api` |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_APP_NAME` | `BuildFlow Agency Management` | Application name |
| `VITE_APP_VERSION` | `1.0.0` | Application version |
| `VITE_APP_ENVIRONMENT` | `development` | Set to `production` for production |
| `VITE_ENABLE_AI_FEATURES` | `true` | Enable AI features |
| `VITE_ENABLE_ANALYTICS` | `true` | Enable analytics |
| `VITE_ENABLE_PROJECT_MANAGEMENT` | `true` | Enable project management |
| `VITE_ENABLE_FINANCIAL_MANAGEMENT` | `true` | Enable financial management |
| `VITE_ENABLE_HR_MANAGEMENT` | `true` | Enable HR management |
| `VITE_ENABLE_CRM` | `true` | Enable CRM |

### Third-party Service Variables

| Variable | Description |
|----------|-------------|
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps API key |
| `VITE_ANALYTICS_TRACKING_ID` | Analytics tracking ID |

## Important Notes

### Backend API Deployment

⚠️ **Important:** The frontend requires a backend API. You have two options:

1. **Deploy backend separately** (recommended)
   - Deploy your backend to a service like:
     - Railway
     - Render
     - AWS
     - DigitalOcean
     - Your own server
   - Set `VITE_API_URL` to your backend URL

2. **Deploy backend as Vercel Serverless Functions**
   - Move backend code to `api/` directory
   - Convert Express routes to serverless functions
   - This requires significant refactoring

### CORS Configuration

Make sure your backend has CORS configured to allow requests from your Vercel domain:

```javascript
// Backend CORS configuration
const allowedOrigins = [
  'https://your-project.vercel.app',
  'https://your-custom-domain.com'
];
```

### Database Connection

The `VITE_DATABASE_URL` is used by the frontend for direct database queries (if applicable). For production, ensure:

1. Your database is accessible from the internet (or use a connection pooler)
2. Use strong passwords
3. Enable SSL connections
4. Consider using connection pooling services like:
   - Supabase
   - Neon
   - Railway PostgreSQL
   - AWS RDS

## Custom Domain Setup

1. **Add Domain in Vercel**
   - Go to Project Settings → Domains
   - Add your custom domain
   - Follow DNS configuration instructions

2. **Update Environment Variables**
   - Update `VITE_API_URL` if needed
   - Update CORS settings on backend

## Post-Deployment Checklist

- [ ] Verify all environment variables are set
- [ ] Test API connectivity from deployed frontend
- [ ] Verify authentication flow works
- [ ] Check that all routes work (SPA routing)
- [ ] Test on mobile devices
- [ ] Verify HTTPS is enabled
- [ ] Check browser console for errors
- [ ] Test with different user roles
- [ ] Verify file uploads/downloads work (if applicable)

## Troubleshooting

### Build Fails

1. **Check build logs** in Vercel dashboard
2. **Verify Node.js version** - Vercel uses Node 18+ by default
3. **Check for missing dependencies** - ensure all dependencies are in `package.json`
4. **Verify environment variables** are set correctly

### API Connection Issues

1. **Check CORS settings** on backend
2. **Verify `VITE_API_URL`** is correct
3. **Check network tab** in browser dev tools
4. **Verify backend is accessible** from the internet

### Routing Issues (404 on refresh)

- The `vercel.json` file includes rewrites to handle SPA routing
- If you still see 404s, verify the rewrite rule is correct

### Environment Variables Not Working

- Remember: Vite requires `VITE_` prefix for environment variables
- Rebuild after adding new environment variables
- Check that variables are set for the correct environment (Production/Preview)

## Performance Optimization

Vercel automatically:
- ✅ Serves static assets with CDN
- ✅ Enables compression
- ✅ Optimizes images
- ✅ Provides edge caching

Additional optimizations in `vercel.json`:
- Long-term caching for static assets (1 year)
- Proper cache headers for JS/CSS files

## Monitoring

- **Vercel Analytics:** Enable in project settings for performance monitoring
- **Error Tracking:** Consider adding Sentry or similar
- **Logs:** View real-time logs in Vercel dashboard

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html#vercel)
- [Vercel Community](https://github.com/vercel/vercel/discussions)

---

**Ready to deploy?** Follow the Quick Deployment steps above! 🚀

