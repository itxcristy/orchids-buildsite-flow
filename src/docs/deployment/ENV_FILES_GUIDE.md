# 📋 Environment Files Guide

This guide explains all the different `.env` files and when to use them.

## Environment Files Overview

| File | Purpose | When to Use |
|------|---------|-------------|
| `.env` | Your local/production config | **Never commit** - Your actual secrets |
| `.env.example` | Template for all environments | Reference for required variables |
| `.env.production` | Production template | VPS/Docker production deployments |
| `.env.production.example` | Production template (safe to commit) | Reference for production setup |
| `.env.hostinger` | Hostinger-specific config | Hostinger Docker Manager deployment |

## Quick Setup

### For Local Development

```bash
# Copy example file
cp .env.example .env

# Edit with your values
nano .env
```

### For Production (VPS/Docker)

```bash
# Copy production template
cp .env.production.example .env.production

# Edit with your production values
nano .env.production

# Or copy to .env
cp .env.production .env
```

### For Hostinger

```bash
# Copy Hostinger template
cp .env.hostinger .env

# Edit with your values
nano .env

# OR set variables in Hostinger Docker Manager panel
```

## Required Variables

### Minimum Required (Must Set)

```env
POSTGRES_PASSWORD=your_secure_password
VITE_JWT_SECRET=your_secure_secret
VITE_API_URL=http://your-domain.com:3000/api
FRONTEND_URL=http://your-domain.com
```

### Recommended for Production

```env
CORS_ORIGINS=http://your-domain.com,https://your-domain.com
EMAIL_PROVIDER=smtp
SMTP_HOST=your-smtp-server.com
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
SMTP_FROM=noreply@your-domain.com
```

## Variable Differences: Local vs Docker

### Database Connection

**Local Development:**
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/buildflow_db
REDIS_HOST=localhost
```

**Docker/Production:**
```env
DATABASE_URL=postgresql://postgres:password@postgres:5432/buildflow_db
REDIS_HOST=redis
```

**Note:** In Docker, use service names (`postgres`, `redis`) instead of `localhost`.

## Hostinger Docker Manager

When deploying via Hostinger's Docker Manager:

1. **Option 1: Set in Panel (Recommended)**
   - Go to your project in Hostinger
   - Find "Environment Variables" section
   - Add variables one by one
   - No `.env` file needed

2. **Option 2: Use .env file**
   - Create `.env` file in your repo
   - Hostinger will use it automatically
   - ⚠️ Make sure `.env` is in `.gitignore`!

## Security Best Practices

### ✅ DO:
- Use strong passwords (32+ characters)
- Generate secrets with: `openssl rand -base64 32`
- Keep `.env` in `.gitignore`
- Use different secrets for dev/prod
- Rotate secrets regularly

### ❌ DON'T:
- Commit `.env` to Git
- Use default passwords in production
- Share `.env` files
- Use same secrets across environments

## Generating Secure Secrets

### Generate POSTGRES_PASSWORD
```bash
openssl rand -base64 32
```

### Generate VITE_JWT_SECRET
```bash
openssl rand -base64 32
# Or with Node.js:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Environment File Priority

When multiple files exist, Docker Compose uses this order:

1. `.env` (highest priority)
2. Environment variables from shell
3. Default values in `docker-compose.yml`

## Quick Reference

### Development
```bash
cp .env.example .env
# Edit .env with local values
```

### Production
```bash
cp .env.production.example .env.production
# Edit .env.production with production values
cp .env.production .env
```

### Hostinger
```bash
cp .env.hostinger .env
# Edit .env with your domain and secrets
# OR set in Hostinger panel
```

---

**Always keep your `.env` file secure and never commit it!** 🔒

