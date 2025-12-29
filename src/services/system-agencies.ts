import { getApiEndpoint } from '@/config/services';

interface ApiEnvelopeSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

interface ApiEnvelopeError {
  success: false;
  error: {
    code?: string;
    message: string;
    details?: string;
  };
  message?: string;
}

type ApiEnvelope<T> = ApiEnvelopeSuccess<T> | ApiEnvelopeError;

function authHeaders() {
  if (typeof window === 'undefined') return {};
  const token = window.localStorage.getItem('auth_token') || '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  let parsed: ApiEnvelope<T>;
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

export interface AgencyDetails {
  id: string;
  name: string;
  domain: string;
  subscription_plan: string;
  max_users: number;
  is_active: boolean;
  created_at: string;
  user_count: number;
  project_count: number;
  invoice_count: number;
}

export interface AgencyUser {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export interface AgencyUsage {
  users: number;
  projects: number;
  invoices: number;
  clients: number;
  tasks: number;
}

export interface UpdateAgencyData {
  name?: string;
  domain?: string;
  subscription_plan?: string;
  max_users?: number;
  is_active?: boolean;
}

export async function fetchAgencyDetails(agencyId: string): Promise<AgencyDetails> {
  const endpoint = getApiEndpoint(`/system/agencies/${encodeURIComponent(agencyId)}`);
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch agency details: ${response.status}`);
  }
  const data = await parseJson<{ agency: AgencyDetails }>(response);
  return data.agency;
}

export async function updateAgency(
  agencyId: string,
  updates: UpdateAgencyData
): Promise<AgencyDetails> {
  const endpoint = getApiEndpoint(`/system/agencies/${encodeURIComponent(agencyId)}`);
  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    throw new Error(`Failed to update agency: ${response.status}`);
  }
  const data = await parseJson<{ agency: AgencyDetails }>(response);
  return data.agency;
}

export async function fetchAgencyUsers(agencyId: string): Promise<AgencyUser[]> {
  const endpoint = getApiEndpoint(`/system/agencies/${encodeURIComponent(agencyId)}/users`);
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch agency users: ${response.status}`);
  }
  const data = await parseJson<{ users: AgencyUser[] }>(response);
  return data.users;
}

export async function fetchAgencyUsage(agencyId: string): Promise<AgencyUsage> {
  const endpoint = getApiEndpoint(`/system/agencies/${encodeURIComponent(agencyId)}/usage`);
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch agency usage: ${response.status}`);
  }
  const data = await parseJson<{ usage: AgencyUsage }>(response);
  return data.usage;
}

/**
 * Export agency backup as ZIP file and trigger download
 * @param agencyId - Agency ID to export
 * @returns Promise that resolves when download starts
 */
export async function exportAgencyBackup(agencyId: string): Promise<void> {
  const endpoint = getApiEndpoint(`/system/agencies/${encodeURIComponent(agencyId)}/export-backup`);
  const headers = authHeaders();
  // Remove Content-Type for blob response
  delete headers['Content-Type'];
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Failed to export backup: ${response.status}`;
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.error?.message || errorData.message || errorMessage;
    } catch {
      // If parsing fails, use default message
    }
    throw new Error(errorMessage);
  }

  // Get blob from response
  const blob = await response.blob();
  
  // Extract filename from Content-Disposition header or generate one
  const contentDisposition = response.headers.get('Content-Disposition');
  let filename = `agency_backup_${agencyId}_${new Date().toISOString().slice(0, 10)}.zip`;
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
    if (filenameMatch) {
      filename = filenameMatch[1];
    }
  }

  // Create download link and trigger download
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Delete an agency completely
 * @param agencyId - Agency ID to delete
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteAgency(agencyId: string): Promise<void> {
  const endpoint = getApiEndpoint(`/system/agencies/${encodeURIComponent(agencyId)}`);
  const response = await fetch(endpoint, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Failed to delete agency: ${response.status}`;
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.error?.message || errorData.message || errorMessage;
    } catch {
      // If parsing fails, use default message
    }
    throw new Error(errorMessage);
  }

  await parseJson<{ message: string }>(response);
}
