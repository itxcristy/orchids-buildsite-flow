/**
 * Inventory Management Service
 * Frontend API client for inventory operations
 */

import { getApiBaseUrl } from '@/config/api';

const API_BASE = getApiBaseUrl();

export interface Warehouse {
  id: string;
  agency_id: string;
  code: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  agency_id: string;
  sku: string;
  name: string;
  description?: string;
  category_id?: string;
  brand?: string;
  unit_of_measure: string;
  barcode?: string;
  qr_code?: string;
  weight?: number;
  dimensions?: string;
  image_url?: string;
  is_active: boolean;
  is_trackable: boolean;
  track_by: 'serial' | 'batch' | 'none';
  created_at: string;
  updated_at: string;
}

export interface InventoryLevel {
  id: string;
  product_id: string;
  variant_id?: string;
  warehouse_id: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  reorder_point: number;
  reorder_quantity: number;
  max_stock?: number;
  min_stock?: number;
  valuation_method: string;
  average_cost: number;
  last_cost: number;
  product_name: string;
  product_sku: string;
  warehouse_name: string;
  warehouse_code: string;
}

export interface InventoryTransaction {
  id: string;
  agency_id: string;
  inventory_id: string;
  transaction_type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER' | 'RETURN';
  quantity: number;
  unit_cost?: number;
  total_cost?: number;
  reference_type?: string;
  reference_id?: string;
  from_warehouse_id?: string;
  to_warehouse_id?: string;
  serial_numbers?: string[];
  batch_number?: string;
  expiry_date?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

/**
 * Get authentication token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

/**
 * Get warehouses
 */
export async function getWarehouses(): Promise<Warehouse[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  try {
    const response = await fetch(`${API_BASE}/api/inventory/warehouses`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Agency-Database': localStorage.getItem('agency_database') || '',
      },
    });

    if (!response.ok) {
      if (response.status === 0 || response.status >= 500) {
        throw new Error('Unable to reach the API server. Please check your connection and try again.');
      }
      const error = await response.json().catch(() => ({ error: 'Failed to fetch warehouses' }));
      throw new Error(error.error || 'Failed to fetch warehouses');
    }

    const result = await response.json();
    return result.data || [];
  } catch (error: any) {
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('Unable to reach the API server. Please check your connection and try again.');
    }
    throw error;
  }
}

/**
 * Create warehouse
 */
