# Namecheap DNS Configuration for dezignbuild.site

## 🎯 Important: Domain Registered at Namecheap

Your domain `dezignbuild.site` is registered at **Namecheap**, but you're using **Hostinger** for hosting.

## Current Problem

- Domain points to: `84.32.84.32` (wrong IP)
- Should point to: `72.61.243.152` (your server IP)

---

## Option 1: Use Hostinger Nameservers (Recommended)

If you want to manage DNS in Hostinger:

### Step 1: Get Hostinger Nameservers

1. Log in to **Hostinger hPanel**: https://hpanel.hostinger.com
2. Go to **Domains** → Find your domain or hosting account
3. Note the nameservers (usually):
   - `ns1.dns.hostinger.com`
   - `ns2.dns.hostinger.com`
   - `ns3.dns.hostinger.com`
   - `ns4.dns.hostinger.com`

### Step 2: Update Nameservers in Namecheap

1. Log in to **Namecheap**: https://www.namecheap.com
2. Go to **Domain List** → Click **Manage** next to `dezignbuild.site`
3. Scroll down to **Nameservers** section
4. Select **"Custom DNS"** (not "Namecheap BasicDNS")
5. Enter Hostinger's nameservers:
   ```
   ns1.dns.hostinger.com
   ns2.dns.hostinger.com
   ns3.dns.hostinger.com
   ns4.dns.hostinger.com
   ```
6. Click **"Save"** or **"Update"**

**Wait 24-48 hours** for nameserver changes to propagate.

### Step 3: Configure DNS Records in Hostinger

After nameservers propagate:

1. Log in to **Hostinger hPanel**
2. Go to **Domains** → `dezignbuild.site` → **DNS / Zone Editor**
3. Add/Update A records:
   - **A Record for @ (root):**
     - Type: A
     
     - Name: @ (or leave blank)
     - Value: `72.61.243.152`
     - TTL: 3600
   
   - **A Record for www:**
     - Type: A
     - Name: www
     - Value: `72.61.243.152`
     - TTL: 3600
4. **Delete** any existing A records pointing to `84.32.84.32`
5. Save changes

---

## Option 2: Use Namecheap DNS (Alternative)

If you want to manage DNS in Namecheap:

### Step 1: Access Namecheap DNS

1. Log in to **Namecheap**: https://www.namecheap.com
2. Go to **Domain List** → Click **Manage** next to `dezignbuild.site`
3. Click on **"Advanced DNS"** tab

### Step 2: Update DNS Records

1. Find the **Host Records** section
2. Look for existing A records

3. **Update or Add A Record for @ (root domain):**
   - Click **"Add New Record"** if it doesn't exist
   - Or click **"Edit"** on existing record
   - Type: **A Record**
   - Host: **@** (or leave blank for root)
   - Value: **72.61.243.152**
   - TTL: **Automatic** or **30 min**
   - Click **"Save"** (green checkmark)

4. **Update or Add A Record for www:**
   - Click **"Add New Record"**
   - Type: **A Record**
   - Host: **www**
   - Value: **72.61.243.152**
   - TTL: **Automatic** or **30 min**
   - Click **"Save"** (green checkmark)

5. **Delete Wrong Records:**
   - Find any A records pointing to `84.32.84.32`
   - Click the **red trash icon** to delete them

### Step 3: Verify Nameservers

Make sure nameservers are set to Namecheap's:
- Should show: **Namecheap BasicDNS** or **Namecheap Web Hosting DNS**
- If it shows "Custom DNS" pointing elsewhere, change it back to Namecheap

---

## Visual Guide for Namecheap

### Namecheap DNS Management Page Should Look Like:

```
┌─────────────────────────────────────────────────────┐
│ Advanced DNS                                        │
├──────────┬──────────┬──────────────┬───────────────┤
│ Type     │ Host     │ Value        │ TTL           │
├──────────┼──────────┼──────────────┼───────────────┤
│ A Record │ @        │ 72.61.243.152│ Automatic     │
│ A Record │ www      │ 72.61.243.152│ Automatic     │
└──────────┴──────────┴──────────────┴───────────────┘
```

### Nameservers Section Should Show:

