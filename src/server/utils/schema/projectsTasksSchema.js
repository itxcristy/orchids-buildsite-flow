/**
 * Projects and Tasks Schema
 * 
 * Manages:
 * - projects: Project records with budgets and timelines
 * - tasks: Task management with status tracking
 * - task_assignments: Multiple assignees per task
 * - task_comments: Task discussion and comments
 * - task_time_tracking: Time tracking on tasks
 * 
 * Dependencies:
 * - clients (for client_id reference in projects)
 * - users (for user_id references)
 */

/**
 * Ensure projects table exists
 */
async function ensureProjectsTable(client) {
  // Create table with all required columns
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.projects (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      description TEXT,
      project_code TEXT,
      project_type TEXT,
      status TEXT DEFAULT 'planning',
      priority TEXT DEFAULT 'medium',
      start_date DATE,
      end_date DATE,
      deadline DATE,
      budget NUMERIC(15, 2),
      actual_cost NUMERIC(15, 2) DEFAULT 0,
      allocated_budget NUMERIC(15, 2),
      cost_center TEXT,
      currency TEXT DEFAULT 'USD',
      client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
      project_manager_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
      account_manager_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
      assigned_team JSONB DEFAULT '[]'::jsonb,
      departments JSONB DEFAULT '[]'::jsonb,
      tags JSONB DEFAULT '[]'::jsonb,
      categories JSONB DEFAULT '[]'::jsonb,
      custom_fields JSONB DEFAULT '{}'::jsonb,
      progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
      agency_id UUID NOT NULL,
      created_by UUID REFERENCES public.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT projects_status_check CHECK (status IN ('planning', 'active', 'in_progress', 'on_hold', 'completed', 'cancelled')),
      CONSTRAINT projects_priority_check CHECK (priority IN ('low', 'medium', 'high', 'critical'))
    );
  `);

  // Add missing columns if they don't exist (for existing tables)
  await client.query(`
    DO $$
    BEGIN
      -- Add project_code if missing
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'project_code') THEN
        ALTER TABLE public.projects ADD COLUMN project_code TEXT;
      END IF;
      
      -- Add project_type if missing
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'project_type') THEN
        ALTER TABLE public.projects ADD COLUMN project_type TEXT;
      END IF;
      
      -- Add priority if missing
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'priority') THEN
        ALTER TABLE public.projects ADD COLUMN priority TEXT DEFAULT 'medium';
      END IF;
      
      -- Add deadline if missing
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'deadline') THEN
        ALTER TABLE public.projects ADD COLUMN deadline DATE;
      END IF;
      
      -- Add actual_cost if missing
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'actual_cost') THEN
        ALTER TABLE public.projects ADD COLUMN actual_cost NUMERIC(15, 2) DEFAULT 0;
      END IF;
      
      -- Add allocated_budget if missing
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'allocated_budget') THEN
        ALTER TABLE public.projects ADD COLUMN allocated_budget NUMERIC(15, 2);
      END IF;
      
      -- Add cost_center if missing
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'cost_center') THEN
        ALTER TABLE public.projects ADD COLUMN cost_center TEXT;
      END IF;
      
      -- Add currency if missing
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'currency') THEN
        ALTER TABLE public.projects ADD COLUMN currency TEXT DEFAULT 'USD';
      END IF;
      
      -- Add project_manager_id if missing
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'project_manager_id') THEN
        ALTER TABLE public.projects ADD COLUMN project_manager_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
      END IF;
      
      -- Add account_manager_id if missing
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'account_manager_id') THEN
        ALTER TABLE public.projects ADD COLUMN account_manager_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
      END IF;
      
      -- Add departments if missing
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'departments') THEN
        ALTER TABLE public.projects ADD COLUMN departments JSONB DEFAULT '[]'::jsonb;
      END IF;
      
      -- Add tags if missing
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'tags') THEN
        ALTER TABLE public.projects ADD COLUMN tags JSONB DEFAULT '[]'::jsonb;
      END IF;
      
      -- Add categories if missing
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'categories') THEN
        ALTER TABLE public.projects ADD COLUMN categories JSONB DEFAULT '[]'::jsonb;
      END IF;
      
      -- Add custom_fields if missing
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'custom_fields') THEN
        ALTER TABLE public.projects ADD COLUMN custom_fields JSONB DEFAULT '{}'::jsonb;
      END IF;
      
      -- Add agency_id if missing (CRITICAL for multi-tenancy)
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'agency_id') THEN
        ALTER TABLE public.projects ADD COLUMN agency_id UUID;
        -- Set default for existing rows (will need to be updated properly)
        UPDATE public.projects SET agency_id = '00000000-0000-0000-0000-000000000000' WHERE agency_id IS NULL;
        ALTER TABLE public.projects ALTER COLUMN agency_id SET NOT NULL;
      END IF;
      
      -- Ensure assigned_team has default
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'assigned_team') THEN
        ALTER TABLE public.projects ALTER COLUMN assigned_team SET DEFAULT '[]'::jsonb;
      END IF;
    END $$;
  `);

  // Create indexes for performance
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_projects_agency_id ON public.projects(agency_id);
    CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id);
    CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
    CREATE INDEX IF NOT EXISTS idx_projects_project_manager_id ON public.projects(project_manager_id);
    CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_projects_project_code ON public.projects(project_code) WHERE project_code IS NOT NULL;
  `);
}

