# Hostinger DNS Configuration Instructions

## CRITICAL: Your Domain is Pointing to Wrong IP

**Current Issue:** Your domain `dezignbuild.site` is pointing to `84.32.84.32` instead of `72.61.243.152`

## Step-by-Step Instructions for Hostinger

### Step 1: Log in to Hostinger

1. Go to https://hpanel.hostinger.com
2. Log in with your Hostinger account credentials

### Step 2: Access DNS Management

1. In the hPanel dashboard, click on **"Domains"** in the left sidebar
2. Find and click on **`dezignbuild.site`**
3. Click on **"DNS / Zone Editor"** or **"DNS Management"**

### Step 3: Check Nameservers

1. Look for **"Nameservers"** section
2. **VERIFY** they show Hostinger's nameservers (should be like):
   - `ns1.dns.hostinger.com`
   - `ns2.dns.hostinger.com`
   - `ns3.dns.hostinger.com`
   - `ns4.dns.hostinger.com`

3. **IF** they show `ns1.dns-parking.com` or `ns2.dns-parking.com`:
   - Click **"Change Nameservers"** or **"Edit"**
   - Change to Hostinger's nameservers
   - Save changes

### Step 4: Update DNS A Records

1. In the **DNS Zone Editor**, find the **A Records** section
2. Look for existing A record for `@` (root domain)
3. **Edit** the A record:
   - **Type:** A
   - **Name:** @ (or leave blank)
   - **Value:** `72.61.243.152` ← **CHANGE THIS**
   - **TTL:** 3600 (or default)
   - Click **"Save"** or **"Update"**

4. **Add or Edit** A record for `www`:
   - **Type:** A
   - **Name:** www
   - **Value:** `72.61.243.152` ← **MUST BE THIS IP**
   - **TTL:** 3600 (or default)
   - Click **"Save"** or **"Add Record"**

### Step 5: Remove Wrong Records

1. **DELETE** any A records pointing to `84.32.84.32` or any other IP
2. **DELETE** any CNAME records that might conflict
3. Keep only the two A records:
   - `@` → `72.61.243.152`
   - `www` → `72.61.243.152`

### Step 6: Verify Changes

After saving, your DNS records should look like this:

```
Type    Name    Value           TTL
A       @       72.61.243.152   3600
A       www     72.61.243.152   3600
```

### Step 7: Wait for DNS Propagation

- **Wait 1-2 hours** for DNS changes to propagate globally
- You can check propagation status at: https://dnschecker.org
- Search for `dezignbuild.site` and verify it shows `72.61.243.152` in all locations

### Step 8: Test DNS Resolution

After waiting, test on your computer:

**Windows (PowerShell):**
```powershell
nslookup dezignbuild.site
```

**Should return:** `72.61.243.152`

**Linux/Mac:**
```bash
dig dezignbuild.site +short
```

**Should return:** `72.61.243.152`

---

## Visual Guide

### What You Should See in Hostinger DNS Zone Editor:

```
┌─────────────────────────────────────────────────┐
│ DNS Records for dezignbuild.site                │
├──────────┬──────────┬──────────────┬───────────┤
│ Type     │ Name     │ Value        │ TTL       │
├──────────┼──────────┼──────────────┼───────────┤
│ A        │ @        │ 72.61.243.152 │ 3600      │
│ A        │ www      │ 72.61.243.152│ 3600      │
└──────────┴──────────┴──────────────┴───────────┘
```

### What Nameservers Should Show:

```
┌─────────────────────────────────────────────┐
│ Nameservers                                 │
├─────────────────────────────────────────────┤
│ ns1.dns.hostinger.com                       │
│ ns2.dns.hostinger.com                       │
│ ns3.dns.hostinger.com                       │
│ ns4.dns.hostinger.com                       │
└─────────────────────────────────────────────┘
```

---

## Common Issues

### Issue: Can't find DNS Zone Editor
**Solution:** 
- Look for "DNS Management", "DNS Settings", or "Advanced DNS"
- It might be under "Advanced" or "DNS" tab

### Issue: Can't edit A record
**Solution:**
- Delete the old record and create a new one
- Make sure you have proper permissions in Hostinger account

### Issue: Still showing wrong IP after changes
**Solution:**
- Wait longer (can take up to 48 hours)
- Clear your DNS cache:
  - Windows: `ipconfig /flushdns`
  - Mac: `sudo dscacheutil -flushcache`
  - Linux: `sudo systemd-resolve --flush-caches`

### Issue: Nameservers won't change
**Solution:**
- If domain is registered elsewhere, change nameservers at the registrar
- Contact Hostinger support if domain is registered with them

---

## After DNS is Fixed

Once DNS correctly points to `72.61.243.152`:

1. **SSH into your server:**
   ```bash
   ssh root@72.61.243.152
   ```

2. **Run the fix script:**
   ```bash
   cd /docker/buildflow  # or your project directory
   chmod +x scripts/fix-domain-dns.sh
   ./scripts/fix-domain-dns.sh
   ```

3. **Test the domain:**
   ```bash
   curl http://dezignbuild.site
   ```

4. **Set up SSL (HTTPS):**
   ```bash
   certbot --nginx -d dezignbuild.site -d www.dezignbuild.site
   ```

---

## Quick Checklist

- [ ] Logged into Hostinger hPanel
- [ ] Verified nameservers are Hostinger's (not parking)
- [ ] Updated A record for `@` to `72.61.243.152`
- [ ] Added/Updated A record for `www` to `72.61.243.152`
- [ ] Removed any wrong A records
- [ ] Saved all changes
- [ ] Waited 1-2 hours for propagation
- [ ] Verified with `nslookup dezignbuild.site`
- [ ] Ran fix script on server
- [ ] Tested domain in browser

---

## Support

If you're stuck:
1. Take a screenshot of your DNS Zone Editor
2. Check Hostinger documentation: https://support.hostinger.com
3. Contact Hostinger support if DNS changes aren't working

