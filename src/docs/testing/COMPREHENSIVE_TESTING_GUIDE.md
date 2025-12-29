# Comprehensive Testing Guide - Sprint 1 Implementation

**Date:** January 2025  
**Purpose:** End-to-end testing of all Sprint 1 features

---

## 🧪 Testing Environment Setup

### Prerequisites
1. PostgreSQL running on localhost:5432
2. Redis server (optional - system falls back to in-memory)
3. Node.js 18+ installed
4. All npm packages installed

### Start Services

```bash
# Terminal 1: Start PostgreSQL (if not running)
# Windows: Check Services
# Linux/Mac: sudo systemctl start postgresql

# Terminal 2: Start Redis (optional)
redis-server

# Terminal 3: Start Backend
cd server
npm start

# Terminal 4: Start Frontend
npm run dev
```

---

## Test 1: Two-Factor Authentication (2FA)

### 1.1 Database Migration Test

```bash
# Verify migration was applied
psql -U postgres -d buildflow_db -c "\d users"

# Should show:
# - two_factor_secret (text)
# - two_factor_enabled (boolean)
# - recovery_codes (text[])
# - two_factor_verified_at (timestamp with time zone)
```

**Expected Result:** ✅ All 4 columns exist

---

### 1.2 2FA Setup Flow Test

**Steps:**
1. Login to the application
2. Navigate to Settings → Security tab
3. Click "Enable Two-Factor Authentication"
4. Verify QR code displays
5. Scan QR code with Google Authenticator or Authy
6. Enter 6-digit code from app
7. Verify recovery codes are shown
8. Save recovery codes

**Expected Results:**
- ✅ QR code displays correctly
- ✅ Secret can be copied manually
- ✅ Recovery codes are generated (10 codes)
- ✅ Recovery codes can be copied/downloaded
- ✅ Token verification succeeds
- ✅ 2FA is enabled
- ✅ Status shows "Enabled" in settings

**API Test:**
```bash
# Get auth token first (login)
TOKEN="your_auth_token"
AGENCY_DB="your_agency_database"

# Setup 2FA
curl -X POST http://localhost:3000/api/two-factor/setup \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Agency-Database: $AGENCY_DB" \
  -H "Content-Type: application/json"

# Should return: secret, qrCode, recoveryCodes
```

---

### 1.3 2FA Login Flow Test

**Steps:**
1. Logout from application
2. Login with email and password
3. Verify 2FA verification component appears
4. Enter 6-digit code from authenticator app
5. Verify login completes successfully

**Expected Results:**
- ✅ After password verification, 2FA screen appears
- ✅ Can enter authenticator code
- ✅ Can switch to recovery code tab
- ✅ Valid code completes login
- ✅ Invalid code shows error
- ✅ Login redirects to dashboard after verification

**API Test:**
```bash
# Login without 2FA token (should return requiresTwoFactor: true)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Login with 2FA token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","twoFactorToken":"123456"}'
```

---

### 1.4 Recovery Code Test

**Steps:**
1. Login with 2FA enabled
2. Click "Use recovery code" tab
3. Enter one of the saved recovery codes
4. Verify login succeeds
5. Try using the same recovery code again
6. Verify it fails (codes are single-use)

**Expected Results:**
- ✅ Recovery code works for login
- ✅ Used recovery code is removed from database
- ✅ Same recovery code cannot be used twice
- ✅ Invalid recovery code shows error

---

### 1.5 2FA Disable Test

**Steps:**
1. Go to Settings → Security
2. Click "Disable 2FA"
3. Enter password to confirm
4. Verify 2FA is disabled
5. Login again (should not require 2FA)

**Expected Results:**
- ✅ Disable dialog requires password
- ✅ 2FA is disabled after confirmation
- ✅ Login no longer requires 2FA
- ✅ Status shows "Disabled"

---

## Test 2: Field-Level Encryption

### 2.1 Database Migration Test

```bash
# Verify encrypted columns exist
psql -U postgres -d buildflow_db -c "\d employee_details"
psql -U postgres -d buildflow_db -c "\d employee_salary_details"

# Should show encrypted columns
```

**Expected Result:** ✅ Encrypted columns exist

---

### 2.2 Encryption Service Test

**Backend Test:**
```javascript
// Test in Node.js REPL or test file
const encryptionService = require('./server/services/encryptionService');

// Test encryption
const plainText = "123-45-6789";
const encrypted = encryptionService.encrypt(plainText, 'ssn');
console.log('Encrypted:', encrypted);

// Test decryption
const decrypted = encryptionService.decrypt(encrypted);
console.log('Decrypted:', decrypted);
console.log('Match:', plainText === decrypted); // Should be true

// Test hash
const hash = encryptionService.hash(plainText);
console.log('Hash:', hash);
```