/**
 * Ensure tasks table exists
 */
async function ensureTasksTable(client) {
  // Create table with all required columns
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.tasks (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      task_type TEXT,
      status TEXT DEFAULT 'todo',
      priority TEXT DEFAULT 'medium',
      due_date DATE,
      start_date DATE,
      estimated_hours NUMERIC(10, 2),
      actual_hours NUMERIC(10, 2) DEFAULT 0,
      progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
      assignee_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
      created_by UUID REFERENCES public.users(id),
      completed_at TIMESTAMP WITH TIME ZONE,
      tags JSONB DEFAULT '[]'::jsonb,
      attachments JSONB DEFAULT '[]'::jsonb,
      checklist JSONB DEFAULT '[]'::jsonb,
      dependencies JSONB DEFAULT '[]'::jsonb,
      custom_fields JSONB DEFAULT '{}'::jsonb,
      agency_id UUID NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT tasks_status_check CHECK (status IN ('todo', 'in_progress', 'in_review', 'blocked', 'completed', 'cancelled')),
      CONSTRAINT tasks_priority_check CHECK (priority IN ('low', 'medium', 'high', 'critical', 'urgent'))
    );
  `);

  // Add missing columns if they don't exist (for existing tables)
  await client.query(`
    DO $$
    BEGIN
      -- Add task_type if missing
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'task_type') THEN
        ALTER TABLE public.tasks ADD COLUMN task_type TEXT;
      END IF;
      
      -- Add assignee_id if missing
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'assignee_id') THEN
        ALTER TABLE public.tasks ADD COLUMN assignee_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
      END IF;
      
      -- Add completed_at if missing
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'completed_at') THEN
        ALTER TABLE public.tasks ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
      END IF;
      
      -- Add tags if missing
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'tags') THEN
        ALTER TABLE public.tasks ADD COLUMN tags JSONB DEFAULT '[]'::jsonb;
      END IF;
      
      -- Add attachments if missing
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'attachments') THEN
        ALTER TABLE public.tasks ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb;
      END IF;
      
      -- Add checklist if missing
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'checklist') THEN
        ALTER TABLE public.tasks ADD COLUMN checklist JSONB DEFAULT '[]'::jsonb;
      END IF;
      
      -- Add dependencies if missing
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'dependencies') THEN
        ALTER TABLE public.tasks ADD COLUMN dependencies JSONB DEFAULT '[]'::jsonb;
      END IF;
      
      -- Add custom_fields if missing
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'custom_fields') THEN
        ALTER TABLE public.tasks ADD COLUMN custom_fields JSONB DEFAULT '{}'::jsonb;
      END IF;
      
      -- Add agency_id if missing (CRITICAL for multi-tenancy)
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'agency_id') THEN
        ALTER TABLE public.tasks ADD COLUMN agency_id UUID;
        -- Set default for existing rows (will need to be updated properly)
        UPDATE public.tasks SET agency_id = '00000000-0000-0000-0000-000000000000' WHERE agency_id IS NULL;
        ALTER TABLE public.tasks ALTER COLUMN agency_id SET NOT NULL;
      END IF;
      
      -- Ensure actual_hours has default
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'actual_hours') THEN
        ALTER TABLE public.tasks ALTER COLUMN actual_hours SET DEFAULT 0;
      END IF;
    END $$;
  `);

  // Create indexes for performance
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_tasks_agency_id ON public.tasks(agency_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks(assignee_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);
    CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
    CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON public.tasks(created_at DESC);
  `);
}

/**
 * Ensure task_assignments table exists
 */
