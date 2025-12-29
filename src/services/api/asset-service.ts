/**
 * Asset Management API Service
 * Frontend API client for asset management operations
 */

import { getApiBaseUrl } from '@/config/api';

const API_BASE = getApiBaseUrl();

/**
 * Get authentication token from localStorage
 */
function getAuthToken(): string | null {
  return typeof window === 'undefined' ? null : localStorage.getItem('auth_token');
}

export interface Asset {
  id: string;
  agency_id: string;
  asset_number: string;
  name: string;
  description?: string;
  category_id?: string;
  category_name?: string;
  category_code?: string;
  location_id?: string;
  location_name?: string;
  location_code?: string;
  department_id?: string;
  assigned_to?: string;
  assigned_to_email?: string;
  purchase_date?: string;
  purchase_cost: number;
  current_value: number;
  residual_value?: number;
  useful_life_years?: number;
  depreciation_method?: string;
  depreciation_rate?: number;
  status: 'active' | 'maintenance' | 'disposed' | 'written_off';
  condition_status?: 'excellent' | 'good' | 'fair' | 'poor';
  serial_number?: string;
  model_number?: string;
  manufacturer?: string;
  supplier_id?: string;
  warranty_start_date?: string;
  warranty_end_date?: string;
  insurance_policy_number?: string;
  insurance_value?: number;
  insurance_expiry_date?: string;
  notes?: string;
  image_url?: string;
  document_url?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AssetCategory {
  id: string;
  agency_id: string;
  parent_id?: string;
  code: string;
  name: string;
  description?: string;
  depreciation_method?: string;
  default_useful_life_years?: number;
  default_depreciation_rate?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssetLocation {
  id: string;
  agency_id: string;
  code: string;
  name: string;
  address?: string;
  building?: string;
  floor?: string;
  room?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceRecord {
  id: string;
  agency_id: string;
  asset_id: string;
  asset_name?: string;
  asset_number?: string;
  maintenance_type: 'scheduled' | 'preventive' | 'corrective' | 'emergency';
  title: string;
  description?: string;
  scheduled_date?: string;
  completed_date?: string;
  due_date?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  cost?: number;
  vendor_id?: string;
  vendor_name?: string;
  technician?: string;
  technician_contact?: string;
  parts_used?: string;
  labor_hours?: number;
  notes?: string;
  next_maintenance_date?: string;
  performed_by?: string;
  performed_by_email?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DepreciationRecord {
  id: string;
  agency_id: string;
  asset_id: string;
  asset_name?: string;
  asset_number?: string;
  depreciation_date: string;
  period_start: string;
  period_end: string;
  depreciation_amount: number;
  accumulated_depreciation: number;
  book_value: number;
  depreciation_method: 'straight_line' | 'declining_balance' | 'units_of_production';
  is_posted: boolean;
  journal_entry_id?: string;
  posted_at?: string;
  posted_by?: string;
  posted_by_email?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get all assets
 */
export async function getAssets(filters?: {
  category_id?: string;
  status?: string;
  location_id?: string;
  search?: string;
  limit?: number;
}): Promise<Asset[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const queryParams = new URLSearchParams();
  if (filters?.category_id) queryParams.append('category_id', filters.category_id);
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.location_id) queryParams.append('location_id', filters.location_id);
  if (filters?.search) queryParams.append('search', filters.search);
  if (filters?.limit) queryParams.append('limit', filters.limit.toString());

  const response = await fetch(`${API_BASE}/api/assets?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch assets' }));
    throw new Error(error.error || 'Failed to fetch assets');
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Get a single asset by ID
 */
export async function getAssetById(assetId: string): Promise<Asset> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/assets/${assetId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch asset' }));
    throw new Error(error.error || 'Failed to fetch asset');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Create a new asset
 */
export async function createAsset(assetData: Partial<Asset>): Promise<Asset> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/assets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(assetData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create asset' }));
    throw new Error(error.error || 'Failed to create asset');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Update an asset
 */
export async function updateAsset(assetId: string, assetData: Partial<Asset>): Promise<Asset> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/assets/${assetId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(assetData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update asset' }));
    throw new Error(error.error || 'Failed to update asset');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Get all asset categories
 */
export async function getAssetCategories(): Promise<AssetCategory[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/assets/categories`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch categories' }));
    throw new Error(error.error || 'Failed to fetch categories');
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Create an asset category
 */
export async function createAssetCategory(categoryData: Partial<AssetCategory>): Promise<AssetCategory> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/assets/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(categoryData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create category' }));
    throw new Error(error.error || 'Failed to create category');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Update an asset category
 */
export async function updateAssetCategory(categoryId: string, categoryData: Partial<AssetCategory>): Promise<AssetCategory> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/assets/categories/${categoryId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(categoryData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update category' }));
    throw new Error(error.error || 'Failed to update category');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Delete an asset category
 */
export async function deleteAssetCategory(categoryId: string): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/assets/categories/${categoryId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete category' }));
    throw new Error(error.error || 'Failed to delete category');
  }
}

/**
 * Get all asset locations
 */
export async function getAssetLocations(): Promise<AssetLocation[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/assets/locations`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch locations' }));
    throw new Error(error.error || 'Failed to fetch locations');
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Create an asset location
 */
export async function createAssetLocation(locationData: Partial<AssetLocation>): Promise<AssetLocation> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/assets/locations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(locationData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create location' }));
    throw new Error(error.error || 'Failed to create location');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Update an asset location
 */
export async function updateAssetLocation(locationId: string, locationData: Partial<AssetLocation>): Promise<AssetLocation> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/assets/locations/${locationId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(locationData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update location' }));
    throw new Error(error.error || 'Failed to update location');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Delete an asset location
 */
export async function deleteAssetLocation(locationId: string): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/assets/locations/${locationId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete location' }));
    throw new Error(error.error || 'Failed to delete location');
  }
}

/**
 * Get all depreciation records (with optional filters)
 */
export async function getAllDepreciation(filters?: {
  asset_id?: string;
  is_posted?: boolean;
  depreciation_method?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}): Promise<DepreciationRecord[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const queryParams = new URLSearchParams();
  if (filters?.asset_id) queryParams.append('asset_id', filters.asset_id);
  if (filters?.is_posted !== undefined) queryParams.append('is_posted', String(filters.is_posted));
  if (filters?.depreciation_method) queryParams.append('depreciation_method', filters.depreciation_method);
  if (filters?.date_from) queryParams.append('date_from', filters.date_from);
  if (filters?.date_to) queryParams.append('date_to', filters.date_to);
  if (filters?.search) queryParams.append('search', filters.search);

  const response = await fetch(`${API_BASE}/api/assets/depreciation?${queryParams.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch depreciation records' }));
    throw new Error(error.error || 'Failed to fetch depreciation records');
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Get depreciation records for an asset
 */
export async function getAssetDepreciation(assetId: string): Promise<DepreciationRecord[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/assets/${assetId}/depreciation`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch depreciation' }));
    throw new Error(error.error || 'Failed to fetch depreciation');
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Create a depreciation record
 */
export async function createDepreciation(depreciationData: Partial<DepreciationRecord>): Promise<DepreciationRecord> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/assets/depreciation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(depreciationData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create depreciation record' }));
    throw new Error(error.error || 'Failed to create depreciation record');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Update a depreciation record
 */
export async function updateDepreciation(depreciationId: string, depreciationData: Partial<DepreciationRecord>): Promise<DepreciationRecord> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/assets/depreciation/${depreciationId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(depreciationData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update depreciation record' }));
    throw new Error(error.error || 'Failed to update depreciation record');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Delete a depreciation record
 */
export async function deleteDepreciation(depreciationId: string): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/assets/depreciation/${depreciationId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete depreciation record' }));
    throw new Error(error.error || 'Failed to delete depreciation record');
  }
}

/**
 * Get all maintenance records (with optional filters)
 */
export async function getAllMaintenance(filters?: {
  asset_id?: string;
  status?: string;
  maintenance_type?: string;
  priority?: string;
  search?: string;
}): Promise<MaintenanceRecord[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const queryParams = new URLSearchParams();
  if (filters?.asset_id) queryParams.append('asset_id', filters.asset_id);
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.maintenance_type) queryParams.append('maintenance_type', filters.maintenance_type);
  if (filters?.priority) queryParams.append('priority', filters.priority);
  if (filters?.search) queryParams.append('search', filters.search);

  const response = await fetch(`${API_BASE}/api/assets/maintenance?${queryParams.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch maintenance' }));
    throw new Error(error.error || 'Failed to fetch maintenance');
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Get maintenance records for an asset
 */
export async function getAssetMaintenance(assetId: string): Promise<MaintenanceRecord[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/assets/${assetId}/maintenance`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch maintenance' }));
    throw new Error(error.error || 'Failed to fetch maintenance');
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Create a maintenance record
 */
export async function createMaintenance(maintenanceData: Partial<MaintenanceRecord>): Promise<MaintenanceRecord> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/assets/maintenance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(maintenanceData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create maintenance record' }));
    throw new Error(error.error || 'Failed to create maintenance record');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Update a maintenance record
 */
export async function updateMaintenance(maintenanceId: string, maintenanceData: Partial<MaintenanceRecord>): Promise<MaintenanceRecord> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/assets/maintenance/${maintenanceId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(maintenanceData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update maintenance record' }));
    throw new Error(error.error || 'Failed to update maintenance record');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Delete a maintenance record
 */
export async function deleteMaintenance(maintenanceId: string): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/assets/maintenance/${maintenanceId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete maintenance record' }));
    throw new Error(error.error || 'Failed to delete maintenance record');
  }
}

export interface DisposalRecord {
  id: string;
  agency_id: string;
  asset_id: string;
  asset_number?: string;
  asset_name?: string;
  purchase_cost?: number;
  current_value?: number;
  disposal_number: string;
  disposal_date: string;
  disposal_type: 'sale' | 'scrap' | 'donation' | 'write_off' | 'transfer';
  disposal_reason?: string;
  disposal_value: number;
  buyer_name?: string;
  buyer_contact?: string;
  disposal_method?: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_by_email?: string;
  approved_at?: string;
  disposal_cost: number;
  net_proceeds: number;
  journal_entry_id?: string;
  posted_at?: string;
  posted_by?: string;
  notes?: string;
  document_url?: string;
  created_by?: string;
  created_by_email?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get all asset disposals
 */
export async function getAllDisposals(filters?: {
  asset_id?: string;
  disposal_type?: string;
  approval_status?: string;
  date_from?: string;
  date_to?: string;
}): Promise<DisposalRecord[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const queryParams = new URLSearchParams();
  if (filters?.asset_id) queryParams.append('asset_id', filters.asset_id);
  if (filters?.disposal_type) queryParams.append('disposal_type', filters.disposal_type);
  if (filters?.approval_status) queryParams.append('approval_status', filters.approval_status);
  if (filters?.date_from) queryParams.append('date_from', filters.date_from);
  if (filters?.date_to) queryParams.append('date_to', filters.date_to);

  const response = await fetch(`${API_BASE}/api/assets/disposals?${queryParams.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch disposals' }));
    throw new Error(error.error || 'Failed to fetch disposals');
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Get asset disposal by ID
 */
export async function getDisposalById(disposalId: string): Promise<DisposalRecord> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/assets/disposals/${disposalId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch disposal' }));
    throw new Error(error.error || 'Failed to fetch disposal');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Create asset disposal
 */
export async function createDisposal(disposalData: Partial<DisposalRecord>): Promise<DisposalRecord> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/assets/disposals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(disposalData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create disposal' }));
    throw new Error(error.error || error.message || 'Failed to create disposal');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Update asset disposal
 */
export async function updateDisposal(
  disposalId: string,
  disposalData: Partial<DisposalRecord>
): Promise<DisposalRecord> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/assets/disposals/${disposalId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(disposalData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update disposal' }));
    throw new Error(error.error || error.message || 'Failed to update disposal');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Delete asset disposal
 */
export async function deleteDisposal(disposalId: string): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/assets/disposals/${disposalId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete disposal' }));
    throw new Error(error.error || error.message || 'Failed to delete disposal');
  }
}

/**
 * Approve asset disposal
 */
export async function approveDisposal(disposalId: string): Promise<DisposalRecord> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/assets/disposals/${disposalId}/approve`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to approve disposal' }));
    throw new Error(error.error || error.message || 'Failed to approve disposal');
  }

  const result = await response.json();
  return result.data;
}

export interface AssetReports {
  summary: {
    total_assets?: number;
    active_assets?: number;
    maintenance_assets?: number;
    disposed_assets?: number;
    total_categories?: number;
    total_locations?: number;
    total_purchase_cost?: number;
    total_current_value?: number;
    total_depreciation?: number;
  };
  assets_by_status: Array<{
    status: string;
    count: number;
    total_purchase_cost: number;
    total_current_value: number;
  }>;
  assets_by_category: Array<{
    id: string;
    name: string;
    code: string;
    asset_count: number;
    total_purchase_cost: number;
    total_current_value: number;
  }>;
  depreciation_trend: Array<{
    month: string;
    record_count: number;
    total_depreciation: number;
  }>;
  maintenance_summary: Array<{
    maintenance_type: string;
    count: number;
    total_cost: number;
  }>;
  top_assets: Array<{
    id: string;
    asset_number: string;
    name: string;
    purchase_cost: number;
    current_value: number;
    status: string;
    category_name?: string;
  }>;
  date_range: {
    from: string;
    to: string;
  };
}

/**
 * Get asset reports
 */
export async function getAssetReports(filters?: {
  date_from?: string;
  date_to?: string;
}): Promise<AssetReports> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const queryParams = new URLSearchParams();
  if (filters?.date_from) queryParams.append('date_from', filters.date_from);
  if (filters?.date_to) queryParams.append('date_to', filters.date_to);

  const response = await fetch(`${API_BASE}/api/assets/reports?${queryParams.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch asset reports' }));
    throw new Error(error.error || 'Failed to fetch asset reports');
  }

  const result = await response.json();
  return result.data;
}

