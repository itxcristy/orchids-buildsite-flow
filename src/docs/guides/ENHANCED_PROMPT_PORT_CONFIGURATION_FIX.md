# TASK: Comprehensive Port Configuration Standardization - Eliminate All Hardcoded Ports

## CONTEXT ANALYSIS REQUIRED

Before implementing any changes, you must:

1. **Examine the following files and understand their current port usage:**

   **Environment Configuration:**
   - `.env` - Current environment variables for ports
   
   - `docker-compose.yml` - Docker port mappings and environment variables
   - `.env.example` (if exists) - Example environment configuration

   **Frontend Configuration:**
   - `vite.config.ts` - Vite dev server port and proxy configuration
   - `src/config/api.ts` - API URL construction with hardcoded ports
   - `src/config/env.ts` - Environment variable validation
   - `src/integrations/postgresql/client-http.ts` - HTTP client using API URLs
   - `nginx.conf` - Nginx configuration with hardcoded backend port

   **Backend Configuration:**
   - `server/index.js` - Main server entry point
   - `server/config/constants.js` - Port and database URL constants
   - `server/config/middleware.js` - CORS configuration with hardcoded origins
   - `server/services/websocketService.js` - WebSocket CORS with hardcoded origins
   - `server/routes/sso.js` - SSO redirect URLs with hardcoded ports
   - `server/routes/api-docs.js` - API documentation URL with hardcoded port
   - `server/Dockerfile` - Health check with hardcoded port
   - `server/utils/schemaValidator.js` - Database connection with port parsing
   - `server/utils/poolManager.js` - Database pool configuration with port parsing
   - `server/services/databaseService.js` - Database URL construction
   - `server/middleware/authMiddleware.js` - Database connection URLs

   **Docker Configuration:**
   - `docker-compose.yml` - Port mappings, environment variables, health checks
   - `Dockerfile` (root) - Frontend build configuration
   - `server/Dockerfile` - Backend build configuration

   **Documentation Files (for reference):**
   - `docs/deployment/*.md` - Deployment documentation mentioning ports
   - `DOCKER_BUILD_FIX_SERVER.md` - Docker deployment issues
   - `docs/deployment/PRODUCTION_DEPLOY.md` - Production deployment guide

2. **Understand the current architecture:**
   - **Frontend:** React 18.3.1 with Vite, served by nginx in production
   - **Backend:** Express.js on Node.js
   - **Database:** PostgreSQL
   - **Cache:** Redis
   - **Deployment:** Docker Compose on Hostinger VPS
   - **Port Usage:**
     - Frontend Dev: 5173 (Vite default)
     - Frontend Prod: 80 (nginx)
     - Backend API: 3000
     - PostgreSQL: 5432
     - Redis: 6379
     - SMTP: 2525 (Mailtrap)

3. **Identify all hardcoded port references:**
   - Search for patterns: `:3000`, `:5173`, `:5432`, `:6379`, `:80`, `:8080`, `localhost:3000`, `localhost:5173`
   - Check for port numbers in strings, URLs, connection strings, health checks
   - Identify port usage in comments, error messages, documentation strings

## DETAILED REQUIREMENTS

### Primary Objective

Eliminate ALL hardcoded ports throughout the entire codebase and replace them with environment variable references. Ensure consistent port configuration across:
- Development environment
- Production environment
- Docker containers
- Health checks
- CORS configurations
- API URLs
- Database connection strings
- WebSocket connections
- Documentation and error messages

### Port Configuration Standard

**Required Environment Variables:**

```env
# Frontend Ports
VITE_DEV_PORT=5173                    # Vite dev server port
FRONTEND_PORT=80                      # Production frontend port (nginx)

# Backend Ports
PORT=3000                             # Backend API server port
BACKEND_PORT=3000                     # Alternative name for consistency

# Database Ports
POSTGRES_PORT=5432                    # PostgreSQL port
DATABASE_PORT=5432                   # Alternative name

# Redis Ports
REDIS_PORT=6379                       # Redis port

# SMTP Ports
SMTP_PORT=2525                        # SMTP server port

# API URLs (should use PORT, not hardcoded)
VITE_API_URL=http://localhost:3000/api  # Development (uses PORT)
# Production: http://dezignbuild.site:3000/api or https://dezignbuild.site/api
```

