# Complete Domain Fix Guide - dezignbuild.site

## 🚨 Current Problem

Your domain `dezignbuild.site` is pointing to **`84.32.84.32`** instead of **`72.61.243.152`**

This is why you're getting `NS_ERROR_CONNECTION_REFUSED`.

---

## ✅ Quick Fix (Do These Steps)

### Step 1: Fix DNS (CRITICAL)

**⚠️ IMPORTANT: Your domain is registered at Namecheap!**

You have two options:

#### Option A: Use Namecheap DNS (Faster - Recommended)

1. **Log in to Namecheap:**
   - Go to https://www.namecheap.com
   - Log in with your credentials

2. **Go to DNS Management:**
   - Click **"Domain List"** → **"Manage"** next to `dezignbuild.site`
   - Click **"Advanced DNS"** tab

3. **Update A Records:**
   - Find or add A record for `@` (root domain)
   - **Change Value to:** `72.61.243.152`
   - Add/Update A record for `www` → `72.61.243.152`
   - **DELETE** any A records pointing to `84.32.84.32`
   - Click **"Save"** (green checkmark)

#### Option B: Use Hostinger Nameservers

1. **Get Hostinger nameservers** from hPanel
2. **Change nameservers in Namecheap** to Hostinger's
3. **Wait 24-48 hours** for propagation
4. **Configure DNS records in Hostinger**

**See `NAMECHEAP_DNS_SETUP.md` for detailed step-by-step instructions.**

---

### Step 2: Verify DNS (On Your Windows PC)

After updating DNS in Hostinger, wait 10-15 minutes, then run:

```powershell
# Run this PowerShell script
.\scripts\verify-dns.ps1
```

Or manually check:
```powershell
nslookup dezignbuild.site
# Should return: 72.61.243.152
```

**If it still shows `84.32.84.32`:**
- Wait longer (DNS can take 1-2 hours to propagate)
- Double-check you saved changes in Hostinger
- Clear DNS cache: `ipconfig /flushdns`

---

### Step 3: Configure Server (SSH into Server)

Once DNS shows `72.61.243.152`, SSH into your server:

```bash
ssh root@72.61.243.152
```

Then run the complete setup script:

```bash
cd /docker/buildflow  # or wherever your project is
chmod +x scripts/setup-domain-complete.sh
./scripts/setup-domain-complete.sh
```

This script will:
- ✅ Install and configure Nginx
- ✅ Set up reverse proxy for your domain
- ✅ Update Docker Compose CORS settings
- ✅ Restart containers
- ✅ Configure firewall
- ✅ Test everything

---

### Step 4: Test Domain

After DNS propagates (1-2 hours), test:

```bash
# On server
curl http://dezignbuild.site

# Or in browser
http://dezignbuild.site
```

---

### Step 5: Set Up SSL (HTTPS) - Optional but Recommended

```bash
# On server
apt install certbot python3-certbot-nginx -y
certbot --nginx -d dezignbuild.site -d www.dezignbuild.site
```

This will:
- Get free SSL certificate from Let's Encrypt
- Configure HTTPS automatically
- Set up auto-renewal

---

## 📋 What I've Already Done

I've prepared everything for you:

1. ✅ **Updated `docker-compose.yml`** - Added your domain to CORS_ORIGINS
2. ✅ **Created `scripts/fix-domain-dns.sh`** - Configures Nginx on server
3. ✅ **Created `scripts/setup-domain-complete.sh`** - Complete automated setup
4. ✅ **Created `scripts/verify-domain-setup.sh`** - Verifies DNS configuration
5. ✅ **Created `scripts/verify-dns.ps1`** - Windows PowerShell DNS checker
6. ✅ **Created `HOSTINGER_DNS_INSTRUCTIONS.md`** - Step-by-step Hostinger guide

---

## 🔧 Manual Steps (If Scripts Don't Work)

### On Server - Configure Nginx Manually

