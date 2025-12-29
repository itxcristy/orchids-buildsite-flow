import { getApiEndpoint } from '@/config/services';

export interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  avgResolutionTime: number;
  newToday: number;
  resolvedToday: number;
}

export interface RecentTicket {
  id: string;
  ticket_number: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  category: string;
}

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

export interface SupportTicket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  category: string;
  user_id?: string | null;
  agency_id?: string | null;
  department?: string | null;
  console_logs?: any;
  error_details?: any;
  browser_info?: any;
  page_url?: string | null;
  screenshot_url?: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface CreateTicketData {
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high';
  category?: string;
  status?: 'open' | 'in_progress' | 'resolved' | 'closed';
  console_logs?: any;
  error_details?: any;
  browser_info?: any;
  page_url?: string;
  department?: string;
}

export interface CreatePublicTicketData {
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high';
  category?: string;
  console_logs?: any;
  error_details?: any;
  browser_info?: any;
  page_url?: string;
  department?: string;
}

export interface UpdateTicketData {
  title?: string;
  description?: string;
  status?: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority?: 'low' | 'medium' | 'high';
  category?: string;
}

export async function fetchTicketSummary(): Promise<{
  stats: TicketStats;
  recentTickets: RecentTicket[];
}> {
  const endpoint = getApiEndpoint('/system/tickets/summary');
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ticket summary: ${response.status}`);
  }
  return parseJson<{ stats: TicketStats; recentTickets: RecentTicket[] }>(
    response
  );
}

export async function fetchTickets(params?: {
  status?: string;
  priority?: string;
  category?: string;
  limit?: number;
  offset?: number;
}): Promise<SupportTicket[]> {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.priority) queryParams.append('priority', params.priority);
  if (params?.category) queryParams.append('category', params.category);
  if (params?.limit) queryParams.append('limit', String(params.limit));
  if (params?.offset) queryParams.append('offset', String(params.offset));

  const endpoint = getApiEndpoint(`/system/tickets?${queryParams.toString()}`);
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch tickets: ${response.status}`);
  }
  const data = await parseJson<{ tickets: SupportTicket[] }>(response);
  return data.tickets;
}

export async function fetchTicket(ticketId: string): Promise<SupportTicket> {
  const endpoint = getApiEndpoint(`/system/tickets/${encodeURIComponent(ticketId)}`);
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ticket: ${response.status}`);
  }
  const data = await parseJson<{ ticket: SupportTicket }>(response);
  return data.ticket;
}

export async function createTicket(ticketData: CreateTicketData): Promise<SupportTicket> {
  const endpoint = getApiEndpoint('/system/tickets');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(ticketData),
  });
  if (!response.ok) {
    throw new Error(`Failed to create ticket: ${response.status}`);
  }
  const data = await parseJson<{ ticket: SupportTicket }>(response);
  return data.ticket;
}

export async function updateTicket(
  ticketId: string,
  updates: UpdateTicketData
): Promise<SupportTicket> {
  const endpoint = getApiEndpoint(`/system/tickets/${encodeURIComponent(ticketId)}`);
  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    throw new Error(`Failed to update ticket: ${response.status}`);
  }
  const data = await parseJson<{ ticket: SupportTicket }>(response);
  return data.ticket;
}

export async function deleteTicket(ticketId: string): Promise<void> {
  const endpoint = getApiEndpoint(`/system/tickets/${encodeURIComponent(ticketId)}`);
  const response = await fetch(endpoint, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to delete ticket: ${response.status}`);
  }
  await parseJson<unknown>(response);
}

/**
 * Create a ticket via the public endpoint (accessible to all authenticated users)
 * This endpoint allows users to create tickets with console logs and error details
 */
export async function createPublicTicket(ticketData: CreatePublicTicketData): Promise<SupportTicket> {
  const endpoint = getApiEndpoint('/system/tickets/public');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(ticketData),
  });
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Failed to create ticket: ${response.status}`;
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.error?.message || errorData.message || errorMessage;
    } catch {
      // Use default error message
    }
    throw new Error(errorMessage);
  }
  const data = await parseJson<{ ticket: SupportTicket }>(response);
  return data.ticket;
}

