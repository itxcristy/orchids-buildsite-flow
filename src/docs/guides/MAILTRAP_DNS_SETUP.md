# Mailtrap DNS Configuration for dezignbuild.site

## Overview
This guide will help you add the required DNS records for Mailtrap.io email service to your domain `dezignbuild.site`.

## Required DNS Records

You need to add the following DNS records:

1. **CNAME**: `mt51.dezignbuild.site` → `smtp.mailtrap.live`
2. **CNAME**: `rwmt1._domainkey.dezignbuild.site` → `rwmt1.dkim.smtp.mailtrap.live`
3. **CNAME**: `rwmt2._domainkey.dezignbuild.site` → `rwmt2.dkim.smtp.mailtrap.live`
4. **TXT**: `_dmarc.dezignbuild.site` → `v=DMARC1; p=none; rua=mailto:dmarc@smtp-staging.mailtrap.net; ruf=mailto:dmarc@smtp-staging.mailtrap.net; rf=afrf; pct=100`
5. **CNAME**: `mt-link.dezignbuild.site` → `t.mailtrap.live`

---

## Option 1: Adding Records in Namecheap (If using Namecheap DNS)

### Step 1: Access Namecheap DNS Management

1. Log in to **Namecheap**: https://www.namecheap.com
2. Go to **Domain List** → Click **Manage** next to `dezignbuild.site`
3. Click on **"Advanced DNS"** tab
4. Scroll down to **"Host Records"** section

### Step 2: Add CNAME Records

For each CNAME record, click **"Add New Record"** and fill in:

#### Record 1: mt51
- **Type**: Select **CNAME Record**
- **Host**: `mt51`
- **Value**: `smtp.mailtrap.live`
- **TTL**: **Automatic** (or 30 min)
- Click **Save** (green checkmark)

#### Record 2: rwmt1._domainkey
- **Type**: Select **CNAME Record**
- **Host**: `rwmt1._domainkey`
- **Value**: `rwmt1.dkim.smtp.mailtrap.live`
- **TTL**: **Automatic** (or 30 min)
- Click **Save** (green checkmark)

#### Record 3: rwmt2._domainkey
- **Type**: Select **CNAME Record**
- **Host**: `rwmt2._domainkey`
- **Value**: `rwmt2.dkim.smtp.mailtrap.live`
- **TTL**: **Automatic** (or 30 min)
- Click **Save** (green checkmark)

#### Record 4: mt-link
- **Type**: Select **CNAME Record**
- **Host**: `mt-link`
- **Value**: `t.mailtrap.live`
- **TTL**: **Automatic** (or 30 min)
- Click **Save** (green checkmark)

### Step 3: Add TXT Record

- **Type**: Select **TXT Record**
- **Host**: `_dmarc`
- **Value**: `v=DMARC1; p=none; rua=mailto:dmarc@smtp-staging.mailtrap.net; ruf=mailto:dmarc@smtp-staging.mailtrap.net; rf=afrf; pct=100`
- **TTL**: **Automatic** (or 30 min)
- Click **Save** (green checkmark)

**Important**: When entering the TXT value, make sure to include the entire string exactly as shown above.

---

## Option 2: Adding Records in Hostinger (If using Hostinger DNS)

### Step 1: Access Hostinger DNS Management

1. Log in to **Hostinger hPanel**: https://hpanel.hostinger.com
2. Go to **Domains** → Find `dezignbuild.site` → Click **Manage**
3. Click on **DNS / Zone Editor** or **DNS Management**

### Step 2: Add CNAME Records

For each CNAME record, click **"Add Record"** or **"Create Record"**:

#### Record 1: mt51
- **Type**: **CNAME**
- **Name/Host**: `mt51`
- **Points to/Value**: `smtp.mailtrap.live`
- **TTL**: `3600` (or default)
- Click **Save** or **Add Record**

#### Record 2: rwmt1._domainkey
- **Type**: **CNAME**
- **Name/Host**: `rwmt1._domainkey`
- **Points to/Value**: `rwmt1.dkim.smtp.mailtrap.live`
- **TTL**: `3600` (or default)
- Click **Save** or **Add Record**

