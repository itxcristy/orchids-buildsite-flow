# Fixes Applied for Service Worker and Database Issues

## Issues Fixed

### 1. Service Worker Asset Interception
**Problem**: Service Worker was intercepting `/assets/` requests causing `NS_ERROR_CORRUPTED_CONTENT` errors.

**Solution**:
- Updated Service Worker to immediately skip ALL `/assets/` requests before any other processing
- Changed cache version from `buildflow-v1` to `drena-v2` to force cache refresh
- Added aggressive early returns for all asset file types (.js, .css, .mjs, etc.)
- Added message handling for cache clearing and updates

### 2. Missing Notifications Table
**Problem**: Database queries were failing because `notifications` table doesn't exist.

**Solution**:
- Updated `ensureNotificationsTable()` to handle missing `agency_id` gracefully
- Made `agency_id` nullable initially, then update with proper values
- Added explicit notifications table repair in database route
- Created fix script: `server/scripts/fix-notifications-table.js`

### 3. Build Asset Cache Issues
**Problem**: Missing asset files (index-BvoVn2BB.js, index-BTLRXhYY.css) due to stale cache.

**Solution**:
- Service Worker now completely skips all asset requests
- Updated cache version to force refresh
- Improved development mode unregistration

## How to Apply Fixes

### For Service Worker Issues:
1. **Clear Browser Cache**:
   - Open DevTools (F12)
   - Application tab → Clear Storage → Clear site data
   - Or use: `http://localhost/clear-sw.html`

2. **Unregister Service Worker**:
   - Application tab → Service Workers → Unregister
   - Application tab → Cache Storage → Delete all

3. **Hard Refresh**:
   - Windows: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

### For Notifications Table:
The table will be automatically created on the next query attempt. If it still fails:

1. **Run the fix script**:
   ```bash
   cd server
   node scripts/fix-notifications-table.js
   ```

2. **Or manually create** (if script doesn't work):
   ```sql
   -- Connect to your database and run:
   -- The table will be created automatically on next API call
   ```

### For Build Asset Issues:
1. **Rebuild the frontend**:
   ```bash
   npm run build
   # or
   docker-compose restart frontend
   ```

2. **Clear Service Worker cache** (see above)

## Files Modified

1. `public/sw.js` - Service Worker improvements
2. `src/main.tsx` - Better SW unregistration in dev mode
3. `server/utils/schema/miscSchema.js` - Fixed notifications table creation
4. `server/routes/database.js` - Added explicit notifications table repair
5. `server/scripts/fix-notifications-table.js` - New fix script

## Testing

After applying fixes:
1. Clear browser cache and Service Worker
2. Hard refresh the page
3. Check browser console for errors
4. Verify notifications table exists in database
5. Test notification functionality

## Notes

- Service Worker only registers in production mode
- In development, it automatically unregisters
- Notifications table is created automatically on first use
- All asset requests bypass Service Worker completely

