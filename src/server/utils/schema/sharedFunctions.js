/**
 * Shared Database Functions and Utilities
 * 
 * This module contains:
 * - Database extensions (uuid-ossp, pgcrypto)
 * - Custom types (app_role enum)
 * - Utility functions (current_user_id, update_updated_at_column, log_audit_change)
 * - Triggers for updated_at columns
 * - Views (unified_employees)
 */

/**
 * Ensure database extensions are installed
 */
async function ensureExtensions(client) {
  try {
    // Check if extensions already exist first to avoid race conditions
    const extCheck = await client.query(`
      SELECT extname FROM pg_extension 
      WHERE extname IN ('uuid-ossp', 'pgcrypto')
    `);
    const existingExts = extCheck.rows.map(r => r.extname);
    
    // Only create extensions that don't exist - use DO block to catch all errors
    if (!existingExts.includes('uuid-ossp')) {
      await client.query(`
        DO $$ 
        BEGIN
          CREATE EXTENSION "uuid-ossp";
        EXCEPTION
          WHEN OTHERS THEN
            -- If extension exists now, that's fine
            IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') THEN
              RAISE;
            END IF;
        END $$;
      `);
    }
    
    if (!existingExts.includes('pgcrypto')) {
      await client.query(`
        DO $$ 
        BEGIN
          CREATE EXTENSION "pgcrypto";
        EXCEPTION
          WHEN OTHERS THEN
            -- If extension exists now, that's fine
            IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
              RAISE;
            END IF;
        END $$;
      `);
    }
    
    // Verify extensions are installed
    const finalCheck = await client.query(`
      SELECT extname FROM pg_extension 
      WHERE extname IN ('uuid-ossp', 'pgcrypto')
    `);
    const installedExts = finalCheck.rows.map(r => r.extname);
    
    if (!installedExts.includes('uuid-ossp')) {
      throw new Error('uuid-ossp extension was not installed');
    }
    if (!installedExts.includes('pgcrypto')) {
      throw new Error('pgcrypto extension was not installed');
    }
    
    console.log('[SQL] ✅ Extensions verified:', installedExts.join(', '));
  } catch (error) {
    // Final fallback: if it's a duplicate key error, check if extensions actually exist
    if (error.code === '23505' || error.message.includes('duplicate key')) {
      const extCheck = await client.query(`
        SELECT extname FROM pg_extension 
        WHERE extname IN ('uuid-ossp', 'pgcrypto')
      `);
      const installedExts = extCheck.rows.map(r => r.extname);
      if (installedExts.length === 2) {
        console.log('[SQL] ✅ Extensions already exist:', installedExts.join(', '));
        return; // Extensions exist, that's fine
      }
    }
    console.error('[SQL] ❌ Error ensuring extensions:', error.message);
    throw error;
  }
}

/**
 * Ensure app_role enum type exists with all valid values
 */