#### Record 3: rwmt2._domainkey
- **Type**: **CNAME**
- **Name/Host**: `rwmt2._domainkey`
- **Points to/Value**: `rwmt2.dkim.smtp.mailtrap.live`
- **TTL**: `3600` (or default)
- Click **Save** or **Add Record**

#### Record 4: mt-link
- **Type**: **CNAME**
- **Name/Host**: `mt-link`
- **Points to/Value**: `t.mailtrap.live`
- **TTL**: `3600` (or default)
- Click **Save** or **Add Record**

### Step 3: Add TXT Record

- **Type**: **TXT**
- **Name/Host**: `_dmarc`
- **Value/Text**: `v=DMARC1; p=none; rua=mailto:dmarc@smtp-staging.mailtrap.net; ruf=mailto:dmarc@smtp-staging.mailtrap.net; rf=afrf; pct=100`
- **TTL**: `3600` (or default)
- Click **Save** or **Add Record**

---

## Visual Reference: What Your DNS Should Look Like

After adding all records, your DNS zone should include:

```
┌──────────────┬──────────────────────────┬──────────────────────────────────────────┐
│ Type         │ Host/Name                │ Value/Points To                          │
├──────────────┼──────────────────────────┼──────────────────────────────────────────┤
│ A Record     │ @                        │ 72.61.243.152                            │
│ A Record     │ www                      │ 72.61.243.152                            │
│ CNAME        │ mt51                     │ smtp.mailtrap.live                       │
│ CNAME        │ rwmt1._domainkey         │ rwmt1.dkim.smtp.mailtrap.live            │
│ CNAME        │ rwmt2._domainkey         │ rwmt2.dkim.smtp.mailtrap.live            │
│ CNAME        │ mt-link                  │ t.mailtrap.live                          │
│ TXT          │ _dmarc                   │ v=DMARC1; p=none; rua=mailto:...         │
└──────────────┴──────────────────────────┴──────────────────────────────────────────┘
```

---

## Step 4: Verify DNS Records

After adding the records, wait 5-15 minutes for DNS propagation, then verify:

### Using Command Line

```powershell
# Check CNAME records
nslookup -type=CNAME mt51.dezignbuild.site
nslookup -type=CNAME rwmt1._domainkey.dezignbuild.site
nslookup -type=CNAME rwmt2._domainkey.dezignbuild.site
nslookup -type=CNAME mt-link.dezignbuild.site

# Check TXT record
nslookup -type=TXT _dmarc.dezignbuild.site
```

### Using Online Tools

1. **MXToolbox**: https://mxtoolbox.com/SuperTool.aspx
   - Enter each record name (e.g., `mt51.dezignbuild.site`)
   - Select record type (CNAME or TXT)
   - Click "Lookup"

2. **DNS Checker**: https://dnschecker.org
   - Enter the record name
   - Select record type
   - Check global propagation

3. **What's My DNS**: https://www.whatsmydns.net
   - Enter record name
   - Select record type

### Expected Results

- **mt51.dezignbuild.site** should resolve to `smtp.mailtrap.live`
- **rwmt1._domainkey.dezignbuild.site** should resolve to `rwmt1.dkim.smtp.mailtrap.live`
- **rwmt2._domainkey.dezignbuild.site** should resolve to `rwmt2.dkim.smtp.mailtrap.live`
- **mt-link.dezignbuild.site** should resolve to `t.mailtrap.live`
- **_dmarc.dezignbuild.site** should show the DMARC TXT record

---

## Step 5: Verify in Mailtrap Dashboard

1. Log in to your **Mailtrap account**: https://mailtrap.io
2. Go to **Email Sending** → **Domains** (or **SMTP Settings**)
3. Find your domain `dezignbuild.site`
4. Click **"Verify Domain"** or **"Check DNS Records"**
5. Mailtrap will verify all records are correctly configured

**Status should show**: ✅ All records verified / Domain verified

---

