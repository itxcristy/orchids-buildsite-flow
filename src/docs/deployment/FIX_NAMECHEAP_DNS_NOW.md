# Fix Namecheap DNS - Step by Step

## 🚨 Current Situation

You have an **existing A record** pointing to `84.32.84.32` (wrong IP)
You're trying to add a new one pointing to `72.61.243.152` (correct IP)

**DO NOT ADD A DUPLICATE!** You need to **EDIT or DELETE** the old one first.

---

## ✅ Solution: Edit the Existing Record

### Step 1: Delete the Wrong Record First

1. In Namecheap **Advanced DNS** page, find the A record:
   ```
   Name: @
   Content: 84.32.84.32
   TTL: 50
   ```

2. Click the **RED TRASH ICON** 🗑️ to **DELETE** this record

3. Confirm the deletion

### Step 2: Add the Correct Record

1. Click **"Add New Record"** button

2. Fill in:
   - **Type:** A Record
   - **Host:** `@` (or leave blank for root domain)
   - **Value:** `72.61.243.152`
   - **TTL:** Automatic (or 3600)

3. Click the **GREEN CHECKMARK** ✅ to save

### Step 3: Add www Subdomain

1. Click **"Add New Record"** again

2. Fill in:
   - **Type:** A Record
   - **Host:** `www`
   - **Value:** `72.61.243.152`
   - **TTL:** Automatic (or 3600)

3. Click the **GREEN CHECKMARK** ✅ to save

---

## ✅ Alternative: Edit Instead of Delete

If you prefer to edit instead of delete:

### Step 1: Edit the Existing Record

1. Find the A record with:
   ```
   Name: @
   Content: 84.32.84.32
   ```

2. Click the **PENCIL ICON** ✏️ (Edit button)

3. Change **Content/Value** from `84.32.84.32` to `72.61.243.152`

4. Change **TTL** to `3600` or `Automatic`

5. Click the **GREEN CHECKMARK** ✅ to save

### Step 2: Add www Subdomain

1. Click **"Add New Record"**

2. Fill in:
   - **Type:** A Record
   - **Host:** `www`
   - **Value:** `72.61.243.152`
   - **TTL:** Automatic

3. Click **GREEN CHECKMARK** ✅ to save

---

## ✅ Final Result

After completing the steps, you should have:

```
Type      Host    Content/Value    TTL
A Record  @       72.61.243.152    Automatic
A Record  www     72.61.243.152    Automatic
```

**NO records pointing to `84.32.84.32` should remain!**

---

## ⚠️ Important Notes

1. **DO NOT** have two A records for `@` pointing to different IPs
2. **DELETE** the old record (`84.32.84.32`) first
3. **THEN** add the new one (`72.61.243.152`)
4. Or **EDIT** the existing one instead of adding a duplicate

---

## ✅ After Saving

1. **Wait 1-2 hours** for DNS propagation
2. **Verify** with:
   ```powershell
   .\scripts\verify-dns.ps1
   ```
3. When it shows `72.61.243.152`, proceed to server setup

---

## 🎯 Quick Action Plan

**Right Now:**
1. ✅ Delete the A record pointing to `84.32.84.32`
2. ✅ Add new A record: `@` → `72.61.243.152`
3. ✅ Add new A record: `www` → `72.61.243.152`
4. ✅ Save all changes

**In 1-2 Hours:**
5. ✅ Run verification script
6. ✅ When DNS is correct, configure server

---

**That's it!** Follow these steps and your DNS will be fixed! 🚀