```bash
# SSH into server
ssh root@72.61.243.152

# Install Nginx
apt update && apt install -y nginx

# Create Nginx config
nano /etc/nginx/sites-available/dezignbuild.site
```

Paste this configuration:

```nginx
server {
    listen 80;
    server_name dezignbuild.site www.dezignbuild.site;

    location / {
        proxy_pass http://127.0.0.1:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and test:

```bash
# Enable site
ln -s /etc/nginx/sites-available/dezignbuild.site /etc/nginx/sites-enabled/

# Test config
nginx -t

# Reload
systemctl reload nginx

# Allow firewall
ufw allow 80/tcp
ufw allow 443/tcp
```

### Update Docker Compose

```bash
cd /docker/buildflow
nano docker-compose.yml
```

Find `CORS_ORIGINS` and make sure it includes:
```
http://dezignbuild.site,http://www.dezignbuild.site,https://dezignbuild.site,https://www.dezignbuild.site
```

Then restart:
```bash
docker compose down
docker compose up -d --build
```

---

## 🐛 Troubleshooting

### DNS Still Shows Wrong IP

**Problem:** `nslookup dezignbuild.site` still shows `84.32.84.32`

**Solutions:**
1. Wait longer (can take up to 48 hours, usually 1-2 hours)
2. Clear DNS cache: `ipconfig /flushdns` (Windows)
3. Check Hostinger DNS Zone Editor - verify A record is saved
4. Try different DNS server: `nslookup dezignbuild.site 8.8.8.8`

### Connection Refused After DNS Fixed

**Problem:** DNS is correct but site still doesn't load

**Solutions:**
1. Check server is running: `ssh root@72.61.243.152 "docker ps"`
2. Check Nginx is running: `ssh root@72.61.243.152 "systemctl status nginx"`
3. Check firewall: `ssh root@72.61.243.152 "ufw status"`
4. Test locally on server: `ssh root@72.61.243.152 "curl http://localhost"`

### CORS Errors

**Problem:** Site loads but API calls fail with CORS errors

**Solutions:**
1. Verify CORS_ORIGINS in docker-compose.yml includes your domain
2. Restart containers: `docker compose restart backend`
3. Check backend logs: `docker logs backend`

---

## 📞 Quick Reference

**Domain:** dezignbuild.site  
**Server IP:** 72.61.243.152  
**Frontend Port:** 80  
**Backend Port:** 3000  

**Hostinger DNS Records Needed:**
- A record: `@` → `72.61.243.152`
- A record: `www` → `72.61.243.152`

**Nameservers Should Be:**
- ns1.dns.hostinger.com
- ns2.dns.hostinger.com
- ns3.dns.hostinger.com
- ns4.dns.hostinger.com

---

## ✅ Checklist

- [ ] Updated DNS A record in Hostinger to `72.61.243.152`
- [ ] Verified nameservers are Hostinger's (not parking)
- [ ] Waited 1-2 hours for DNS propagation
- [ ] Verified DNS: `nslookup dezignbuild.site` shows `72.61.243.152`
- [ ] Ran setup script on server: `./scripts/setup-domain-complete.sh`
- [ ] Tested domain: `curl http://dezignbuild.site`
- [ ] (Optional) Set up SSL certificate
- [ ] Site is working in browser!

---

## 🚀 After Everything Works

1. **Set up SSL/HTTPS** (recommended)
2. **Update environment variables** to use domain instead of IP
3. **Configure email** with your domain
4. **Set up monitoring** to track uptime
5. **Configure backups** for production data

---

**Need Help?** Check the detailed guides:
- `NAMECHEAP_DNS_SETUP.md` - Step-by-step Namecheap DNS guide (YOUR DOMAIN REGISTRAR)
- `HOSTINGER_DNS_INSTRUCTIONS.md` - Hostinger guide (if using Hostinger nameservers)
- `docs/deployment/DOMAIN_SETUP_GUIDE.md` - Complete setup guide
- `docs/deployment/QUICK_DOMAIN_FIX.md` - Quick reference

