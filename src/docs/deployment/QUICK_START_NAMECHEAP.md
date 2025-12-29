# Quick Start: Fix DNS for dezignbuild.site (Namecheap)

## 🎯 Your Situation
- **Domain registered at:** Namecheap
- **Current DNS points to:** `84.32.84.32` ❌ (wrong)
- **Should point to:** `72.61.243.152` ✅ (your server)

---

## ⚡ Quick Fix (5 Minutes)

### Step 1: Log in to Namecheap
1. Go to https://www.namecheap.com
2. Click **"Sign In"** (top right)
3. Enter your credentials

### Step 2: Access DNS Settings
1. Click **"Domain List"** (top menu)
2. Find **`dezignbuild.site`** in the list
3. Click the **"Manage"** button (right side)
4. Click the **"Advanced DNS"** tab

### Step 3: Update A Records

**Update Root Domain (@):**
1. Find the A record with Host: **@** (or blank)
2. Click the **pencil icon** (Edit) or **trash icon** (Delete if wrong)
3. If editing: Change **Value** to: `72.61.243.152`
4. If adding new: Click **"Add New Record"** → Select **A Record** → Host: `@` → Value: `72.61.243.152`
5. Click **green checkmark** to save

**Add www Subdomain:**
1. Click **"Add New Record"**
2. Select **A Record**
3. **Host:** `www`
4. **Value:** `72.61.243.152`
5. **TTL:** Automatic (or 30 min)
6. Click **green checkmark** to save

**Delete Wrong Records:**
1. Find any A records pointing to `84.32.84.32`
2. Click the **red trash icon** to delete them

### Step 4: Verify
Your DNS records should look like this:

```
Type      Host    Value           TTL
A Record  @       72.61.243.152   Automatic
A Record  www     72.61.243.152   Automatic
```

### Step 5: Wait & Test
1. **Wait 1-2 hours** for DNS to propagate
2. Run verification:
   ```powershell
   .\scripts\verify-dns.ps1
   ```
3. When it shows `72.61.243.152`, proceed to server setup

---

## 🖥️ Server Setup (After DNS is Fixed)

Once DNS is correct, SSH into your server:

```bash
ssh root@72.61.243.152
cd /docker/buildflow
chmod +x scripts/setup-domain-complete.sh
./scripts/setup-domain-complete.sh
```

This will configure everything automatically!

---

## 📋 Visual Guide

### Namecheap Advanced DNS Page:

```
┌─────────────────────────────────────────────────────┐
│ Advanced DNS                                        │
│                                                     │
│ Host Records                                        │
├──────────┬──────────┬──────────────┬───────────────┤
│ Type     │ Host     │ Value        │ TTL           │
├──────────┼──────────┼──────────────┼───────────────┤
│ A Record │ @        │ 72.61.243.152│ Automatic    │ ✅
│ A Record │ www      │ 72.61.243.152│ Automatic    │ ✅
└──────────┴──────────┴──────────────┴───────────────┘
```

### What to Look For:

✅ **Correct:**
- A Record with Host `@` pointing to `72.61.243.152`
- A Record with Host `www` pointing to `72.61.243.152`

❌ **Wrong (Delete These):**
- Any A Record pointing to `84.32.84.32`
- Any A Record pointing to other IPs

---

## 🐛 Troubleshooting

### "I can't find Advanced DNS tab"
- Make sure you clicked **"Manage"** on the domain
- Look for tabs: **Domain**, **Advanced DNS**, **Email**, etc.
- If you don't see it, the domain might be locked - check Domain tab

### "DNS still shows wrong IP after 2 hours"
1. Double-check you saved changes (green checkmark)
2. Clear DNS cache: `ipconfig /flushdns` (Windows)
3. Try different DNS: `nslookup dezignbuild.site 8.8.8.8`
4. Check online: https://dnschecker.org

### "Domain shows parking page"
- Nameservers might still be pointing to parking
- In Namecheap, go to **Domain** tab → Check **Nameservers**
- Should be: **Namecheap BasicDNS** (not Custom DNS with parking)

---

## ✅ Checklist

- [ ] Logged into Namecheap
- [ ] Went to Domain List → Manage → Advanced DNS
- [ ] Updated A record for `@` to `72.61.243.152`
- [ ] Added A record for `www` to `72.61.243.152`
- [ ] Deleted wrong A records (pointing to `84.32.84.32`)
- [ ] Saved all changes (green checkmarks)
- [ ] Waited 1-2 hours
- [ ] Verified: `nslookup dezignbuild.site` shows `72.61.243.152`
- [ ] Ran server setup script
- [ ] Tested domain in browser

---

## 📚 More Help

- **Detailed Guide:** See `NAMECHEAP_DNS_SETUP.md`
- **Complete Setup:** See `DOMAIN_FIX_COMPLETE.md`
- **Namecheap Support:** https://www.namecheap.com/support/

---

**That's it!** Once DNS is fixed, your domain will work! 🚀