async function ensureAppRoleType(client) {
  try {
    // Check if type already exists first
    const typeCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON t.typnamespace = n.oid
        WHERE n.nspname = 'public' 
        AND t.typname = 'app_role'
      )
    `);
    
    if (!typeCheck.rows[0].exists) {
      // Create enum with all valid values
      await client.query(`
        DO $$ 
        BEGIN
          CREATE TYPE public.app_role AS ENUM (
            'super_admin', 'ceo', 'cto', 'cfo', 'coo', 'admin', 
            'operations_manager', 'department_head', 'team_lead', 
            'project_manager', 'hr', 'finance_manager', 'sales_manager',
            'marketing_manager', 'quality_assurance', 'it_support', 
            'legal_counsel', 'business_analyst', 'customer_success',
            'employee', 'contractor', 'intern'
          );
        EXCEPTION
          WHEN duplicate_object THEN
            -- Type already exists, that's fine
            NULL;
          WHEN OTHERS THEN
            -- Check if type actually exists before re-raising
            IF NOT EXISTS (
              SELECT 1 FROM pg_type t
              JOIN pg_namespace n ON t.typnamespace = n.oid
              WHERE n.nspname = 'public' AND t.typname = 'app_role'
            ) THEN
              RAISE;
            END IF;
        END $$;
      `);
    }
    
    // Add any missing enum values to existing enum type
    // PostgreSQL doesn't support ALTER TYPE ADD VALUE in a transaction block,
    // so we need to handle this carefully
    const allRoles = [
      'super_admin', 'ceo', 'cto', 'cfo', 'coo', 'admin', 
      'operations_manager', 'department_head', 'team_lead', 
      'project_manager', 'hr', 'finance_manager', 'sales_manager',
      'marketing_manager', 'quality_assurance', 'it_support', 
      'legal_counsel', 'business_analyst', 'customer_success',
      'employee', 'contractor', 'intern'
    ];
    
    // Get existing enum values
    const existingValues = await client.query(`
      SELECT unnest(enum_range(NULL::app_role))::text as role
    `).catch(() => ({ rows: [] }));
    
    const existingRoles = existingValues.rows.map(r => r.role);
    const missingRoles = allRoles.filter(role => !existingRoles.includes(role));
    
    // Add missing enum values one by one (outside transaction)
    for (const role of missingRoles) {
      try {
        await client.query(`ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS '${role}'`);
      } catch (addError) {
        // Ignore errors if value already exists or can't be added in transaction
        if (!addError.message.includes('already exists') && 
            !addError.message.includes('cannot be run inside a transaction block')) {
          console.warn(`[Schema] Could not add enum value '${role}':`, addError.message);
        }
      }
    }
    
  } catch (error) {
    // If it's a duplicate key error, check if type actually exists
    if (error.code === '23505' || error.message.includes('duplicate key') || error.code === '42710') {
      const typeCheck = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_type t
          JOIN pg_namespace n ON t.typnamespace = n.oid
          WHERE n.nspname = 'public' AND t.typname = 'app_role'
        )
      `);
      if (typeCheck.rows[0].exists) {
        return; // Type exists, that's fine
      }
    }
    throw error;
  }
}

/**
 * Create update_updated_at_column function
 */