### Specific Implementation Details

#### 1. Frontend Configuration Fixes

**1.1 `vite.config.ts` - Vite Dev Server Configuration:**
- ❌ **CURRENT:** Hardcoded `port: 5173` and `target: 'http://localhost:3000'`
- ✅ **REQUIRED:**
  - Use `process.env.VITE_DEV_PORT || 5173` for dev server port
  - Use `process.env.VITE_API_URL` or construct from `process.env.PORT || 3000` for proxy target
  - Ensure proxy target respects environment (dev vs production)

**1.2 `src/config/api.ts` - API URL Construction:**
- ❌ **CURRENT:** Hardcoded `localhost:3000` in multiple fallback cases
- ✅ **REQUIRED:**
  - Extract port from `VITE_API_URL` environment variable
  - Use `process.env.PORT || 3000` as fallback (for SSR/Node.js contexts)
  - Remove all hardcoded `:3000` references
  - Use environment-aware port detection

**1.3 `nginx.conf` - Nginx Proxy Configuration:**
- ❌ **CURRENT:** Hardcoded `proxy_pass http://backend:3000;`
- ✅ **REQUIRED:**
  - Use environment variable for backend port: `proxy_pass http://backend:${BACKEND_PORT};`
  - Or use Docker service name with port from environment
  - Ensure nginx can access environment variables (may need envsubst in Dockerfile)

#### 2. Backend Configuration Fixes

**2.1 `server/config/constants.js` - Server Constants:**
- ❌ **CURRENT:** Hardcoded `PORT || 3000` and `localhost:5432` in DATABASE_URL default
- ✅ **REQUIRED:**
  - `PORT` should use `process.env.PORT || process.env.BACKEND_PORT || 3000`
  - `DATABASE_URL` default should use `process.env.POSTGRES_PORT || 5432` for port
  - Extract database port from `DATABASE_URL` if provided, otherwise use `POSTGRES_PORT`

**2.2 `server/config/middleware.js` - CORS Configuration:**
- ❌ **CURRENT:** Hardcoded CORS origins: `'http://localhost:5173'`, `'http://localhost:5174'`, `'http://localhost:3000'`
- ✅ **REQUIRED:**
  - Build CORS origins dynamically from environment variables:
    - `process.env.VITE_DEV_PORT || 5173` for dev frontend
    - `process.env.PORT || 3000` for backend
    - `process.env.CORS_ORIGINS` (comma-separated) for additional origins
  - Parse `CORS_ORIGINS` environment variable and merge with dynamic origins
  - Support both development and production origins

**2.3 `server/services/websocketService.js` - WebSocket CORS:**
- ❌ **CURRENT:** Hardcoded CORS origins similar to middleware
- ✅ **REQUIRED:**
  - Use same dynamic CORS origin construction as middleware
  - Ensure WebSocket connections work with environment-based ports

**2.4 `server/routes/sso.js` - SSO Redirect URLs:**
- ❌ **CURRENT:** Hardcoded `'http://localhost:5173'` in redirect URI
- ✅ **REQUIRED:**
  - Use `process.env.FRONTEND_URL` or construct from `VITE_DEV_PORT`/`FRONTEND_PORT`
  - Support both development and production frontend URLs

**2.5 `server/routes/api-docs.js` - API Documentation URL:**
- ❌ **CURRENT:** Hardcoded `'http://localhost:3000'` in Swagger config
- ✅ **REQUIRED:**
  - Use `process.env.API_URL` or construct from `PORT` environment variable
  - Support both development and production URLs

