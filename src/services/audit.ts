import { getApiEndpoint } from '@/config/services';

interface ApiSuccess<T> {
  success: true;
  data: T;
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

export interface AuditLog {
  id: string;
  table_name: string;
  action: string;
  user_id: string | null;
  record_id: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
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
 * Get audit logs with filtering
 */
export async function getAuditLogs(params?: {
  page?: number;
  limit?: number;
  table_name?: string;
  action?: string;
  user_id?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
}): Promise<{ data: AuditLog[]; pagination?: ApiSuccess<AuditLog>['pagination'] }> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.table_name) queryParams.append('table_name', params.table_name);
  if (params?.action) queryParams.append('action', params.action);
  if (params?.user_id) queryParams.append('user_id', params.user_id);
  if (params?.start_date) queryParams.append('start_date', params.start_date);
  if (params?.end_date) queryParams.append('end_date', params.end_date);
  if (params?.search) queryParams.append('search', params.search);

  const endpoint = getApiEndpoint(`/audit/logs?${queryParams.toString()}`);

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`API endpoint not found (404). The server may need to be restarted to register new routes.`);
    }
    throw new Error(`Failed to load audit logs (status ${response.status})`);
  }

  const text = await response.text();
  let parsed: ApiResponseShape<AuditLog[]>;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Failed to parse response`);
  }

  if (!('success' in parsed)) {
    return {
      data: parsed as unknown as AuditLog[],
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
 * Export audit logs to CSV/JSON
 */
export async function exportAuditLogs(params?: {
  format?: 'json' | 'csv';
  start_date?: string;
  end_date?: string;
}): Promise<Blob | AuditLog[]> {
  const queryParams = new URLSearchParams();
  if (params?.format) queryParams.append('format', params.format);
  if (params?.start_date) queryParams.append('start_date', params.start_date);
  if (params?.end_date) queryParams.append('end_date', params.end_date);

  const endpoint = getApiEndpoint(`/audit/export?${queryParams.toString()}`);
  const format = params?.format || 'json';

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to export audit logs (status ${response.status})`);
  }

  if (format === 'csv') {
    return await response.blob();
  }

  return handleJsonResponse<AuditLog[]>(response);
}
