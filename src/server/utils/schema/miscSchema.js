/**
 * Miscellaneous Schema
 * 
 * Manages:
 * - notifications: System notifications
 * - holidays: Holiday calendar
 * - company_events: Company event records
 * - calendar_settings: Calendar configuration
 * - reports: Generated report records
 * - custom_reports: Custom report definitions
 * - role_change_requests: Role change request tracking
 * - feature_flags: Feature flag management
 * - file_storage: File storage metadata
 * 
 * Dependencies:
 * - users (for user_id and created_by references)
 * - Requires sync_holidays_date() function (from sharedFunctions)
 */

/**
 * Ensure notifications table exists
 */
async function ensureNotificationsTable(client) {
  // First check if table exists
  const tableExists = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'notifications'
    );
  `);

  if (!tableExists.rows[0].exists) {
    // Create table with agency_id as nullable initially
    await client.query(`
      CREATE TABLE public.notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        type TEXT NOT NULL DEFAULT 'in_app',
        category TEXT NOT NULL DEFAULT 'system',
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        metadata JSONB,
        priority TEXT NOT NULL DEFAULT 'normal',
        action_url TEXT,
        read_at TIMESTAMP WITH TIME ZONE,
        sent_at TIMESTAMP WITH TIME ZONE,
        expires_at TIMESTAMP WITH TIME ZONE,
        agency_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
  }

  // Check if agency_id column exists and handle it
  // NOTE: Only reference agencies table if it exists (main database only)
  // In agency databases, agencies table doesn't exist, so skip those operations
  await client.query(`
    DO $$
    DECLARE
      agencies_table_exists BOOLEAN;
    BEGIN
      -- Check if agencies table exists (main database only)
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'agencies'
      ) INTO agencies_table_exists;
      
      -- Add agency_id column if it doesn't exist
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications' 
        AND column_name = 'agency_id'
      ) THEN
        ALTER TABLE public.notifications ADD COLUMN agency_id UUID;
      END IF;
      
      -- Only try to populate agency_id if we're in main database (agencies table exists)
      IF agencies_table_exists THEN
        -- Update existing records with agency_id from profiles (main database only)
        BEGIN
          UPDATE public.notifications n
          SET agency_id = (
            SELECT p.agency_id 
            FROM public.profiles p 
            WHERE p.user_id = n.user_id 
            LIMIT 1
          )
          WHERE n.agency_id IS NULL 
          AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = n.user_id);
        EXCEPTION WHEN OTHERS THEN
          -- If profiles table doesn't exist (agency database), skip
          NULL;
        END;
        
        -- Set default for any remaining nulls (main database only)
        BEGIN
          UPDATE public.notifications 
          SET agency_id = COALESCE(
            (SELECT id FROM public.agencies LIMIT 1),
            '00000000-0000-0000-0000-000000000000'::UUID
          )
          WHERE agency_id IS NULL;
        EXCEPTION WHEN OTHERS THEN
          -- If agencies table doesn't exist, skip
          NULL;
        END;
        
        -- Make agency_id NOT NULL if we have agencies (main database only)
        IF EXISTS (SELECT 1 FROM public.agencies LIMIT 1) THEN
          BEGIN
            ALTER TABLE public.notifications ALTER COLUMN agency_id SET NOT NULL;
          EXCEPTION WHEN OTHERS THEN
            -- If it fails, it might already be NOT NULL or have nulls, skip
            NULL;
          END;
        END IF;
      END IF;
      -- In agency databases, agency_id remains nullable (no agencies table exists there)
    END $$;
  `);

  // Create indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_agency_id ON public.notifications(agency_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON public.notifications(read_at);
    CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);
  `);
}

/**
 * Ensure holidays table exists
 */
async function ensureHolidaysTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.holidays (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      holiday_date DATE NOT NULL,
      date DATE,
      holiday_type TEXT DEFAULT 'public',
      is_recurring BOOLEAN DEFAULT false,
      description TEXT,
      is_company_holiday BOOLEAN DEFAULT false,
      is_national_holiday BOOLEAN DEFAULT false,
      agency_id UUID,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(holiday_date, name, agency_id)
    );
  `);

  // Add missing columns and indexes for existing tables (migrate in-place)
  await client.query(`
    DO $$ 
    BEGIN
      -- Add date column if it doesn't exist (alias for holiday_date for frontend compatibility)
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'holidays' 
        AND column_name = 'date'
      ) THEN
        ALTER TABLE public.holidays ADD COLUMN date DATE;
        -- Copy holiday_date to date for existing records
        UPDATE public.holidays SET date = holiday_date WHERE date IS NULL;
      END IF;

      -- Add is_company_holiday column if it doesn't exist
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'holidays' 
        AND column_name = 'is_company_holiday'
      ) THEN
        ALTER TABLE public.holidays ADD COLUMN is_company_holiday BOOLEAN DEFAULT false;
        -- Set default based on existing holiday_type if it exists
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'holidays' 
          AND column_name = 'holiday_type'
        ) THEN
          UPDATE public.holidays SET is_company_holiday = (holiday_type = 'company') WHERE is_company_holiday IS NULL;
        END IF;
        UPDATE public.holidays SET is_company_holiday = false WHERE is_company_holiday IS NULL;
      END IF;

      -- Add is_national_holiday column if it doesn't exist
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'holidays' 
        AND column_name = 'is_national_holiday'
      ) THEN
        ALTER TABLE public.holidays ADD COLUMN is_national_holiday BOOLEAN DEFAULT false;
        -- Set default based on existing holiday_type if it exists
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'holidays' 
          AND column_name = 'holiday_type'
        ) THEN
          UPDATE public.holidays SET is_national_holiday = (holiday_type = 'public' OR holiday_type = 'national') WHERE is_national_holiday IS NULL;
        END IF;
        UPDATE public.holidays SET is_national_holiday = false WHERE is_national_holiday IS NULL;
      END IF;

      -- Add agency_id column if it doesn't exist
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'holidays' 
        AND column_name = 'agency_id'
      ) THEN
        ALTER TABLE public.holidays ADD COLUMN agency_id UUID;
      END IF;
    END $$;
  `);

  // Create indexes for performance and multi-tenancy filtering
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_holidays_date ON public.holidays(date);
    CREATE INDEX IF NOT EXISTS idx_holidays_holiday_date ON public.holidays(holiday_date);
    CREATE INDEX IF NOT EXISTS idx_holidays_agency_id ON public.holidays(agency_id);
  `);

  // Create trigger for sync_holidays_date function (after table exists)
  await client.query(`
    DROP TRIGGER IF EXISTS sync_holidays_date_trigger ON public.holidays;
    CREATE TRIGGER sync_holidays_date_trigger
      BEFORE INSERT OR UPDATE ON public.holidays
      FOR EACH ROW
      EXECUTE FUNCTION public.sync_holidays_date();
  `);
}

/**
 * Ensure company_events table exists
 */
async function ensureCompanyEventsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.company_events (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      title TEXT NOT NULL,
      description TEXT,
      event_type TEXT,
      start_date TIMESTAMP WITH TIME ZONE NOT NULL,
      end_date TIMESTAMP WITH TIME ZONE,
      location TEXT,
      is_all_day BOOLEAN DEFAULT false,
      color TEXT DEFAULT '#3b82f6',
      created_by UUID REFERENCES public.users(id),
      agency_id UUID,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add missing columns and indexes for existing tables (migrate in-place)
  await client.query(`
    DO $$
    BEGIN
      -- Add color column if it doesn't exist
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'company_events' 
          AND column_name = 'color'
      ) THEN
        ALTER TABLE public.company_events ADD COLUMN color TEXT DEFAULT '#3b82f6';
      END IF;

      -- Add agency_id column if it doesn't exist
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'company_events' 
          AND column_name = 'agency_id'
      ) THEN
        ALTER TABLE public.company_events ADD COLUMN agency_id UUID;
      END IF;

      -- Ensure is_all_day column exists (rename all_day if present)
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'company_events' 
          AND column_name = 'is_all_day'
      ) THEN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'company_events' 
            AND column_name = 'all_day'
        ) THEN
          ALTER TABLE public.company_events RENAME COLUMN all_day TO is_all_day;
        ELSE
          ALTER TABLE public.company_events ADD COLUMN is_all_day BOOLEAN DEFAULT false;
        END IF;
      END IF;
    END $$;
  `);

  // Indexes for performance and multi-tenancy filtering
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_company_events_agency_id ON public.company_events(agency_id);
    CREATE INDEX IF NOT EXISTS idx_company_events_start_date ON public.company_events(start_date);
  `);
}

