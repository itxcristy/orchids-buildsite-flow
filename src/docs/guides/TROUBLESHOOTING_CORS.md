# Troubleshooting CORS and Connection Issues

## Problem: "CORS request did not succeed" or "Unable to reach the API server"

This error typically means the backend server is not running or not accessible.

## Quick Fixes

### 1. Start the Backend Server

The backend server must be running for the frontend to work. Start it in a separate terminal:

```bash
# Navigate to server directory
cd server

# Start the server
npm start

# OR for development with auto-reload
npm run dev
```

You should see:
```
🚀 Server running on port 3000
📊 Database: localhost:5432/buildflow_db
✅ Redis cache initialized
```

### 2. Verify Server is Running

Test if the server is accessible:

```bash
# In a browser or terminal
curl http://localhost:3000/health

# Should return:
# {"status":"ok","timestamp":"...","services":{...}}
```

### 3. Check Port Conflicts

If port 3000 is already in use:

```bash
# Windows (PowerShell)
netstat -ano | findstr :3000

# Kill the process if needed, or change PORT in .env
```

### 4. Verify Environment Variables

Make sure your `.env` file has:

```bash
VITE_API_URL=http://localhost:3000/api
```

### 5. Check CORS Configuration

The server is configured to allow all origins in development. If `CORS_ORIGINS` is empty in `.env`, all origins are allowed.

To explicitly allow your frontend:

```bash
# In .env
CORS_ORIGINS=http://localhost:8080,http://localhost:5173
```

## Common Issues

### Issue: Server Crashes on Startup

**Check:**
1. Database is running: `psql -U postgres -d buildflow_db -c "SELECT 1;"`
2. All dependencies installed: `cd server && npm install`
3. Check server logs for specific error messages

### Issue: "Connection Refused"

**Solutions:**
1. Ensure server is running on port 3000
2. Check firewall settings
3. Verify no other service is using port 3000

### Issue: CORS Still Blocking

**Solutions:**
1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. Check browser console for specific CORS error
4. Verify server logs show CORS middleware is active

### Issue: Frontend on Different Port

If your frontend runs on a different port (e.g., 5173 for Vite), make sure:

1. Server allows that origin (should be automatic in dev)
2. `VITE_API_URL` is correctly set
3. No proxy configuration conflicts

## Development Workflow

### Terminal 1: Backend Server
```bash
cd server
npm run dev
```

### Terminal 2: Frontend
```bash
npm run dev
```

Both should be running simultaneously.

## Production Checklist

For production deployment:

1. Set explicit `CORS_ORIGINS` with your production domain
2. Use HTTPS for both frontend and backend
3. Verify environment variables are set correctly
4. Test API connectivity before deploying

## Still Having Issues?

1. Check server logs for errors
2. Verify database connection
3. Test with `curl` or Postman
4. Check browser Network tab for request details
5. Verify no antivirus/firewall blocking localhost connections
