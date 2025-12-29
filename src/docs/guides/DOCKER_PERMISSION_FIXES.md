# Docker Permission Fixes Applied

## Issues Fixed

### 1. ✅ Frontend Vite Permission Error
**Problem**: `EACCES: permission denied, open '/app/node_modules/.vite-temp/vite.config.ts.timestamp-...'`
**Root Cause**: Container runs as `nodejs` user (UID 1001) but volume mounts override permissions
**Fix Applied**:
- Changed frontend container to run as root (`user: "0:0"`) in dev mode
- Added named volume for `.vite-temp` directory
- Updated Dockerfile to create and set permissions on `.vite-temp` directory

**Files Changed**:
- `docker-compose.dev.yml`: Added `user: "0:0"` to frontend service
- `Dockerfile.dev`: Added creation and permission setup for `.vite-temp` directory
- Added `vite_temp` named volume

### 2. ✅ Backend Storage Permission Error
**Problem**: `[Files] Could not create storage directory: EACCES: permission denied, mkdir '/storage'`
**Root Cause**: Container runs as `nodejs` user but storage volume needs write access
**Fix Applied**:
- Changed backend container to run as root (`user: "0:0"`) in dev mode
- Storage volume already configured as `backend_storage_dev:/app/storage`

**Files Changed**:
- `docker-compose.dev.yml`: Added `user: "0:0"` to backend service

## Security Note

⚠️ **Running as root in development**: These changes run containers as root user in development mode for easier permission handling. This is acceptable for development but should NOT be used in production.

For production:
- Use non-root users
- Set proper volume permissions
- Use init containers or entrypoint scripts to fix permissions

## Testing

After applying these fixes:
1. Rebuild containers: `docker compose -f docker-compose.dev.yml build`
2. Restart services: `docker compose -f docker-compose.dev.yml up`
3. Verify frontend starts without permission errors
4. Verify backend can create storage directory

## Related Issues

- Frontend: Vite temp file creation
- Backend: File storage directory creation
- Both: Volume mount permission conflicts