/**
 * Ensure calendar_settings table exists
 */
async function ensureCalendarSettingsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.calendar_settings (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      setting_key TEXT UNIQUE NOT NULL,
      setting_value JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
}

/**
 * Ensure reports table exists
 */
async function ensureReportsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.reports (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      report_type TEXT NOT NULL,
      description TEXT,
      parameters JSONB,
      file_path TEXT,
      file_name TEXT,
      file_size BIGINT,
      generated_by UUID REFERENCES public.users(id),
      expires_at TIMESTAMP WITH TIME ZONE,
      is_public BOOLEAN DEFAULT false,
      agency_id UUID,
      generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add missing columns if they don't exist (for existing tables)
  // First check if table exists
  const tableExists = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'reports'
    )
  `);
  
  if (tableExists.rows[0].exists) {
    // Table exists, check and migrate columns
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'reports' 
      AND column_name IN ('type', 'report_type')
    `);
    
    const hasType = columnCheck.rows.some(r => r.column_name === 'type');
    const hasReportType = columnCheck.rows.some(r => r.column_name === 'report_type');
    
    // Rename 'type' to 'report_type' if needed
    if (hasType && !hasReportType) {
      await client.query('ALTER TABLE public.reports RENAME COLUMN type TO report_type');
      console.log('[SQL] ✅ Renamed reports.type to reports.report_type');
    }
    
    // Add report_type if it still doesn't exist
    if (!hasReportType) {
      // Check if table has rows
      const rowCount = await client.query('SELECT COUNT(*) as count FROM public.reports');
      const count = parseInt(rowCount.rows[0].count);
      
      if (count > 0) {
        // Table has data, add as nullable first
        await client.query('ALTER TABLE public.reports ADD COLUMN report_type TEXT');
        await client.query('UPDATE public.reports SET report_type = \'custom\' WHERE report_type IS NULL');
        await client.query('ALTER TABLE public.reports ALTER COLUMN report_type SET NOT NULL');
        await client.query('ALTER TABLE public.reports ALTER COLUMN report_type SET DEFAULT \'custom\'');
      } else {
        // Empty table, can add as NOT NULL directly
        await client.query('ALTER TABLE public.reports ADD COLUMN report_type TEXT NOT NULL DEFAULT \'custom\'');
      }
      console.log('[SQL] ✅ Added report_type column to reports table');
    }
  }
  
  // Use DO block for other columns (simpler)
  await client.query(`
    DO $$
    BEGIN

      -- Add file_name if it doesn't exist
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'reports' 
        AND column_name = 'file_name'
      ) THEN
        ALTER TABLE public.reports ADD COLUMN file_name TEXT;
      END IF;

      -- Add file_size if it doesn't exist
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'reports' 
        AND column_name = 'file_size'
      ) THEN
        ALTER TABLE public.reports ADD COLUMN file_size BIGINT;
      END IF;

      -- Add expires_at if it doesn't exist
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'reports' 
        AND column_name = 'expires_at'
      ) THEN
        ALTER TABLE public.reports ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
      END IF;

      -- Add is_public if it doesn't exist
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'reports' 
        AND column_name = 'is_public'
      ) THEN
        ALTER TABLE public.reports ADD COLUMN is_public BOOLEAN DEFAULT false;
      END IF;

      -- Add agency_id if it doesn't exist
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'reports' 
        AND column_name = 'agency_id'
      ) THEN
        ALTER TABLE public.reports ADD COLUMN agency_id UUID;
        CREATE INDEX IF NOT EXISTS idx_reports_agency_id ON public.reports(agency_id);
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error adding columns to reports table: %', SQLERRM;
    END $$;
  `);
}

