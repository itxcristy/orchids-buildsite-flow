/**
 * CRM Schema
 * 
 * Manages:
 * - lead_sources: Lead source categories
 * - leads: Lead records with status tracking
 * - crm_activities: CRM activity logging
 * - sales_pipeline: Sales pipeline stage definitions
 * 
 * Dependencies:
 * - users (for created_by and assigned_to references)
 */

/**
 * Ensure lead_sources table exists
 */
async function ensureLeadSourcesTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.lead_sources (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      agency_id UUID,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(name, agency_id)
    );
  `);

  // Add agency_id column if it doesn't exist (for backward compatibility)
  try {
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'lead_sources' 
          AND column_name = 'agency_id'
        ) THEN
          ALTER TABLE public.lead_sources ADD COLUMN agency_id UUID;
          CREATE INDEX IF NOT EXISTS idx_lead_sources_agency_id ON public.lead_sources(agency_id);
          -- Drop old unique constraint if exists and add new one with agency_id
          ALTER TABLE public.lead_sources DROP CONSTRAINT IF EXISTS lead_sources_name_key;
        END IF;
      END $$;
    `);
  } catch (error) {
    console.warn('[SQL] Warning: Could not add agency_id to lead_sources:', error.message);
  }
}

/**
 * Ensure leads table exists
 */
