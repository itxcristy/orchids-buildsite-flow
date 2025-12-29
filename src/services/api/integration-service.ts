/**
 * Integration Management API Service
 * Frontend API client for integration operations
 */

import { getApiBaseUrl } from '@/config/api';

const API_BASE = getApiBaseUrl();

/**
 * Get authentication token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

export interface Integration {
  id: string;
  agency_id: string;
  name: string;
  integration_type: string;
  provider?: string;
  description?: string;
  status: 'active' | 'inactive' | 'error' | 'testing';
  configuration?: Record<string, any>;
  credentials_encrypted?: string;
  webhook_url?: string;
  api_endpoint?: string;
  authentication_type?: string;
  is_system: boolean;
  sync_enabled: boolean;
  sync_frequency?: string;
  last_sync_at?: string;
  last_sync_status?: string;
  last_sync_error?: string;
  error_count?: number;
  success_count?: number;
  metadata?: Record<string, any>;
  created_by?: string;
  created_by_email?: string;
  created_at: string;
  updated_at: string;
}

export interface IntegrationLog {
  id: string;
  agency_id: string;
  integration_id: string;
  integration_name?: string;
  integration_type?: string;
  log_type: 'sync' | 'webhook' | 'api_call' | 'error' | 'info';
  event_type?: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  direction?: 'inbound' | 'outbound';
  request_data?: Record<string, any>;
  response_data?: Record<string, any>;
  error_message?: string;
  error_stack?: string;
  execution_time_ms?: number;
  records_processed?: number;
  records_success?: number;
  records_failed?: number;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  permissions?: Record<string, any>;
  rateLimitPerMinute?: number;
  rateLimitPerHour?: number;
  rateLimitPerDay?: number;
  isActive: boolean;
  expiresAt?: string;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationStats {
  integrations: {
    total_integrations?: number;
    active_integrations?: number;
    inactive_integrations?: number;
    error_integrations?: number;
    sync_enabled_count?: number;
  };
  logs: {
    total_logs?: number;
    success_logs?: number;
    error_logs?: number;
    logs_last_24h?: number;
  };
}

/**
 * Get all integrations (with optional filters)
 */
export async function getIntegrations(filters?: {
  integration_type?: string;
  provider?: string;
  status?: string;
  search?: string;
}): Promise<Integration[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const queryParams = new URLSearchParams();
  if (filters?.integration_type) queryParams.append('integration_type', filters.integration_type);
  if (filters?.provider) queryParams.append('provider', filters.provider);
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.search) queryParams.append('search', filters.search);

  const response = await fetch(`${API_BASE}/api/integrations?${queryParams.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch integrations' }));
    throw new Error(error.error || 'Failed to fetch integrations');
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Get integration by ID
 */
export async function getIntegrationById(integrationId: string): Promise<Integration> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/integrations/${integrationId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch integration' }));
    throw new Error(error.error || 'Failed to fetch integration');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Create integration
 */
export async function createIntegration(data: Partial<Integration>): Promise<Integration> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/integrations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create integration' }));
    throw new Error(error.error || error.message || 'Failed to create integration');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Update integration
 */
export async function updateIntegration(
  integrationId: string,
  data: Partial<Integration>
): Promise<Integration> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/integrations/${integrationId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update integration' }));
    throw new Error(error.error || error.message || 'Failed to update integration');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Delete integration
 */
export async function deleteIntegration(integrationId: string): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/integrations/${integrationId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete integration' }));
    throw new Error(error.error || error.message || 'Failed to delete integration');
  }
}

/**
 * Get integration logs
 */
export async function getIntegrationLogs(
  integrationId?: string,
  filters?: {
    log_type?: string;
    status?: string;
    direction?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
  }
): Promise<IntegrationLog[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  let url = integrationId
    ? `${API_BASE}/api/integrations/${integrationId}/logs`
    : `${API_BASE}/api/integrations/logs/all`;

  const queryParams = new URLSearchParams();
  if (filters?.log_type) queryParams.append('log_type', filters.log_type);
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.direction) queryParams.append('direction', filters.direction);
  if (filters?.start_date) queryParams.append('start_date', filters.start_date);
  if (filters?.end_date) queryParams.append('end_date', filters.end_date);
  if (filters?.limit) queryParams.append('limit', String(filters.limit));

  if (queryParams.toString()) {
    url += `?${queryParams.toString()}`;
  }

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch integration logs' }));
    throw new Error(error.error || 'Failed to fetch integration logs');
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Get integration statistics
 */
export async function getIntegrationStats(): Promise<IntegrationStats> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/integrations/stats`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch integration stats' }));
    throw new Error(error.error || 'Failed to fetch integration stats');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Test integration connection
 */
export async function testIntegration(integrationId: string): Promise<{ status: string; message: string }> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/integrations/${integrationId}/test`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to test integration' }));
    throw new Error(error.error || error.message || 'Failed to test integration');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Trigger integration sync
 */
export async function syncIntegration(integrationId: string): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/integrations/${integrationId}/sync`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to sync integration' }));
    throw new Error(error.error || error.message || 'Failed to sync integration');
  }
}

// API Key functions (reusing existing API keys service)
export async function getApiKeys(): Promise<ApiKey[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/api-keys`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch API keys' }));
    throw new Error(error.error || 'Failed to fetch API keys');
  }

  const result = await response.json();
  return result.data || [];
}

export async function createApiKey(data: {
  name: string;
  permissions?: Record<string, any>;
  rateLimitPerMinute?: number;
  rateLimitPerHour?: number;
  rateLimitPerDay?: number;
  expiresAt?: string;
  prefix?: string;
}): Promise<ApiKey & { key?: string }> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/api-keys`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create API key' }));
    throw new Error(error.error || error.message || 'Failed to create API key');
  }

  const result = await response.json();
  return result.data;
}

export async function revokeApiKey(keyId: string): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/api-keys/${keyId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to revoke API key' }));
    throw new Error(error.error || error.message || 'Failed to revoke API key');
  }
}

export async function getApiKeyUsage(keyId: string, period: string = 'day'): Promise<any> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/api-keys/${keyId}/usage?period=${period}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch API key usage' }));
    throw new Error(error.error || 'Failed to fetch API key usage');
  }

  const result = await response.json();
  return result.data;
}

