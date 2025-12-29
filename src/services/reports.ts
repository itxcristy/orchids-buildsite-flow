import { getApiEndpoint } from '@/config/services';

interface ApiSuccess<T> {
  success: true;
  data: T;
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

export interface PermissionDistribution {
  role: string;
  category: string;
  permission_count: number;
  granted_count: number;
}

export interface UserPermissionReport {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  role_permission_count: number;
  override_count: number;
}

export interface ComplianceReport {
  excessive_permissions: Array<{
    id: string;
    full_name: string | null;
    email: string | null;
    override_count: number;
  }>;
  expired_permissions: Array<{
    id: string;
    permission_name: string;
    user_name: string | null;
    expires_at: string;
  }>;
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
    const message = parsed.error?.message || parsed.message || 'Request failed';
    throw new Error(message);
  }

  return parsed.data;
}

/**
 * Generate permission distribution report
 */
export async function getPermissionDistributionReport(): Promise<PermissionDistribution[]> {
  const endpoint = getApiEndpoint('/reports/permission-distribution');

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate report (status ${response.status})`);
  }

  return handleJsonResponse<PermissionDistribution[]>(response);
}

/**
 * Generate user permissions report
 */
export async function getUserPermissionsReport(): Promise<UserPermissionReport[]> {
  const endpoint = getApiEndpoint('/reports/user-permissions');

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate report (status ${response.status})`);
  }

  return handleJsonResponse<UserPermissionReport[]>(response);
}

/**
 * Get unused permissions (never granted)
 */
export async function getUnusedPermissionsReport(): Promise<any[]> {
  const endpoint = getApiEndpoint('/reports/unused-permissions');

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate report (status ${response.status})`);
  }

  return handleJsonResponse<any[]>(response);
}

/**
 * Generate compliance report
 */
export async function getComplianceReport(): Promise<ComplianceReport> {
  const endpoint = getApiEndpoint('/reports/compliance');

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate report (status ${response.status})`);
  }

  return handleJsonResponse<ComplianceReport>(response);
}
