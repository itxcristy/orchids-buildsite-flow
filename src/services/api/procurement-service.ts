/**
 * Procurement Management Service
 * Frontend API client for procurement operations
 */

import { getApiBaseUrl } from '@/config/api';

const API_BASE = getApiBaseUrl();

export interface PurchaseRequisition {
  id: string;
  agency_id: string;
  requisition_number: string;
  requested_by: string;
  department_id?: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  required_date?: string;
  total_amount: number;
  notes?: string;
  approved_by?: string;
  approved_at?: string;
  rejected_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: string;
  agency_id: string;
  po_number: string;
  requisition_id?: string;
  supplier_id: string;
  status: 'draft' | 'sent' | 'acknowledged' | 'partial' | 'received' | 'completed' | 'cancelled';
  order_date: string;
  expected_delivery_date?: string;
  delivery_address?: string;
  payment_terms?: string;
  currency: string;
  exchange_rate: number;
  subtotal: number;
  tax_amount: number;
  shipping_cost: number;
  discount_amount: number;
  total_amount: number;
  notes?: string;
  terms_conditions?: string;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  supplier_name?: string;
  supplier_code?: string;
}

export interface GoodsReceipt {
  id: string;
  agency_id: string;
  grn_number: string;
  po_id: string;
  warehouse_id: string;
  received_date: string;
  received_by?: string;
  status: 'pending' | 'inspected' | 'approved' | 'rejected';
  inspection_notes?: string;
  quality_status?: 'passed' | 'failed' | 'partial';
  inspected_by?: string;
  inspected_at?: string;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  po_number?: string;
  warehouse_name?: string;
  warehouse_code?: string;
}

/**
 * Get authentication token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

/**
 * Get purchase requisitions
 */
