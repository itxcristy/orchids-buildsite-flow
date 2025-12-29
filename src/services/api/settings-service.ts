/**
 * Settings API Service
 * Handles module-specific settings management
 */

import { BaseApiService } from './base';
import { getApiBaseUrl } from '@/config/api';

const API_BASE = getApiBaseUrl();

/**
 * Get inventory settings
 */
export async function getInventorySettings() {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('Authentication required');
  }

  const agencyDatabase = localStorage.getItem('agency_database') || '';
  
  const response = await fetch(`${API_BASE}/api/settings/inventory`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': agencyDatabase,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch inventory settings' }));
    throw new Error(error.error || 'Failed to fetch inventory settings');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Update inventory settings
 */
export async function updateInventorySettings(settings: any) {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('Authentication required');
  }

  const agencyDatabase = localStorage.getItem('agency_database') || '';
  
  const response = await fetch(`${API_BASE}/api/settings/inventory`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': agencyDatabase,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update inventory settings' }));
    throw new Error(error.error || 'Failed to update inventory settings');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Get procurement settings
 */
export async function getProcurementSettings() {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('Authentication required');
  }

  const agencyDatabase = localStorage.getItem('agency_database') || '';
  
  const response = await fetch(`${API_BASE}/api/settings/procurement`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': agencyDatabase,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch procurement settings' }));
    throw new Error(error.error || 'Failed to fetch procurement settings');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Update procurement settings
 */
export async function updateProcurementSettings(settings: any) {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('Authentication required');
  }

  const agencyDatabase = localStorage.getItem('agency_database') || '';
  
  const response = await fetch(`${API_BASE}/api/settings/procurement`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': agencyDatabase,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update procurement settings' }));
    throw new Error(error.error || 'Failed to update procurement settings');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Get asset settings
 */
export async function getAssetSettings() {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('Authentication required');
  }

  const agencyDatabase = localStorage.getItem('agency_database') || '';
  
  const response = await fetch(`${API_BASE}/api/settings/assets`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': agencyDatabase,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch asset settings' }));
    throw new Error(error.error || 'Failed to fetch asset settings');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Update asset settings
 */
export async function updateAssetSettings(settings: any) {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('Authentication required');
  }

  const agencyDatabase = localStorage.getItem('agency_database') || '';
  
  const response = await fetch(`${API_BASE}/api/settings/assets`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': agencyDatabase,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update asset settings' }));
    throw new Error(error.error || 'Failed to update asset settings');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Get workflow settings
 */
export async function getWorkflowSettings() {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('Authentication required');
  }

  const agencyDatabase = localStorage.getItem('agency_database') || '';
  
  const response = await fetch(`${API_BASE}/api/settings/workflow`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': agencyDatabase,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch workflow settings' }));
    throw new Error(error.error || 'Failed to fetch workflow settings');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Update workflow settings
 */
export async function updateWorkflowSettings(settings: any) {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('Authentication required');
  }

  const agencyDatabase = localStorage.getItem('agency_database') || '';
  
  const response = await fetch(`${API_BASE}/api/settings/workflow`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': agencyDatabase,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update workflow settings' }));
    throw new Error(error.error || 'Failed to update workflow settings');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Get integration settings
 */
export async function getIntegrationSettings() {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('Authentication required');
  }

  const agencyDatabase = localStorage.getItem('agency_database') || '';
  
  const response = await fetch(`${API_BASE}/api/settings/integration`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': agencyDatabase,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch integration settings' }));
    throw new Error(error.error || 'Failed to fetch integration settings');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Update integration settings
 */
export async function updateIntegrationSettings(settings: any) {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('Authentication required');
  }

  const agencyDatabase = localStorage.getItem('agency_database') || '';
  
  const response = await fetch(`${API_BASE}/api/settings/integration`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': agencyDatabase,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update integration settings' }));
    throw new Error(error.error || 'Failed to update integration settings');
  }

  const result = await response.json();
  return result.data;
}