## Troubleshooting

### Issue: DNS records not showing up

**Solutions:**
1. **Wait longer**: DNS propagation can take 5-60 minutes (sometimes up to 24 hours)
2. **Clear DNS cache**:
   - Windows: `ipconfig /flushdns`
   - Mac: `sudo dscacheutil -flushcache`
   - Linux: `sudo systemd-resolve --flush-caches`
3. **Check for typos**: Verify host names and values are exactly correct
4. **Check TTL**: Lower TTL values (300-600) help with faster updates

### Issue: CNAME record not working

**Solutions:**
1. Make sure you're using **CNAME** type, not A record
2. Verify the target value doesn't have a trailing dot (should be `smtp.mailtrap.live` not `smtp.mailtrap.live.`)
3. Some DNS providers don't allow CNAME at root (@) - but these are subdomains, so should work

### Issue: TXT record too long or not saving

**Solutions:**
1. Some DNS providers split long TXT records - check if your provider does this automatically
2. Copy the entire value including all semicolons and spaces
3. Make sure there are no extra spaces at the beginning or end
4. If using quotes, some providers require them, others don't - try without quotes first

### Issue: Mailtrap shows records as "Not Found"

**Solutions:**
1. Wait 15-30 minutes after adding records
2. Verify records using online DNS checkers (see Step 4)
3. Make sure you added records to the correct DNS provider (where your nameservers point)
4. Check if your domain uses custom nameservers - records must be added where nameservers point

### Issue: Can't find where to add DNS records

**Solutions:**
1. **Namecheap**: Domain List → Manage → Advanced DNS tab
2. **Hostinger**: Domains → DNS / Zone Editor
3. **Cloudflare**: DNS → Records → Add record
4. **GoDaddy**: DNS Management → Add Record
5. If using custom nameservers, add records where those nameservers are hosted

---

## Quick Checklist

- [ ] Identified which DNS provider you're using (Namecheap or Hostinger)
- [ ] Added CNAME record: `mt51` → `smtp.mailtrap.live`
- [ ] Added CNAME record: `rwmt1._domainkey` → `rwmt1.dkim.smtp.mailtrap.live`
- [ ] Added CNAME record: `rwmt2._domainkey` → `rwmt2.dkim.smtp.mailtrap.live`
- [ ] Added CNAME record: `mt-link` → `t.mailtrap.live`
- [ ] Added TXT record: `_dmarc` → (full DMARC value)
- [ ] Waited 5-15 minutes for DNS propagation
- [ ] Verified records using `nslookup` or online tools
- [ ] Verified domain in Mailtrap dashboard
- [ ] All records show as verified ✅

---

## After DNS is Verified

Once Mailtrap shows all records as verified:

1. **Update your application's email configuration** with Mailtrap SMTP settings:
   - SMTP Host: `smtp.mailtrap.io` (or the host provided by Mailtrap)
   - Port: `2525` (or the port provided)
   - Username: (from Mailtrap dashboard)
   - Password: (from Mailtrap dashboard)

2. **Test email sending** from your application

3. **Monitor emails** in Mailtrap inbox to ensure they're being sent correctly

---

## Support Links

- **Mailtrap Support**: https://mailtrap.io/support
- **Mailtrap Documentation**: https://mailtrap.io/docs
- **Namecheap DNS Guide**: https://www.namecheap.com/support/knowledgebase/article.aspx/767/10/how-can-i-set-up-dns-records-for-my-domain/
- **Hostinger DNS Guide**: https://support.hostinger.com/en/articles/1583290-how-to-manage-dns-records

---

## Notes

- **DNS Propagation**: Changes typically take 5-60 minutes, but can take up to 24-48 hours in rare cases
- **TTL Values**: Lower TTL (300-600 seconds) allows faster updates, higher TTL (3600+) reduces DNS queries
- **Record Priority**: The order of records doesn't matter
- **Multiple Providers**: If you're unsure which DNS provider to use, check where your nameservers point:
  ```powershell
  nslookup -type=NS dezignbuild.site
  ```

