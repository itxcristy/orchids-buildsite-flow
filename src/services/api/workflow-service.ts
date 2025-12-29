/**
 * Workflow Management API Service
 * Frontend API client for workflow operations
 */

import { getApiBaseUrl } from '@/config/api';

const API_BASE = getApiBaseUrl();

/**
 * Get authentication token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

export interface Workflow {
  id: string;
  agency_id: string;
  name: string;
  description?: string;
  workflow_type: 'approval' | 'notification' | 'automation' | 'custom';
  entity_type: string;
  trigger_event?: string;
  is_active: boolean;
  is_system: boolean;
  version: number;
  configuration?: Record<string, any>;
  created_by?: string;
  created_by_email?: string;
  step_count?: number;
  instance_count?: number;
  created_at: string;
  updated_at: string;
}

export interface WorkflowStep {
  id: string;
  workflow_id: string;
  step_number: number;
  step_name: string;
  step_type: 'approval' | 'notification' | 'condition' | 'action' | 'delay';
  approver_type?: 'user' | 'role' | 'department' | 'manager' | 'custom';
  approver_id?: string;
  approver_email?: string;
  approver_role?: string;
  approver_department_id?: string;
  condition_expression?: string;
  action_config?: Record<string, any>;
  timeout_hours?: number;
  escalation_enabled: boolean;
  escalation_after_hours?: number;
  escalation_to?: string;
  is_required: boolean;
  is_parallel: boolean;
  sequence_group: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get all workflows (with optional filters)
 */
