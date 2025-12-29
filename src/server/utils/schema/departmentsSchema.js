/**
 * Departments and Teams Schema
 * 
 * Manages:
 * - departments: Organizational departments with hierarchy
 * - team_assignments: User-department relationships with roles
 * - department_hierarchy: Department organizational structure
 * - team_members: Team composition tracking
 * 
 * Dependencies:
 * - profiles (for manager_id reference)
 * - users (for user_id references)
 */

/**
 * Ensure departments table exists
 */
async function ensureDepartmentsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.departments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      description TEXT,
      manager_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
      parent_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
      budget NUMERIC(15, 2) DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      agency_id UUID,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
}

/**
 * Ensure team_assignments table exists
 */
async function ensureTeamAssignmentsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.team_assignments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      department_id UUID,
      role TEXT,
      position_title TEXT,
      role_in_department TEXT,
      start_date DATE,
      is_active BOOLEAN DEFAULT true,
      agency_id UUID,
      assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      assigned_by UUID REFERENCES public.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add missing columns if they don't exist (for backward compatibility)
  await client.query(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'team_assignments' 
        AND column_name = 'is_active'
      ) THEN
        ALTER TABLE public.team_assignments ADD COLUMN is_active BOOLEAN DEFAULT true;
        CREATE INDEX IF NOT EXISTS idx_team_assignments_is_active ON public.team_assignments(is_active);
      END IF;
      
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'team_assignments' 
        AND column_name = 'position_title'
      ) THEN
        ALTER TABLE public.team_assignments ADD COLUMN position_title TEXT;
      END IF;
      
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'team_assignments' 
        AND column_name = 'role_in_department'
      ) THEN
        ALTER TABLE public.team_assignments ADD COLUMN role_in_department TEXT;
      END IF;
      
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'team_assignments' 
        AND column_name = 'start_date'
      ) THEN
        ALTER TABLE public.team_assignments ADD COLUMN start_date DATE;
      END IF;
      
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'team_assignments' 
        AND column_name = 'agency_id'
      ) THEN
        ALTER TABLE public.team_assignments ADD COLUMN agency_id UUID;
        CREATE INDEX IF NOT EXISTS idx_team_assignments_agency_id ON public.team_assignments(agency_id);
      END IF;
    END $$;
  `);
}

/**
 * Ensure department_hierarchy table exists
 */
async function ensureDepartmentHierarchyTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.department_hierarchy (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      parent_department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
      child_department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(parent_department_id, child_department_id)
    );
  `);
}

/**
 * Ensure team_members table exists
 */
async function ensureTeamMembersTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.team_members (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      team_id UUID,
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      role TEXT,
      joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
}

/**
 * Ensure all departments and teams tables
 */
async function ensureDepartmentsSchema(client) {
  console.log('[SQL] Ensuring departments schema...');
  
  await ensureDepartmentsTable(client);
  await ensureTeamAssignmentsTable(client);
  await ensureDepartmentHierarchyTable(client);
  await ensureTeamMembersTable(client);
  
  console.log('[SQL] ✅ Departments schema ensured');
}

module.exports = {
  ensureDepartmentsSchema,
  ensureDepartmentsTable,
  ensureTeamAssignmentsTable,
  ensureDepartmentHierarchyTable,
  ensureTeamMembersTable,
};
