/**
 * Authentication and Authorization Schema
 * 
 * Manages:
 * - users: Core user accounts with email and password
 * - profiles: Extended user profiles with agency_id
 * - user_roles: Role assignments linking users to roles and agencies
 * - audit_logs: System audit trail for all operations
 * - permissions: Permission definitions
 * - role_permissions: Role-permission mappings
 * - user_preferences: User preference settings
 * 
 * Dependencies:
 * - Requires app_role enum type (from sharedFunctions)
 * - Requires current_user_id() function (from sharedFunctions)
 * - Requires log_audit_change() function (from sharedFunctions)
 */

/**
 * Ensure users table exists
 */
async function ensureUsersTable(client) {
  try {
    // Check if table already exists first
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      )
    `);
    
    if (tableCheck.rows[0].exists) {
      // Table exists, just ensure columns are up to date
      // (The rest of the function will handle column additions)
      // But we still need to continue to add missing columns
    } else {
      // Extensions should already be created by ensureSharedFunctions, skip here
      // Create the users table with DO block to handle all errors
      await client.query(`
        DO $$ 
        BEGIN
          CREATE TABLE IF NOT EXISTS public.users (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            email_confirmed BOOLEAN DEFAULT false,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            last_sign_in_at TIMESTAMP WITH TIME ZONE,
            raw_user_meta_data JSONB
          );
        EXCEPTION
          WHEN duplicate_table THEN
            -- Table already exists, that's fine
            NULL;
          WHEN OTHERS THEN
            -- If table exists now, that's fine
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = 'users'
            ) THEN
              -- If it's a type conflict, wait and check again
              IF SQLSTATE = '23505' AND SQLERRM LIKE '%pg_type_typname_nsp_index%' THEN
                PERFORM pg_sleep(0.5);
                IF EXISTS (
                  SELECT 1 FROM information_schema.tables 
                  WHERE table_schema = 'public' 
                  AND table_name = 'users'
                ) THEN
                  RETURN;
                END IF;
              END IF;
              RAISE;
            END IF;
        END $$;
      `);
    }

    // Verify table was created
    const tableVerification = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (!tableVerification.rows[0].exists) {
      throw new Error('Failed to create users table');
    }

    // Check if update_updated_at_column function exists before creating trigger
    const updateFunctionCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.proname = 'update_updated_at_column'
      );
    `);
    
    if (updateFunctionCheck.rows[0].exists) {
      // Create updated_at trigger
      await client.query(`
        DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
        CREATE TRIGGER update_users_updated_at
          BEFORE UPDATE ON public.users
          FOR EACH ROW
          EXECUTE FUNCTION public.update_updated_at_column();
      `);
    } else {
      console.warn('[SQL] ⚠️ update_updated_at_column function not found, skipping trigger creation');
    }

    // Check if log_audit_change function exists before creating trigger
    const auditFunctionCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.proname = 'log_audit_change'
      );
    `);
    
    if (auditFunctionCheck.rows[0].exists) {
      // Create audit trigger
      await client.query(`
        DROP TRIGGER IF EXISTS audit_users_changes ON public.users;
        CREATE TRIGGER audit_users_changes
          AFTER INSERT OR UPDATE OR DELETE ON public.users
          FOR EACH ROW
          EXECUTE FUNCTION public.log_audit_change();
      `);
    } else {
      console.warn('[SQL] ⚠️ log_audit_change function not found, skipping audit trigger creation');
    }
    
    // Add 2FA columns if they don't exist
    try {
      await client.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'users' 
            AND column_name = 'two_factor_secret'
          ) THEN
            ALTER TABLE public.users ADD COLUMN two_factor_secret TEXT;
          END IF;

          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'users' 
            AND column_name = 'two_factor_enabled'
          ) THEN
            ALTER TABLE public.users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT false;
          END IF;

          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'users' 
            AND column_name = 'recovery_codes'
          ) THEN
            ALTER TABLE public.users ADD COLUMN recovery_codes TEXT[];
          END IF;

          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'users' 
            AND column_name = 'two_factor_verified_at'
          ) THEN
            ALTER TABLE public.users ADD COLUMN two_factor_verified_at TIMESTAMP WITH TIME ZONE;
          END IF;

          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'users' 
            AND column_name = 'password_changed_at'
          ) THEN
            ALTER TABLE public.users ADD COLUMN password_changed_at TIMESTAMP WITH TIME ZONE;
          END IF;

          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'users' 
            AND column_name = 'password_policy_id'
          ) THEN
            ALTER TABLE public.users ADD COLUMN password_policy_id UUID;
          END IF;
        END $$;
      `);
      console.log('[SQL] ✅ 2FA and password policy columns added to users table');
    } catch (error) {
      console.warn('[SQL] ⚠️ Warning adding 2FA/password columns:', error.message);
    }
    
    console.log('[SQL] ✅ Users table ensured successfully');
  } catch (error) {
    console.error('[SQL] ❌ Error ensuring users table:', error.message);
    console.error('[SQL] Error stack:', error.stack);
    throw error;
  }
}

/**
 * Ensure profiles table exists
 */