**Option 1 (Using Hostinger):**
```
Custom DNS
ns1.dns.hostinger.com
ns2.dns.hostinger.com
ns3.dns.hostinger.com
ns4.dns.hostinger.com
```

**Option 2 (Using Namecheap):**
```
Namecheap BasicDNS
(or)
Namecheap Web Hosting DNS
```

---

## After DNS is Updated

### Wait for Propagation

- **Nameserver changes:** 24-48 hours
- **DNS record changes:** 1-2 hours (usually faster)

### Verify DNS

Run the verification script:
```powershell
.\scripts\verify-dns.ps1
```

Or manually check:
```powershell
nslookup dezignbuild.site
# Should return: 72.61.243.152
```

### Configure Server

Once DNS is correct, SSH into your server:

```bash
ssh root@72.61.243.152
cd /docker/buildflow
chmod +x scripts/setup-domain-complete.sh
./scripts/setup-domain-complete.sh
```

---

## Troubleshooting

### Issue: Can't find DNS settings in Namecheap

**Solution:**
- Make sure you're logged into the correct Namecheap account
- Go to: **Domain List** → **Manage** → **Advanced DNS** tab
- If you don't see Advanced DNS, the domain might be locked - check domain status

### Issue: Nameservers won't change

**Solution:**
- Domain might be locked (common security feature)
- Go to **Domain List** → **Manage** → **Domain** tab
- Look for **"Transfer Lock"** or **"Registrar Lock"**
- Temporarily disable it, change nameservers, then re-enable

### Issue: Still showing wrong IP after changes

**Solutions:**
1. Wait longer (DNS can take up to 48 hours)
2. Clear DNS cache:
   - Windows: `ipconfig /flushdns`
   - Mac: `sudo dscacheutil -flushcache`
   - Linux: `sudo systemd-resolve --flush-caches`
3. Try different DNS server: `nslookup dezignbuild.site 8.8.8.8`
4. Check online: https://dnschecker.org (search for `dezignbuild.site`)

### Issue: Domain shows "Parked" page

**Solution:**
- This means DNS is still pointing to parking nameservers
- Make sure you changed nameservers in Namecheap
- Wait for nameserver propagation (24-48 hours)

---

## Quick Checklist

**If Using Hostinger Nameservers:**
- [ ] Got Hostinger nameservers from hPanel
- [ ] Changed nameservers in Namecheap to Hostinger's
- [ ] Waited 24-48 hours for nameserver propagation
- [ ] Added A records in Hostinger DNS Zone Editor
- [ ] Verified DNS: `nslookup dezignbuild.site` shows `72.61.243.152`
- [ ] Ran server setup script

**If Using Namecheap DNS:**
- [ ] Verified nameservers are Namecheap's (not custom)
- [ ] Updated A record for `@` to `72.61.243.152` in Namecheap
- [ ] Added A record for `www` to `72.61.243.152` in Namecheap
- [ ] Deleted wrong A records pointing to `84.32.84.32`
- [ ] Waited 1-2 hours for DNS propagation
- [ ] Verified DNS: `nslookup dezignbuild.site` shows `72.61.243.152`
- [ ] Ran server setup script

---

## Which Option Should You Choose?

**Choose Option 1 (Hostinger Nameservers) if:**
- You have hosting with Hostinger
- You want to manage everything in one place (Hostinger)
- You plan to use Hostinger's email or other services

**Choose Option 2 (Namecheap DNS) if:**
- You only have domain at Namecheap (no Hostinger hosting)
- You prefer managing DNS in Namecheap
- You want faster DNS updates (no nameserver change needed)

---

## Next Steps After DNS is Fixed

1. **Verify DNS:** Run `.\scripts\verify-dns.ps1`
2. **Configure Server:** SSH and run `./scripts/setup-domain-complete.sh`
3. **Test Domain:** `curl http://dezignbuild.site`
4. **Set Up SSL:** `certbot --nginx -d dezignbuild.site -d www.dezignbuild.site`

---

## Support Links

- **Namecheap Support:** https://www.namecheap.com/support/
- **Namecheap DNS Guide:** https://www.namecheap.com/support/knowledgebase/article.aspx/767/10/how-can-i-set-up-dns-records-for-my-domain/
- **Hostinger Support:** https://support.hostinger.com