**2.6 `server/Dockerfile` - Health Check:**
- ❌ **CURRENT:** Hardcoded `'http://localhost:3000/api/health'` in health check
- ✅ **REQUIRED:**
  - Use `ARG PORT=3000` and `ENV PORT=$PORT` in Dockerfile
  - Use `http://localhost:${PORT}/api/health` in health check

**2.7 Database Connection Files:**
- **`server/utils/schemaValidator.js`:**
  - ❌ **CURRENT:** Hardcoded `'5432'` in port parsing: `parseInt(dbConfig.port || '5432', 10)`
  - ✅ **REQUIRED:** Use `process.env.POSTGRES_PORT || 5432` as fallback

- **`server/utils/poolManager.js`:**
  - ❌ **CURRENT:** Hardcoded `port: 5432` in default database config
  - ✅ **REQUIRED:** Use `process.env.POSTGRES_PORT || 5432`

- **`server/services/databaseService.js`:**
  - ❌ **CURRENT:** Port extracted from `DATABASE_URL` but may have hardcoded fallbacks
  - ✅ **REQUIRED:** Ensure all port references use environment variables

- **`server/middleware/authMiddleware.js`:**
  - ❌ **CURRENT:** Port in database URL construction may be hardcoded
  - ✅ **REQUIRED:** Use environment variable for port

#### 3. Docker Configuration Fixes

**3.1 `docker-compose.yml` - Port Mappings and Environment:**
- ❌ **CURRENT:** Hardcoded port mappings: `"3000:3000"`, `"5432:5432"`, `"6379:6379"`, `"80:80"`
- ✅ **REQUIRED:**
  - Use environment variables for port mappings:
    - `"${BACKEND_PORT:-3000}:${BACKEND_PORT:-3000}"`
    - `"${POSTGRES_PORT:-5432}:${POSTGRES_PORT:-5432}"`
    - `"${REDIS_PORT:-6379}:${REDIS_PORT:-6379}"`
    - `"${FRONTEND_PORT:-80}:80"` (internal nginx always uses 80)
  - Update health checks to use environment variables
  - Ensure all service environment variables reference port env vars

**3.2 `Dockerfile` (Root) - Frontend Build:**
- ❌ **CURRENT:** May have hardcoded ports in build args
- ✅ **REQUIRED:**
  - Use `ARG` for build-time port configuration if needed
  - Ensure `VITE_API_URL` build arg uses port from environment

**3.3 `server/Dockerfile` - Backend Build:**
- ❌ **CURRENT:** Health check has hardcoded port
- ✅ **REQUIRED:**
  - Use `ARG PORT=3000` and `ENV PORT=$PORT`
  - Update health check to use `$PORT`

#### 4. Documentation and Error Messages

**4.1 Error Messages and User-Facing Text:**
- ❌ **CURRENT:** Error messages may reference hardcoded ports (e.g., "Server running on port 3000")
- ✅ **REQUIRED:**
  - Use dynamic port values in error messages
  - Reference environment variables in user guidance

**4.2 Code Comments:**
- ❌ **CURRENT:** Comments may reference hardcoded ports
- ✅ **REQUIRED:**
  - Update comments to reference environment variables
  - Add documentation about port configuration

### Technical Constraints

- **Must maintain:**
  - Backward compatibility (default values should match current hardcoded values)
  - Docker Compose functionality
  - Development workflow (Vite dev server, hot reload)
  - Production deployment (nginx, backend API)
  - Health checks functionality

- **Must follow:**
  - Environment variable naming conventions (existing `VITE_*` for frontend, `PORT` for backend)
  - Docker best practices for port configuration
  - Existing code patterns and structure

- **Performance requirements:**
  - No performance impact from environment variable lookups
  - Port resolution should be cached where appropriate

### Error Handling Requirements

- **Environment variable validation:**
  - Validate port numbers are integers in valid range (1-65535)
  - Provide clear error messages if invalid ports are configured
  - Fall back to sensible defaults if environment variables are missing

