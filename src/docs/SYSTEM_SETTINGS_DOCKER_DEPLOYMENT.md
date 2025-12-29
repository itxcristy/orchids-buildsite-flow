# System Settings - Docker Production Deployment

## ✅ Implementation Complete

The system settings feature is **fully Docker-compatible** and production-ready.

## 📋 What Was Implemented

1. **Database Migration** (`database/migrations/12_system_settings_schema.sql`)
   - Creates `system_settings` table with all configuration fields
   - Idempotent (safe to run multiple times)
   - Docker-compatible (runs automatically on first database init)

2. **Backend API** (`server/routes/system.js`)
   - `GET /api/system/settings` - Fetch settings (super admin only)
   - `PUT /api/system/settings` - Update settings (super admin only)
   - Auto-creates schema if missing (works for existing databases)

3. **Frontend Component** (`src/components/system/SystemSettings.tsx`)
   - Complete settings UI with 6 organized tabs
   - Integrated into System Dashboard

## 🐳 Docker Deployment

### Automatic Migration (New Databases)

When you start Docker with a fresh database, the migration runs automatically:

```bash
# The migration is mounted in docker-compose files:
volumes:
  - ./database/migrations:/docker-entrypoint-initdb.d
```

PostgreSQL automatically executes all `.sql` files in `/docker-entrypoint-initdb.d` on first initialization.

### Existing Production Databases

For **existing production databases**, the migration will NOT run automatically (PostgreSQL only runs init scripts on first init).

**Solution**: The backend automatically handles this! The `ensureSystemSettingsSchema()` function is called every time the settings endpoints are accessed, which:
- Creates the table if it doesn't exist
- Creates indexes and triggers
- Inserts default settings if none exist

**No manual migration needed** - just access the System Settings page in the dashboard!

### Manual Migration (Optional)

If you want to run the migration manually in Docker:

```bash
# Connect to PostgreSQL container
docker compose exec postgres psql -U postgres -d buildflow_db

# Or run migration file directly
docker compose exec -T postgres psql -U postgres -d buildflow_db -f /docker-entrypoint-initdb.d/12_system_settings_schema.sql

# Or from host machine
docker compose exec postgres psql -U postgres -d buildflow_db < database/migrations/12_system_settings_schema.sql
```

## 🚀 Deployment Steps

### 1. Build and Deploy

```bash
# Build images
docker compose -f docker-compose.hostinger-ready.yml build

# Start services
docker compose -f docker-compose.hostinger-ready.yml up -d

# Check logs
docker compose -f docker-compose.hostinger-ready.yml logs -f backend
```

### 2. Verify Migration

```bash
# Check if table exists
docker compose exec postgres psql -U postgres -d buildflow_db -c "\d public.system_settings"

# Check if default settings exist
docker compose exec postgres psql -U postgres -d buildflow_db -c "SELECT system_name, system_tagline FROM public.system_settings;"
```

### 3. Access Settings

1. Login as super_admin
2. Navigate to `/system` dashboard
3. Click on "Settings" tab
4. System Settings component will be at the top

The backend will automatically create the table if it doesn't exist when you access the settings page.

## 🔒 Security

- **Super Admin Only**: All endpoints require `super_admin` role
- **Authentication Required**: All requests must include valid JWT token
- **Database Isolation**: Settings stored in main database, not agency databases

## 📝 Settings Categories

1. **Identity** - System name, tagline, description, language, timezone
2. **Branding** - Logos (main, favicon, login, email)
3. **SEO** - Meta tags, Open Graph, Twitter cards
4. **Analytics** - Google Analytics, Tag Manager, Facebook Pixel, custom tracking
5. **Advertising** - Ad network settings and placement options
6. **Other** - Contact info, social media, legal links, maintenance mode

## ✅ Verification Checklist

- [x] Migration file is Docker-compatible
- [x] Backend auto-creates schema if missing
- [x] Frontend component integrated
- [x] All fields properly typed
- [x] Error handling implemented
- [x] Security (super_admin only) enforced
- [x] No linting errors

## 🎯 Status

**✅ COMPLETE AND PRODUCTION-READY**

The system settings feature is fully implemented and ready for Docker production deployment. No additional steps required - the backend will automatically handle schema creation when accessed.

