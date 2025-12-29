/**
 * BuildFlow API Server
 * Main entry point - modular Express.js application
 */

// Load environment variables from .env file (must be first)
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

/**
 * Validate required secrets on startup
 * Prevents server from starting with default or missing secrets
 * 
 * Note: In Docker, environment variables are set by docker-compose.yml
 * In local development, they come from .env file via dotenv
 * 
 * Note: Uses console.log because this runs before logger is initialized
 */
function validateRequiredSecrets() {
  // Check all possible environment variable names
  const postgresPassword = process.env.POSTGRES_PASSWORD || 
                          process.env.DATABASE_URL?.match(/:(.+?)@/)?.[1] ||
                          process.env.VITE_DATABASE_URL?.match(/:(.+?)@/)?.[1];
  
  const jwtSecret = process.env.VITE_JWT_SECRET || 
                   process.env.JWT_SECRET;

  const required = {
    POSTGRES_PASSWORD: postgresPassword,
    VITE_JWT_SECRET: jwtSecret,
  };

  const missing = [];
  const weak = [];
  const defaultValues = [
    'admin',
    'your-super-secret-jwt-key-change-this-in-production',
    'change-this-in-production',
  ];

  for (const [key, value] of Object.entries(required)) {
    if (!value || value.trim() === '') {
      missing.push(key);
    } else if (value.length < 32) {
      weak.push(key);
    } else if (defaultValues.some(defaultVal => value.includes(defaultVal))) {
      weak.push(`${key} (appears to be using default value)`);
    }
  }

  if (missing.length > 0) {
    // Use console.error here because logger is not initialized yet
    console.error('❌ CRITICAL: Missing required secrets:', missing.join(', '));
    console.error('   Please set these in your .env file or docker-compose.yml');
    console.error('   Generate secrets with: openssl rand -base64 32');
    console.error('');
    console.error('   For Docker: Set in .env file and docker-compose.yml will use them');
    console.error('   For local: Set in .env file in project root');
    process.exit(1);
  }

  if (weak.length > 0) {
    // Use console.error here because logger is not initialized yet
    console.error('❌ CRITICAL: Weak or default secrets detected:', weak.join(', '));
    console.error('   Secrets must be at least 32 characters and not use default values');
    console.error('   Generate strong secrets with: openssl rand -base64 32');
    process.exit(1);
  }

  // Use console.log here because logger is not initialized yet
  console.log('✅ All required secrets validated');
}

// Validate secrets before starting server
validateRequiredSecrets();

const express = require('express');
const http = require('http');
const logger = require('./utils/logger');
const { configureMiddleware } = require('./config/middleware');
const { errorHandler } = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');
const { PORT, DATABASE_URL } = require('./config/constants');
const { getRedisClient, isRedisAvailable } = require('./config/redis');

// Import routes
const healthRoutes = require('./routes/health');
const simpleHealthRoutes = require('./routes/health-simple');
const filesRoutes = require('./routes/files');
const databaseRoutes = require('./routes/database');
const authRoutes = require('./routes/auth');
const agenciesRoutes = require('./routes/agencies');
const schemaRoutes = require('./routes/schema');
const systemRoutes = require('./routes/system');
const permissionsRoutes = require('./routes/permissions');
const auditRoutes = require('./routes/audit');
const reportsRoutes = require('./routes/reports');
const twoFactorRoutes = require('./routes/twoFactor');
const systemHealthRoutes = require('./routes/systemHealth');
const backupRoutes = require('./routes/backups');
const inventoryRoutes = require('./routes/inventory');
const procurementRoutes = require('./routes/procurement');
const assetsRoutes = require('./routes/assets');
const currencyRoutes = require('./routes/currency');
const financialRoutes = require('./routes/financial');
const advancedReportsRoutes = require('./routes/advancedReports');
const graphqlRoutes = require('./routes/graphql');
const webhookRoutes = require('./routes/webhooks');
const apiDocsRoutes = require('./routes/api-docs');
const projectEnhancementsRoutes = require('./routes/projectEnhancements');
const crmEnhancementsRoutes = require('./routes/crmEnhancements');
const ssoRoutes = require('./routes/sso');
const passwordPolicyRoutes = require('./routes/passwordPolicy');
const databaseOptimizationRoutes = require('./routes/databaseOptimization');
const apiKeysRoutes = require('./routes/apiKeys');
const sessionManagementRoutes = require('./routes/sessionManagement');
const emailRoutes = require('./routes/email');
const messagingRoutes = require('./routes/messaging');
const slackRoutes = require('./routes/slack');
const workflowsRoutes = require('./routes/workflows');
const integrationsRoutes = require('./routes/integrations');
const settingsRoutes = require('./routes/settings');
const pageCatalogRoutes = require('./routes/pageCatalog');
const schemaAdminRoutes = require('./routes/schemaAdmin');