export async function createWarehouse(warehouseData: Partial<Warehouse>): Promise<Warehouse> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/inventory/warehouses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(warehouseData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create warehouse' }));
    throw new Error(error.error || 'Failed to create warehouse');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Get products
 */
export async function getProducts(filters?: {
  category_id?: string;
  is_active?: boolean;
  search?: string;
  limit?: number;
}): Promise<Product[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  try {
    const queryParams = new URLSearchParams();
    if (filters?.category_id) queryParams.append('category_id', filters.category_id);
    if (filters?.is_active !== undefined) queryParams.append('is_active', String(filters.is_active));
    if (filters?.search) queryParams.append('search', filters.search);
    if (filters?.limit) queryParams.append('limit', String(filters.limit));

    const response = await fetch(`${API_BASE}/api/inventory/products?${queryParams}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Agency-Database': localStorage.getItem('agency_database') || '',
      },
    });

    if (!response.ok) {
      if (response.status === 0 || response.status >= 500) {
        throw new Error('Unable to reach the API server. Please check your connection and try again.');
      }
      const error = await response.json().catch(() => ({ error: 'Failed to fetch products' }));
      throw new Error(error.error || 'Failed to fetch products');
    }

    const result = await response.json();
    return result.data || [];
  } catch (error: any) {
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('Unable to reach the API server. Please check your connection and try again.');
    }
    throw error;
  }
}

/**
 * Create product
 */
export async function createProduct(productData: Partial<Product>): Promise<Product> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/inventory/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(productData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create product' }));
    throw new Error(error.error || 'Failed to create product');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Get inventory levels for a product
 */
export async function getInventoryLevels(productId: string, variantId?: string): Promise<InventoryLevel[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const queryParams = new URLSearchParams();
  if (variantId) queryParams.append('variant_id', variantId);

  const response = await fetch(`${API_BASE}/api/inventory/products/${productId}/levels?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch inventory levels' }));
    throw new Error(error.error || 'Failed to fetch inventory levels');
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Create inventory transaction
 */
export async function createInventoryTransaction(transactionData: Partial<InventoryTransaction>): Promise<InventoryTransaction> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/inventory/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(transactionData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create transaction' }));
    throw new Error(error.error || 'Failed to create transaction');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Get low stock alerts
 */
export async function getLowStockAlerts(): Promise<InventoryLevel[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/inventory/alerts/low-stock`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch alerts' }));
    throw new Error(error.error || 'Failed to fetch alerts');
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Get a single product by ID
 */
export async function getProductById(productId: string): Promise<Product> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/inventory/products/${productId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch product' }));
    throw new Error(error.error || 'Failed to fetch product');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Update a product
 */
export async function updateProduct(productId: string, productData: Partial<Product>): Promise<Product> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/inventory/products/${productId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(productData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update product' }));
    throw new Error(error.error || 'Failed to update product');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Delete a product
 */
export async function deleteProduct(productId: string): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/inventory/products/${productId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete product' }));
    throw new Error(error.error || 'Failed to delete product');
  }
}

/**
 * Update a warehouse
 */
export async function updateWarehouse(warehouseId: string, warehouseData: Partial<Warehouse>): Promise<Warehouse> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/inventory/warehouses/${warehouseId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(warehouseData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update warehouse' }));
    throw new Error(error.error || 'Failed to update warehouse');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Delete a warehouse
 */
export async function deleteWarehouse(warehouseId: string): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/inventory/warehouses/${warehouseId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete warehouse' }));
    throw new Error(error.error || 'Failed to delete warehouse');
  }
}

/**
 * Get product categories
 */
export async function getProductCategories(): Promise<Array<{ id: string; name: string; description?: string; parent_id?: string }>> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/inventory/categories`, {
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
 * Create product category
 */
export async function createProductCategory(categoryData: { name: string; description?: string; parent_id?: string }): Promise<any> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/inventory/categories`, {
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
 * Create inventory transfer
 */
export async function createTransfer(transferData: {
  product_id: string;
  variant_id?: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  quantity: number;
  notes?: string;
}): Promise<any> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/inventory/transfers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(transferData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create transfer' }));
    throw new Error(error.error || 'Failed to create transfer');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Create inventory adjustment
 */
export async function createAdjustment(adjustmentData: {
  product_id: string;
  variant_id?: string;
  warehouse_id: string;
  quantity: number;
  unit_cost?: number;
  reason?: string;
  notes?: string;
}): Promise<any> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/inventory/adjustments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(adjustmentData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create adjustment' }));
    throw new Error(error.error || 'Failed to create adjustment');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Get inventory transactions
 */
export async function getInventoryTransactions(filters?: {
  product_id?: string;
  warehouse_id?: string;
  transaction_type?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
}): Promise<InventoryTransaction[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const queryParams = new URLSearchParams();
  if (filters?.product_id) queryParams.append('product_id', filters.product_id);
  if (filters?.warehouse_id) queryParams.append('warehouse_id', filters.warehouse_id);
  if (filters?.transaction_type) queryParams.append('transaction_type', filters.transaction_type);
  if (filters?.start_date) queryParams.append('start_date', filters.start_date);
  if (filters?.end_date) queryParams.append('end_date', filters.end_date);
  if (filters?.limit) queryParams.append('limit', String(filters.limit));

  const response = await fetch(`${API_BASE}/api/inventory/transactions?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch transactions' }));
    throw new Error(error.error || 'Failed to fetch transactions');
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Serial Number interfaces and functions
 */
export interface SerialNumber {
  id: string;
  agency_id: string;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  variant_id?: string;
  serial_number: string;
  warehouse_id?: string;
  warehouse_name?: string;
  warehouse_code?: string;
  inventory_id?: string;
  status: 'available' | 'reserved' | 'sold' | 'returned' | 'damaged';
  purchase_order_id?: string;
  sale_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Batch interfaces and functions
 */
export interface Batch {
  id: string;
  agency_id: string;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  variant_id?: string;
  batch_number: string;
  warehouse_id?: string;
  warehouse_name?: string;
  warehouse_code?: string;
  inventory_id?: string;
  quantity: number;
  manufacture_date?: string;
  expiry_date?: string;
  purchase_order_id?: string;
  cost_per_unit?: number;
  status: 'active' | 'expired' | 'consumed' | 'damaged';
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get all serial numbers (with optional filters)
 */
export async function getSerialNumbers(filters?: {
  product_id?: string;
  warehouse_id?: string;
  status?: string;
  search?: string;
}): Promise<SerialNumber[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const queryParams = new URLSearchParams();
  if (filters?.product_id) queryParams.append('product_id', filters.product_id);
  if (filters?.warehouse_id) queryParams.append('warehouse_id', filters.warehouse_id);
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.search) queryParams.append('search', filters.search);

  const response = await fetch(`${API_BASE}/api/inventory/serial-numbers?${queryParams.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch serial numbers' }));
    throw new Error(error.error || 'Failed to fetch serial numbers');
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Create a serial number
 */
export async function createSerialNumber(serialData: Partial<SerialNumber>): Promise<SerialNumber> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/inventory/serial-numbers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(serialData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create serial number' }));
    throw new Error(error.error || 'Failed to create serial number');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Update a serial number
 */
export async function updateSerialNumber(serialId: string, serialData: Partial<SerialNumber>): Promise<SerialNumber> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/inventory/serial-numbers/${serialId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(serialData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update serial number' }));
    throw new Error(error.error || 'Failed to update serial number');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Delete a serial number
 */
export async function deleteSerialNumber(serialId: string): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/inventory/serial-numbers/${serialId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete serial number' }));
    throw new Error(error.error || 'Failed to delete serial number');
  }
}

/**
 * Get all batches (with optional filters)
 */
export async function getBatches(filters?: {
  product_id?: string;
  warehouse_id?: string;
  status?: string;
  expiring_soon?: number;
  search?: string;
}): Promise<Batch[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const queryParams = new URLSearchParams();
  if (filters?.product_id) queryParams.append('product_id', filters.product_id);
  if (filters?.warehouse_id) queryParams.append('warehouse_id', filters.warehouse_id);
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.expiring_soon) queryParams.append('expiring_soon', String(filters.expiring_soon));
  if (filters?.search) queryParams.append('search', filters.search);

  const response = await fetch(`${API_BASE}/api/inventory/batches?${queryParams.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch batches' }));
    throw new Error(error.error || 'Failed to fetch batches');
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Create a batch
 */
export async function createBatch(batchData: Partial<Batch>): Promise<Batch> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/inventory/batches`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(batchData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create batch' }));
    throw new Error(error.error || 'Failed to create batch');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Update a batch
 */
export async function updateBatch(batchId: string, batchData: Partial<Batch>): Promise<Batch> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/inventory/batches/${batchId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(batchData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update batch' }));
    throw new Error(error.error || 'Failed to update batch');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Delete a batch
 */
export async function deleteBatch(batchId: string): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/inventory/batches/${batchId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete batch' }));
    throw new Error(error.error || 'Failed to delete batch');
  }
}

/**
 * Inventory Reports interfaces and functions
 */
export interface InventoryReportSummary {
  summary: {
    total_products?: number;
    total_warehouses?: number;
    total_inventory_records?: number;
    total_quantity?: number;
    total_value?: number;
    low_stock_items?: number;
  };
  transactions: Array<{
    transaction_type: string;
    count: number;
    total_quantity: number;
    total_cost: number;
  }>;
  top_products: Array<{
    id: string;
    sku: string;
    name: string;
    total_quantity: number;
    total_value: number;
    available_quantity: number;
  }>;
  warehouses: Array<{
    id: string;
    code: string;
    name: string;
    product_count: number;
    total_quantity: number;
    total_value: number;
  }>;
  date_range: {
    from: string;
    to: string;
  };
}

export interface StockValueReportItem {
  id: string;
  sku: string;
  name: string;
  category_id?: string;
  category_name?: string;
  warehouse_id: string;
  warehouse_code: string;
  warehouse_name: string;
  quantity: number;
  available_quantity: number;
  average_cost: number;
  last_cost: number;
  stock_value: number;
  reorder_point: number;
  is_low_stock: boolean;
}

export interface MovementReportItem {
  date: string;
  transaction_type: string;
  transaction_count: number;
  total_quantity: number;
  total_cost: number;
  sku: string;
  product_name: string;
  warehouse_code?: string;
  warehouse_name?: string;
}

export interface WarehouseUtilizationItem {
  id: string;
  code: string;
  name: string;
  product_count: number;
  inventory_records: number;
  total_quantity: number;
  available_quantity: number;
  reserved_quantity: number;
  total_value: number;
  low_stock_count: number;
}

/**
 * Get inventory reports summary
 */
export async function getInventoryReports(filters?: {
  date_from?: string;
  date_to?: string;
}): Promise<InventoryReportSummary> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const queryParams = new URLSearchParams();
  if (filters?.date_from) queryParams.append('date_from', filters.date_from);
  if (filters?.date_to) queryParams.append('date_to', filters.date_to);

  const response = await fetch(`${API_BASE}/api/inventory/reports?${queryParams.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch reports' }));
    throw new Error(error.error || 'Failed to fetch reports');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Get stock value report
 */
export async function getStockValueReport(filters?: {
  warehouse_id?: string;
  category_id?: string;
  low_stock_only?: boolean;
}): Promise<StockValueReportItem[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const queryParams = new URLSearchParams();
  if (filters?.warehouse_id) queryParams.append('warehouse_id', filters.warehouse_id);
  if (filters?.category_id) queryParams.append('category_id', filters.category_id);
  if (filters?.low_stock_only) queryParams.append('low_stock_only', 'true');

  const response = await fetch(`${API_BASE}/api/inventory/reports/stock-value?${queryParams.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch stock value report' }));
    throw new Error(error.error || 'Failed to fetch stock value report');
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Get movement report
 */
export async function getMovementReport(filters?: {
  date_from?: string;
  date_to?: string;
  product_id?: string;
  warehouse_id?: string;
  transaction_type?: string;
}): Promise<MovementReportItem[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const queryParams = new URLSearchParams();
  if (filters?.date_from) queryParams.append('date_from', filters.date_from);
  if (filters?.date_to) queryParams.append('date_to', filters.date_to);
  if (filters?.product_id) queryParams.append('product_id', filters.product_id);
  if (filters?.warehouse_id) queryParams.append('warehouse_id', filters.warehouse_id);
  if (filters?.transaction_type) queryParams.append('transaction_type', filters.transaction_type);

  const response = await fetch(`${API_BASE}/api/inventory/reports/movement?${queryParams.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch movement report' }));
    throw new Error(error.error || 'Failed to fetch movement report');
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Get warehouse utilization report
 */
export async function getWarehouseUtilizationReport(): Promise<WarehouseUtilizationItem[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/inventory/reports/warehouse-utilization`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch warehouse utilization' }));
    throw new Error(error.error || 'Failed to fetch warehouse utilization');
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Generate product code (barcode/QR)
 */
export async function generateProductCode(productId: string, codeType: 'barcode' | 'qr' = 'barcode'): Promise<string> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/inventory/products/${productId}/generate-code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify({ codeType }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to generate code' }));
    throw new Error(error.error || 'Failed to generate code');
  }

  const result = await response.json();
  return result.data.code;
}

/**
 * BOM (Bill of Materials) interfaces and functions
 */
export interface Bom {
  id: string;
  agency_id: string;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  name: string;
  version?: string;
  is_active: boolean;
  notes?: string;
  item_count?: number;
  items?: BomItem[];
  created_at: string;
  updated_at: string;
}

export interface BomItem {
  id: string;
  bom_id: string;
  component_product_id: string;
  component_name?: string;
  component_sku?: string;
  component_uom?: string;
  quantity: number;
  unit_of_measure: string;
  sequence: number;
  notes?: string;
  created_at: string;
}

/**
 * Get all BOMs
 */
export async function getBoms(filters?: {
  product_id?: string;
  is_active?: boolean;
  limit?: number;
}): Promise<Bom[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const params = new URLSearchParams();
  if (filters?.product_id) params.append('product_id', filters.product_id);
  if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active));
  if (filters?.limit) params.append('limit', String(filters.limit));

  const response = await fetch(`${API_BASE}/api/inventory/boms?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch BOMs' }));
    throw new Error(error.error || 'Failed to fetch BOMs');
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Get a single BOM by ID
 */
export async function getBomById(bomId: string): Promise<Bom> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/inventory/boms/${bomId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch BOM' }));
    throw new Error(error.error || 'Failed to fetch BOM');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Create a new BOM
 */
export async function createBom(bomData: Partial<Bom>): Promise<Bom> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/inventory/boms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(bomData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create BOM' }));
    throw new Error(error.error || 'Failed to create BOM');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Update a BOM
 */
export async function updateBom(bomId: string, bomData: Partial<Bom>): Promise<Bom> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/inventory/boms/${bomId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(bomData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update BOM' }));
    throw new Error(error.error || 'Failed to update BOM');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Delete a BOM
 */
export async function deleteBom(bomId: string): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/inventory/boms/${bomId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete BOM' }));
    throw new Error(error.error || 'Failed to delete BOM');
  }
}