/**
 * Ensure custom_reports table exists
 */
async function ensureCustomReportsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.custom_reports (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      description TEXT,
      report_type TEXT NOT NULL,
      query_config JSONB,
      created_by UUID REFERENCES public.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add missing columns if they don't exist
  await client.query(`
    DO $$
    BEGIN
      -- Add agency_id if it doesn't exist
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'custom_reports' 
        AND column_name = 'agency_id'
      ) THEN
        ALTER TABLE public.custom_reports ADD COLUMN agency_id UUID;
        CREATE INDEX IF NOT EXISTS idx_custom_reports_agency_id ON public.custom_reports(agency_id);
      END IF;

      -- Add user_id if it doesn't exist (for compatibility with frontend)
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'custom_reports' 
        AND column_name = 'user_id'
      ) THEN
        ALTER TABLE public.custom_reports ADD COLUMN user_id UUID REFERENCES public.users(id);
        CREATE INDEX IF NOT EXISTS idx_custom_reports_user_id ON public.custom_reports(user_id);
      END IF;

      -- Add data_sources if it doesn't exist (TEXT[] for array of strings)
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'custom_reports' 
        AND column_name = 'data_sources'
      ) THEN
        ALTER TABLE public.custom_reports ADD COLUMN data_sources TEXT[] DEFAULT '{}';
      END IF;

      -- Add is_public if it doesn't exist
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'custom_reports' 
        AND column_name = 'is_public'
      ) THEN
        ALTER TABLE public.custom_reports ADD COLUMN is_public BOOLEAN DEFAULT false;
      END IF;

      -- Add is_scheduled if it doesn't exist
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'custom_reports' 
        AND column_name = 'is_scheduled'
      ) THEN
        ALTER TABLE public.custom_reports ADD COLUMN is_scheduled BOOLEAN DEFAULT false;
      END IF;

      -- Add filters if it doesn't exist (for filter configuration)
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'custom_reports' 
        AND column_name = 'filters'
      ) THEN
        ALTER TABLE public.custom_reports ADD COLUMN filters JSONB;
      END IF;

      -- Add aggregations if it doesn't exist
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'custom_reports' 
        AND column_name = 'aggregations'
      ) THEN
        ALTER TABLE public.custom_reports ADD COLUMN aggregations JSONB;
      END IF;

      -- Add group_by if it doesn't exist (TEXT[] for array of strings)
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'custom_reports' 
        AND column_name = 'group_by'
      ) THEN
        ALTER TABLE public.custom_reports ADD COLUMN group_by TEXT[] DEFAULT '{}';
      END IF;

      -- Add visualizations if it doesn't exist
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'custom_reports' 
        AND column_name = 'visualizations'
      ) THEN
        ALTER TABLE public.custom_reports ADD COLUMN visualizations JSONB;
      END IF;

      -- Add schedule_config if it doesn't exist
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'custom_reports' 
        AND column_name = 'schedule_config'
      ) THEN
        ALTER TABLE public.custom_reports ADD COLUMN schedule_config JSONB;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error adding columns to custom_reports table: %', SQLERRM;
    END $$;
  `);
}

