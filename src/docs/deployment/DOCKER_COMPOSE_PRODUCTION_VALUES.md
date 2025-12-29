# Docker Compose Production Values Guide

## 🎯 What Values to Set for Production

Here's what you need to configure in your `docker-compose.yml` for production deployment.

---

## ✅ Values That Are Already Correct (Keep As-Is)

### PostgreSQL
```yaml
POSTGRES_USER: postgres          # ✅ OK for production
POSTGRES_PASSWORD: admin         # ⚠️ CHANGE THIS - Use strong password!
POSTGRES_DB: buildflow_db        # ✅ OK
```

### Redis
```yaml
# ✅ All Redis values are fine as-is
REDIS_HOST: redis
REDIS_PORT: 6379
REDIS_PASSWORD: ""               # ✅ Empty is OK if Redis is internal
REDIS_DB: 0
```

### Ports
```yaml
# ✅ These are correct
postgres: "5432:5432"
redis: "6379:6379"
backend: "3000:3000"
frontend: "80:80"                # ✅ Port 80 for HTTP
```

---

## 🔧 Values You MUST Change for Production

### 1. PostgreSQL Password (CRITICAL - Security)

**Current:**
```yaml
POSTGRES_PASSWORD: admin
```

**Change to:**
```yaml
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-your-strong-password-here-min-16-chars}
```

**Generate strong password:**
```bash
# On Linux/Mac
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Then create `.env` file:**
```bash
POSTGRES_PASSWORD=your-generated-password-here
```

---

### 2. JWT Secret (CRITICAL - Security)

**Current:**
```yaml
VITE_JWT_SECRET: ${VITE_JWT_SECRET:-your-super-secret-jwt-key-change-this-in-production}
```

**Change to:**
```yaml
VITE_JWT_SECRET: ${VITE_JWT_SECRET}
```

**Generate JWT secret:**
```bash
# Generate strong secret
openssl rand -base64 32
```

**Add to `.env` file:**
```bash
VITE_JWT_SECRET=your-generated-jwt-secret-here
```

---

### 3. API URLs (CRITICAL - Must Match Your Domain)

**Current (WRONG for production):**
```yaml
VITE_API_URL: http://localhost:3000/api
```

**Change to (Use Your Domain):**
```yaml
# Option 1: Using domain (recommended)
VITE_API_URL: http://dezignbuild.site:3000/api
# Or if you set up SSL:
VITE_API_URL: https://dezignbuild.site/api

# Option 2: Using IP (if domain not ready)
VITE_API_URL: http://72.61.243.152:3000/api
```

**Update in TWO places:**
1. **Backend environment:**
```yaml
backend:
  environment:
    VITE_API_URL: http://dezignbuild.site:3000/api  # ← Change this