export async function getWorkflows(filters?: {
  workflow_type?: string;
  entity_type?: string;
  is_active?: boolean;
  search?: string;
}): Promise<Workflow[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const queryParams = new URLSearchParams();
  if (filters?.workflow_type) queryParams.append('workflow_type', filters.workflow_type);
  if (filters?.entity_type) queryParams.append('entity_type', filters.entity_type);
  if (filters?.is_active !== undefined) queryParams.append('is_active', String(filters.is_active));
  if (filters?.search) queryParams.append('search', filters.search);

  const response = await fetch(`${API_BASE}/api/workflows?${queryParams.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch workflows' }));
    throw new Error(error.error || 'Failed to fetch workflows');
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Get workflow by ID
 */
export async function getWorkflowById(workflowId: string): Promise<Workflow> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/workflows/${workflowId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch workflow' }));
    throw new Error(error.error || 'Failed to fetch workflow');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Create a workflow
 */
export async function createWorkflow(workflowData: Partial<Workflow>): Promise<Workflow> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/workflows`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(workflowData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create workflow' }));
    throw new Error(error.error || 'Failed to create workflow');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Update a workflow
 */
export async function updateWorkflow(workflowId: string, workflowData: Partial<Workflow>): Promise<Workflow> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/workflows/${workflowId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(workflowData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update workflow' }));
    throw new Error(error.error || 'Failed to update workflow');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Delete a workflow
 */
export async function deleteWorkflow(workflowId: string): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/workflows/${workflowId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete workflow' }));
    throw new Error(error.error || 'Failed to delete workflow');
  }
}

/**
 * Get workflow steps
 */
export async function getWorkflowSteps(workflowId: string): Promise<WorkflowStep[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/workflows/${workflowId}/steps`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch workflow steps' }));
    throw new Error(error.error || 'Failed to fetch workflow steps');
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Create a workflow step
 */
export async function createWorkflowStep(workflowId: string, stepData: Partial<WorkflowStep>): Promise<WorkflowStep> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/workflows/${workflowId}/steps`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(stepData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create workflow step' }));
    throw new Error(error.error || 'Failed to create workflow step');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Update a workflow step
 */
export async function updateWorkflowStep(workflowId: string, stepId: string, stepData: Partial<WorkflowStep>): Promise<WorkflowStep> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/workflows/${workflowId}/steps/${stepId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(stepData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update workflow step' }));
    throw new Error(error.error || 'Failed to update workflow step');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Delete a workflow step
 */
export async function deleteWorkflowStep(workflowId: string, stepId: string): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/workflows/${workflowId}/steps/${stepId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete workflow step' }));
    throw new Error(error.error || 'Failed to delete workflow step');
  }
}

/**
 * Workflow Instance interfaces and functions
 */
export interface WorkflowInstance {
  id: string;
  agency_id: string;
  workflow_id: string;
  workflow_name?: string;
  workflow_type?: string;
  entity_type: string;
  entity_id: string;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'cancelled' | 'completed';
  current_step_number: number;
  started_by?: string;
  started_by_email?: string;
  started_at: string;
  completed_at?: string;
  completed_by?: string;
  completed_by_email?: string;
  rejection_reason?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface WorkflowApproval {
  id: string;
  agency_id: string;
  instance_id: string;
  step_id: string;
  step_number: number;
  step_name?: string;
  step_type?: string;
  approver_id: string;
  approver_email?: string;
  status: 'pending' | 'approved' | 'rejected' | 'skipped' | 'delegated';
  action_taken_at?: string;
  comments?: string;
  delegated_to?: string;
  delegated_to_email?: string;
  is_timeout: boolean;
  timeout_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get all workflow instances (with optional filters)
 */
export async function getWorkflowInstances(filters?: {
  workflow_id?: string;
  entity_type?: string;
  entity_id?: string;
  status?: string;
  started_by?: string;
  date_from?: string;
  date_to?: string;
}): Promise<WorkflowInstance[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const queryParams = new URLSearchParams();
  if (filters?.workflow_id) queryParams.append('workflow_id', filters.workflow_id);
  if (filters?.entity_type) queryParams.append('entity_type', filters.entity_type);
  if (filters?.entity_id) queryParams.append('entity_id', filters.entity_id);
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.started_by) queryParams.append('started_by', filters.started_by);
  if (filters?.date_from) queryParams.append('date_from', filters.date_from);
  if (filters?.date_to) queryParams.append('date_to', filters.date_to);

  const response = await fetch(`${API_BASE}/api/workflows/instances?${queryParams.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch workflow instances' }));
    throw new Error(error.error || 'Failed to fetch workflow instances');
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Get workflow instance by ID
 */
export async function getWorkflowInstanceById(instanceId: string): Promise<WorkflowInstance> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/workflows/instances/${instanceId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch workflow instance' }));
    throw new Error(error.error || 'Failed to fetch workflow instance');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Get workflow approvals for an instance
 */
export async function getWorkflowApprovals(instanceId: string): Promise<WorkflowApproval[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/workflows/instances/${instanceId}/approvals`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch workflow approvals' }));
    throw new Error(error.error || 'Failed to fetch workflow approvals');
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Get all pending approvals for the current user
 */
export async function getAllPendingApprovals(): Promise<WorkflowApproval[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/workflows/approvals/pending`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch pending approvals' }));
    throw new Error(error.error || 'Failed to fetch pending approvals');
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Update a workflow approval (approve/reject)
 */
export async function updateWorkflowApproval(
  approvalId: string,
  approvalData: {
    status: 'approved' | 'rejected';
    comments?: string;
  }
): Promise<WorkflowApproval> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/workflows/approvals/${approvalId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(approvalData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update approval' }));
    throw new Error(error.error || 'Failed to update approval');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Create a workflow instance
 */
export async function createWorkflowInstance(instanceData: Partial<WorkflowInstance>): Promise<WorkflowInstance> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/workflows/instances`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(instanceData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create workflow instance' }));
    throw new Error(error.error || 'Failed to create workflow instance');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Update a workflow instance
 */
export async function updateWorkflowInstance(instanceId: string, instanceData: Partial<WorkflowInstance>): Promise<WorkflowInstance> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/workflows/instances/${instanceId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(instanceData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update workflow instance' }));
    throw new Error(error.error || 'Failed to update workflow instance');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Cancel a workflow instance
 */
export async function cancelWorkflowInstance(instanceId: string, reason?: string): Promise<WorkflowInstance> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/workflows/instances/${instanceId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to cancel workflow instance' }));
    throw new Error(error.error || 'Failed to cancel workflow instance');
  }

  const result = await response.json();
  return result.data;
}