/**
 * Ensure role_change_requests table exists
 */
async function ensureRoleChangeRequestsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.role_change_requests (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      requested_role TEXT NOT NULL,
      previous_role TEXT,
      reason TEXT,
      status TEXT DEFAULT 'pending',
      requested_by UUID REFERENCES public.users(id),
      reviewed_by UUID REFERENCES public.users(id),
      reviewed_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
}

/**
 * Ensure feature_flags table exists
 */
async function ensureFeatureFlagsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.feature_flags (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      feature_key TEXT UNIQUE NOT NULL,
      feature_name TEXT NOT NULL,
      description TEXT,
      is_enabled BOOLEAN DEFAULT false,
      settings JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
}

/**
 * Ensure file_storage table exists
 */
async function ensureFileStorageTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.file_storage (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      bucket_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_name TEXT,
      file_size BIGINT,
      mime_type TEXT,
      uploaded_by UUID REFERENCES public.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
}

/**
 * Ensure document_folders table exists
 */
async function ensureDocumentFoldersTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.document_folders (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      description TEXT,
      parent_folder_id UUID REFERENCES public.document_folders(id) ON DELETE CASCADE,
      created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      agency_id UUID NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  // Create indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_document_folders_agency_id ON public.document_folders(agency_id);
    CREATE INDEX IF NOT EXISTS idx_document_folders_parent_folder_id ON public.document_folders(parent_folder_id);
    CREATE INDEX IF NOT EXISTS idx_document_folders_created_by ON public.document_folders(created_by);
    CREATE INDEX IF NOT EXISTS idx_document_folders_name ON public.document_folders(name);
  `);

  // Create updated_at trigger (only if function exists)
  try {
    const functionCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.proname = 'update_updated_at_column'
      );
    `);
    
    if (functionCheck.rows[0].exists) {
      await client.query(`
        DROP TRIGGER IF EXISTS update_document_folders_updated_at ON public.document_folders;
        CREATE TRIGGER update_document_folders_updated_at
          BEFORE UPDATE ON public.document_folders
          FOR EACH ROW
          EXECUTE FUNCTION public.update_updated_at_column();
      `);
    } else {
      console.warn('[SQL] ⚠️ update_updated_at_column function not found, skipping trigger creation for document_folders');
    }
  } catch (error) {
    console.warn('[SQL] ⚠️ Could not create trigger for document_folders:', error.message);
  }
}

