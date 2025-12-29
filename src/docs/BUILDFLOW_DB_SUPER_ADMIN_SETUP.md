# BuildFlow DB - Super Admin Setup Guide

## Quick Start

### 1. Create Super Admin User

**Using Docker (Recommended):**

```bash
# Linux/Mac
./scripts/create_super_admin.sh

# Windows
scripts\create_super_admin.bat
```

**Or manually via SQL:**

```bash
# Connect to database
docker compose exec postgres psql -U postgres -d buildflow_db

# Run migration
\i database/migrations/13_create_super_admin.sql
```

### 2. Login Credentials

- **Email**: `super@buildflow.local`
- **Password**: `super123`
- **Login URL**: `http://localhost:8080/auth`
- **System Dashboard**: `http://localhost:8080/system`

## BuildFlow DB Tables for Super Admin

### Core Tables

1. **`users`** - System-level user accounts
   - Stores super admin and system users
   - Located in `buildflow_db` (main database)

2. **`user_roles`** - Role assignments
   - `super_admin` role with `agency_id = NULL` = system-level admin
   - `super_admin` role with `agency_id = <uuid>` = agency-level admin

3. **`profiles`** - User profile information
   - Linked to users table

### System Management Tables

4. **`system_settings`** - System-wide configuration
   - Identity (name, tagline, description)
   - Branding (logos, favicon)
   - SEO (meta tags, Open Graph, Twitter Cards)
   - Analytics (Google Analytics, GTM, Facebook Pixel)
   - Advertising (ad network settings)
   - Other (contact info, social media, legal links, maintenance mode)

5. **`agencies`** - All agency records
   - Agency information
   - Subscription details
   - Database names

6. **`subscription_plans`** - Subscription plan definitions
   - Plan names, prices, features

7. **`plan_features`** - Feature definitions
   - Available features

8. **`plan_feature_mappings`** - Plan-to-feature mappings
   - Which features are enabled for which plans

### Page Catalog System

9. **`page_catalog`** - Master catalog of available pages
   - All pages available in the system

10. **`agency_page_assignments`** - Pages assigned to agencies
    - Which pages each agency has access to

11. **`agency_page_requests`** - Page access requests
    - Requests from agencies for additional pages

12. **`page_recommendation_rules`** - Auto-recommendation rules
    - Rules for automatically recommending pages

13. **`page_pricing_tiers`** - Pricing by subscription tier
    - Page pricing information

## Super Admin Pages

### Main Dashboard (`/system`)

**Tabs:**
1. **Overview** - System metrics, revenue, platform growth, system health
2. **Agencies** - Manage all agencies
3. **Analytics** - Platform-wide analytics and charts
4. **Monitoring** - Real-time usage, support tickets
5. **Settings** - System settings, agency settings, plans, page catalog

### Other Pages

- `/system-health` - System health monitoring
- `/email-testing` - Email service testing
- `/permissions` - Advanced permissions management

## How to Make Changes

### System Settings

1. Login as super admin
2. Go to `/system` → **Settings** tab
3. Click **System Settings**
4. Configure:
   - **Identity**: System name, tagline, description
   - **Branding**: Logos (main, favicon, login, email)
   - **SEO**: Meta tags, Open Graph, Twitter Cards
   - **Analytics**: Google Analytics, GTM, Facebook Pixel
   - **Advertising**: Ad network settings
   - **Other**: Contact info, social media, legal links
5. Click **Save Changes**

### Agency Management

1. Go to `/system` → **Agencies** tab
2. View all agencies
3. Click on an agency to manage

### Plan Management

1. Go to `/system` → **Settings** tab → **Plan Management**
2. Create/edit subscription plans
3. Manage features

## Docker Setup

The `docker-compose.yml` is already configured to:
- Mount migrations directory: `./database/migrations:/docker-entrypoint-initdb.d`
- Auto-run migrations on first startup
- Create super admin via migration `13_create_super_admin.sql`

### First Time Setup

```bash
# Start services
docker compose up -d

# Wait for services to be healthy
docker compose ps

# Verify super admin was created
docker compose exec postgres psql -U postgres -d buildflow_db -c "SELECT email, is_active FROM users WHERE email = 'super@buildflow.local';"
```

### Create Super Admin Manually

If super admin wasn't created automatically:

```bash
# Run the script
./scripts/create_super_admin.sh

# Or on Windows
scripts\create_super_admin.bat
```

## Database Connection

**Connection String:**
```
postgresql://postgres:admin@localhost:5432/buildflow_db
```

**From Docker:**
```bash
docker compose exec postgres psql -U postgres -d buildflow_db
```

## Verification

### Check Super Admin Exists

```sql
SELECT 
  u.email, 
  u.is_active, 
  ur.role, 
  ur.agency_id,
  p.full_name
FROM public.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
LEFT JOIN public.profiles p ON u.id = p.user_id
WHERE u.email = 'super@buildflow.local';
```

Expected result:
- `email`: `super@buildflow.local`
- `is_active`: `true`
- `role`: `super_admin`
- `agency_id`: `NULL` (system-level admin)
- `full_name`: `Super Administrator`

### Check System Settings Table

```sql
SELECT * FROM public.system_settings LIMIT 1;
```

## Troubleshooting

### Cannot Login

1. **Verify user exists:**
   ```sql
   SELECT * FROM public.users WHERE email = 'super@buildflow.local';
   ```

2. **Verify role assignment:**
   ```sql
   SELECT * FROM public.user_roles 
   WHERE user_id = (SELECT id FROM users WHERE email = 'super@buildflow.local');
   ```
   Should show `role = 'super_admin'` and `agency_id = NULL`

3. **Reset password:**
   ```sql
   UPDATE public.users 
   SET password_hash = crypt('super123', gen_salt('bf'))
   WHERE email = 'super@buildflow.local';
   ```

### Cannot Access System Dashboard

1. **Check authentication**: Ensure you're logged in
2. **Check role**: Verify `super_admin` role exists in `user_roles` table
3. **Check database**: Make sure you're using `buildflow_db`, not an agency database
4. **Clear browser cache**: Clear localStorage and cookies

### System Settings Not Saving

1. **Check API endpoint**: Verify `/api/system/settings` is accessible
2. **Check authentication**: Ensure you have `super_admin` role
3. **Check database**: Verify `system_settings` table exists
4. **Check logs**: `docker compose logs backend`

## Security Notes

⚠️ **IMPORTANT**: 
- Change default password in production
- Use strong passwords
- Limit super_admin role to trusted personnel
- Monitor access logs

## Quick Commands

```bash
# Create super admin
./scripts/create_super_admin.sh

# Check if super admin exists
docker compose exec postgres psql -U postgres -d buildflow_db -c "SELECT email FROM users WHERE email = 'super@buildflow.local';"

# View all super admins
docker compose exec postgres psql -U postgres -d buildflow_db -c "SELECT u.email, ur.role FROM users u JOIN user_roles ur ON u.id = ur.user_id WHERE ur.role = 'super_admin' AND ur.agency_id IS NULL;"

# Reset super admin password
docker compose exec postgres psql -U postgres -d buildflow_db -c "UPDATE users SET password_hash = crypt('super123', gen_salt('bf')) WHERE email = 'super@buildflow.local';"
```

