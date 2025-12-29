# Super Admin Setup - Quick Reference

## 🚀 Quick Start

### 1. Create Super Admin (Choose One Method)

#### Method A: Automatic (Docker - Recommended)
The super admin is automatically created when the backend starts if it doesn't exist.

```bash
# Just start Docker
docker compose up -d

# Super admin will be created automatically
```

#### Method B: Manual Script
```bash
# Linux/Mac
./scripts/create_super_admin.sh

# Windows
scripts\create_super_admin.bat
```

#### Method C: SQL Migration
```bash
docker compose exec -T postgres psql -U postgres -d buildflow_db -f database/migrations/13_create_super_admin.sql
```

### 2. Login

- **URL**: `http://localhost:8080/auth`
- **Email**: `super@buildflow.local`
- **Password**: `super123`

### 3. Access System Dashboard

- **URL**: `http://localhost:8080/system`

## 📊 BuildFlow DB Tables

### Core Tables
- `users` - System-level user accounts
- `user_roles` - Role assignments (super_admin with agency_id = NULL)
- `profiles` - User profiles

### System Management
- `system_settings` - System-wide settings (Identity, Branding, SEO, Analytics, Ads)
- `agencies` - All agency records
- `subscription_plans` - Subscription plans
- `plan_features` - Feature definitions
- `plan_feature_mappings` - Plan-to-feature mappings

### Page Catalog
- `page_catalog` - Master catalog of available pages
- `agency_page_assignments` - Pages assigned to agencies
- `agency_page_requests` - Page access requests
- `page_recommendation_rules` - Auto-recommendation rules
- `page_pricing_tiers` - Pricing by subscription tier

## 🎯 Super Admin Pages

### Main Dashboard (`/system`)
- **Overview**: System metrics, revenue, growth, health
- **Agencies**: Manage all agencies
- **Analytics**: Platform-wide analytics
- **Monitoring**: Real-time usage, support tickets
- **Settings**: 
  - System Settings (Identity, Branding, SEO, Analytics, Ads, Other)
  - Agency Settings
  - Plan Management
  - Page Catalog Management
  - Page Request Management

### Other Pages
- `/system-health` - System health monitoring
- `/email-testing` - Email service testing
- `/permissions` - Advanced permissions

## 🔧 Making Changes

### System Settings
1. Login as super admin
2. Go to `/system` → **Settings** tab
3. Click **System Settings**
4. Configure any tab (Identity, Branding, SEO, Analytics, Ads, Other)
5. Click **Save Changes**

All changes are saved to `system_settings` table in `buildflow_db` and automatically applied throughout the ERP system.

## 🔍 Verify Super Admin

```sql
-- Check super admin exists
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

Should show:
- `role = 'super_admin'`
- `agency_id = NULL` (system-level admin)

## 📝 Database Connection

```
postgresql://postgres:admin@localhost:5432/buildflow_db
```

## ⚠️ Important Notes

1. **Super admin uses buildflow_db** (main database), NOT agency databases
2. **System settings** are stored in `buildflow_db.system_settings`
3. **Changes apply system-wide** to all agencies
4. **Change default password** in production!

## 📚 Full Documentation

See `docs/SUPER_ADMIN_GUIDE.md` and `docs/BUILDFLOW_DB_SUPER_ADMIN_SETUP.md` for detailed information.