async function ensureProfilesTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.profiles (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      agency_id UUID,
      full_name TEXT,
      phone TEXT,
      department TEXT,
      position TEXT,
      hire_date DATE,
      avatar_url TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add agency_id column if it doesn't exist (for backward compatibility)
  await client.query(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'agency_id'
      ) THEN
        ALTER TABLE public.profiles ADD COLUMN agency_id UUID;
        CREATE INDEX IF NOT EXISTS idx_profiles_agency_id ON public.profiles(agency_id);
      END IF;
    END $$;
  `);

  // Create updated_at trigger
  await client.query(`
    DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
    CREATE TRIGGER update_profiles_updated_at
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  `);

  // Create audit trigger
  await client.query(`
    DROP TRIGGER IF EXISTS audit_profiles_changes ON public.profiles;
    CREATE TRIGGER audit_profiles_changes
      AFTER INSERT OR UPDATE OR DELETE ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.log_audit_change();
  `);
}

/**
 * Ensure user_roles table exists
 */
async function ensureUserRolesTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.user_roles (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      role public.app_role NOT NULL,
      agency_id UUID,
      assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      assigned_by UUID REFERENCES public.users(id),
      UNIQUE(user_id, role, agency_id)
    );
  `);

  // Add agency_id column if it doesn't exist (for backward compatibility)
  await client.query(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_roles' 
        AND column_name = 'agency_id'
      ) THEN
        ALTER TABLE public.user_roles ADD COLUMN agency_id UUID;
        CREATE INDEX IF NOT EXISTS idx_user_roles_agency_id ON public.user_roles(agency_id);
        
        -- Update UNIQUE constraint to include agency_id if it doesn't already
        IF EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'user_roles_user_id_role_key'
        ) THEN
          ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
        END IF;
        
        -- Add new constraint with agency_id
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'user_roles_user_id_role_agency_id_key'
        ) THEN
          ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_agency_id_key 
          UNIQUE(user_id, role, agency_id);
        END IF;
      END IF;
    END $$;
  `);
}

/**
 * Ensure audit_logs table exists
 */
async function ensureAuditLogsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.audit_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      table_name TEXT NOT NULL,
      action TEXT NOT NULL,
      user_id UUID REFERENCES public.users(id),
      record_id UUID,
      old_values JSONB,
      new_values JSONB,
      ip_address INET,
      user_agent TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
}

/**
 * Ensure permissions table exists
 */
async function ensurePermissionsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.permissions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
}

/**
 * Ensure role_permissions table exists
 */
async function ensureRolePermissionsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.role_permissions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      role TEXT NOT NULL,
      permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
      granted BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(role, permission_id)
    );
  `);
}

/**
 * Ensure user_permissions table exists
 */
async function ensureUserPermissionsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.user_permissions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
      granted BOOLEAN NOT NULL,
      granted_by UUID REFERENCES public.users(id),
      granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      reason TEXT,
      expires_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, permission_id)
    );
  `);
  
  // Create indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id 
    ON public.user_permissions(user_id);
  `);
  
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_id 
    ON public.user_permissions(permission_id);
  `);
  
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_user_permissions_granted 
    ON public.user_permissions(granted);
  `);
}

/**
 * Ensure user_preferences table exists
 */
async function ensureUserPreferencesTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.user_preferences (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      preferences JSONB DEFAULT '{}'::jsonb,
      theme TEXT DEFAULT 'light',
      language TEXT DEFAULT 'en',
      timezone TEXT,
      date_format TEXT,
      time_format TEXT,
      notifications_enabled BOOLEAN DEFAULT true,
      email_notifications BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
}

/**
 * Ensure all authentication and authorization tables
 */
async function ensureAuthSchema(client) {
  console.log('[SQL] Ensuring authentication schema...');
  
  try {
    await ensureUsersTable(client);
    await ensureProfilesTable(client);
    await ensureUserRolesTable(client);
    await ensureAuditLogsTable(client);
    await ensurePermissionsTable(client);
    await ensureRolePermissionsTable(client);
    await ensureUserPermissionsTable(client);
    await ensurePermissionsTable(client);
    await ensureRolePermissionsTable(client);
    await ensureUserPreferencesTable(client);
    
    // Verify all critical tables exist
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'profiles', 'user_roles', 'audit_logs')
    `);
    const existingTables = tableCheck.rows.map(r => r.table_name);
    const requiredTables = ['users', 'profiles', 'user_roles', 'audit_logs'];
    const missingTables = requiredTables.filter(t => !existingTables.includes(t));
    
    if (missingTables.length > 0) {
      throw new Error(`Missing required auth tables: ${missingTables.join(', ')}`);
    }
    
    console.log('[SQL] ✅ Authentication schema ensured');
  } catch (error) {
    console.error('[SQL] ❌ Error ensuring authentication schema:', error.message);
    throw error;
  }
}

module.exports = {
  ensureAuthSchema,
  ensureUsersTable,
  ensureProfilesTable,
  ensureUserRolesTable,
  ensureAuditLogsTable,
  ensurePermissionsTable,
  ensureRolePermissionsTable,
  ensureUserPermissionsTable,
  ensureUserPreferencesTable,
};
