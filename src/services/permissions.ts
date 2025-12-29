import { getApiEndpoint } from '@/config/services';

interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ApiErrorShape {
  success: false;
  error: {
    code?: string;
    message: string;
    details?: string;
  };
  message?: string;
}

type ApiResponseShape<T> = ApiSuccess<T> | ApiErrorShape;

export interface Permission {
  id: string;
  name: string;
  category: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  granted?: boolean;
  role_permission_id?: string;
  source?: 'role' | 'user';
}

export interface RolePermission {
  id: string;
  role: string;
  permission_id: string;
  granted: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserPermission {
  id: string;
  user_id: string;
  permission_id: string;
  granted: boolean;
  granted_by: string | null;
  granted_at: string;
  reason: string | null;
  expires_at: string | null;
}

export interface PermissionTemplate {
  id: string;
  name: string;
  description: string | null;
  permissions: Array<{ permission_id: string; granted: boolean }>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

function getAuthHeaders() {
  if (typeof window === 'undefined') {
    return {};
  }

  const token = window.localStorage.getItem('auth_token') || '';
  const agencyDatabase = window.localStorage.getItem('agency_database') || '';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (agencyDatabase) {
    headers['X-Agency-Database'] = agencyDatabase;
  }

  return headers;
}

async function handleJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  // Handle 404 specifically
  if (response.status === 404) {
    throw new Error(`API endpoint not found (404). The server may need to be restarted to register new routes.`);
  }

  let parsed: ApiResponseShape<T>;
  try {
    parsed = JSON.parse(text);
  } catch {
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return JSON.parse(text) as T;
  }

  if (!('success' in parsed)) {
    return parsed as unknown as T;
  }

  if (!parsed.success) {
    // Type guard: if success is false, it's an error response
    const errorResponse = parsed as { success: false; error?: string; message?: string };
    const message = errorResponse.error || errorResponse.message || 'Request failed';
    throw new Error(message);
  }

  return parsed.data;
}

/**
 * Get all permissions with pagination and filtering
 */
export async function getPermissions(params?: {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
}): Promise<{ data: Permission[]; pagination?: ApiSuccess<Permission>['pagination'] }> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.category) queryParams.append('category', params.category);
  if (params?.search) queryParams.append('search', params.search);

  const endpoint = getApiEndpoint(`/permissions?${queryParams.toString()}`);

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`API endpoint not found (404). The server may need to be restarted to register new routes.`);
    }
    throw new Error(`Failed to load permissions (status ${response.status})`);
  }

  const text = await response.text();
  let parsed: ApiResponseShape<Permission[]>;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Failed to parse response`);
  }

  if (!('success' in parsed)) {
    return {
      data: parsed as unknown as Permission[],
      pagination: undefined
    };
  }

  if (!parsed.success) {
    // Type guard: if success is false, it's an error response
    const errorResponse = parsed as { success: false; error?: string; message?: string };
    const message = errorResponse.error || errorResponse.message || 'Request failed';
    throw new Error(message);
  }
  
  return {
    data: parsed.data,
    pagination: (parsed as any).pagination
  };
}

/**
 * Get all permission categories
 */
export async function getPermissionCategories(): Promise<string[]> {
  const endpoint = getApiEndpoint('/permissions/categories');

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to load categories (status ${response.status})`);
  }

  return handleJsonResponse<string[]>(response);
}

/**
 * Get all permissions for a specific role
 */
export async function getRolePermissions(role: string): Promise<Permission[]> {
  const endpoint = getApiEndpoint(`/permissions/roles/${role}`);

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to load role permissions (status ${response.status})`);
  }

  return handleJsonResponse<Permission[]>(response);
}

/**
 * Update permissions for a specific role
 */
export async function updateRolePermissions(
  role: string,
  permissions: Array<{ permission_id: string; granted: boolean }>
): Promise<void> {
  const endpoint = getApiEndpoint(`/permissions/roles/${role}`);

  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ permissions }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Update failed' }));
    throw new Error(error.error?.message || 'Failed to update role permissions');
  }
}

/**
 * Get all permissions for a specific user (including role-based and overrides)
 */
export async function getUserPermissions(userId: string): Promise<Permission[]> {
  const endpoint = getApiEndpoint(`/permissions/users/${userId}`);

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to load user permissions (status ${response.status})`);
  }

  return handleJsonResponse<Permission[]>(response);
}

/**
 * Update user-specific permission overrides
 */
export async function updateUserPermissions(
  userId: string,
  permissions: Array<{
    permission_id: string;
    granted: boolean;
    reason?: string;
    expires_at?: string;
  }>
): Promise<void> {
  const endpoint = getApiEndpoint(`/permissions/users/${userId}`);

  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ permissions }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Update failed' }));
    throw new Error(error.error?.message || 'Failed to update user permissions');
  }
}

/**
 * Remove all user permission overrides (reset to role defaults)
 */
export async function resetUserPermissions(userId: string): Promise<void> {
  const endpoint = getApiEndpoint(`/permissions/users/${userId}/overrides`);

  const response = await fetch(endpoint, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Reset failed' }));
    throw new Error(error.error?.message || 'Failed to reset user permissions');
  }
}

/**
 * Bulk update permissions for multiple roles/users
 */
export async function bulkUpdatePermissions(params: {
  type: 'roles' | 'users';
  targets: string[];
  permissions: Array<{ permission_id: string; granted: boolean }>;
}): Promise<void> {
  const endpoint = getApiEndpoint('/permissions/bulk');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Bulk update failed' }));
    throw new Error(error.error?.message || 'Failed to bulk update permissions');
  }
}

/**
 * Get all permission templates
 */
export async function getPermissionTemplates(): Promise<PermissionTemplate[]> {
  const endpoint = getApiEndpoint('/permissions/templates');

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to load templates (status ${response.status})`);
  }

  return handleJsonResponse<PermissionTemplate[]>(response);
}

/**
 * Create a new permission template
 */
export async function createPermissionTemplate(template: {
  name: string;
  description?: string;
  permissions: Array<{ permission_id: string; granted: boolean }>;
}): Promise<PermissionTemplate> {
  const endpoint = getApiEndpoint('/permissions/templates');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(template),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Create failed' }));
    throw new Error(error.error?.message || 'Failed to create template');
  }

  return handleJsonResponse<PermissionTemplate>(response);
}

/**
 * Apply a template to roles or users
 */
export async function applyTemplate(
  templateId: string,
  type: 'roles' | 'users',
  targets: string[]
): Promise<void> {
  const endpoint = getApiEndpoint(`/permissions/templates/${templateId}/apply`);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ type, targets }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Apply failed' }));
    throw new Error(error.error?.message || 'Failed to apply template');
  }
}

/**
 * Export current permission configuration
 */
export async function exportPermissions(): Promise<{
  permissions: Permission[];
  role_permissions: RolePermission[];
  user_permissions: UserPermission[];
  templates: PermissionTemplate[];
  exported_at: string;
}> {
  const endpoint = getApiEndpoint('/permissions/export');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to export permissions (status ${response.status})`);
  }

  return handleJsonResponse(response);
}

/**
 * Import permission configuration
 */
export async function importPermissions(data: {
  permissions: Permission[];
  role_permissions: RolePermission[];
  user_permissions?: UserPermission[];
  templates?: PermissionTemplate[];
}): Promise<void> {
  const endpoint = getApiEndpoint('/permissions/import');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ data }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Import failed' }));
    throw new Error(error.error?.message || 'Failed to import permissions');
  }
}