export async function getPurchaseRequisitions(filters?: {
  status?: string;
}): Promise<PurchaseRequisition[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const queryParams = new URLSearchParams();
  if (filters?.status) queryParams.append('status', filters.status);

  const response = await fetch(`${API_BASE}/api/procurement/requisitions?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch requisitions' }));
    throw new Error(error.error || 'Failed to fetch requisitions');
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Create purchase requisition
 */
export async function createPurchaseRequisition(requisitionData: Partial<PurchaseRequisition>): Promise<PurchaseRequisition> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/procurement/requisitions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(requisitionData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create requisition' }));
    throw new Error(error.error || 'Failed to create requisition');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Get purchase orders
 */
export async function getPurchaseOrders(filters?: {
  status?: string;
  supplier_id?: string;
}): Promise<PurchaseOrder[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const queryParams = new URLSearchParams();
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.supplier_id) queryParams.append('supplier_id', filters.supplier_id);

  const response = await fetch(`${API_BASE}/api/procurement/purchase-orders?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch purchase orders' }));
    throw new Error(error.error || 'Failed to fetch purchase orders');
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Create purchase order
 */
export async function createPurchaseOrder(poData: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/procurement/purchase-orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(poData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create purchase order' }));
    throw new Error(error.error || 'Failed to create purchase order');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Get goods receipts
 */
export async function getGoodsReceipts(filters?: {
  status?: string;
}): Promise<GoodsReceipt[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const queryParams = new URLSearchParams();
  if (filters?.status) queryParams.append('status', filters.status);

  const response = await fetch(`${API_BASE}/api/procurement/goods-receipts?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch goods receipts' }));
    throw new Error(error.error || 'Failed to fetch goods receipts');
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Create goods receipt
 */
export async function createGoodsReceipt(grnData: Partial<GoodsReceipt>): Promise<GoodsReceipt> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/procurement/goods-receipts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(grnData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create goods receipt' }));
    throw new Error(error.error || 'Failed to create goods receipt');
  }

  const result = await response.json();
  return result.data;
}

export interface Supplier {
  id: string;
  agency_id: string;
  code?: string;
  name: string;
  company_name?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  alternate_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  tax_id?: string;
  payment_terms?: string;
  credit_limit?: number;
  rating?: number;
  is_active: boolean;
  is_preferred: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RfqRfp {
  id: string;
  agency_id: string;
  rfq_number: string;
  title: string;
  description?: string;
  type: 'RFQ' | 'RFP';
  status: string;
  published_date?: string;
  closing_date?: string;
  currency: string;
  terms_conditions?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get suppliers/vendors
 */
export async function getSuppliers(filters?: {
  is_active?: boolean;
  search?: string;
}): Promise<Supplier[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const queryParams = new URLSearchParams();
  if (filters?.is_active !== undefined) queryParams.append('is_active', String(filters.is_active));
  if (filters?.search) queryParams.append('search', filters.search);

  const response = await fetch(`${API_BASE}/api/procurement/suppliers?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch suppliers' }));
    throw new Error(error.error || 'Failed to fetch suppliers');
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Create supplier
 */
export async function createSupplier(supplierData: Partial<Supplier>): Promise<Supplier> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/procurement/suppliers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(supplierData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create supplier' }));
    throw new Error(error.error || 'Failed to create supplier');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Get a single supplier by ID
 */
export async function getSupplierById(supplierId: string): Promise<Supplier> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/procurement/suppliers/${supplierId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch supplier' }));
    throw new Error(error.error || 'Failed to fetch supplier');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Update supplier
 */
export async function updateSupplier(supplierId: string, supplierData: Partial<Supplier>): Promise<Supplier> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/procurement/suppliers/${supplierId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(supplierData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update supplier' }));
    throw new Error(error.error || 'Failed to update supplier');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Get a single purchase order by ID
 */
export async function getPurchaseOrderById(poId: string): Promise<PurchaseOrder> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/procurement/purchase-orders/${poId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch purchase order' }));
    throw new Error(error.error || 'Failed to fetch purchase order');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Update purchase order
 */
export async function updatePurchaseOrder(poId: string, poData: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/procurement/purchase-orders/${poId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(poData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update purchase order' }));
    throw new Error(error.error || 'Failed to update purchase order');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Get RFQ/RFP records
 */
export async function getRfqRfp(filters?: {
  status?: string;
  type?: 'RFQ' | 'RFP';
}): Promise<RfqRfp[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const queryParams = new URLSearchParams();
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.type) queryParams.append('type', filters.type);

  const response = await fetch(`${API_BASE}/api/procurement/rfq?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch RFQ/RFP' }));
    throw new Error(error.error || 'Failed to fetch RFQ/RFP');
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Create RFQ/RFP
 */
export async function createRfqRfp(rfqData: Partial<RfqRfp>): Promise<RfqRfp> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/procurement/rfq`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(rfqData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create RFQ/RFP' }));
    throw new Error(error.error || 'Failed to create RFQ/RFP');
  }

  const result = await response.json();
  return result.data;
}

export interface VendorContract {
  id: string;
  agency_id: string;
  supplier_id: string;
  supplier_name?: string;
  supplier_code?: string;
  contract_number: string;
  title: string;
  contract_type?: string;
  start_date: string;
  end_date?: string;
  value?: number;
  currency: string;
  terms_conditions?: string;
  renewal_terms?: string;
  status: 'draft' | 'active' | 'expired' | 'terminated';
  signed_by?: string;
  signed_by_email?: string;
  signed_date?: string;
  document_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface VendorPerformance {
  id: string;
  agency_id: string;
  supplier_id: string;
  supplier_name?: string;
  supplier_code?: string;
  period_start: string;
  period_end: string;
  total_orders: number;
  total_order_value: number;
  on_time_delivery_rate: number;
  quality_rating: number;
  cost_rating: number;
  communication_rating: number;
  overall_rating: number;
  late_deliveries: number;
  rejected_items: number;
  notes?: string;
  evaluated_by?: string;
  evaluated_by_email?: string;
  evaluated_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get vendor contracts
 */
export async function getVendorContracts(filters?: {
  supplier_id?: string;
  status?: string;
  contract_type?: string;
}): Promise<VendorContract[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const queryParams = new URLSearchParams();
  if (filters?.supplier_id) queryParams.append('supplier_id', filters.supplier_id);
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.contract_type) queryParams.append('contract_type', filters.contract_type);

  const response = await fetch(`${API_BASE}/api/procurement/vendor-contracts?${queryParams.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch vendor contracts' }));
    throw new Error(error.error || 'Failed to fetch vendor contracts');
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Get vendor contract by ID
 */
export async function getVendorContractById(contractId: string): Promise<VendorContract> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/procurement/vendor-contracts/${contractId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch vendor contract' }));
    throw new Error(error.error || 'Failed to fetch vendor contract');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Create vendor contract
 */
export async function createVendorContract(contractData: Partial<VendorContract>): Promise<VendorContract> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/procurement/vendor-contracts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(contractData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create vendor contract' }));
    throw new Error(error.error || error.message || 'Failed to create vendor contract');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Update vendor contract
 */
export async function updateVendorContract(
  contractId: string,
  contractData: Partial<VendorContract>
): Promise<VendorContract> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/procurement/vendor-contracts/${contractId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(contractData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update vendor contract' }));
    throw new Error(error.error || error.message || 'Failed to update vendor contract');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Delete vendor contract
 */
export async function deleteVendorContract(contractId: string): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/procurement/vendor-contracts/${contractId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete vendor contract' }));
    throw new Error(error.error || error.message || 'Failed to delete vendor contract');
  }
}

/**
 * Get vendor performance records
 */
export async function getVendorPerformance(filters?: {
  supplier_id?: string;
  period_start?: string;
  period_end?: string;
}): Promise<VendorPerformance[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const queryParams = new URLSearchParams();
  if (filters?.supplier_id) queryParams.append('supplier_id', filters.supplier_id);
  if (filters?.period_start) queryParams.append('period_start', filters.period_start);
  if (filters?.period_end) queryParams.append('period_end', filters.period_end);

  const response = await fetch(`${API_BASE}/api/procurement/vendor-performance?${queryParams.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch vendor performance' }));
    throw new Error(error.error || 'Failed to fetch vendor performance');
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Get vendor performance by ID
 */
export async function getVendorPerformanceById(performanceId: string): Promise<VendorPerformance> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/procurement/vendor-performance/${performanceId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch vendor performance' }));
    throw new Error(error.error || 'Failed to fetch vendor performance');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Create vendor performance record
 */
export async function createVendorPerformance(
  performanceData: Partial<VendorPerformance>
): Promise<VendorPerformance> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/procurement/vendor-performance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(performanceData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create vendor performance' }));
    throw new Error(error.error || error.message || 'Failed to create vendor performance');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Update vendor performance record
 */
export async function updateVendorPerformance(
  performanceId: string,
  performanceData: Partial<VendorPerformance>
): Promise<VendorPerformance> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/procurement/vendor-performance/${performanceId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify(performanceData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update vendor performance' }));
    throw new Error(error.error || error.message || 'Failed to update vendor performance');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Delete vendor performance record
 */
export async function deleteVendorPerformance(performanceId: string): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/api/procurement/vendor-performance/${performanceId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete vendor performance' }));
    throw new Error(error.error || error.message || 'Failed to delete vendor performance');
  }
}

export interface ProcurementReports {
  summary: {
    total_requisitions?: number;
    approved_requisitions?: number;
    total_purchase_orders?: number;
    completed_orders?: number;
    total_goods_receipts?: number;
    total_suppliers?: number;
    pending_po_value?: number;
    completed_po_value?: number;
    total_po_value?: number;
  };
  requisitions_by_status: Array<{
    status: string;
    count: number;
    total_amount: number;
  }>;
  purchase_orders_by_status: Array<{
    status: string;
    count: number;
    total_amount: number;
  }>;
  top_suppliers: Array<{
    id: string;
    name: string;
    code: string;
    order_count: number;
    total_order_value: number;
    completed_orders: number;
  }>;
  monthly_trend: Array<{
    month: string;
    order_count: number;
    total_amount: number;
  }>;
  date_range: {
    from: string;
    to: string;
  };
}

/**
 * Get procurement reports
 */
export async function getProcurementReports(filters?: {
  date_from?: string;
  date_to?: string;
}): Promise<ProcurementReports> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const queryParams = new URLSearchParams();
  if (filters?.date_from) queryParams.append('date_from', filters.date_from);
  if (filters?.date_to) queryParams.append('date_to', filters.date_to);

  const response = await fetch(`${API_BASE}/api/procurement/reports?${queryParams.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch procurement reports' }));
    throw new Error(error.error || 'Failed to fetch procurement reports');
  }

  const result = await response.json();
  return result.data;
}