# Domain Setup Guide for dezignbuild.site

## Current Issue
Your domain `dezignbuild.site` is showing `NS_ERROR_CONNECTION_REFUSED` because:
1. Nameservers are still pointing to parking nameservers (`ns1.dns-parking.com`, `ns2.dns-parking.com`)
2. DNS records are not configured to point to your server
3. CORS configuration may need to include your domain

## Server Information
- **Server IP:** `72.61.243.152`
- **Frontend Port:** `80` (HTTP)
- **Backend Port:** `3000`
- **Domain:** `dezignbuild.site`

---

## Step 1: Update Nameservers in Hostinger

### Option A: If you registered the domain with Hostinger
1. Log in to your **Hostinger account**
2. Go to **Domains** → Select `dezignbuild.site`
3. Click on **DNS / Nameservers**
4. You should see Hostinger's nameservers automatically set (usually something like):
   - `ns1.dns.hostinger.com`
   - `ns2.dns.hostinger.com`
   - `ns3.dns.hostinger.com`
   - `ns4.dns.hostinger.com`

### Option B: If you registered the domain elsewhere
1. Log in to your domain registrar (where you bought the domain)
2. Find **DNS Management** or **Nameservers** section
3. Change nameservers to Hostinger's:
   - `ns1.dns.hostinger.com`
   - `ns2.dns.hostinger.com`
   - `ns3.dns.hostinger.com`
   - `ns4.dns.hostinger.com`
4. Save changes

**Note:** DNS propagation can take 24-48 hours, but usually happens within 1-2 hours.

---

## Step 2: Configure DNS Records in Hostinger

After nameservers are updated, configure DNS records in Hostinger:

1. Log in to **Hostinger hPanel**
2. Go to **Domains** → `dezignbuild.site` → **DNS Zone Editor** or **DNS Management**

### Required DNS Records:

#### A Record (Main Domain)
```
Type: A
Name: @ (or leave blank)
Value: 72.61.243.152
TTL: 3600 (or default)
```

#### A Record (WWW Subdomain)
```
Type: A
Name: www
Value: 72.61.243.152
TTL: 3600 (or default)
```

#### Optional: CNAME for API Subdomain (if you want api.dezignbuild.site)
```
Type: CNAME
Name: api
Value: dezignbuild.site
TTL: 3600
```

---

## Step 3: Update Server Configuration

### Update CORS Configuration

Update your `docker-compose.yml` or `.env` file to include your domain:

```bash
CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:3000,http://localhost:8080,http://localhost:80,http://72.61.243.152,http://72.61.243.152:80,http://72.61.243.152:3000,http://dezignbuild.site,http://www.dezignbuild.site,https://dezignbuild.site,https://www.dezignbuild.site
```

### Update Environment Variables

If using `.env.production` or `.env.hostinger`:

```bash
# Update API URL to use domain
VITE_API_URL=http://dezignbuild.site:3000/api
# Or if you set up SSL later:
# VITE_API_URL=https://api.dezignbuild.site/api

# Update CORS
CORS_ORIGINS=http://dezignbuild.site,http://www.dezignbuild.site,https://dezignbuild.site,https://www.dezignbuild.site,http://72.61.243.152
```

---

## Step 4: Verify DNS Propagation

After updating DNS records, verify they're working:

### Check DNS Records
```bash
# Check A record
nslookup dezignbuild.site
# or
dig dezignbuild.site

# Should return: 72.61.243.152
```

### Check Nameservers
```bash
# Check nameservers
nslookup -type=NS dezignbuild.site
# Should show Hostinger nameservers, NOT parking nameservers
```

### Online DNS Checkers
- https://dnschecker.org
- https://www.whatsmydns.net
- https://mxtoolbox.com/DNSLookup.aspx

---

## Step 5: Test Connection

### Test HTTP Connection
```bash
# Test if server responds
curl -I http://dezignbuild.site
# Should return HTTP 200 or similar

# Test backend health
curl http://dezignbuild.site:3000/health
```

### Test in Browser
1. Open `http://dezignbuild.site` in your browser
2. Check browser console for errors
3. Verify the site loads correctly

---

## Step 6: Configure Nginx/Reverse Proxy (Recommended)

For production, you should set up Nginx as a reverse proxy to:
- Handle SSL/HTTPS (Let's Encrypt)
- Route traffic properly
- Hide backend port

### Basic Nginx Configuration

Create `/etc/nginx/sites-available/dezignbuild.site`:

```nginx
server {
    listen 80;
    server_name dezignbuild.site www.dezignbuild.site;

    # Frontend
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/dezignbuild.site /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 7: Set Up SSL Certificate (HTTPS)

### Using Certbot (Let's Encrypt)

```bash
# Install certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d dezignbuild.site -d www.dezignbuild.site

# Auto-renewal is set up automatically
```

After SSL is set up, update your environment variables:
```bash
VITE_API_URL=https://dezignbuild.site/api
CORS_ORIGINS=https://dezignbuild.site,https://www.dezignbuild.site
```

---

## Troubleshooting

### Issue: Still showing parking page
**Solution:** 
- Wait for DNS propagation (can take up to 48 hours)
- Clear your DNS cache: `ipconfig /flushdns` (Windows) or `sudo systemd-resolve --flush-caches` (Linux)
- Check nameservers are correctly set

### Issue: Connection refused
**Solution:**
- Verify server is running: `ssh root@72.61.243.152 "docker ps"`
- Check firewall allows port 80: `sudo ufw allow 80`
- Verify DNS A record points to correct IP

### Issue: CORS errors
**Solution:**
- Update `CORS_ORIGINS` in docker-compose.yml
- Rebuild containers: `docker compose up -d --build`
- Check backend logs: `docker logs backend`

### Issue: Site loads but API doesn't work
**Solution:**
- Check `VITE_API_URL` is correct in frontend build
- Verify backend is accessible: `curl http://72.61.243.152:3000/health`
- Check CORS includes your domain

---

## Quick Checklist

- [ ] Nameservers changed to Hostinger's nameservers
- [ ] A record created pointing to `72.61.243.152`
- [ ] DNS propagation verified (check with dnschecker.org)
- [ ] CORS_ORIGINS updated in docker-compose.yml
- [ ] Environment variables updated
- [ ] Docker containers restarted
- [ ] Firewall allows port 80
- [ ] Tested connection: `curl http://dezignbuild.site`
- [ ] Site loads in browser
- [ ] (Optional) SSL certificate installed
- [ ] (Optional) Nginx reverse proxy configured

---

## Next Steps After Domain Works

1. **Set up SSL/HTTPS** for secure connections
2. **Configure email** using your domain (SMTP)
3. **Set up monitoring** to track uptime
4. **Configure backups** for production data
5. **Set up CDN** (optional) for better performance

---

## Support

If issues persist:
1. Check Hostinger DNS Zone Editor for correct records
2. Verify server is running and accessible
3. Check server logs: `docker logs frontend` and `docker logs backend`
4. Verify firewall rules allow HTTP/HTTPS traffic