/**
 * Ensure documents table exists
 */
async function ensureDocumentsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.documents (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      description TEXT,
      file_path TEXT NOT NULL,
      file_size BIGINT NOT NULL DEFAULT 0,
      file_type TEXT NOT NULL,
      uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      folder_id UUID REFERENCES public.document_folders(id) ON DELETE SET NULL,
      agency_id UUID NOT NULL,
      tags TEXT[] DEFAULT '{}',
      is_public BOOLEAN NOT NULL DEFAULT false,
      download_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  // Create indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_documents_agency_id ON public.documents(agency_id);
    CREATE INDEX IF NOT EXISTS idx_documents_folder_id ON public.documents(folder_id);
    CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON public.documents(uploaded_by);
    CREATE INDEX IF NOT EXISTS idx_documents_name ON public.documents(name);
    CREATE INDEX IF NOT EXISTS idx_documents_tags ON public.documents USING GIN(tags);
    CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at);
    CREATE INDEX IF NOT EXISTS idx_documents_is_public ON public.documents(is_public);
  `);

  // Create updated_at trigger (only if function exists)
  try {
    const functionCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.proname = 'update_updated_at_column'
      );
    `);
    
    if (functionCheck.rows[0].exists) {
      await client.query(`
        DROP TRIGGER IF EXISTS update_documents_updated_at ON public.documents;
        CREATE TRIGGER update_documents_updated_at
          BEFORE UPDATE ON public.documents
          FOR EACH ROW
          EXECUTE FUNCTION public.update_updated_at_column();
      `);
    } else {
      console.warn('[SQL] ⚠️ update_updated_at_column function not found, skipping trigger creation for documents');
    }
  } catch (error) {
    console.warn('[SQL] ⚠️ Could not create trigger for documents:', error.message);
  }
}

