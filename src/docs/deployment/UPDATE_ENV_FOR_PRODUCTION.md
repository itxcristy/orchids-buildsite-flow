# ⚠️ CRITICAL: Update .env Before Production

## 🔒 Security Values That MUST Be Changed

Your `.env` file has been updated with production structure, but you **MUST** change these values:

### 1. PostgreSQL Password (CRITICAL)

**Current:** `POSTGRES_PASSWORD=admin` ❌ **INSECURE!**

**Action Required:**
```bash
# Generate strong password
openssl rand -base64 32

# Update .env file
POSTGRES_PASSWORD=your-generated-password-here
```

---

### 2. JWT Secret (CRITICAL)

**Current:** `VITE_JWT_SECRET=your-super-secret-jwt-key-change-this-in-production` ❌ **DEFAULT VALUE!**

**Action Required:**
```bash
# Generate strong secret
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Update .env file
VITE_JWT_SECRET=your-generated-secret-here
```

---

## ✅ Values Already Updated

These have been automatically updated in your `.env`:

- ✅ `VITE_API_URL` → `http://dezignbuild.site:3000/api`
- ✅ `VITE_APP_ENVIRONMENT` → `production`
- ✅ `CORS_ORIGINS` → Includes your domain
- ✅ `FRONTEND_PORT` → `80`
- ✅ Database URLs → Use `${POSTGRES_PASSWORD}` variable

---

## 🚀 Quick Setup Commands

### On Your Server:

```bash
# 1. Generate secure values
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)"
echo "VITE_JWT_SECRET=$(openssl rand -base64 32)"

# 2. Copy the output and update .env file
nano .env
# Or
vi .env

# 3. Update these two lines:
# POSTGRES_PASSWORD=<paste-generated-password>
# VITE_JWT_SECRET=<paste-generated-secret>

# 4. Verify .env is in .gitignore
grep -q "^\.env$" .gitignore || echo ".env" >> .gitignore

# 5. Restart services
docker compose down
docker compose up -d
```

---

## 📋 Complete Checklist

- [ ] Generated strong `POSTGRES_PASSWORD` (32+ characters)
- [ ] Generated strong `VITE_JWT_SECRET` (32+ characters)
- [ ] Updated both values in `.env` file
- [ ] Verified `VITE_API_URL` is correct (`http://dezignbuild.site:3000/api`)
- [ ] Verified `VITE_APP_ENVIRONMENT=production`
- [ ] Verified `.env` is in `.gitignore`
- [ ] Tested application after changes
- [ ] Backed up `.env` file securely

---

## 🔐 Security Notes

1. **Never commit `.env` to git** - It contains secrets
2. **Use different passwords** - Don't reuse passwords
3. **Store `.env` securely** - Keep backups in secure location
4. **Rotate secrets regularly** - Change passwords periodically
5. **Use strong passwords** - Minimum 32 characters for production

---

## 🎯 What's Next

1. **Generate secrets** (commands above)
2. **Update `.env` file** with generated values
3. **Restart Docker services**
4. **Test the application**
5. **Set up SSL** (HTTPS) for secure connections

---

**Your `.env` file structure is now production-ready!** Just update the two security values and you're good to go! 🚀