- **Port parsing:**
  - Handle port extraction from URLs correctly
  - Handle missing ports in connection strings
  - Validate port format before use

- **Configuration errors:**
  - Log warnings for missing environment variables (use defaults)
  - Log errors for invalid port values
  - Provide helpful error messages for misconfiguration

### Data Validation

- **Port number validation:**
  - Must be integer between 1 and 65535
  - Must not be reserved system ports (unless explicitly allowed)
  - Must be consistent across related services (e.g., frontend proxy target matches backend port)

- **URL validation:**
  - Validate `VITE_API_URL` format
  - Extract and validate port from URLs
  - Ensure URLs are properly formatted

## INTEGRATION REQUIREMENTS

### Files to Modify

1. **`vite.config.ts`**
   - Replace hardcoded `port: 5173` with `port: parseInt(process.env.VITE_DEV_PORT || '5173', 10)`
   - Replace hardcoded `target: 'http://localhost:3000'` with dynamic port from environment
   - Construct proxy target from `VITE_API_URL` or `process.env.PORT`

2. **`src/config/api.ts`**
   - Remove all hardcoded `:3000` references
   - Extract port from `VITE_API_URL` environment variable
   - Use `process.env.PORT || 3000` as fallback for Node.js contexts
   - Update `getApiRoot()` to use environment-based port detection

3. **`nginx.conf`**
   - Replace `proxy_pass http://backend:3000;` with environment variable
   - Use `envsubst` in Dockerfile to substitute environment variables, OR
   - Use nginx template with environment variable substitution

4. **`server/config/constants.js`**
   - Update `PORT` to use `process.env.PORT || process.env.BACKEND_PORT || 3000`
   - Update `DATABASE_URL` default to use `process.env.POSTGRES_PORT || 5432` for port
   - Add helper function to extract port from `DATABASE_URL` or use `POSTGRES_PORT`

