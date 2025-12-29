/**
 * Advanced Reporting Schema
 * 
 * Manages:
 * - custom_reports: Custom report definitions (already exists)
 * - report_schedules: Scheduled report delivery
 * - report_templates: Report templates
 * - report_filters: Saved filter configurations
 */

/**
 * Ensure report_schedules table exists
 */
async function ensureReportSchedulesTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.report_schedules (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      report_template_id UUID REFERENCES public.custom_reports(id),
      schedule_name VARCHAR(255) NOT NULL,
      schedule_type VARCHAR(50) NOT NULL, -- daily, weekly, monthly, quarterly, yearly, custom
      cron_expression VARCHAR(100), -- For custom schedules
      day_of_week INTEGER, -- 0-6 (Sunday-Saturday)
      day_of_month INTEGER, -- 1-31
      time TIME DEFAULT '09:00:00',
      recipients TEXT[], -- Array of email addresses
      format VARCHAR(20) DEFAULT 'pdf', -- pdf, excel, csv
      filters JSONB, -- Saved filter configuration
      is_active BOOLEAN DEFAULT true,
      last_run_at TIMESTAMP WITH TIME ZONE,
      next_run_at TIMESTAMP WITH TIME ZONE,
      created_by UUID REFERENCES public.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_report_schedules_agency_id ON public.report_schedules(agency_id);
    CREATE INDEX IF NOT EXISTS idx_report_schedules_is_active ON public.report_schedules(is_active);
    CREATE INDEX IF NOT EXISTS idx_report_schedules_next_run_at ON public.report_schedules(next_run_at);
  `);

  // Create updated_at trigger
  await client.query(`
    DROP TRIGGER IF EXISTS update_report_schedules_updated_at ON public.report_schedules;
    CREATE TRIGGER update_report_schedules_updated_at
      BEFORE UPDATE ON public.report_schedules
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  `);
}

/**
 * Ensure report_templates table exists (enhancement to custom_reports)
 */
async function ensureReportTemplatesTable(client) {
  // Check if custom_reports table exists, if not create it
  const tableCheck = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'custom_reports'
    );
  `);

  if (!tableCheck.rows[0].exists) {
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.custom_reports (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        agency_id UUID,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        report_type VARCHAR(100),
        query_config JSONB,
        columns_config JSONB,
        filters_config JSONB,
        chart_config JSONB,
        is_public BOOLEAN DEFAULT false,
        created_by UUID REFERENCES public.users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
  }

  // Add template-specific columns and other missing columns if they don't exist
  await client.query(`
    DO $$ 
    BEGIN
      -- Add is_template column
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'custom_reports' 
        AND column_name = 'is_template'
      ) THEN
        ALTER TABLE public.custom_reports ADD COLUMN is_template BOOLEAN DEFAULT false;
      END IF;

      -- Add category column
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'custom_reports' 
        AND column_name = 'category'
      ) THEN
        ALTER TABLE public.custom_reports ADD COLUMN category VARCHAR(100);
      END IF;

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

      -- Add filters if it doesn't exist
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

      -- Add group_by if it doesn't exist
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
 * Ensure report_executions table exists (for tracking report runs)
 */
async function ensureReportExecutionsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.report_executions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      report_id UUID REFERENCES public.custom_reports(id),
      schedule_id UUID REFERENCES public.report_schedules(id),
      execution_type VARCHAR(50) DEFAULT 'manual', -- manual, scheduled
      status VARCHAR(50) DEFAULT 'pending', -- pending, running, completed, failed
      parameters JSONB,
      result_data JSONB,
      file_path TEXT, -- Path to generated file
      file_size BIGINT,
      error_message TEXT,
      started_at TIMESTAMP WITH TIME ZONE,
      completed_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_report_executions_agency_id ON public.report_executions(agency_id);
    CREATE INDEX IF NOT EXISTS idx_report_executions_report_id ON public.report_executions(report_id);
    CREATE INDEX IF NOT EXISTS idx_report_executions_schedule_id ON public.report_executions(schedule_id);
    CREATE INDEX IF NOT EXISTS idx_report_executions_status ON public.report_executions(status);
    CREATE INDEX IF NOT EXISTS idx_report_executions_created_at ON public.report_executions(created_at);
  `);
}

/**
 * Ensure all reporting enhancement tables
 */
async function ensureReportingSchema(client) {
  console.log('[SQL] Ensuring advanced reporting schema...');
  
  try {
    await ensureReportTemplatesTable(client);
    await ensureReportSchedulesTable(client);
    await ensureReportExecutionsTable(client);
    
    console.log('[SQL] ✅ Advanced reporting schema ensured');
  } catch (error) {
    console.error('[SQL] ❌ Error ensuring reporting schema:', error.message);
    throw error;
  }
}

module.exports = {
  ensureReportingSchema,
  ensureReportSchedulesTable,
  ensureReportTemplatesTable,
  ensureReportExecutionsTable,
};
