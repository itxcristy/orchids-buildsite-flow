/**
 * Standardized Project Selector Service
 * 
 * This service provides a centralized, reliable way to fetch projects
 * for dropdowns and selectors across the entire application.
 * 
 * Key Features:
 * - Automatic agency_id filtering (multi-tenant isolation)
 * - Handles projects with missing records gracefully
 * - Consistent data structure across all components
 * - Status-based and client-based filtering
 * - Performance optimized with proper indexing
 */

import { selectRecords, selectOne } from './postgresql-service';
import { getAgencyId } from '@/utils/agencyUtils';

/**
 * Project option interface for dropdowns/selectors
 */
export interface ProjectOption {
  id: string;
  name: string;
  project_code: string | null;
  status: string;
  client_id: string | null;
  client_name: string | null;
  client_company_name: string | null;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  currency: string;
  progress: number;
  is_active: boolean;
}

/**
 * Options for fetching projects
 */
export interface ProjectFetchOptions {
  includeInactive?: boolean;  // Include inactive projects (default: false)
  status?: string | string[]; // Filter by status (single or array)
  clientId?: string;          // Filter by client ID
  search?: string;            // Search by name or project_code
  limit?: number;             // Limit results (for pagination)
  offset?: number;            // Offset for pagination
}

/**
 * Get all projects for selection dropdowns
 * Automatically filters by agency_id and handles all edge cases
 * 
 * @param agencyId - Agency ID to filter projects (required for multi-tenant isolation)
 * @param options - Optional filtering options
 * @returns Array of project options for dropdowns
 * 
 * @example
 * ```typescript
 * const agencyId = await getAgencyId(profile, user?.id);
 * const projects = await getProjectsForSelection(agencyId, {
 *   status: 'active',
 *   clientId: 'client-123',
 *   search: 'Website'
 * });
 * ```
 */
export async function getProjectsForSelection(
  agencyId: string | null,
  options: ProjectFetchOptions = {}
): Promise<ProjectOption[]> {
  if (!agencyId) {
    console.warn('getProjectsForSelection: No agencyId provided, returning empty array');
    return [];
  }

  const {
    includeInactive = false,
    status,
    clientId,
    search,
    limit,
    offset
  } = options;

  try {
    // Build filters
    const filters: any[] = [];
    
    // Always filter by agency_id
    filters.push({
      column: 'agency_id',
      operator: 'eq',
      value: agencyId
    });

    // Filter by client
    if (clientId) {
      filters.push({
        column: 'client_id',
        operator: 'eq',
        value: clientId
      });
    }

    // Filter by status
    if (status) {
      if (Array.isArray(status)) {
        filters.push({
          column: 'status',
          operator: 'in',
          value: status
        });
      } else {
        filters.push({
          column: 'status',
          operator: 'eq',
          value: status
        });
      }
    }

    // Build query options
    const queryOptions: any = {
      filters,
      orderBy: 'name ASC'
    };

    // Add pagination if specified
    if (limit) {
      queryOptions.limit = limit;
    }
    if (offset) {
      queryOptions.offset = offset;
    }

    // Execute query
    let projects = await selectRecords('projects', queryOptions);

    // Apply search filter in memory
    if (search) {
      const searchLower = search.toLowerCase();
      projects = projects.filter((project: any) =>
        project.name?.toLowerCase().includes(searchLower) ||
        project.project_code?.toLowerCase().includes(searchLower) ||
        project.description?.toLowerCase().includes(searchLower)
      );
    }

    // Fetch client information for each project
    const projectOptions: ProjectOption[] = await Promise.all(
      projects.map(async (project: any) => {
        let clientName: string | null = null;
        let clientCompanyName: string | null = null;

        // Get client information if client_id exists
        if (project.client_id) {
          try {
            const client = await selectOne('clients', { id: project.client_id });
            if (client) {
              clientName = client.name || null;
              clientCompanyName = client.company_name || null;
            }
          } catch (error) {
            console.warn(`Failed to fetch client for project ${project.id}:`, error);
          }
        }

        return {
          id: project.id,
          name: project.name || 'Unnamed Project',
          project_code: project.project_code,
          status: project.status || 'planning',
          client_id: project.client_id,
          client_name: clientName,
          client_company_name: clientCompanyName,
          start_date: project.start_date,
          end_date: project.end_date,
          budget: project.budget,
          currency: project.currency || 'USD',
          progress: project.progress || 0,
          is_active: true // Projects don't have is_active field, assume active if in results
        };
      })
    );

    return projectOptions;
  } catch (error: any) {
    console.error('Error in getProjectsForSelection:', error);
    throw new Error(`Failed to fetch projects: ${error.message}`);
  }
}

/**
 * Get a single project by ID with full details
 * 
 * @param projectId - Project ID
 * @param agencyId - Agency ID to filter projects (required for multi-tenant isolation)
 * @returns Project option or null if not found
 */
export async function getProjectById(
  projectId: string,
  agencyId: string | null
): Promise<ProjectOption | null> {
  if (!agencyId) {
    console.warn('getProjectById: No agencyId provided, returning null');
    return null;
  }

  try {
    const project = await selectOne('projects', {
      id: projectId,
      agency_id: agencyId
    });

    if (!project) {
      return null;
    }

    // Get client information
    let clientName: string | null = null;
    let clientCompanyName: string | null = null;
    if (project.client_id) {
      try {
        const client = await selectOne('clients', { id: project.client_id });
        if (client) {
          clientName = client.name || null;
          clientCompanyName = client.company_name || null;
        }
      } catch (error) {
        console.warn(`Failed to fetch client for project ${project.id}:`, error);
      }
    }

    return {
      id: project.id,
      name: project.name || 'Unnamed Project',
      project_code: project.project_code,
      status: project.status || 'planning',
      client_id: project.client_id,
      client_name: clientName,
      client_company_name: clientCompanyName,
      start_date: project.start_date,
      end_date: project.end_date,
      budget: project.budget,
      currency: project.currency || 'USD',
      progress: project.progress || 0,
      is_active: true
    };
  } catch (error: any) {
    console.error('Error in getProjectById:', error);
    throw new Error(`Failed to fetch project: ${error.message}`);
  }
}

/**
 * Get projects for selection (convenience wrapper)
 * Automatically gets agencyId from profile and user
 * 
 * @param profile - User profile from useAuth hook
 * @param userId - User ID
 * @param options - Optional filtering options
 * @returns Array of project options
 * 
 * @example
 * ```typescript
 * const { profile, user } = useAuth();
 * const projects = await getProjectsForSelectionAuto(profile, user?.id, {
 *   status: 'active',
 *   search: 'Website'
 * });
 * ```
 */
export async function getProjectsForSelectionAuto(
  profile: { agency_id?: string | null } | null | undefined,
  userId: string | null | undefined,
  options: ProjectFetchOptions = {}
): Promise<ProjectOption[]> {
  const agencyId = await getAgencyId(profile, userId);
  if (!agencyId) {
    return [];
  }
  return await getProjectsForSelection(agencyId, options);
}

