/**
 * Workflow Automation API Service
 * Additional automation rule functions
 */

import { getApiBaseUrl } from '@/config/api';

const API_BASE = getApiBaseUrl();

/**
 * Get authentication token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

export interface AutomationRule {
  id: string;
  agency_id: string;
  name: string;
  description?: string;
  rule_type: 'trigger' | 'condition' | 'action' | 'schedule';
  entity_type: string;
  trigger_event: string;
  trigger_condition: Record<string, any>;
  action_type: string;
  action_config: Record<string, any>;
  is_active: boolean;
  priority: number;
  execution_count: number;
  last_executed_at?: string;
  created_by?: string;
  created_by_email?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get all automation rules
 */
export async function getAutomationRules(filters?: {
  rule_type?: string;
  entity_type?: string;
  is_active?: boolean;
  search?: string;
}): Promise<AutomationRule[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const queryParams = new URLSearchParams();
  if (filters?.rule_type) queryParams.append('rule_type', filters.rule_type);
  if (filters?.entity_type) queryParams.append('entity_type', filters.entity_type);
  if (filters?.is_active !== undefined) queryParams.append('is_active', String(filters.is_active));
  if (filters?.search) queryParams.append('search', filters.search);

  const response = await fetch(`${API_BASE}/api/workflows/automation?${queryParams.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch automation rules' }));
    throw new Error(error.error || 'Failed to fetch automation rules');
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Get automation rule by ID
 */
export async function getAutomationRuleById(ruleId: string): Promise<AutomationRule> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/workflows/automation/${ruleId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch automation rule' }));
    throw new Error(error.error || 'Failed to fetch automation rule');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Create automation rule
 */
export async function createAutomationRule(ruleData: Partial<AutomationRule>): Promise<AutomationRule> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/workflows/automation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(ruleData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create automation rule' }));
    throw new Error(error.error || 'Failed to create automation rule');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Update automation rule
 */
export async function updateAutomationRule(ruleId: string, ruleData: Partial<AutomationRule>): Promise<AutomationRule> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/workflows/automation/${ruleId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(ruleData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update automation rule' }));
    throw new Error(error.error || 'Failed to update automation rule');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Delete automation rule
 */
export async function deleteAutomationRule(ruleId: string): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/workflows/automation/${ruleId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete automation rule' }));
    throw new Error(error.error || 'Failed to delete automation rule');
  }
}