/**
 * Ensure document_versions table exists
 */
async function ensureDocumentVersionsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.document_versions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
      version_number INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      change_summary TEXT,
      is_current BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  // Create indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON public.document_versions(document_id);
    CREATE INDEX IF NOT EXISTS idx_document_versions_uploaded_by ON public.document_versions(uploaded_by);
    CREATE INDEX IF NOT EXISTS idx_document_versions_is_current ON public.document_versions(is_current);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_document_versions_unique ON public.document_versions(document_id, version_number);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_document_versions_one_current 
      ON public.document_versions(document_id) 
      WHERE is_current = true;
  `);
}

/**
 * Ensure document_permissions table exists
 */
async function ensureDocumentPermissionsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.document_permissions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      role TEXT,
      permission_type TEXT NOT NULL CHECK (permission_type IN ('read', 'write', 'admin')),
      granted_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      UNIQUE(document_id, user_id)
    );
  `);

  // Create indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_document_permissions_document_id ON public.document_permissions(document_id);
    CREATE INDEX IF NOT EXISTS idx_document_permissions_user_id ON public.document_permissions(user_id);
    CREATE INDEX IF NOT EXISTS idx_document_permissions_permission_type ON public.document_permissions(permission_type);
  `);
}

/**
 * Ensure module_settings table exists
 */
async function ensureModuleSettingsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.module_settings (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      module VARCHAR(100) NOT NULL, -- inventory, procurement, assets, workflow, integration
      settings JSONB DEFAULT '{}'::jsonb,
      created_by UUID REFERENCES public.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(agency_id, module)
    );
  `);

  // Create indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_module_settings_agency_id ON public.module_settings(agency_id);
    CREATE INDEX IF NOT EXISTS idx_module_settings_module ON public.module_settings(module);
  `);

  // Create updated_at trigger
  try {
    const functionCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.proname = 'update_updated_at_column'
      );
    `);
    
    if (functionCheck.rows[0].exists) {
      await client.query(`
        DROP TRIGGER IF EXISTS update_module_settings_updated_at ON public.module_settings;
        CREATE TRIGGER update_module_settings_updated_at
          BEFORE UPDATE ON public.module_settings
          FOR EACH ROW
          EXECUTE FUNCTION public.update_updated_at_column();
      `);
    }
  } catch (error) {
    console.warn('[SQL] ⚠️ Could not create trigger for module_settings:', error.message);
  }
}

/**
 * Ensure all miscellaneous tables
 */
async function ensureMiscSchema(client) {
  console.log('[SQL] Ensuring miscellaneous schema...');
  
  await ensureNotificationsTable(client);
  await ensureHolidaysTable(client);
  await ensureCompanyEventsTable(client);
  await ensureCalendarSettingsTable(client);
  await ensureReportsTable(client);
  await ensureCustomReportsTable(client);
  await ensureRoleChangeRequestsTable(client);
  await ensureFeatureFlagsTable(client);
  await ensureFileStorageTable(client);
  await ensureModuleSettingsTable(client);
  
  // Document management tables
  await ensureDocumentFoldersTable(client);
  await ensureDocumentsTable(client);
  await ensureDocumentVersionsTable(client);
  await ensureDocumentPermissionsTable(client);
  
  console.log('[SQL] ✅ Miscellaneous schema ensured');
}

module.exports = {
  ensureMiscSchema,
  ensureNotificationsTable,
  ensureHolidaysTable,
  ensureCompanyEventsTable,
  ensureCalendarSettingsTable,
  ensureReportsTable,
  ensureCustomReportsTable,
  ensureRoleChangeRequestsTable,
  ensureFeatureFlagsTable,
  ensureFileStorageTable,
  ensureModuleSettingsTable,
  ensureDocumentFoldersTable,
  ensureDocumentsTable,
  ensureDocumentVersionsTable,
  ensureDocumentPermissionsTable,
};