async function ensureTaskAssignmentsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.task_assignments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      assigned_by UUID REFERENCES public.users(id),
      agency_id UUID NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(task_id, user_id)
    );
  `);

  // Add agency_id if missing
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'task_assignments' AND column_name = 'agency_id') THEN
        ALTER TABLE public.task_assignments ADD COLUMN agency_id UUID;
        UPDATE public.task_assignments SET agency_id = '00000000-0000-0000-0000-000000000000' WHERE agency_id IS NULL;
        ALTER TABLE public.task_assignments ALTER COLUMN agency_id SET NOT NULL;
      END IF;
    END $$;
  `);

  // Create indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_task_assignments_agency_id ON public.task_assignments(agency_id);
    CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON public.task_assignments(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON public.task_assignments(user_id);
  `);
}

/**
 * Ensure task_comments table exists
 */
async function ensureTaskCommentsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.task_comments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      comment TEXT NOT NULL,
      parent_comment_id UUID REFERENCES public.task_comments(id) ON DELETE CASCADE,
      attachments JSONB DEFAULT '[]'::jsonb,
      mentions JSONB DEFAULT '[]'::jsonb,
      agency_id UUID NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add missing columns if they don't exist
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'task_comments' AND column_name = 'parent_comment_id') THEN
        ALTER TABLE public.task_comments ADD COLUMN parent_comment_id UUID REFERENCES public.task_comments(id) ON DELETE CASCADE;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'task_comments' AND column_name = 'attachments') THEN
        ALTER TABLE public.task_comments ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'task_comments' AND column_name = 'mentions') THEN
        ALTER TABLE public.task_comments ADD COLUMN mentions JSONB DEFAULT '[]'::jsonb;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'task_comments' AND column_name = 'agency_id') THEN
        ALTER TABLE public.task_comments ADD COLUMN agency_id UUID;
        UPDATE public.task_comments SET agency_id = '00000000-0000-0000-0000-000000000000' WHERE agency_id IS NULL;
        ALTER TABLE public.task_comments ALTER COLUMN agency_id SET NOT NULL;
      END IF;
    END $$;
  `);

  // Create indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_task_comments_agency_id ON public.task_comments(agency_id);
    CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON public.task_comments(user_id);
    CREATE INDEX IF NOT EXISTS idx_task_comments_parent_id ON public.task_comments(parent_comment_id);
  `);
}

/**
 * Ensure task_time_tracking table exists
 */
async function ensureTaskTimeTrackingTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.task_time_tracking (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      hours_logged NUMERIC(10, 2) NOT NULL DEFAULT 0,
      start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      end_time TIMESTAMP WITH TIME ZONE,
      duration_minutes INTEGER,
      description TEXT,
      billable BOOLEAN DEFAULT true,
      hourly_rate NUMERIC(10, 2),
      agency_id UUID NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add missing columns if they don't exist
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'task_time_tracking' AND column_name = 'date') THEN
        ALTER TABLE public.task_time_tracking ADD COLUMN date DATE NOT NULL DEFAULT CURRENT_DATE;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'task_time_tracking' AND column_name = 'hours_logged') THEN
        ALTER TABLE public.task_time_tracking ADD COLUMN hours_logged NUMERIC(10, 2) NOT NULL DEFAULT 0;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'task_time_tracking' AND column_name = 'billable') THEN
        ALTER TABLE public.task_time_tracking ADD COLUMN billable BOOLEAN DEFAULT true;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'task_time_tracking' AND column_name = 'hourly_rate') THEN
        ALTER TABLE public.task_time_tracking ADD COLUMN hourly_rate NUMERIC(10, 2);
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'task_time_tracking' AND column_name = 'agency_id') THEN
        ALTER TABLE public.task_time_tracking ADD COLUMN agency_id UUID;
        UPDATE public.task_time_tracking SET agency_id = '00000000-0000-0000-0000-000000000000' WHERE agency_id IS NULL;
        ALTER TABLE public.task_time_tracking ALTER COLUMN agency_id SET NOT NULL;
      END IF;
      
      -- Ensure start_time has a default value if it's NOT NULL
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'task_time_tracking' AND column_name = 'start_time') THEN
        -- Check if start_time is NOT NULL and has no default
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'task_time_tracking' 
          AND column_name = 'start_time' 
          AND is_nullable = 'NO'
          AND column_default IS NULL
        ) THEN
          -- Set default for existing NULL values
          UPDATE public.task_time_tracking SET start_time = COALESCE(start_time, created_at, NOW()) WHERE start_time IS NULL;
          ALTER TABLE public.task_time_tracking ALTER COLUMN start_time SET DEFAULT NOW();
        END IF;
      END IF;
    END $$;
  `);

  // Create indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_task_time_tracking_agency_id ON public.task_time_tracking(agency_id);
    CREATE INDEX IF NOT EXISTS idx_task_time_tracking_task_id ON public.task_time_tracking(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_time_tracking_user_id ON public.task_time_tracking(user_id);
    CREATE INDEX IF NOT EXISTS idx_task_time_tracking_date ON public.task_time_tracking(date);
  `);
}

/**
 * Ensure all projects and tasks tables
 */
async function ensureProjectsTasksSchema(client) {
  console.log('[SQL] Ensuring projects and tasks schema...');
  
  await ensureProjectsTable(client);
  await ensureTasksTable(client);
  await ensureTaskAssignmentsTable(client);
  await ensureTaskCommentsTable(client);
  await ensureTaskTimeTrackingTable(client);
  
  console.log('[SQL] ✅ Projects and tasks schema ensured');
}

module.exports = {
  ensureProjectsTasksSchema,
  ensureProjectsTable,
  ensureTasksTable,
  ensureTaskAssignmentsTable,
  ensureTaskCommentsTable,
  ensureTaskTimeTrackingTable,
};