5. **`server/config/middleware.js`**
   - Replace hardcoded CORS origins with dynamic construction
   - Build origins from environment variables:
     ```javascript
     const devPort = process.env.VITE_DEV_PORT || 5173;
     const backendPort = process.env.PORT || 3000;
     const corsOrigins = [
       `http://localhost:${devPort}`,
       `http://localhost:${backendPort}`,
       ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [])
     ];
     ```

6. **`server/services/websocketService.js`**
   - Apply same CORS origin construction as middleware
   - Ensure WebSocket connections use environment-based ports

7. **`server/routes/sso.js`**
   - Replace hardcoded `'http://localhost:5173'` with:
     ```javascript
     const frontendUrl = process.env.FRONTEND_URL || 
       `http://localhost:${process.env.VITE_DEV_PORT || 5173}`;
     ```

8. **`server/routes/api-docs.js`**
   - Replace hardcoded `'http://localhost:3000'` with:
     ```javascript
     const apiUrl = process.env.API_URL || 
       `http://localhost:${process.env.PORT || 3000}`;
     ```

9. **`server/Dockerfile`**
   - Add `ARG PORT=3000` and `ENV PORT=$PORT`
   - Update health check to use `$PORT`:
     ```dockerfile
     HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
       CMD node -e "require('http').get('http://localhost:' + process.env.PORT + '/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
     ```

10. **`server/utils/schemaValidator.js`**
    - Replace `'5432'` hardcoded fallback with `process.env.POSTGRES_PORT || 5432`
    - Update all port parsing to use environment variable

11. **`server/utils/poolManager.js`**
    - Replace `port: 5432` default with `port: parseInt(process.env.POSTGRES_PORT || '5432', 10)`
    - Update `parseDatabaseUrl()` to use environment variable fallback

12. **`server/services/databaseService.js`**
    - Ensure all port references use environment variables
    - Update database URL construction to use `POSTGRES_PORT`

13. **`server/middleware/authMiddleware.js`**
    - Update database URL construction to use environment variable for port

14. **`docker-compose.yml`**
    - Update port mappings to use environment variables:
      ```yaml
      ports:
        - "${BACKEND_PORT:-3000}:${BACKEND_PORT:-3000}"
        - "${POSTGRES_PORT:-5432}:${POSTGRES_PORT:-5432}"
        - "${REDIS_PORT:-6379}:${REDIS_PORT:-6379}"
        - "${FRONTEND_PORT:-80}:80"
      ```
    - Update health checks to use environment variables
    - Ensure all service environment variables reference port env vars

15. **`.env` file (update with new variables):**
    - Add `VITE_DEV_PORT=5173`
    - Add `FRONTEND_PORT=80`
    - Add `BACKEND_PORT=3000` (or use existing `PORT`)
    - Add `POSTGRES_PORT=5432`
    - Add `DATABASE_PORT=5432` (alias)
    - Add `REDIS_PORT=6379`
    - Ensure `VITE_API_URL` uses port from environment (or construct dynamically)

### Files to Create (if needed)

1. **`server/config/ports.js`** (Optional - Centralized Port Configuration):
   - Centralize all port configuration logic
   - Export port constants with environment variable fallbacks
   - Provide validation functions
   - Example:
     ```javascript
     module.exports = {
       FRONTEND_DEV: parseInt(process.env.VITE_DEV_PORT || '5173', 10),
       FRONTEND_PROD: parseInt(process.env.FRONTEND_PORT || '80', 10),
       BACKEND: parseInt(process.env.PORT || process.env.BACKEND_PORT || '3000', 10),
       POSTGRES: parseInt(process.env.POSTGRES_PORT || '5432', 10),
       REDIS: parseInt(process.env.REDIS_PORT || '6379', 10),
       SMTP: parseInt(process.env.SMTP_PORT || '2525', 10),
     };
     ```

### Dependencies/Imports

- **No new dependencies required** - Use existing Node.js `process.env`
- **For nginx environment variable substitution:**
  - May need `envsubst` in Dockerfile (usually available in nginx images)
  - Or use nginx template approach

### State Management

- **Port configuration is static** - No state management needed
- **Environment variables are read at startup** - No runtime changes needed
- **Cache port values** - Read once and reuse (already done in most cases)

## CODE QUALITY REQUIREMENTS

### Type Safety

- **TypeScript files:**
  - Type port numbers as `number`
  - Validate port ranges (1-65535)
  - Use type guards for port validation

- **JavaScript files:**
  - Use `parseInt()` with radix for port parsing
  - Validate port numbers before use
  - Handle NaN cases gracefully

### Code Style

- **Follow existing patterns:**
  - Use `process.env.VARIABLE || 'default'` pattern
  - Use `parseInt(..., 10)` for port parsing
  - Maintain consistent naming (PORT, BACKEND_PORT, etc.)

- **Error handling:**
  - Validate ports are in valid range
  - Provide helpful error messages
  - Log warnings for missing environment variables

### Best Practices

- **Environment variable defaults:**
  - Always provide sensible defaults matching current hardcoded values
  - Document default values in code comments
  - Use `.env.example` file to document required variables

- **Port validation:**
  - Validate port numbers are integers
  - Validate port range (1-65535)
  - Warn about potentially problematic ports (system ports)

- **Configuration centralization:**
  - Consider creating `server/config/ports.js` for centralized port configuration
  - Reuse port configuration across files
  - Avoid duplicating port parsing logic

## VERIFICATION CHECKLIST

Before considering the port configuration complete, verify:

### Environment Variable Configuration
- [ ] All required port environment variables are defined in `.env`
- [ ] `.env.example` (if exists) documents all port variables
- [ ] Default values match current hardcoded values
- [ ] Port variables are properly named and consistent

### Frontend Configuration
- [ ] `vite.config.ts` uses environment variables for dev server port
- [ ] `vite.config.ts` uses environment variables for proxy target
- [ ] `src/config/api.ts` has no hardcoded ports
- [ ] API URL construction uses environment variables
- [ ] Frontend works in both development and production

### Backend Configuration
- [ ] `server/config/constants.js` uses environment variables for PORT
- [ ] `server/config/constants.js` uses environment variables for DATABASE_URL port
- [ ] `server/config/middleware.js` builds CORS origins from environment variables
- [ ] `server/services/websocketService.js` uses environment-based CORS
- [ ] All route files use environment variables for URLs
- [ ] Health checks use environment variables

### Database Configuration
- [ ] All database connection files use `POSTGRES_PORT` environment variable
- [ ] Port parsing in `schemaValidator.js` uses environment variable
- [ ] Port parsing in `poolManager.js` uses environment variable
- [ ] Database URLs are constructed with environment-based ports

### Docker Configuration
- [ ] `docker-compose.yml` port mappings use environment variables
- [ ] `docker-compose.yml` health checks use environment variables
- [ ] `server/Dockerfile` uses `ARG PORT` and `ENV PORT`
- [ ] `nginx.conf` uses environment variables (or template approach)
- [ ] Docker containers start with correct ports

### Testing
- [ ] Development environment works with default ports
- [ ] Development environment works with custom ports (via .env)
- [ ] Production Docker deployment works
- [ ] Health checks pass with environment-based ports
- [ ] CORS works with environment-based origins
- [ ] API URLs resolve correctly in all environments
- [ ] Database connections work with environment-based ports

### Code Quality
- [ ] No hardcoded port numbers remain in codebase
- [ ] All port references use environment variables
- [ ] Port validation is implemented
- [ ] Error messages are helpful and accurate
- [ ] Code comments reference environment variables

## COMMON PITFALLS TO AVOID

- **Don't:**
  - Remove hardcoded values without providing environment variable fallbacks
  - Break backward compatibility (defaults must match current values)
  - Use different port variable names inconsistently
  - Forget to update Docker health checks
  - Hardcode ports in error messages or user-facing text
  - Assume ports are always the same across environments

- **Do:**
  - Provide sensible defaults for all port environment variables
  - Validate port numbers before use
  - Use consistent naming (PORT, BACKEND_PORT, POSTGRES_PORT, etc.)
  - Test with different port configurations
  - Document port configuration in `.env.example`
  - Update all related files (not just some)

## EXPECTED OUTPUT

Provide:
1. **Complete implementation:**
   - All modified files with environment variable usage
   - Updated `.env` file with new port variables
   - Updated `.env.example` (if exists) with documentation
   - Updated `docker-compose.yml` with environment variable port mappings

2. **Port configuration documentation:**
   - List of all port environment variables
   - Default values for each port
   - How to configure ports for different environments
   - Port configuration for Docker deployment

3. **Testing results:**
   - Verification that development works with default ports
   - Verification that custom ports work via environment variables
   - Verification that Docker deployment works
   - Verification that all services connect correctly

## SUCCESS CRITERIA

The port configuration is successful when:
- ✅ **Zero hardcoded ports remain** in the codebase (except in comments/documentation)
- ✅ **All ports use environment variables** with sensible defaults
- ✅ **Development environment works** with default ports
- ✅ **Custom ports work** when configured via environment variables
- ✅ **Docker deployment works** with environment-based port configuration
- ✅ **All services connect correctly** (frontend → backend → database)
- ✅ **Health checks pass** with environment-based ports
- ✅ **CORS works** with environment-based origins
- ✅ **No breaking changes** - existing deployments continue to work
- ✅ **Port configuration is documented** in `.env.example` and code comments

---

**Priority:** 🔴 **CRITICAL** - Port inconsistencies cause deployment failures and connection errors.

**Estimated Impact:** This will eliminate all port-related errors and make the system truly environment-agnostic, allowing seamless deployment across different environments (development, staging, production) with different port configurations.
