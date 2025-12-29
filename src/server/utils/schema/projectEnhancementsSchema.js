/**
 * Advanced Project Management Schema Enhancements
 * 
 * Adds:
 * - project_milestones: Milestone tracking
 * - project_risks: Risk register
 * - project_issues: Issue tracking
 * - project_dependencies: Task dependencies for Gantt
 * - project_resources: Resource allocation
 */

/**
 * Ensure project_milestones table exists
 */
async function ensureProjectMilestonesTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.project_milestones (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
      agency_id UUID NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      target_date DATE NOT NULL,
      status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, delayed
      completion_date DATE,
      is_critical BOOLEAN DEFAULT false,
      created_by UUID REFERENCES public.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_project_milestones_project_id ON public.project_milestones(project_id);
    CREATE INDEX IF NOT EXISTS idx_project_milestones_agency_id ON public.project_milestones(agency_id);
    CREATE INDEX IF NOT EXISTS idx_project_milestones_target_date ON public.project_milestones(target_date);
  `);
}

/**
 * Ensure project_risks table exists
 */
async function ensureProjectRisksTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.project_risks (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
      agency_id UUID NOT NULL,
      risk_title VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(100), -- technical, financial, schedule, resource, external
      probability VARCHAR(20) DEFAULT 'medium', -- low, medium, high
      impact VARCHAR(20) DEFAULT 'medium', -- low, medium, high
      risk_score INTEGER GENERATED ALWAYS AS (
        CASE 
          WHEN probability = 'low' AND impact = 'low' THEN 1
          WHEN probability = 'low' AND impact = 'medium' THEN 2
          WHEN probability = 'low' AND impact = 'high' THEN 3
          WHEN probability = 'medium' AND impact = 'low' THEN 2
          WHEN probability = 'medium' AND impact = 'medium' THEN 4
          WHEN probability = 'medium' AND impact = 'high' THEN 6
          WHEN probability = 'high' AND impact = 'low' THEN 3
          WHEN probability = 'high' AND impact = 'medium' THEN 6
          WHEN probability = 'high' AND impact = 'high' THEN 9
          ELSE 0
        END
      ) STORED,
      status VARCHAR(50) DEFAULT 'open', -- open, mitigated, closed, accepted
      mitigation_plan TEXT,
      owner_id UUID REFERENCES public.users(id),
      identified_date DATE DEFAULT CURRENT_DATE,
      resolved_date DATE,
      created_by UUID REFERENCES public.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_project_risks_project_id ON public.project_risks(project_id);
    CREATE INDEX IF NOT EXISTS idx_project_risks_agency_id ON public.project_risks(agency_id);
    CREATE INDEX IF NOT EXISTS idx_project_risks_status ON public.project_risks(status);
    CREATE INDEX IF NOT EXISTS idx_project_risks_risk_score ON public.project_risks(risk_score);
  `);
}

/**
 * Ensure project_issues table exists
 */
async function ensureProjectIssuesTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.project_issues (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
      agency_id UUID NOT NULL,
      issue_title VARCHAR(255) NOT NULL,
      description TEXT,
      priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
      status VARCHAR(50) DEFAULT 'open', -- open, in_progress, resolved, closed
      issue_type VARCHAR(50), -- bug, feature_request, question, blocker
      assigned_to UUID REFERENCES public.users(id),
      reported_by UUID REFERENCES public.users(id),
      due_date DATE,
      resolved_date DATE,
      resolution_notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_project_issues_project_id ON public.project_issues(project_id);
    CREATE INDEX IF NOT EXISTS idx_project_issues_agency_id ON public.project_issues(agency_id);
    CREATE INDEX IF NOT EXISTS idx_project_issues_status ON public.project_issues(status);
    CREATE INDEX IF NOT EXISTS idx_project_issues_priority ON public.project_issues(priority);
    CREATE INDEX IF NOT EXISTS idx_project_issues_assigned_to ON public.project_issues(assigned_to);
  `);
}

/**
 * Ensure project_dependencies table exists (for Gantt charts)
 */
async function ensureProjectDependenciesTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.project_dependencies (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
      agency_id UUID NOT NULL,
      predecessor_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
      successor_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
      dependency_type VARCHAR(50) DEFAULT 'finish_to_start', -- finish_to_start, start_to_start, finish_to_finish, start_to_finish
      lag_days INTEGER DEFAULT 0, -- Delay in days
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_project_dependencies_project_id ON public.project_dependencies(project_id);
    CREATE INDEX IF NOT EXISTS idx_project_dependencies_predecessor ON public.project_dependencies(predecessor_task_id);
    CREATE INDEX IF NOT EXISTS idx_project_dependencies_successor ON public.project_dependencies(successor_task_id);
  `);
}

/**
 * Ensure project_resources table exists
 */
async function ensureProjectResourcesTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.project_resources (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
      agency_id UUID NOT NULL,
      resource_type VARCHAR(50) NOT NULL, -- employee, equipment, material, external
      resource_id UUID, -- user_id, equipment_id, etc.
      allocation_percentage DECIMAL(5,2) DEFAULT 100, -- 0-100
      start_date DATE,
      end_date DATE,
      hourly_rate DECIMAL(15,2),
      estimated_hours DECIMAL(10,2),
      actual_hours DECIMAL(10,2) DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_project_resources_project_id ON public.project_resources(project_id);
    CREATE INDEX IF NOT EXISTS idx_project_resources_agency_id ON public.project_resources(agency_id);
    CREATE INDEX IF NOT EXISTS idx_project_resources_resource_id ON public.project_resources(resource_id);
  `);
}

/**
 * Ensure all project enhancement tables
 */
async function ensureProjectEnhancementsSchema(client) {
  console.log('[SQL] Ensuring advanced project management schema...');
  
  try {
    await ensureProjectMilestonesTable(client);
    await ensureProjectRisksTable(client);
    await ensureProjectIssuesTable(client);
    await ensureProjectDependenciesTable(client);
    await ensureProjectResourcesTable(client);
    
    console.log('[SQL] ✅ Advanced project management schema ensured');
  } catch (error) {
    console.error('[SQL] ❌ Error ensuring project enhancements schema:', error.message);
    throw error;
  }
}

module.exports = {
  ensureProjectEnhancementsSchema,
  ensureProjectMilestonesTable,
  ensureProjectRisksTable,
  ensureProjectIssuesTable,
  ensureProjectDependenciesTable,
  ensureProjectResourcesTable,
};
