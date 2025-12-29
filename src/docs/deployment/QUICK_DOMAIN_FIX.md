# Quick Fix: Domain Connection Refused Error

## Immediate Problem
Your domain `dezignbuild.site` shows `NS_ERROR_CONNECTION_REFUSED` because nameservers are still pointing to parking nameservers.

## Quick Fix Steps (Do These Now)

### 1. Fix Nameservers (CRITICAL - Do This First!)

**In Hostinger hPanel:**
1. Login to Hostinger
2. Go to **Domains** → `dezignbuild.site`
3. Click **DNS / Nameservers**
4. Verify nameservers are Hostinger's (should be like `ns1.dns.hostinger.com`)
5. If they show `ns1.dns-parking.com`, change them to Hostinger's nameservers

**If domain is registered elsewhere:**
- Go to your domain registrar
- Change nameservers to Hostinger's:
  - `ns1.dns.hostinger.com`
  - `ns2.dns.hostinger.com`
  - `ns3.dns.hostinger.com`
  - `ns4.dns.hostinger.com`

### 2. Add DNS A Record

**In Hostinger DNS Zone Editor:**
1. Go to **DNS Zone Editor** or **DNS Management**
2. Add A record:
   - **Type:** A
   - **Name:** @ (or leave blank for root domain)
   - **Value:** `72.61.243.152`
   - **TTL:** 3600
3. Add another A record for www:
   - **Type:** A
   - **Name:** www
   - **Value:** `72.61.243.152`
   - **TTL:** 3600
4. Save changes

### 3. Wait for DNS Propagation
- Usually takes 1-2 hours
- Can take up to 48 hours
- Check status: https://dnschecker.org (search for `dezignbuild.site`)

### 4. Update Server Configuration

**On your server (72.61.243.152):**

```bash
# SSH into server
ssh root@72.61.243.152

# Navigate to project directory
cd /docker/buildflow  # or wherever your project is

# Update docker-compose.yml CORS_ORIGINS (already done in repo)
# Or manually edit:
nano docker-compose.yml
# Add to CORS_ORIGINS: ,http://dezignbuild.site,http://www.dezignbuild.site,https://dezignbuild.site,https://www.dezignbuild.site

# Restart containers
docker compose down
docker compose up -d --build
```

### 5. Verify Firewall

```bash
# On server, ensure port 80 is open
sudo ufw allow 80
sudo ufw allow 443
sudo ufw status
```

### 6. Test Connection

```bash
# Test DNS resolution
nslookup dezignbuild.site
# Should return: 72.61.243.152

# Test HTTP connection
curl -I http://dezignbuild.site
# Should return HTTP response (not connection refused)

# Test backend
curl http://dezignbuild.site:3000/health
```

---

## Expected Timeline

1. **Nameservers update:** 1-24 hours
2. **DNS A record propagation:** 1-2 hours
3. **Total wait time:** Usually 2-4 hours, max 48 hours

---

## Verify DNS is Working

### Check Nameservers
```bash
nslookup -type=NS dezignbuild.site
```
**Should show:** Hostinger nameservers (NOT `dns-parking.com`)

### Check A Record
```bash
nslookup dezignbuild.site
```
**Should return:** `72.61.243.152`

### Online Checkers
- https://dnschecker.org - Check global DNS propagation
- https://www.whatsmydns.net - Visual DNS checker
- https://mxtoolbox.com/DNSLookup.aspx - Detailed DNS lookup

---

## If Still Not Working After 24 Hours

1. **Double-check nameservers** - They MUST be Hostinger's
2. **Verify A record** - Must point to `72.61.243.152`
3. **Check server is running:**
   ```bash
   ssh root@72.61.243.152 "docker ps"
   ```
4. **Check server responds:**
   ```bash
   curl http://72.61.243.152
   ```
5. **Clear DNS cache:**
   - Windows: `ipconfig /flushdns`
   - Mac: `sudo dscacheutil -flushcache`
   - Linux: `sudo systemd-resolve --flush-caches`

---

## Common Mistakes

❌ **Wrong:** Nameservers still pointing to `dns-parking.com`  
✅ **Correct:** Nameservers pointing to Hostinger's nameservers

❌ **Wrong:** A record pointing to wrong IP  
✅ **Correct:** A record pointing to `72.61.243.152`

❌ **Wrong:** Forgetting to wait for DNS propagation  
✅ **Correct:** Wait 1-2 hours after changes

❌ **Wrong:** Server not running or firewall blocking  
✅ **Correct:** Server running and port 80 open

---

## Next Steps After Domain Works

1. Set up SSL certificate (HTTPS) using Let's Encrypt
2. Configure Nginx reverse proxy
3. Update environment variables to use domain instead of IP
4. Set up email with your domain

See `DOMAIN_SETUP_GUIDE.md` for detailed instructions.

