/**
 * Standardized Client Selector Service
 * 
 * This service provides a centralized, reliable way to fetch clients
 * for dropdowns and selectors across the entire application.
 * 
 * Key Features:
 * - Automatic agency_id filtering (multi-tenant isolation)
 * - Handles clients with missing records gracefully
 * - Consistent data structure across all components
 * - Status-based and industry-based filtering
 * - Performance optimized with proper indexing
 */

import { selectRecords, selectOne } from './postgresql-service';
import { getAgencyId } from '@/utils/agencyUtils';

/**
 * Client option interface for dropdowns/selectors
 */
export interface ClientOption {
  id: string;
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: string;
  industry: string | null;
  payment_terms: string | null;
  is_active: boolean;
}

/**
 * Options for fetching clients
 */
export interface ClientFetchOptions {
  includeInactive?: boolean;  // Include inactive clients (default: false)
  status?: string;             // Filter by status
  industry?: string;           // Filter by industry
  search?: string;             // Search by name, company_name, email, or contact_person
  limit?: number;              // Limit results (for pagination)
  offset?: number;             // Offset for pagination
}

/**
 * Get all clients for selection dropdowns
 * Automatically filters by agency_id and handles all edge cases
 * 
 * @param agencyId - Agency ID to filter clients (required for multi-tenant isolation)
 * @param options - Optional filtering options
 * @returns Array of client options for dropdowns
 * 
 * @example
 * ```typescript
 * const agencyId = await getAgencyId(profile, user?.id);
 * const clients = await getClientsForSelection(agencyId, {
 *   includeInactive: false,
 *   status: 'active',
 *   search: 'Acme'
 * });
 * ```
 */
export async function getClientsForSelection(
  agencyId: string | null,
  options: ClientFetchOptions = {}
): Promise<ClientOption[]> {
  if (!agencyId) {
    console.warn('getClientsForSelection: No agencyId provided, returning empty array');
    return [];
  }

  const {
    includeInactive = false,
    status,
    industry,
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

    // Filter by active status
    if (!includeInactive) {
      filters.push({
        column: 'is_active',
        operator: 'eq',
        value: true
      });
    }

    // Filter by status
    if (status) {
      filters.push({
        column: 'status',
        operator: 'eq',
        value: status
      });
    }

    // Filter by industry
    if (industry) {
      filters.push({
        column: 'industry',
        operator: 'eq',
        value: industry
      });
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
    let clients = await selectRecords('clients', queryOptions);

    // Apply search filter in memory (for better performance with large datasets, consider SQL LIKE)
    if (search) {
      const searchLower = search.toLowerCase();
      clients = clients.filter((client: any) =>
        client.name?.toLowerCase().includes(searchLower) ||
        client.company_name?.toLowerCase().includes(searchLower) ||
        client.email?.toLowerCase().includes(searchLower) ||
        client.contact_person?.toLowerCase().includes(searchLower) ||
        client.contact_email?.toLowerCase().includes(searchLower)
      );
    }

    // Transform to ClientOption format
    const clientOptions: ClientOption[] = clients.map((client: any) => ({
      id: client.id,
      name: client.name || 'Unnamed Client',
      company_name: client.company_name,
      email: client.email,
      phone: client.phone,
      contact_person: client.contact_person,
      contact_email: client.contact_email,
      contact_phone: client.contact_phone,
      status: client.status || 'active',
      industry: client.industry,
      payment_terms: client.payment_terms,
      is_active: client.is_active !== false
    }));

    return clientOptions;
  } catch (error: any) {
    console.error('Error in getClientsForSelection:', error);
    throw new Error(`Failed to fetch clients: ${error.message}`);
  }
}

/**
 * Get a single client by ID with full details
 * 
 * @param clientId - Client ID
 * @param agencyId - Agency ID to filter clients (required for multi-tenant isolation)
 * @returns Client option or null if not found
 */
export async function getClientById(
  clientId: string,
  agencyId: string | null
): Promise<ClientOption | null> {
  if (!agencyId) {
    console.warn('getClientById: No agencyId provided, returning null');
    return null;
  }

  try {
    const client = await selectOne('clients', {
      id: clientId,
      agency_id: agencyId
    });

    if (!client) {
      return null;
    }

    return {
      id: client.id,
      name: client.name || 'Unnamed Client',
      company_name: client.company_name,
      email: client.email,
      phone: client.phone,
      contact_person: client.contact_person,
      contact_email: client.contact_email,
      contact_phone: client.contact_phone,
      status: client.status || 'active',
      industry: client.industry,
      payment_terms: client.payment_terms,
      is_active: client.is_active !== false
    };
  } catch (error: any) {
    console.error('Error in getClientById:', error);
    throw new Error(`Failed to fetch client: ${error.message}`);
  }
}

/**
 * Get clients for selection (convenience wrapper)
 * Automatically gets agencyId from profile and user
 * 
 * @param profile - User profile from useAuth hook
 * @param userId - User ID
 * @param options - Optional filtering options
 * @returns Array of client options
 * 
 * @example
 * ```typescript
 * const { profile, user } = useAuth();
 * const clients = await getClientsForSelectionAuto(profile, user?.id, {
 *   status: 'active',
 *   search: 'Acme'
 * });
 * ```
 */
export async function getClientsForSelectionAuto(
  profile: { agency_id?: string | null } | null | undefined,
  userId: string | null | undefined,
  options: ClientFetchOptions = {}
): Promise<ClientOption[]> {
  const agencyId = await getAgencyId(profile, userId);
  if (!agencyId) {
    return [];
  }
  return await getClientsForSelection(agencyId, options);
}

