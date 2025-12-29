# Super Admin Dashboard Guide

## Overview

The Super Admin Dashboard is the central control panel for managing the entire BuildFlow ERP platform. It's accessible only to users with the `super_admin` role in the main database (`buildflow_db`).

## Database: buildflow_db

The super admin dashboard uses the **main database** (`buildflow_db`), not agency databases. This database contains:

### Key Tables for Super Admin

1. **`users`** - System-level user accounts
2. **`user_roles`** - Role assignments (super_admin role stored here with `agency_id = NULL`)
3. **`profiles`** - User profile information
4. **`system_settings`** - System-wide settings (SEO, branding, analytics, etc.)
5. **`agencies`** - All agency records
6. **`subscription_plans`** - Subscription plan definitions
7. **`plan_features`** - Feature definitions
8. **`plan_feature_mappings`** - Plan-to-feature mappings
9. **`page_catalog`** - Master catalog of available pages
10. **`agency_page_assignments`** - Pages assigned to agencies
11. **`agency_page_requests`** - Page access requests from agencies
12. **`page_recommendation_rules`** - Auto-recommendation rules
13. **`page_pricing_tiers`** - Pricing by subscription tier

## Super Admin Pages

### Main Dashboard (`/system`)
- **Overview Tab**: System metrics, revenue, platform growth, system health
- **Agencies Tab**: Manage all agencies, view agency details, activate/deactivate
- **Analytics Tab**: Platform-wide analytics and charts
- **Monitoring Tab**: Real-time usage, support tickets
- **Settings Tab**: 
  - System Settings (Identity, Branding, SEO, Analytics, Ads, Other)
  - Agency Settings management
  - Plan Management
  - Page Catalog Management
  - Page Request Management

### Other Super Admin Pages
- `/system-health` - System health monitoring
- `/email-testing` - Email service testing
- `/permissions` - Advanced permissions management
- `/agency/:agencyId/super-admin-dashboard` - Agency-specific super admin view

## How to Login

### Step 1: Create Super Admin User

If you don't have a super admin user, create one using one of these methods:

#### Method 1: Using Docker (Recommended)

```bash
# Make script executable (Linux/Mac)
chmod +x scripts/create_super_admin.sh

# Run the script
./scripts/create_super_admin.sh
```

Or on Windows:
```cmd
scripts\create_super_admin.bat
```

#### Method 2: Using SQL Migration

```bash
# Connect to PostgreSQL container
docker compose exec postgres psql -U postgres -d buildflow_db

# Or run migration file
docker compose exec -T postgres psql -U postgres -d buildflow_db -f database/migrations/13_create_super_admin.sql
```

#### Method 3: Manual SQL

```sql
-- Connect to buildflow_db
\c buildflow_db

-- Create super admin user
INSERT INTO public.users (email, password_hash, email_confirmed, email_confirmed_at, is_active)
VALUES (
  'super@buildflow.local',
  crypt('super123', gen_salt('bf')),
  true,
  now(),
  true
) ON CONFLICT (email) DO NOTHING;

-- Get user ID and create profile
DO $$
DECLARE
  admin_id UUID;
BEGIN
  SELECT id INTO admin_id FROM public.users WHERE email = 'super@buildflow.local';
  
  IF admin_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, user_id, full_name, is_active)
    VALUES (gen_random_uuid(), admin_id, 'Super Administrator', true)
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO public.user_roles (user_id, role, agency_id)
    VALUES (admin_id, 'super_admin'::public.app_role, NULL)
    ON CONFLICT (user_id, role, agency_id) DO NOTHING;
  END IF;
END $$;
```

### Step 2: Login to Application

1. Navigate to: `http://localhost:8080/auth`
2. Enter credentials:
   - **Email**: `super@buildflow.local`
   - **Password**: `super123`
3. Click "Sign In"

### Step 3: Access System Dashboard