**Expected Results:**
- ✅ Encryption produces different output each time (due to random salt/IV)
- ✅ Decryption recovers original text
- ✅ Hash is consistent for same input
- ✅ Encrypted format: `salt:iv:authTag:encryptedData`

---

### 2.3 Integration Test (When Employee Service Updated)

**Note:** Encryption middleware is ready but needs to be integrated into employee routes.

**Test Plan:**
1. Create employee with SSN
2. Verify SSN is encrypted in database
3. Retrieve employee
4. Verify SSN is decrypted automatically
5. Verify plain text SSN is never stored

---

## Test 3: Redis Caching

### 3.1 Redis Connection Test

**Backend Test:**
```javascript
// Test Redis connection
const { isRedisAvailable, getRedisClient } = require('./server/config/redis');

(async () => {
  const available = await isRedisAvailable();
  console.log('Redis available:', available);
  
  if (available) {
    const client = await getRedisClient();
    await client.set('test', 'value');
    const value = await client.get('test');
    console.log('Test value:', value); // Should be 'value'
  }
})();
```

**Expected Results:**
- ✅ If Redis is running: Connection succeeds
- ✅ If Redis is not running: Falls back to in-memory cache
- ✅ No errors thrown

---

### 3.2 Cache Service Test

**Backend Test:**
```javascript
const cacheService = require('./server/services/cacheService');

(async () => {
  // Test set/get
  await cacheService.set('test:key', { data: 'test' }, 60);
  const value = await cacheService.get('test:key');
  console.log('Cached value:', value); // Should be { data: 'test' }
  
  // Test delete
  await cacheService.del('test:key');
  const deleted = await cacheService.get('test:key');
  console.log('After delete:', deleted); // Should be null
  
  // Test stats
  const stats = await cacheService.getStats();
  console.log('Cache stats:', stats);
})();
```

**Expected Results:**
- ✅ Set/get works correctly
- ✅ Delete removes key
- ✅ Stats show cache type and size
- ✅ TTL expiration works (test with short TTL)

---

### 3.3 Cache Middleware Test

**Test on a Route:**
1. Make a GET request to a cached endpoint
2. Verify response is cached
3. Make same request again
4. Verify response comes from cache (faster)
5. Wait for TTL to expire
6. Verify fresh data is fetched

---

## Test 4: Performance Monitoring

### 4.1 Health Endpoint Test

```bash
# Test basic health endpoint
curl http://localhost:3000/health

# Expected response:
# {
#   "status": "ok",
#   "timestamp": "...",
#   "services": {
#     "database": { "status": "connected", "responseTime": ... },
#     "redis": { "status": "connected" or "unavailable" }
#   }
# }
```

**Expected Results:**
- ✅ Returns 200 status
- ✅ Database status is "connected"
- ✅ Redis status is shown (connected or unavailable)
- ✅ Response time is included

---

### 4.2 System Health API Test

```bash
# Get auth token first
TOKEN="your_auth_token"
AGENCY_DB="your_agency_database"

# Test system health endpoint (requires admin)
curl http://localhost:3000/api/system-health \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Agency-Database: $AGENCY_DB"
```

**Expected Results:**
- ✅ Returns comprehensive health data
- ✅ Database metrics (size, connections)
- ✅ Redis metrics (if available)
- ✅ System resources (CPU, memory)
- ✅ Performance metrics

---

### 4.3 Health Dashboard Test

**Steps:**
1. Login as admin
2. Navigate to `/system-health` (or from menu)
3. Verify all metrics display
4. Click refresh button
5. Verify data updates
6. Wait 30 seconds
7. Verify auto-refresh works

**Expected Results:**
- ✅ All service statuses display
- ✅ Database metrics show correctly
- ✅ Redis status shows (with fallback if unavailable)
- ✅ System resources display
- ✅ Performance metrics show
- ✅ Auto-refresh updates data
- ✅ Manual refresh works

---

## Test 5: Automated Backup System

### 5.1 Manual Backup Test

```bash
# Get auth token
TOKEN="your_auth_token"
AGENCY_DB="your_agency_database"

# Create backup
curl -X POST http://localhost:3000/api/backups/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Agency-Database: $AGENCY_DB" \
  -H "Content-Type: application/json" \
  -d '{"databaseName":"buildflow_db","backupType":"full"}'
```

**Expected Results:**
- ✅ Backup file is created in `backups/` directory
- ✅ File has `.sql` extension
- ✅ File size > 0
- ✅ Response includes backup path

---

### 5.2 Backup Listing Test

```bash
# List all backups
curl http://localhost:3000/api/backups \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Agency-Database: $AGENCY_DB"
```

**Expected Results:**
- ✅ Returns array of backup files
- ✅ Each backup includes: filename, size, createdAt
- ✅ Backups sorted by date (newest first)

---

### 5.3 Backup Statistics Test

