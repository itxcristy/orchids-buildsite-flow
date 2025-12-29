# Journal Entry Accounts Not Showing - Troubleshooting Guide

## Issues Fixed

1. ✅ **Fixed useEffect dependencies** - Now waits for user to be available
2. ✅ **Added multiple fetch strategies** - Tries 3 different approaches
3. ✅ **Improved error handling** - Better fallback logic
4. ✅ **Added debug logging** - Console logs to track the issue
5. ✅ **Fixed agency_id passing** - Now correctly passes to insertRecord
6. ✅ **Enhanced Select component** - Better rendering and error states

## Current Implementation

The code now tries 3 strategies to fetch accounts:

1. **Strategy 1:** Fetch with `agency_id` AND `is_active: true`
2. **Strategy 2:** Fetch with only `agency_id`, filter `is_active` in memory
3. **Strategy 3:** Fetch all accounts (fallback if `agency_id` column doesn't exist)

## Debug Steps

### Step 1: Check Browser Console

Open browser console (F12) and look for these logs:

```
Attempt 1: Fetching accounts with agency_id and is_active filters for agency: [agency-id]
Success with both filters: X accounts
OR
Attempt 1 failed: [error message]
Attempt 2: Fetching accounts with only agency_id filter
...
```

### Step 2: Check Debug Panel

In development mode, you'll see a debug panel showing:
- Accounts loaded count
- Loading state
- User ID
- Full accounts data (click "View Accounts Data")

### Step 3: Verify Database

Run this SQL query directly in your database:

```sql
-- Check if accounts exist
SELECT id, account_code, account_name, is_active, agency_id 
FROM chart_of_accounts 
WHERE is_active = true 
ORDER BY account_code ASC;

-- Check your agency_id
SELECT id, agency_id FROM profiles WHERE user_id = '[your-user-id]';

-- Check accounts for your agency
SELECT id, account_code, account_name, is_active, agency_id 
FROM chart_of_accounts 
WHERE agency_id = '[your-agency-id]' AND is_active = true;
```

### Step 4: Test Manual Refresh

Click the refresh button (↻) next to "Add Line" to manually trigger account fetch.

## Common Issues & Solutions

### Issue 1: No Accounts in Database
**Symptom:** Console shows "No accounts found for agency"
**Solution:** 
1. Go to Financial Management
2. Create chart of accounts
3. Ensure `is_active` is set to `true`
4. Ensure `agency_id` matches your agency

### Issue 2: Agency ID Mismatch
**Symptom:** Accounts exist but don't show
**Solution:**
1. Check console for your `agency_id`
2. Verify accounts have matching `agency_id`
3. If accounts have `NULL` agency_id, they won't show (by design)

### Issue 3: Accounts Have is_active = false
**Symptom:** Accounts exist but don't show
**Solution:**
1. Update accounts: `UPDATE chart_of_accounts SET is_active = true WHERE id IN (...)`
2. Or the code will try Strategy 2 which filters in memory

### Issue 4: Select Component Not Rendering
**Symptom:** Console shows accounts loaded but dropdown is empty
**Solution:**
1. Check browser console for "Rendering SelectItem" logs
2. Verify accounts array has valid `id` fields
3. Check if SelectContent is being rendered (inspect element)

## Quick Test

Add this temporary test button to verify accounts are loading:

```tsx
<Button onClick={() => {
  console.log('Accounts state:', accounts);
  console.log('Accounts length:', accounts.length);
  console.log('First account:', accounts[0]);
  alert(`Accounts: ${accounts.length}\nFirst: ${accounts[0]?.account_name || 'None'}`);
}}>
  Test Accounts
</Button>
```

## Database Verification Query

Run this to verify your setup:

```sql
-- 1. Check your profile
SELECT p.id, p.user_id, p.agency_id, a.name as agency_name
FROM profiles p
LEFT JOIN agencies a ON p.agency_id = a.id
WHERE p.user_id = '[your-user-id]';

-- 2. Check accounts for your agency
SELECT COUNT(*) as account_count, 
       COUNT(*) FILTER (WHERE is_active = true) as active_count
FROM chart_of_accounts
WHERE agency_id = '[your-agency-id]';

-- 3. List all accounts for your agency
SELECT id, account_code, account_name, account_type, is_active, agency_id
FROM chart_of_accounts
WHERE agency_id = '[your-agency-id]'
ORDER BY account_code;
```

## Expected Console Output

If everything works, you should see:

```
Attempt 1: Fetching accounts with agency_id and is_active filters for agency: [uuid]
Success with both filters: 5 accounts
Final accounts to set: 5 accounts
Account details: [{id: "...", code: "1000", name: "Cash", ...}, ...]
Setting accounts state with 5 items
Successfully loaded 5 accounts for agency: [uuid]
Rendering Select with accounts: 5 [...]
Rendering 5 valid accounts in SelectContent
Rendering SelectItem: {accountId: "...", displayText: "1000 - Cash"}
...
```

## If Still Not Working

1. **Check Network Tab:** Look for the API call to `/database/query` and check the response
2. **Check Response:** Verify the SQL query is correct and returns data
3. **Check React DevTools:** Inspect the `accounts` state in React DevTools
4. **Try Hardcoded Test:** Temporarily add a test account to verify Select works:

```tsx
// Temporary test - add after setAccounts
useEffect(() => {
  if (accounts.length === 0 && !accountsLoading) {
    console.log('TEST: Setting test account');
    setAccounts([{
      id: 'test-1',
      account_code: 'TEST',
      account_name: 'Test Account',
      is_active: true,
      agency_id: agencyId
    }]);
  }
}, [accounts.length, accountsLoading]);
```

## Next Steps

1. Open browser console (F12)
2. Navigate to Create Journal Entry page
3. Check console logs for the fetch process
4. Check the debug panel (if in dev mode)
5. Click refresh button to retry
6. Share the console output if still not working