// Create Express app
const app = express();

// Configure middleware
configureMiddleware(app);

// Request logging (after CORS, before routes)
app.use(requestLogger);

// Apply general API rate limiting (after CORS but before routes)
// Note: system-health endpoints are excluded from rate limiting in rateLimiter.js
const { apiLimiter } = require('./middleware/rateLimiter');
app.use('/api', apiLimiter);

// Simple health check route (for Docker health checks - responds immediately)
app.use('/health', simpleHealthRoutes);
// Detailed health check route (for monitoring - checks services)
app.use('/health/detailed', healthRoutes);

// API routes
app.use('/api/files', filesRoutes);
app.use('/api/database', databaseRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/agencies', agenciesRoutes);
app.use('/api/schema', schemaRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/two-factor', twoFactorRoutes);
app.use('/api/system-health', systemHealthRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/procurement', procurementRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/currency', currencyRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/advanced-reports', advancedReportsRoutes);
app.use('/api/graphql', graphqlRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api-docs', apiDocsRoutes);
app.use('/api/projects', projectEnhancementsRoutes);
app.use('/api/crm', crmEnhancementsRoutes);
app.use('/api/sso', ssoRoutes);
app.use('/api/password-policy', passwordPolicyRoutes);
app.use('/api/database-optimization', databaseOptimizationRoutes);
app.use('/api/api-keys', apiKeysRoutes);
app.use('/api/sessions', sessionManagementRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/messaging', messagingRoutes);
app.use('/api/slack', slackRoutes);
app.use('/api/workflows', workflowsRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/system/page-catalog', pageCatalogRoutes);
app.use('/health', schemaAdminRoutes); // Health check routes (no /api prefix)
app.use('/admin', schemaAdminRoutes); // Admin routes (no /api prefix)

// Global error handler (must be last)
app.use(errorHandler);

// Initialize Redis on startup
async function initializeRedis() {
  try {
    const available = await isRedisAvailable();
    if (available) {
      logger.info('Redis cache initialized');
    } else {
      logger.warn('Redis not available, using in-memory cache fallback');
    }
  } catch (error) {
    logger.warn('Redis initialization warning', { error: error.message });
  }
}

// Initialize automated backups
function initializeBackups() {
  const cron = require('node-cron');
  const { createBackup, cleanupOldBackups, BACKUP_SCHEDULE } = require('./services/backupService');
  const { parseDatabaseUrl } = require('./utils/poolManager');
  
  // Schedule daily backups
  cron.schedule(BACKUP_SCHEDULE, async () => {
    try {
      logger.info('Starting scheduled backup');
      const dbConfig = parseDatabaseUrl();
      const dbName = dbConfig.database || 'buildflow_db';
      await createBackup(dbName, 'full');
      
      // Clean up old backups
      const deleted = await cleanupOldBackups();
      if (deleted > 0) {
        logger.info('Cleaned up old backups', { count: deleted });
      }
    } catch (error) {
      logger.error('Scheduled backup failed', { error: error.message, stack: error.stack });
    }
  });
  
  logger.info('Automated backups scheduled', { schedule: BACKUP_SCHEDULE });
}

// Create HTTP server for Socket.io
const server = http.createServer(app);

// Initialize WebSocket server
const { initializeWebSocket } = require('./services/websocketService');
const io = initializeWebSocket(server);

// Make io available globally for services
global.io = io;

// Initialize main database schema on startup
async function initializeMainDatabase() {
  try {
    const { pool } = require('./config/database');
    const client = await pool.connect();
    
    try {
      // Check if agencies table exists
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'agencies'
        );
      `);
      
      if (!tableCheck.rows[0].exists) {
        logger.warn('Main database schema missing - agencies table not found. Running migrations...');
        
        // Run core schema migration
        const fs = require('fs');
        const path = require('path');
        const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '01_core_schema.sql');
        
        if (fs.existsSync(migrationPath)) {
          const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
          await client.query(migrationSQL);
          logger.info('✅ Main database schema initialized from migrations');
        } else {
          // Fallback: Create agencies table directly
          await client.query(`
            CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
            CREATE EXTENSION IF NOT EXISTS "pgcrypto";
            
            CREATE TABLE IF NOT EXISTS public.agencies (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              name TEXT NOT NULL,
              domain TEXT UNIQUE,
              created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
              updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
              is_active BOOLEAN NOT NULL DEFAULT true,
              subscription_plan TEXT DEFAULT 'basic',
              max_users INTEGER DEFAULT 50,
              database_name TEXT UNIQUE,
              owner_user_id UUID
            );
            
            CREATE INDEX IF NOT EXISTS idx_agencies_created_at ON public.agencies(created_at);
            CREATE INDEX IF NOT EXISTS idx_agencies_database_name ON public.agencies(database_name);
            CREATE INDEX IF NOT EXISTS idx_agencies_domain ON public.agencies(domain);
            CREATE INDEX IF NOT EXISTS idx_agencies_is_active ON public.agencies(is_active);
          `);
          logger.info('✅ Main database agencies table created');
        }
      } else {
        logger.info('✅ Main database schema verified');
      }
      
      // Ensure notifications table exists
      const notificationsCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'notifications'
        );
      `);
      
      if (!notificationsCheck.rows[0].exists) {
        const { ensureNotificationsTable } = require('./utils/schema/miscSchema');
        await ensureNotificationsTable(client);
        logger.info('✅ Notifications table created in main database');
      }
      
      // Ensure page_catalog table exists (needed for page recommendations)
      const pageCatalogCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'page_catalog'
        );
      `);
      
      if (!pageCatalogCheck.rows[0].exists) {
        logger.warn('page_catalog table missing - running migration...');
        const fs = require('fs');
        const path = require('path');
        const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '10_page_catalog_schema.sql');
        
        if (fs.existsSync(migrationPath)) {
          const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
          await client.query(migrationSQL);
          logger.info('✅ page_catalog tables created from migration');
          
          // Also seed the catalog if seed file exists
          const seedPath = path.join(__dirname, '..', 'database', 'migrations', '11_seed_page_catalog.sql');
          if (fs.existsSync(seedPath)) {
            const seedSQL = fs.readFileSync(seedPath, 'utf8');
            await client.query(seedSQL);
            logger.info('✅ page_catalog seeded with initial data');
          }
        } else {
          logger.warn('page_catalog migration file not found, creating basic tables...');
          // Create page_catalog table
          await client.query(`
            CREATE TABLE IF NOT EXISTS public.page_catalog (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              path TEXT NOT NULL UNIQUE,
              title TEXT NOT NULL,
              description TEXT,
              icon TEXT,
              category TEXT NOT NULL,
              base_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
              is_active BOOLEAN NOT NULL DEFAULT true,
              requires_approval BOOLEAN NOT NULL DEFAULT false,
              metadata JSONB DEFAULT '{}'::jsonb,
              created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
              updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS idx_page_catalog_category ON public.page_catalog(category);
            CREATE INDEX IF NOT EXISTS idx_page_catalog_is_active ON public.page_catalog(is_active);
            CREATE INDEX IF NOT EXISTS idx_page_catalog_path ON public.page_catalog(path);
          `);
          
          // Create page_recommendation_rules table
          await client.query(`
            CREATE TABLE IF NOT EXISTS public.page_recommendation_rules (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              page_id UUID NOT NULL REFERENCES public.page_catalog(id) ON DELETE CASCADE,
              industry TEXT[],
              company_size TEXT[],
              primary_focus TEXT[],
              business_goals TEXT[],
              priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
              is_required BOOLEAN NOT NULL DEFAULT false,
              created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
              updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS idx_page_recommendation_rules_page_id ON public.page_recommendation_rules(page_id);
            CREATE INDEX IF NOT EXISTS idx_page_recommendation_rules_priority ON public.page_recommendation_rules(priority);
          `);
          logger.info('✅ Basic page_catalog and page_recommendation_rules tables created');
        }
        
        // Seed page_catalog if empty
        const countResult = await client.query('SELECT COUNT(*) as count FROM public.page_catalog');
        if (parseInt(countResult.rows[0].count) === 0) {
          logger.warn('page_catalog table is empty, seeding basic pages...');
          await client.query(`
            INSERT INTO public.page_catalog (path, title, description, icon, category, base_cost, is_active, requires_approval) VALUES
            ('/dashboard', 'Main Dashboard', 'Main dashboard for all users', 'BarChart3', 'dashboard', 0, true, false),
            ('/agency', 'Agency Dashboard', 'Agency dashboard', 'Building2', 'dashboard', 0, true, false),
            ('/employee-management', 'Employee Management', 'Employee management and administration', 'Users', 'management', 0, true, false),
            ('/project-management', 'Project Management', 'Project management interface', 'FolderKanban', 'projects', 0, true, false),
            ('/projects', 'Projects', 'Projects overview', 'Briefcase', 'projects', 0, true, false),
            ('/invoices', 'Invoices', 'Invoice management', 'FileText', 'finance', 0, true, false),
            ('/clients', 'Clients', 'Client management', 'Users', 'management', 0, true, false),
            ('/crm', 'CRM', 'Customer relationship management', 'ContactRound', 'management', 0, true, false),
            ('/attendance', 'Attendance', 'Employee attendance tracking', 'Calendar', 'hr', 0, true, false),
            ('/leave-requests', 'Leave Requests', 'Employee leave management', 'CalendarDays', 'hr', 0, true, false),
            ('/financial-management', 'Financial Management', 'Financial operations', 'DollarSign', 'finance', 0, true, false),
            ('/inventory', 'Inventory', 'Inventory management', 'Package', 'inventory', 0, true, false),
            ('/procurement', 'Procurement', 'Procurement management', 'ShoppingCart', 'procurement', 0, true, false),
            ('/reports', 'Reports', 'Business reports and analytics', 'FileBarChart', 'reports', 0, true, false),
            ('/analytics', 'Analytics', 'Data analytics and insights', 'TrendingUp', 'reports', 0, true, false)
            ON CONFLICT (path) DO NOTHING;
          `);
          logger.info('✅ page_catalog seeded with basic pages');
        }
      }
      
      // Seed page_catalog if empty (check regardless of whether table was just created)
      const countResult = await client.query('SELECT COUNT(*) as count FROM public.page_catalog');
      if (parseInt(countResult.rows[0].count) === 0) {
        logger.warn('page_catalog table is empty, seeding basic pages...');
        await client.query(`
          INSERT INTO public.page_catalog (path, title, description, icon, category, base_cost, is_active, requires_approval) VALUES
          ('/dashboard', 'Main Dashboard', 'Main dashboard for all users', 'BarChart3', 'dashboard', 0, true, false),
          ('/agency', 'Agency Dashboard', 'Agency dashboard', 'Building2', 'dashboard', 0, true, false),
          ('/employee-management', 'Employee Management', 'Employee management and administration', 'Users', 'management', 0, true, false),
          ('/project-management', 'Project Management', 'Project management interface', 'FolderKanban', 'projects', 0, true, false),
          ('/projects', 'Projects', 'Projects overview', 'Briefcase', 'projects', 0, true, false),
          ('/invoices', 'Invoices', 'Invoice management', 'FileText', 'finance', 0, true, false),
          ('/clients', 'Clients', 'Client management', 'Users', 'management', 0, true, false),
          ('/crm', 'CRM', 'Customer relationship management', 'ContactRound', 'management', 0, true, false),
          ('/attendance', 'Attendance', 'Employee attendance tracking', 'Calendar', 'hr', 0, true, false),
          ('/leave-requests', 'Leave Requests', 'Employee leave management', 'CalendarDays', 'hr', 0, true, false),
          ('/financial-management', 'Financial Management', 'Financial operations', 'DollarSign', 'finance', 0, true, false),
          ('/inventory', 'Inventory', 'Inventory management', 'Package', 'inventory', 0, true, false),
          ('/procurement', 'Procurement', 'Procurement management', 'ShoppingCart', 'procurement', 0, true, false),
          ('/reports', 'Reports', 'Business reports and analytics', 'FileBarChart', 'reports', 0, true, false),
          ('/analytics', 'Analytics', 'Data analytics and insights', 'TrendingUp', 'reports', 0, true, false)
          ON CONFLICT (path) DO NOTHING;
        `);
        logger.info('✅ page_catalog seeded with basic pages');
      } else {
        logger.info('✅ page_catalog table verified');
      }
      
      // Ensure system_settings table exists
      const systemSettingsCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'system_settings'
        );
      `);
      
      if (!systemSettingsCheck.rows[0].exists) {
        logger.warn('system_settings table missing - running migration...');
        const fs = require('fs');
        const path = require('path');
        const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '12_system_settings_schema.sql');
        
        if (fs.existsSync(migrationPath)) {
          const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
          await client.query(migrationSQL);
          logger.info('✅ system_settings table created from migration');
        } else {
          logger.warn('system_settings migration file not found, creating basic table...');
          // Create system_settings table
          await client.query(`
            CREATE TABLE IF NOT EXISTS public.system_settings (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              system_name TEXT NOT NULL DEFAULT 'BuildFlow ERP',
              system_tagline TEXT,
              system_description TEXT,
              logo_url TEXT,
              favicon_url TEXT,
              login_logo_url TEXT,
              email_logo_url TEXT,
              meta_title TEXT,
              meta_description TEXT,
              meta_keywords TEXT,
              og_image_url TEXT,
              og_title TEXT,
              og_description TEXT,
              twitter_card_type TEXT DEFAULT 'summary_large_image',
              twitter_site TEXT,
              twitter_creator TEXT,
              google_analytics_id TEXT,
              google_tag_manager_id TEXT,
              facebook_pixel_id TEXT,
              custom_tracking_code TEXT,
              ad_network_enabled BOOLEAN DEFAULT false,
              ad_network_code TEXT,
              ad_placement_header BOOLEAN DEFAULT false,
              ad_placement_sidebar BOOLEAN DEFAULT false,
              ad_placement_footer BOOLEAN DEFAULT false,
              support_email TEXT,
              support_phone TEXT,
              support_address TEXT,
              facebook_url TEXT,
              twitter_url TEXT,
              linkedin_url TEXT,
              instagram_url TEXT,
              youtube_url TEXT,
              terms_of_service_url TEXT,
              privacy_policy_url TEXT,
              cookie_policy_url TEXT,
              maintenance_mode BOOLEAN DEFAULT false,
              maintenance_message TEXT,
              default_language TEXT DEFAULT 'en',
              default_timezone TEXT DEFAULT 'UTC',
              created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
              updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
              created_by UUID REFERENCES public.users(id),
              updated_by UUID REFERENCES public.users(id)
            );
          `);
          
          // Note: We enforce single record via application logic
          // PostgreSQL doesn't support unique indexes on constant expressions
          
          // Create trigger function if it doesn't exist
          await client.query(`
            CREATE OR REPLACE FUNCTION public.update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = now();
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
          `);
          
          // Create trigger
          await client.query(`
            DROP TRIGGER IF EXISTS update_system_settings_updated_at ON public.system_settings;
            CREATE TRIGGER update_system_settings_updated_at
                BEFORE UPDATE ON public.system_settings
                FOR EACH ROW
                EXECUTE FUNCTION public.update_updated_at_column();
          `);
          
          // Insert default settings
          await client.query(`
            INSERT INTO public.system_settings (system_name, system_tagline, system_description)
            VALUES ('BuildFlow ERP', 'Complete Business Management Solution', 'A comprehensive ERP system for managing your business operations');
          `);
          
          logger.info('✅ Basic system_settings table created with default values');
        }
      } else {
        // Ensure default settings exist even if table exists
        const settingsCount = await client.query('SELECT COUNT(*) as count FROM public.system_settings');
        if (parseInt(settingsCount.rows[0].count) === 0) {
          logger.warn('system_settings table is empty, inserting default settings...');
          await client.query(`
            INSERT INTO public.system_settings (system_name, system_tagline, system_description)
            VALUES ('BuildFlow ERP', 'Complete Business Management Solution', 'A comprehensive ERP system for managing your business operations');
          `);
          logger.info('✅ Default system settings inserted');
        } else {
          logger.info('✅ system_settings table verified');
        }
      }
      
      // Ensure super admin user exists
      await ensureSuperAdminUser(client);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Failed to initialize main database schema', { 
      error: error.message,
      stack: error.stack 
    });
    // Don't exit - let the server start and handle errors at runtime
  }
}

/**
 * Ensure super admin user exists in buildflow_db
 */
async function ensureSuperAdminUser(client) {
  try {
    // Check if users table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      logger.warn('Users table does not exist, skipping super admin creation');
      return;
    }
    
    // Check if user_roles table exists
    const userRolesTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_roles'
      )
    `);
    
    const userRolesTableExists = userRolesTableCheck.rows[0].exists;
    
    // Check if super admin exists
    let userCheck;
    if (userRolesTableExists) {
      userCheck = await client.query(`
        SELECT u.id, ur.role 
         FROM public.users u
         LEFT JOIN public.user_roles ur ON u.id = ur.user_id AND ur.role = 'super_admin' AND ur.agency_id IS NULL
         WHERE u.email = 'super@buildflow.local'
      `);
    } else {
      // If user_roles table doesn't exist, just check if user exists
      userCheck = await client.query(`
        SELECT id, NULL as role 
         FROM public.users 
         WHERE email = 'super@buildflow.local'
      `);
    }
    
    if (userCheck.rows.length === 0 || !userCheck.rows[0].role) {
      logger.info('Creating super admin user...');
      
      // Ensure extensions exist
      await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
      await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
      
      // Create or update super admin user
      await client.query(`
        INSERT INTO public.users (email, password_hash, email_confirmed, email_confirmed_at, is_active)
        VALUES (
          'super@buildflow.local',
          crypt('super123', gen_salt('bf')),
          true,
          now(),
          true
        ) ON CONFLICT (email) 
        DO UPDATE SET 
          password_hash = crypt('super123', gen_salt('bf')),
          email_confirmed = true,
          email_confirmed_at = now(),
          is_active = true,
          updated_at = now();
      `);
      
      // Create profile and assign role
      await client.query(`
        DO $$
        DECLARE
          admin_id UUID;
        BEGIN
          SELECT id INTO admin_id FROM public.users WHERE email = 'super@buildflow.local';
          
          IF admin_id IS NOT NULL THEN
            -- Ensure profiles table exists
            CREATE TABLE IF NOT EXISTS public.profiles (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
              full_name TEXT,
              phone_number TEXT,
              address TEXT,
              avatar_url TEXT,
              is_active BOOLEAN DEFAULT true,
              created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
              updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
            
            -- Create or update profile
            INSERT INTO public.profiles (id, user_id, full_name, is_active)
            VALUES (gen_random_uuid(), admin_id, 'Super Administrator', true)
            ON CONFLICT (user_id) 
            DO UPDATE SET 
              full_name = 'Super Administrator',
              is_active = true,
              updated_at = now();
            
            -- Ensure app_role enum exists
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
              CREATE TYPE public.app_role AS ENUM (
                'super_admin', 'admin', 'hr', 'finance_manager', 'cfo', 'ceo', 
                'project_manager', 'employee', 'contractor', 'intern'
              );
            END IF;
            
            -- Ensure user_roles table exists
            CREATE TABLE IF NOT EXISTS public.user_roles (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
              role public.app_role NOT NULL,
              agency_id UUID,
              created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
              UNIQUE(user_id, role, agency_id)
            );
            
            -- Assign super_admin role (with NULL agency_id for system-level admin)
            INSERT INTO public.user_roles (user_id, role, agency_id)
            VALUES (admin_id, 'super_admin'::public.app_role, NULL)
            ON CONFLICT (user_id, role, agency_id) DO NOTHING;
          END IF;
        END $$;
      `);
      
      logger.info('✅ Super admin user created (email: super@buildflow.local, password: super123)');
    } else {
      logger.info('✅ Super admin user verified');
    }
  } catch (error) {
    logger.warn('Could not ensure super admin user (this is okay if tables don\'t exist yet):', error.message);
  }
}

// Start server
server.listen(PORT, '0.0.0.0', async () => {
  logger.info('Server started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
  });
  
  try {
    const dbHostInfo = DATABASE_URL.split('@')[1] || DATABASE_URL;
    logger.info('Database connected', { host: dbHostInfo });
  } catch (error) {
    logger.warn('Database connection info unavailable', { error: error.message });
  }
  
  // Initialize main database schema
  await initializeMainDatabase();
  
  // Initialize Redis
  await initializeRedis();
  
  // Initialize automated backups
  initializeBackups();
  
  // Initialize scheduled reports
  const { initializeScheduledReports } = require('./services/scheduledReportService');
  initializeScheduledReports();
  
  logger.info('WebSocket server initialized');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  const { closeRedisConnection } = require('./config/redis');
  await closeRedisConnection();
  logger.info('Shutdown complete');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  const { closeRedisConnection } = require('./config/redis');
  await closeRedisConnection();
  logger.info('Shutdown complete');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { 
    reason: reason?.message || reason, 
    stack: reason?.stack,
  });
});