async function ensureLeadsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.leads (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      lead_number TEXT,
      lead_source_id UUID REFERENCES public.lead_sources(id),
      source_id UUID REFERENCES public.lead_sources(id),
      name TEXT,
      contact_name TEXT,
      company_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      website TEXT,
      job_title TEXT,
      industry TEXT,
      location TEXT,
      status TEXT DEFAULT 'new',
      priority TEXT DEFAULT 'medium',
      stage TEXT,
      value NUMERIC(15, 2),
      estimated_value NUMERIC(15, 2),
      probability INTEGER DEFAULT 0,
      expected_close_date DATE,
      due_date DATE,
      follow_up_date DATE,
      description TEXT,
      notes TEXT,
      tags TEXT[],
      custom_fields JSONB,
      assigned_to UUID REFERENCES public.users(id),
      assigned_team UUID,
      created_by UUID REFERENCES public.users(id),
      agency_id UUID,
      converted_to_client_id UUID REFERENCES public.clients(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(lead_number, agency_id)
    );
  `);

  // Add missing columns if they don't exist (for backward compatibility)
  try {
    await client.query(`
      DO $$ 
      BEGIN
        -- Add agency_id
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'leads' 
          AND column_name = 'agency_id'
        ) THEN
          ALTER TABLE public.leads ADD COLUMN agency_id UUID;
          CREATE INDEX IF NOT EXISTS idx_leads_agency_id ON public.leads(agency_id);
        END IF;

        -- Add lead_source_id (alias for source_id)
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'leads' 
          AND column_name = 'lead_source_id'
        ) THEN
          ALTER TABLE public.leads ADD COLUMN lead_source_id UUID REFERENCES public.lead_sources(id);
        END IF;

        -- Add contact_name
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'leads' 
          AND column_name = 'contact_name'
        ) THEN
          ALTER TABLE public.leads ADD COLUMN contact_name TEXT;
        END IF;

        -- Make name column nullable if it's NOT NULL (for backward compatibility)
        BEGIN
          ALTER TABLE public.leads ALTER COLUMN name DROP NOT NULL;
        EXCEPTION
          WHEN OTHERS THEN
            -- Column might not have NOT NULL constraint, ignore
            NULL;
        END;

        -- Add priority
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'leads' 
          AND column_name = 'priority'
        ) THEN
          ALTER TABLE public.leads ADD COLUMN priority TEXT DEFAULT 'medium';
        END IF;

        -- Add estimated_value (alias for value)
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'leads' 
          AND column_name = 'estimated_value'
        ) THEN
          ALTER TABLE public.leads ADD COLUMN estimated_value NUMERIC(15, 2);
        END IF;

        -- Add due_date
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'leads' 
          AND column_name = 'due_date'
        ) THEN
          ALTER TABLE public.leads ADD COLUMN due_date DATE;
        END IF;

        -- Add follow_up_date
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'leads' 
          AND column_name = 'follow_up_date'
        ) THEN
          ALTER TABLE public.leads ADD COLUMN follow_up_date DATE;
        END IF;

        -- Add notes (alias for description)
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'leads' 
          AND column_name = 'notes'
        ) THEN
          ALTER TABLE public.leads ADD COLUMN notes TEXT;
        END IF;

        -- Add address
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'leads' 
          AND column_name = 'address'
        ) THEN
          ALTER TABLE public.leads ADD COLUMN address TEXT;
        END IF;

        -- Add website
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'leads' 
          AND column_name = 'website'
        ) THEN
          ALTER TABLE public.leads ADD COLUMN website TEXT;
        END IF;

        -- Add pipeline_stage (for pipeline board integration)
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'leads' 
          AND column_name = 'pipeline_stage'
        ) THEN
          ALTER TABLE public.leads ADD COLUMN pipeline_stage TEXT;
          -- Sync existing stage values to pipeline_stage
          UPDATE public.leads SET pipeline_stage = stage WHERE stage IS NOT NULL AND pipeline_stage IS NULL;
        END IF;

        -- Add job_title
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'leads' 
          AND column_name = 'job_title'
        ) THEN
          ALTER TABLE public.leads ADD COLUMN job_title TEXT;
        END IF;

        -- Add industry
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'leads' 
          AND column_name = 'industry'
        ) THEN
          ALTER TABLE public.leads ADD COLUMN industry TEXT;
        END IF;

        -- Add location
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'leads' 
          AND column_name = 'location'
        ) THEN
          ALTER TABLE public.leads ADD COLUMN location TEXT;
        END IF;

        -- Add tags
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'leads' 
          AND column_name = 'tags'
        ) THEN
          ALTER TABLE public.leads ADD COLUMN tags TEXT[];
        END IF;

        -- Add custom_fields
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'leads' 
          AND column_name = 'custom_fields'
        ) THEN
          ALTER TABLE public.leads ADD COLUMN custom_fields JSONB;
        END IF;

        -- Add assigned_team
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'leads' 
          AND column_name = 'assigned_team'
        ) THEN
          ALTER TABLE public.leads ADD COLUMN assigned_team UUID;
        END IF;

        -- Add converted_to_client_id
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'leads' 
          AND column_name = 'converted_to_client_id'
        ) THEN
          ALTER TABLE public.leads ADD COLUMN converted_to_client_id UUID REFERENCES public.clients(id);
        END IF;

        -- Add pipeline_stage (for pipeline board integration)
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'leads' 
          AND column_name = 'pipeline_stage'
        ) THEN
          ALTER TABLE public.leads ADD COLUMN pipeline_stage TEXT;
          -- Sync existing stage values to pipeline_stage
          UPDATE public.leads SET pipeline_stage = stage WHERE stage IS NOT NULL AND pipeline_stage IS NULL;
        END IF;

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
        CREATE INDEX IF NOT EXISTS idx_leads_priority ON public.leads(priority);
        CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);
        CREATE INDEX IF NOT EXISTS idx_leads_lead_source_id ON public.leads(lead_source_id);
        CREATE INDEX IF NOT EXISTS idx_leads_due_date ON public.leads(due_date);
        CREATE INDEX IF NOT EXISTS idx_leads_follow_up_date ON public.leads(follow_up_date);
        CREATE INDEX IF NOT EXISTS idx_leads_pipeline_stage ON public.leads(pipeline_stage);
      END $$;
    `);
  } catch (error) {
    console.warn('[SQL] Warning: Could not add missing columns to leads:', error.message);
  }
}

/**
 * Ensure crm_activities table exists
 */
async function ensureCrmActivitiesTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.crm_activities (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
      client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
      activity_type TEXT NOT NULL,
      subject TEXT NOT NULL,
      description TEXT,
      activity_date TIMESTAMP WITH TIME ZONE NOT NULL,
      due_date TIMESTAMP WITH TIME ZONE,
      completed_date TIMESTAMP WITH TIME ZONE,
      status TEXT DEFAULT 'pending',
      duration INTEGER,
      outcome TEXT,
      location TEXT,
      attendees TEXT[],
      agenda TEXT,
      attachments JSONB,
      assigned_to UUID REFERENCES public.users(id),
      created_by UUID REFERENCES public.users(id),
      agency_id UUID,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add missing columns if they don't exist (for backward compatibility)
  try {
    await client.query(`
      DO $$ 
      BEGIN
        -- Add agency_id
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'crm_activities' 
          AND column_name = 'agency_id'
        ) THEN
          ALTER TABLE public.crm_activities ADD COLUMN agency_id UUID;
          CREATE INDEX IF NOT EXISTS idx_crm_activities_agency_id ON public.crm_activities(agency_id);
        END IF;

        -- Add client_id
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'crm_activities' 
          AND column_name = 'client_id'
        ) THEN
          ALTER TABLE public.crm_activities ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
        END IF;

        -- Add due_date
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'crm_activities' 
          AND column_name = 'due_date'
        ) THEN
          ALTER TABLE public.crm_activities ADD COLUMN due_date TIMESTAMP WITH TIME ZONE;
        END IF;

        -- Add completed_date
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'crm_activities' 
          AND column_name = 'completed_date'
        ) THEN
          ALTER TABLE public.crm_activities ADD COLUMN completed_date TIMESTAMP WITH TIME ZONE;
        END IF;

        -- Add status
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'crm_activities' 
          AND column_name = 'status'
        ) THEN
          ALTER TABLE public.crm_activities ADD COLUMN status TEXT DEFAULT 'pending';
        END IF;

        -- Add duration
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'crm_activities' 
          AND column_name = 'duration'
        ) THEN
          ALTER TABLE public.crm_activities ADD COLUMN duration INTEGER;
        END IF;

        -- Add outcome
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'crm_activities' 
          AND column_name = 'outcome'
        ) THEN
          ALTER TABLE public.crm_activities ADD COLUMN outcome TEXT;
        END IF;

        -- Add location
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'crm_activities' 
          AND column_name = 'location'
        ) THEN
          ALTER TABLE public.crm_activities ADD COLUMN location TEXT;
        END IF;

        -- Add attendees
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'crm_activities' 
          AND column_name = 'attendees'
        ) THEN
          ALTER TABLE public.crm_activities ADD COLUMN attendees TEXT[];
        END IF;

        -- Add agenda
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'crm_activities' 
          AND column_name = 'agenda'
        ) THEN
          ALTER TABLE public.crm_activities ADD COLUMN agenda TEXT;
        END IF;

        -- Add attachments
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'crm_activities' 
          AND column_name = 'attachments'
        ) THEN
          ALTER TABLE public.crm_activities ADD COLUMN attachments JSONB;
        END IF;

        -- Add type column (alias for activity_type, for backward compatibility)
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'crm_activities' 
          AND column_name = 'type'
        ) THEN
          ALTER TABLE public.crm_activities ADD COLUMN type TEXT;
        END IF;

        -- Add title column (alias for subject, for backward compatibility)
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'crm_activities' 
          AND column_name = 'title'
        ) THEN
          ALTER TABLE public.crm_activities ADD COLUMN title TEXT;
        END IF;

        -- Add related_entity_type column
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'crm_activities' 
          AND column_name = 'related_entity_type'
        ) THEN
          ALTER TABLE public.crm_activities ADD COLUMN related_entity_type TEXT;
        END IF;

        -- Add related_entity_id column
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'crm_activities' 
          AND column_name = 'related_entity_id'
        ) THEN
          ALTER TABLE public.crm_activities ADD COLUMN related_entity_id UUID;
        END IF;

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_crm_activities_lead_id ON public.crm_activities(lead_id);
        CREATE INDEX IF NOT EXISTS idx_crm_activities_client_id ON public.crm_activities(client_id);
        CREATE INDEX IF NOT EXISTS idx_crm_activities_status ON public.crm_activities(status);
        CREATE INDEX IF NOT EXISTS idx_crm_activities_due_date ON public.crm_activities(due_date);
        CREATE INDEX IF NOT EXISTS idx_crm_activities_activity_date ON public.crm_activities(activity_date);
      END $$;
    `);
  } catch (error) {
    console.warn('[SQL] Warning: Could not add missing columns to crm_activities:', error.message);
  }
}

/**
 * Ensure sales_pipeline table exists
 */
async function ensureSalesPipelineTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.sales_pipeline (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      stage_name TEXT NOT NULL,
      stage_order INTEGER NOT NULL,
      description TEXT,
      probability INTEGER DEFAULT 0,
      color TEXT,
      is_active BOOLEAN DEFAULT true,
      agency_id UUID,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(stage_name, agency_id)
    );
  `);

  // Add missing columns if they don't exist (for backward compatibility)
  try {
    await client.query(`
      DO $$ 
      BEGIN
        -- Add agency_id
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'sales_pipeline' 
          AND column_name = 'agency_id'
        ) THEN
          ALTER TABLE public.sales_pipeline ADD COLUMN agency_id UUID;
          CREATE INDEX IF NOT EXISTS idx_sales_pipeline_agency_id ON public.sales_pipeline(agency_id);
          -- Drop old unique constraint if exists and add new one with agency_id
          ALTER TABLE public.sales_pipeline DROP CONSTRAINT IF EXISTS sales_pipeline_stage_name_key;
        END IF;

        -- Add color
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'sales_pipeline' 
          AND column_name = 'color'
        ) THEN
          ALTER TABLE public.sales_pipeline ADD COLUMN color TEXT;
        END IF;

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_sales_pipeline_stage_order ON public.sales_pipeline(stage_order);
        CREATE INDEX IF NOT EXISTS idx_sales_pipeline_is_active ON public.sales_pipeline(is_active);
      END $$;
    `);
  } catch (error) {
    console.warn('[SQL] Warning: Could not add missing columns to sales_pipeline:', error.message);
  }
}

/**
 * Ensure all CRM tables
 */
async function ensureCrmSchema(client) {
  console.log('[SQL] Ensuring CRM schema...');
  
  await ensureLeadSourcesTable(client);
  await ensureLeadsTable(client);
  await ensureCrmActivitiesTable(client);
  await ensureSalesPipelineTable(client);
  
  console.log('[SQL] ✅ CRM schema ensured');
}

module.exports = {
  ensureCrmSchema,
  ensureLeadSourcesTable,
  ensureLeadsTable,
  ensureCrmActivitiesTable,
  ensureSalesPipelineTable,
};