async function ensureUpdateUpdatedAtFunction(client) {
  await client.query(`
    CREATE OR REPLACE FUNCTION public.update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
}

/**
 * Create current_user_id function
 */
async function ensureCurrentUserIdFunction(client) {
  await client.query(`
    CREATE OR REPLACE FUNCTION public.current_user_id()
    RETURNS UUID AS $$
    DECLARE
      user_id_text TEXT;
    BEGIN
      BEGIN
        user_id_text := current_setting('app.current_user_id', true);
      EXCEPTION WHEN OTHERS THEN
        RETURN NULL;
      END;

      IF user_id_text IS NULL OR user_id_text = '' THEN
        RETURN NULL;
      END IF;

      BEGIN
        RETURN user_id_text::UUID;
      EXCEPTION WHEN OTHERS THEN
        RETURN NULL;
      END;
    END;
    $$ LANGUAGE plpgsql STABLE;
  `);
}

/**
 * Create audit logging function
 * Handles tables with or without user_id column
 * Note: users table doesn't have user_id column, only id
 */
async function ensureAuditLoggingFunction(client) {
  await client.query(`
    CREATE OR REPLACE FUNCTION public.log_audit_change()
    RETURNS TRIGGER AS $$
    DECLARE
      v_user_id uuid;
      v_record_id uuid;
    BEGIN
      v_user_id := public.current_user_id();
      
      -- Get record_id: For users table, use id. For other tables, prefer user_id, fallback to id
      -- We check table name to avoid accessing non-existent columns
      IF TG_OP = 'INSERT' THEN
        IF TG_TABLE_NAME = 'users' THEN
          v_record_id := NEW.id;
        ELSE
          -- For other tables, use user_id if it exists, otherwise use id
          -- We extract from JSONB to safely check if column exists
          v_record_id := COALESCE(
            (to_jsonb(NEW)->>'user_id')::uuid,
            NEW.id
          );
        END IF;
        INSERT INTO public.audit_logs(table_name, action, user_id, record_id, old_values, new_values, created_at)
        VALUES (TG_TABLE_NAME, lower(TG_OP), v_user_id, v_record_id, NULL, to_jsonb(NEW), now());
        RETURN NEW;
      ELSIF TG_OP = 'UPDATE' THEN
        IF TG_TABLE_NAME = 'users' THEN
          v_record_id := COALESCE(NEW.id, OLD.id);
        ELSE
          v_record_id := COALESCE(
            (to_jsonb(NEW)->>'user_id')::uuid,
            (to_jsonb(OLD)->>'user_id')::uuid,
            COALESCE(NEW.id, OLD.id)
          );
        END IF;
        INSERT INTO public.audit_logs(table_name, action, user_id, record_id, old_values, new_values, created_at)
        VALUES (TG_TABLE_NAME, lower(TG_OP), v_user_id, v_record_id, to_jsonb(OLD), to_jsonb(NEW), now());
        RETURN NEW;
      ELSIF TG_OP = 'DELETE' THEN
        IF TG_TABLE_NAME = 'users' THEN
          v_record_id := OLD.id;
        ELSE
          v_record_id := COALESCE(
            (to_jsonb(OLD)->>'user_id')::uuid,
            OLD.id
          );
        END IF;
        INSERT INTO public.audit_logs(table_name, action, user_id, record_id, old_values, new_values, created_at)
        VALUES (TG_TABLE_NAME, lower(TG_OP), v_user_id, v_record_id, to_jsonb(OLD), NULL, now());
        RETURN OLD;
      END IF;
      RETURN COALESCE(NEW, OLD);
    END;
    $$ LANGUAGE plpgsql;
  `);
}

/**
 * Create sync_attendance_employee_id function
 * Note: The trigger is created in ensureAttendanceTable after the table exists
 */
async function ensureSyncAttendanceEmployeeIdFunction(client) {
  await client.query(`
    CREATE OR REPLACE FUNCTION public.sync_attendance_employee_id()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.employee_id IS NULL AND NEW.user_id IS NOT NULL THEN
        NEW.employee_id := NEW.user_id;
      ELSIF NEW.user_id IS NULL AND NEW.employee_id IS NOT NULL THEN
        NEW.user_id := NEW.employee_id;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
}

/**
 * Create sync_employee_salary function
 * Note: The trigger is created in ensureEmployeeSalaryDetailsTable after the table exists
 */
async function ensureSyncEmployeeSalaryFunction(client) {
  await client.query(`
    CREATE OR REPLACE FUNCTION public.sync_employee_salary()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Sync salary from base_salary if salary is NULL but base_salary is provided
      IF NEW.salary IS NULL AND NEW.base_salary IS NOT NULL THEN
        NEW.salary := NEW.base_salary;
      END IF;
      
      -- Sync base_salary from salary if base_salary is NULL but salary is provided
      IF NEW.base_salary IS NULL AND NEW.salary IS NOT NULL THEN
        NEW.base_salary := NEW.salary;
      END IF;
      
      -- Ensure base_salary has a value (default to 0 if both are NULL, though this shouldn't happen)
      IF NEW.base_salary IS NULL THEN
        NEW.base_salary := COALESCE(NEW.salary, 0);
      END IF;
      
      -- Sync salary_frequency from pay_frequency if needed
      IF NEW.salary_frequency IS NULL AND NEW.pay_frequency IS NOT NULL THEN
        NEW.salary_frequency := NEW.pay_frequency;
      END IF;
      
      -- Sync pay_frequency from salary_frequency if needed
      IF NEW.pay_frequency IS NULL AND NEW.salary_frequency IS NOT NULL THEN
        NEW.pay_frequency := NEW.salary_frequency;
      END IF;
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
}

/**
 * Create sync_holidays_date function
 * Note: The trigger is created in ensureHolidaysTable after the table exists
 */
async function ensureSyncHolidaysDateFunction(client) {
  await client.query(`
    CREATE OR REPLACE FUNCTION public.sync_holidays_date()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.date IS NULL AND NEW.holiday_date IS NOT NULL THEN
        NEW.date := NEW.holiday_date;
      ELSIF NEW.holiday_date IS NULL AND NEW.date IS NOT NULL THEN
        NEW.holiday_date := NEW.date;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
}

/**
 * Create updated_at triggers for a list of tables
 */
async function ensureUpdatedAtTriggers(client, tables) {
  for (const table of tables) {
    await client.query(`
      DROP TRIGGER IF EXISTS update_${table}_updated_at ON public.${table};
      CREATE TRIGGER update_${table}_updated_at
        BEFORE UPDATE ON public.${table}
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    `);
  }
}

/**
 * Create unified_employees view
 * Includes agency_id for proper multi-tenant isolation
 * This must be called AFTER users, profiles, employee_details, and user_roles tables exist
 */
async function ensureUnifiedEmployeesView(client) {
  try {
    // Verify required tables exist before creating view
    const requiredTables = ['users', 'profiles', 'employee_details', 'user_roles'];
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = ANY($1::text[])
    `, [requiredTables]);
    
    const existingTables = tableCheck.rows.map(r => r.table_name);
    const missingTables = requiredTables.filter(t => !existingTables.includes(t));
    
    if (missingTables.length > 0) {
      throw new Error(`Cannot create unified_employees view: missing required tables: ${missingTables.join(', ')}`);
    }
    
    await client.query(`
      CREATE OR REPLACE VIEW public.unified_employees AS
      SELECT 
        COALESCE(ed.id, p.id, u.id) as id,
        u.id as user_id,
        ed.id as employee_detail_id,
        p.id as profile_id,
        -- agency_id: prioritize profiles.agency_id, fallback to employee_details.agency_id
        COALESCE(p.agency_id, ed.agency_id) as agency_id,
        COALESCE(ed.first_name || ' ' || ed.last_name, p.full_name, u.email) as display_name,
        ed.first_name,
        ed.last_name,
        p.full_name,
        u.email,
        ed.employee_id,
        p.phone,
        p.department,
        p.position,
        ed.employment_type,
        ed.work_location,
        ed.supervisor_id,
        COALESCE(ed.is_active, p.is_active, u.is_active, true) as is_active,
        -- is_fully_active: true only if ALL existing records are active
        (u.is_active = true 
          AND (p.id IS NULL OR p.is_active = true) 
          AND (ed.id IS NULL OR ed.is_active = true)) as is_fully_active,
        ed.date_of_birth,
        p.hire_date,
        p.hire_date as profile_hire_date,
        u.created_at,
        ed.created_at as employee_detail_created_at,
        p.created_at as profile_created_at,
        ur.role
      FROM public.users u
      LEFT JOIN public.profiles p ON p.user_id = u.id
      LEFT JOIN public.employee_details ed ON ed.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT role FROM public.user_roles 
        WHERE user_id = u.id 
        ORDER BY assigned_at DESC 
        LIMIT 1
      ) ur ON true;
    `);
    
    console.log('[SQL] ✅ unified_employees view created successfully');
  } catch (error) {
    console.error('[SQL] ❌ Error creating unified_employees view:', error.message);
    throw error;
  }
}

/**
 * Initialize all shared functions, types, and views
 * Note: unified_employees view is created separately after tables exist
 */
async function ensureSharedFunctions(client) {
  try {
    console.log('[SQL] Ensuring database extensions and types...');
    await ensureExtensions(client);
    await ensureAppRoleType(client);
    
    console.log('[SQL] Ensuring utility functions...');
    await ensureUpdateUpdatedAtFunction(client);
    await ensureCurrentUserIdFunction(client);
    await ensureAuditLoggingFunction(client);
    await ensureSyncAttendanceEmployeeIdFunction(client);
    await ensureSyncEmployeeSalaryFunction(client);
    await ensureSyncHolidaysDateFunction(client);
    
    // Verify critical functions exist
    const functionCheck = await client.query(`
      SELECT proname FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' 
      AND proname IN ('update_updated_at_column', 'log_audit_change', 'current_user_id', 'sync_attendance_employee_id')
    `);
    const existingFunctions = functionCheck.rows.map(r => r.proname);
    const requiredFunctions = ['update_updated_at_column', 'log_audit_change', 'current_user_id', 'sync_attendance_employee_id'];
    const missingFunctions = requiredFunctions.filter(f => !existingFunctions.includes(f));
    
    if (missingFunctions.length > 0) {
      throw new Error(`Missing required functions: ${missingFunctions.join(', ')}`);
    }
    
    console.log('[SQL] ✅ Utility functions verified');
    console.log('[SQL] ✅ Shared functions and types ensured (unified_employees view will be created after tables exist)');
  } catch (error) {
    console.error('[SQL] ❌ Error ensuring shared functions:', error.message);
    console.error('[SQL] Error stack:', error.stack);
    throw error;
  }
}

module.exports = {
  ensureSharedFunctions,
  ensureUpdatedAtTriggers,
  ensureExtensions,
  ensureAppRoleType,
  ensureUpdateUpdatedAtFunction,
  ensureCurrentUserIdFunction,
  ensureAuditLoggingFunction,
  ensureUnifiedEmployeesView,
};
