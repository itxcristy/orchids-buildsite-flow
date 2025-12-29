# Rate Limiter Fix - System Health Endpoint

**Date:** 2024-12-19  
**Issue:** Rate limiting too aggressive, blocking system-health and database query endpoints

---

## Problem

The rate limiter was set to 100 requests per 15 minutes, which was too restrictive for normal application usage. The frontend makes multiple requests on page load:
- System health checks (frequent polling)
- Database queries (multiple per page)
- Other API calls

This caused 429 (Too Many Requests) errors.

---

## Solution

### Changes Made:

1. **Increased Rate Limit:**
   - Changed from 100 to 300 requests per 15 minutes
   - More reasonable for normal application usage

2. **Excluded System Health Endpoints:**
   - `/api/system-health` and all sub-paths are now excluded from rate limiting
   - System health monitoring needs frequent updates

3. **Improved Skip Function:**
   - Better path matching logic
   - Handles both `/health` and `/api/health` endpoints
   - Properly excludes all system-health routes

---

## Updated Configuration

```javascript
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Increased from 100 to 300
  skip: (req) => {
    const path = req.path || req.url || '';
    const fullPath = path.startsWith('/') ? path : `/${path}`;
    
    // Skip for health endpoints
    if (fullPath === '/health' || fullPath === '/api/health') {
      return true;
    }
    
    // Skip for system-health endpoints
    if (fullPath.includes('/system-health')) {
      return true;
    }
    
    return false;
  },
});
```

---

## Endpoints Excluded from Rate Limiting

- `/health` - Basic health check
- `/api/health` - API health check
- `/api/system-health` - System health monitoring (and all sub-paths)

---

## Rate Limits Summary

| Endpoint Type | Rate Limit | Window |
|--------------|------------|--------|
| General API | 300 requests | 15 minutes |
| Authentication | 5 attempts | 15 minutes |
| Password Reset | 3 requests | 1 hour |
| File Upload | 50 uploads | 1 hour |
| Two-Factor Auth | 10 attempts | 15 minutes |
| System Health | **Unlimited** | - |

---

## Testing

After the fix:
1. System health page should load without 429 errors
2. Database queries should work normally
3. Rate limiting still protects against abuse
4. Authentication endpoints still have strict limits

---

## Status

✅ **FIXED** - Rate limiter adjusted and system-health excluded

**Next Steps:**
- Monitor rate limit effectiveness
- Adjust limits if needed based on usage patterns
- Consider user-based rate limiting for authenticated users