```

2. **Frontend build args:**
```yaml
frontend:
  build:
    args:
      VITE_API_URL: ${VITE_API_URL:-http://dezignbuild.site:3000/api}  # ← Change this
```

**Add to `.env` file:**
```bash
VITE_API_URL=http://dezignbuild.site:3000/api
```

---

### 4. CORS Origins (CRITICAL - Must Include Your Domain)

**Current (Missing your domain):**
```yaml
CORS_ORIGINS: http://localhost:5173,http://localhost:5174,http://localhost:3000,http://localhost:8080,http://localhost:80,http://72.61.243.152,http://72.61.243.152:80,http://72.61.243.152:3000
```

**Change to (Add your domain):**
```yaml
CORS_ORIGINS: http://localhost:5173,http://localhost:5174,http://localhost:3000,http://localhost:8080,http://localhost:80,http://72.61.243.152,http://72.61.243.152:80,http://72.61.243.152:3000,http://dezignbuild.site,http://www.dezignbuild.site,https://dezignbuild.site,https://www.dezignbuild.site
```

**Note:** Already updated in your docker-compose.yml! ✅

---

### 5. Email Configuration (Optional but Recommended)

**Current (Empty):**
```yaml
EMAIL_PROVIDER: ${EMAIL_PROVIDER:-}
SMTP_HOST: ${SMTP_HOST:-}
SMTP_PORT: ${SMTP_PORT:-}
SMTP_USER: ${SMTP_USER:-}
SMTP_PASSWORD: ${SMTP_PASSWORD:-}
SMTP_FROM: ${SMTP_FROM:-}
```

**Configure for production (add to `.env`):**
```bash
# Example: Gmail SMTP
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@dezignbuild.site

# Or use your domain's SMTP
EMAIL_PROVIDER=smtp
SMTP_HOST=mail.dezignbuild.site
SMTP_PORT=587
SMTP_USER=noreply@dezignbuild.site
SMTP_PASSWORD=your-smtp-password
SMTP_FROM=noreply@dezignbuild.site
```

---

## 📋 Complete Production Configuration

### Create `.env` file in project root:

```bash
# Database
POSTGRES_PASSWORD=your-strong-password-here-min-16-chars

# Security
VITE_JWT_SECRET=your-generated-jwt-secret-32-chars-min

# API URLs
VITE_API_URL=http://dezignbuild.site:3000/api
# Or after SSL: VITE_API_URL=https://dezignbuild.site/api

# Application
VITE_APP_NAME=BuildFlow Agency Management
VITE_APP_VERSION=1.0.0
VITE_APP_ENVIRONMENT=production

# Frontend Port
FRONTEND_PORT=80

# Email (Optional)
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@dezignbuild.site
```

---

## 🔒 Security Checklist

- [ ] Changed `POSTGRES_PASSWORD` from `admin` to strong password
- [ ] Changed `VITE_JWT_SECRET` from default to strong secret
- [ ] Updated `VITE_API_URL` to use your domain/IP
- [ ] Added your domain to `CORS_ORIGINS`
- [ ] Created `.env` file with all secrets
- [ ] Added `.env` to `.gitignore` (don't commit secrets!)
- [ ] Configured email settings (optional)

---

## 🚀 Quick Setup Script

Run this on your server to generate secure values:

```bash
#!/bin/bash
echo "Generating production values..."
echo ""
echo "# Add these to your .env file:"
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)"
echo "VITE_JWT_SECRET=$(openssl rand -base64 32)"
echo ""
echo "VITE_API_URL=http://dezignbuild.site:3000/api"
echo "VITE_APP_NAME=BuildFlow Agency Management"
echo "VITE_APP_VERSION=1.0.0"
echo "VITE_APP_ENVIRONMENT=production"
echo "FRONTEND_PORT=80"
```

---

## 📝 Updated docker-compose.yml Sections

### Backend Environment:
```yaml
backend:
  environment:
    # Database - Use .env variable
    DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/buildflow_db
    VITE_DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/buildflow_db
    
    # API - Use your domain
    VITE_API_URL: ${VITE_API_URL:-http://dezignbuild.site:3000/api}
    
    # Security - Use .env variable
    VITE_JWT_SECRET: ${VITE_JWT_SECRET}
    
    # CORS - Already includes your domain ✅
    CORS_ORIGINS: http://localhost:5173,http://localhost:5174,http://localhost:3000,http://localhost:8080,http://localhost:80,http://72.61.243.152,http://72.61.243.152:80,http://72.61.243.152:3000,http://dezignbuild.site,http://www.dezignbuild.site,https://dezignbuild.site,https://www.dezignbuild.site
```

### Frontend Build Args:
```yaml
frontend:
  build:
    args:
      VITE_API_URL: ${VITE_API_URL:-http://dezignbuild.site:3000/api}
      VITE_APP_NAME: ${VITE_APP_NAME:-BuildFlow Agency Management}
      VITE_APP_VERSION: ${VITE_APP_VERSION:-1.0.0}
      VITE_APP_ENVIRONMENT: ${VITE_APP_ENVIRONMENT:-production}
```

### PostgreSQL:
```yaml
postgres:
  environment:
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}  # ← Use .env variable
    POSTGRES_DB: buildflow_db
```

---

## ⚠️ Important Notes

1. **Never commit `.env` file** - Add to `.gitignore`
2. **Use strong passwords** - Minimum 16 characters
3. **Update API URLs** - Must match your actual domain/IP
4. **CORS must include domain** - Already done ✅
5. **JWT secret must be unique** - Generate new one for production
6. **Database password** - Change from default `admin`

---

## 🎯 Summary: What to Change

| Setting | Current | Production Value |
|---------|---------|------------------|
| `POSTGRES_PASSWORD` | `admin` | Strong password (from .env) |
| `VITE_JWT_SECRET` | Default | Strong secret (from .env) |
| `VITE_API_URL` | `localhost:3000` | `dezignbuild.site:3000` or IP |
| `CORS_ORIGINS` | Missing domain | ✅ Already includes domain |
| Email settings | Empty | Configure SMTP (optional) |

---

**That's it!** Update these values and your production setup will be secure and properly configured.