After login, navigate to: `http://localhost:8080/system`

Or click on "System Dashboard" in the sidebar (if you have super_admin role).

## Default Super Admin Credentials

| Email | Password | Role |
|-------|----------|------|
| `super@buildflow.local` | `super123` | Super Admin |

**⚠️ IMPORTANT**: Change the default password in production!

## Making Changes from Super Admin Dashboard

### System Settings

1. Go to `/system` → **Settings** tab
2. Click on **System Settings** card
3. Configure:
   - **Identity**: System name, tagline, description, language, timezone
   - **Branding**: Logos (main, favicon, login, email)
   - **SEO**: Meta tags, Open Graph, Twitter Cards
   - **Analytics**: Google Analytics, GTM, Facebook Pixel, custom tracking
   - **Advertising**: Ad network settings and placement
   - **Other**: Contact info, social media, legal links, maintenance mode
4. Click **Save Changes**

### Agency Management

1. Go to `/system` → **Agencies** tab
2. View all agencies
3. Click on an agency to:
   - View details
   - Activate/Deactivate
   - Manage subscription
   - View users and usage

### Plan Management

1. Go to `/system` → **Settings** tab → **Plan Management**
2. Create/edit subscription plans
3. Manage plan features
4. Set pricing tiers

### Page Catalog

1. Go to `/system` → **Settings** tab → **Page Catalog Management**
2. Manage available pages
3. Set page recommendations
4. Configure pricing tiers

## Docker Setup

### Environment Variables

You can customize the super admin creation by setting environment variables:

```bash
export SUPER_ADMIN_EMAIL="admin@yourcompany.com"
export SUPER_ADMIN_PASSWORD="YourSecurePassword123"
export SUPER_ADMIN_NAME="Your Name"
```

Then run the script:
```bash
./scripts/create_super_admin.sh
```

### Docker Compose Integration

Add to your `docker-compose.yml`:

```yaml
services:
  postgres:
    # ... existing config ...
    environment:
      - POSTGRES_DB=buildflow_db
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=admin
    volumes:
      - ./database/migrations:/docker-entrypoint-initdb.d
      # This will auto-run migrations including super admin creation
```

## Troubleshooting

### Cannot Access System Dashboard

1. **Check user role**: Ensure you have `super_admin` role in `user_roles` table with `agency_id = NULL`
2. **Check database**: Make sure you're authenticated against `buildflow_db`, not an agency database
3. **Check authentication**: Verify JWT token includes super_admin role

### User Not Found

1. **Verify user exists**: 
   ```sql
   SELECT * FROM public.users WHERE email = 'super@buildflow.local';
   ```

2. **Check role assignment**:
   ```sql
   SELECT * FROM public.user_roles WHERE user_id = (SELECT id FROM users WHERE email = 'super@buildflow.local');
   ```

3. **Recreate user**: Run the creation script again

### Foreign Key Errors

- The system settings table no longer requires foreign keys to users table
- `created_by` and `updated_by` can be NULL for agency database users
- Super admins from main database will have these fields populated

## Security Notes

1. **Change Default Password**: Always change the default password in production
2. **Use Strong Passwords**: Use complex passwords for super admin accounts
3. **Limit Access**: Only grant super_admin role to trusted personnel
4. **Monitor Activity**: Review audit logs regularly
5. **Database Isolation**: Super admin operations use main database, not agency databases

## Quick Reference

| Action | URL | Method |
|--------|-----|--------|
| Login | `/auth` | GET |
| System Dashboard | `/system` | GET |
| System Settings | `/system` (Settings tab) | GET |
| Update Settings | `/api/system/settings` | PUT |
| Get Settings | `/api/system/settings` | GET |
| Agency Management | `/system` (Agencies tab) | GET |

## Support

For issues or questions:
1. Check logs: `docker compose logs backend`
2. Verify database connection
3. Check user role in database
4. Review authentication middleware logs