```bash
# Get backup stats
curl http://localhost:3000/api/backups/stats \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Agency-Database: $AGENCY_DB"
```

**Expected Results:**
- ✅ Returns total backup count
- ✅ Returns total size
- ✅ Returns oldest/newest backup dates
- ✅ Returns retention policy info

---

### 5.4 Backup Cleanup Test

```bash
# Create old backup (manually set date or wait)
# Then cleanup
curl -X POST http://localhost:3000/api/backups/cleanup \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Agency-Database: $AGENCY_DB"
```

**Expected Results:**
- ✅ Old backups (>30 days) are deleted
- ✅ Recent backups are kept
- ✅ Returns count of deleted backups

---

### 5.5 Scheduled Backup Test

**Steps:**
1. Check server logs for backup schedule message
2. Wait for scheduled time (or change schedule to test)
3. Verify backup is created automatically
4. Check logs for backup confirmation

**Expected Results:**
- ✅ Backup runs at scheduled time
- ✅ Backup file is created
- ✅ Old backups are cleaned up
- ✅ Logs show backup completion

---

## Test 6: System Health Dashboard

### 6.1 Dashboard Access Test

**Steps:**
1. Login as admin
2. Navigate to System Health dashboard
3. Verify page loads without errors
4. Verify all sections display

**Expected Results:**
- ✅ Page loads successfully
- ✅ All tabs are accessible
- ✅ No console errors
- ✅ Data displays correctly

---

### 6.2 Real-Time Updates Test

**Steps:**
1. Open System Health dashboard
2. Note current metrics
3. Wait 30 seconds
4. Verify metrics update automatically
5. Click refresh button
6. Verify manual refresh works

**Expected Results:**
- ✅ Auto-refresh every 30 seconds
- ✅ Manual refresh updates immediately
- ✅ Loading states show during refresh
- ✅ No duplicate requests

---

### 6.3 Service Status Display Test

**Steps:**
1. Check each service status badge
2. Verify colors match status:
   - Green = connected/ok
   - Yellow = degraded/unavailable
   - Red = error/disconnected
3. Verify response times display
4. Verify connection metrics display

**Expected Results:**
- ✅ Status badges show correct colors
- ✅ Response times are numeric
- ✅ Connection metrics are accurate
- ✅ Fallback status shows when Redis unavailable

---

## Test 7: Integration Tests

### 7.1 Full 2FA Flow Test

**Complete User Journey:**
1. User signs up
2. User enables 2FA
3. User logs out
4. User logs in with 2FA
5. User uses recovery code once
6. User disables 2FA
7. User logs in without 2FA

**Expected Results:**
- ✅ All steps complete successfully
- ✅ No errors in console
- ✅ Database records are correct
- ✅ UI updates correctly

---

### 7.2 Performance Under Load Test

**Test:**
1. Enable caching on a route
2. Make 100 requests to that route
3. Measure response times
4. Verify cache hit rate
5. Compare with/without cache

**Expected Results:**
- ✅ Cached requests are faster
- ✅ Cache hit rate > 80%
- ✅ No performance degradation
- ✅ Memory usage is reasonable

---

### 7.3 Backup and Restore Test

**⚠️ WARNING: Only test on non-production database!**

**Steps:**
1. Create test data
2. Create backup
3. Delete some data
4. Restore from backup
5. Verify data is restored

**Expected Results:**
- ✅ Backup contains all data
- ✅ Restore recovers all data
- ✅ No data loss
- ✅ Database is functional after restore

---

## 🐛 Common Issues & Solutions

### Issue: Redis Connection Failed
**Solution:** 
- Check if Redis server is running: `redis-cli ping`
- Verify REDIS_HOST and REDIS_PORT in environment
- System will fall back to in-memory cache (acceptable for development)

### Issue: 2FA QR Code Not Displaying
**Solution:**
- Check browser console for errors
- Verify API endpoint returns qrCode
- Check network tab for failed requests
- Verify user is authenticated

### Issue: Backup Fails
**Solution:**
- Verify PostgreSQL is running
- Check DATABASE_URL is correct
- Verify backup directory exists and is writable
- Check pg_dump is in PATH

### Issue: Encryption Fails
**Solution:**
- Verify ENCRYPTION_KEY is set (32-byte hex string)
- Check encryption service is imported correctly
- Verify encrypted data format is correct

---

## ✅ Test Completion Checklist

- [ ] All 2FA tests pass
- [ ] Encryption service tests pass
- [ ] Redis/cache tests pass
- [ ] Health monitoring tests pass
- [ ] Backup system tests pass
- [ ] Dashboard tests pass
- [ ] Integration tests pass
- [ ] No console errors
- [ ] No database errors
- [ ] Performance is acceptable

---

**Testing Status:** ⚠️ Pending  
**Next:** Run all tests and document results
