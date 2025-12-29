// GST API Service - Full CRUD operations for GST compliance
import { BaseApiService, type ApiResponse } from './base';
import { getAgencyId } from '@/utils/agencyUtils';

export interface GSTSettings {
  id?: string;
  agency_id?: string;
  gstin: string;
  legal_name: string;
  trade_name?: string | null;
  business_type: 'regular' | 'composition' | 'casual' | 'non_resident';
  filing_frequency: 'monthly' | 'quarterly' | 'annual';
  composition_scheme: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface GSTReturn {
  id?: string;
  agency_id?: string;
  return_type: 'GSTR1' | 'GSTR3B' | 'GSTR9' | 'GSTR4';
  filing_period: string; // date
  due_date: string; // date
  status: 'pending' | 'filed' | 'late' | 'cancelled';
  total_taxable_value?: number;
  total_tax_amount?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  igst_amount?: number;
  cess_amount?: number;
  filed_date?: string | null;
  acknowledgment_number?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface GSTTransaction {
  id?: string;
  agency_id?: string;
  transaction_type: 'sale' | 'purchase' | 'credit_note' | 'debit_note';
  invoice_number: string;
  invoice_date: string; // date
  customer_gstin?: string | null;
  customer_name: string;
  place_of_supply?: string | null;
  hsn_sac_code?: string | null;
  description?: string | null;
  quantity?: number;
  unit_price: number;
  taxable_value: number;
  cgst_rate?: number;
  sgst_rate?: number;
  igst_rate?: number;
  cess_rate?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  igst_amount?: number;
  cess_amount?: number;
  total_amount: number;
  created_at?: string;
  updated_at?: string;
}

export interface GSTLiability {
  total_taxable_value: number;
  total_cgst: number;
  total_sgst: number;
  total_igst: number;
  total_cess: number;
  total_tax: number;
}

export class GSTService extends BaseApiService {
  // ============ GST Settings CRUD ============
  
  static async getSettings(): Promise<ApiResponse<GSTSettings>> {
    const agencyId = await getAgencyId();
    if (!agencyId) {
      return { data: null, error: 'Agency ID not found', success: false };
    }

    const response = await this.query<GSTSettings>(
      'gst_settings',
      {
        filters: { agency_id: agencyId, is_active: true },
        single: true
      },
      { showErrorToast: true }
    );

    // Handle single result
    if (response.success && Array.isArray(response.data)) {
      return { ...response, data: response.data[0] || null };
    }
    return response;
  }

  static async createSettings(settings: Omit<GSTSettings, 'id' | 'agency_id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<GSTSettings>> {
    const agencyId = await getAgencyId();
    if (!agencyId) {
      return { data: null, error: 'Agency ID not found', success: false };
    }

    const settingsData = {
      ...settings,
      agency_id: agencyId
    };

    return this.insert<GSTSettings>(
      'gst_settings',
      settingsData,
      { showErrorToast: true }
    );
  }

  static async updateSettings(settingsId: string, settings: Partial<Omit<GSTSettings, 'id' | 'agency_id' | 'created_at'>>): Promise<ApiResponse<GSTSettings>> {
    const agencyId = await getAgencyId();
    if (!agencyId) {
      return { data: null, error: 'Agency ID not found', success: false };
    }

    return this.update<GSTSettings>(
      'gst_settings',
      settings,
      { id: settingsId, agency_id: agencyId },
      { showErrorToast: true }
    );
  }

  static async deleteSettings(settingsId: string): Promise<ApiResponse<null>> {
    const agencyId = await getAgencyId();
    if (!agencyId) {
      return { data: null, error: 'Agency ID not found', success: false };
    }

    // Soft delete by setting is_active to false
    return this.update<GSTSettings>(
      'gst_settings',
      { is_active: false },
      { id: settingsId, agency_id: agencyId },
      { showErrorToast: true }
    );
  }

  // ============ GST Returns CRUD ============

  static async getReturns(filters?: { status?: string; return_type?: string; filing_period?: string }): Promise<ApiResponse<GSTReturn[]>> {
    const agencyId = await getAgencyId();
    if (!agencyId) {
      return { data: null, error: 'Agency ID not found', success: false };
    }

    const queryFilters: Record<string, any> = { agency_id: agencyId };
    if (filters?.status) queryFilters.status = filters.status;
    if (filters?.return_type) queryFilters.return_type = filters.return_type;
    if (filters?.filing_period) queryFilters.filing_period = filters.filing_period;

    return this.query<GSTReturn[]>(
      'gst_returns',
      {
        filters: queryFilters,
        orderBy: { column: 'filing_period', ascending: false }
      },
      { showErrorToast: true }
    );
  }

  static async getReturn(returnId: string): Promise<ApiResponse<GSTReturn>> {
    const agencyId = await getAgencyId();
    if (!agencyId) {
      return { data: null, error: 'Agency ID not found', success: false };
    }

    const response = await this.query<GSTReturn>(
      'gst_returns',
      {
        filters: { id: returnId, agency_id: agencyId },
        single: true
      },
      { showErrorToast: true }
    );

    // Handle single result
    if (response.success && Array.isArray(response.data)) {
      return { ...response, data: response.data[0] || null };
    }
    return response;
  }

  static async createReturn(gstReturn: Omit<GSTReturn, 'id' | 'agency_id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<GSTReturn>> {
    const agencyId = await getAgencyId();
    if (!agencyId) {
      return { data: null, error: 'Agency ID not found', success: false };
    }

    const returnData = {
      ...gstReturn,
      agency_id: agencyId
    };

    return this.insert<GSTReturn>(
      'gst_returns',
      returnData,
      { showErrorToast: true }
    );
  }

  static async updateReturn(returnId: string, gstReturn: Partial<Omit<GSTReturn, 'id' | 'agency_id' | 'created_at'>>): Promise<ApiResponse<GSTReturn>> {
    const agencyId = await getAgencyId();
    if (!agencyId) {
      return { data: null, error: 'Agency ID not found', success: false };
    }

    return this.update<GSTReturn>(
      'gst_returns',
      gstReturn,
      { id: returnId, agency_id: agencyId },
      { showErrorToast: true }
    );
  }

  static async deleteReturn(returnId: string): Promise<ApiResponse<null>> {
    const agencyId = await getAgencyId();
    if (!agencyId) {
      return { data: null, error: 'Agency ID not found', success: false };
    }

    return this.delete<null>(
      'gst_returns',
      { id: returnId, agency_id: agencyId },
      { showErrorToast: true }
    );
  }

  // ============ GST Transactions CRUD ============

  static async getTransactions(filters?: { 
    transaction_type?: string; 
    start_date?: string; 
    end_date?: string;
    invoice_number?: string;
  }): Promise<ApiResponse<GSTTransaction[]>> {
    const agencyId = await getAgencyId();
    if (!agencyId) {
      return { data: null, error: 'Agency ID not found', success: false };
    }

    // Build query with date filters
    let query = `SELECT * FROM public.gst_transactions WHERE agency_id = $1`;
    const params: any[] = [agencyId];
    let paramIndex = 2;

    if (filters?.transaction_type) {
      query += ` AND transaction_type = $${paramIndex++}`;
      params.push(filters.transaction_type);
    }
    
    if (filters?.invoice_number) {
      query += ` AND invoice_number ILIKE $${paramIndex++}`;
      params.push(`%${filters.invoice_number}%`);
    }

    if (filters?.start_date) {
      query += ` AND invoice_date >= $${paramIndex++}`;
      params.push(filters.start_date);
    }
    
    if (filters?.end_date) {
      query += ` AND invoice_date <= $${paramIndex++}`;
      params.push(filters.end_date);
    }

    query += ` ORDER BY invoice_date DESC, created_at DESC`;

    return this.execute(async () => {
      const { pgClient } = await import('@/integrations/postgresql/client');
      const result = await pgClient.query(query, params);
      return result.rows as GSTTransaction[];
    }, { showErrorToast: true });
  }

  static async getTransaction(transactionId: string): Promise<ApiResponse<GSTTransaction>> {
    const agencyId = await getAgencyId();
    if (!agencyId) {
      return { data: null, error: 'Agency ID not found', success: false };
    }

    const response = await this.query<GSTTransaction>(
      'gst_transactions',
      {
        filters: { id: transactionId, agency_id: agencyId },
        single: true
      },
      { showErrorToast: true }
    );

    // Handle single result
    if (response.success && Array.isArray(response.data)) {
      return { ...response, data: response.data[0] || null };
    }
    return response;
  }

  static async createTransaction(transaction: Omit<GSTTransaction, 'id' | 'agency_id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<GSTTransaction>> {
    const agencyId = await getAgencyId();
    if (!agencyId) {
      return { data: null, error: 'Agency ID not found', success: false };
    }

    const transactionData = {
      ...transaction,
      agency_id: agencyId
    };

    return this.insert<GSTTransaction>(
      'gst_transactions',
      transactionData,
      { showErrorToast: true }
    );
  }

  static async updateTransaction(transactionId: string, transaction: Partial<Omit<GSTTransaction, 'id' | 'agency_id' | 'created_at'>>): Promise<ApiResponse<GSTTransaction>> {
    const agencyId = await getAgencyId();
    if (!agencyId) {
      return { data: null, error: 'Agency ID not found', success: false };
    }

    return this.update<GSTTransaction>(
      'gst_transactions',
      transaction,
      { id: transactionId, agency_id: agencyId },
      { showErrorToast: true }
    );
  }

  static async deleteTransaction(transactionId: string): Promise<ApiResponse<null>> {
    const agencyId = await getAgencyId();
    if (!agencyId) {
      return { data: null, error: 'Agency ID not found', success: false };
    }

    return this.delete<null>(
      'gst_transactions',
      { id: transactionId, agency_id: agencyId },
      { showErrorToast: true }
    );
  }

  // ============ GST Liability Calculation ============

  static async calculateLiability(startDate: string, endDate: string): Promise<ApiResponse<GSTLiability>> {
    const agencyId = await getAgencyId();
    if (!agencyId) {
      return { data: null, error: 'Agency ID not found', success: false };
    }

    return this.execute(async () => {
      const { pgClient } = await import('@/integrations/postgresql/client');
      // Use explicit type casts to avoid "unknown" type errors
      const query = `SELECT * FROM public.calculate_gst_liability($1::UUID, $2::DATE, $3::DATE)`;
      const params = [agencyId, startDate, endDate];
      const result = await pgClient.query(query, params);
      
      if (result.rows && result.rows.length > 0) {
        return result.rows[0] as GSTLiability;
      }
      
      // Return default values if no data
      return {
        total_taxable_value: 0,
        total_cgst: 0,
        total_sgst: 0,
        total_igst: 0,
        total_cess: 0,
        total_tax: 0
      };
    }, { showErrorToast: false }); // Don't show toast on every error to reduce noise
  }

  // ============ Generate GST Return from Transactions ============

  static async generateReturn(
    returnType: 'GSTR1' | 'GSTR3B' | 'GSTR9' | 'GSTR4',
    filingPeriod: string
  ): Promise<ApiResponse<GSTReturn>> {
    const agencyId = await getAgencyId();
    if (!agencyId || agencyId === '00000000-0000-0000-0000-000000000000') {
      return { data: null, error: 'Agency ID not found or invalid', success: false };
    }

    // Parse filing period - it comes as "YYYY-MM" format, convert to first day of month
    let periodDate: Date;
    if (filingPeriod.match(/^\d{4}-\d{2}$/)) {
      // Format: "2025-12" -> convert to Date object for first day of month
      const [year, month] = filingPeriod.split('-').map(Number);
      periodDate = new Date(year, month - 1, 1);
    } else {
      // Try to parse as date string
      periodDate = new Date(filingPeriod);
      if (isNaN(periodDate.getTime())) {
        return { data: null, error: 'Invalid filing period format', success: false };
      }
    }
    
    // filing_period should be the first day of the month as a DATE
    const filingPeriodDate = new Date(periodDate.getFullYear(), periodDate.getMonth(), 1);
    
    // Calculate due date based on return type and filing period
    let dueDate = new Date(periodDate);
    
    if (returnType === 'GSTR1' || returnType === 'GSTR3B') {
      // Monthly returns due on 11th of next month
      dueDate.setMonth(dueDate.getMonth() + 1);
      dueDate.setDate(11);
    } else if (returnType === 'GSTR4') {
      // Quarterly returns due on 18th of next month
      dueDate.setMonth(dueDate.getMonth() + 1);
      dueDate.setDate(18);
    } else {
      // Annual returns due on 31st December of next year
      dueDate.setFullYear(dueDate.getFullYear() + 1);
      dueDate.setMonth(11);
      dueDate.setDate(31);
    }

    // Get transactions for the period
    const startDate = new Date(periodDate.getFullYear(), periodDate.getMonth(), 1).toISOString().split('T')[0];
    const endDate = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 0).toISOString().split('T')[0];

    const transactionsResponse = await this.getTransactions({
      start_date: startDate,
      end_date: endDate
    });

    if (!transactionsResponse.success || !transactionsResponse.data) {
      return { data: null, error: 'Failed to fetch transactions', success: false };
    }

    const transactions = transactionsResponse.data;
    const salesTransactions = transactions.filter(t => 
      t.transaction_type === 'sale' || t.transaction_type === 'debit_note'
    );

    // Calculate totals
    const totalTaxableValue = salesTransactions.reduce((sum, t) => sum + (Number(t.taxable_value) || 0), 0);
    const totalCgst = salesTransactions.reduce((sum, t) => sum + (Number(t.cgst_amount) || 0), 0);
    const totalSgst = salesTransactions.reduce((sum, t) => sum + (Number(t.sgst_amount) || 0), 0);
    const totalIgst = salesTransactions.reduce((sum, t) => sum + (Number(t.igst_amount) || 0), 0);
    const totalCess = salesTransactions.reduce((sum, t) => sum + (Number(t.cess_amount) || 0), 0);
    const totalTax = totalCgst + totalSgst + totalIgst + totalCess;

    // Ensure filing_period is a proper date (first day of the month)
    const filingPeriodDateStr = filingPeriodDate.toISOString().split('T')[0];
    
    const newReturn: Omit<GSTReturn, 'id' | 'agency_id' | 'created_at' | 'updated_at'> = {
      return_type: returnType,
      filing_period: filingPeriodDateStr, // DATE format (YYYY-MM-DD) - first day of month
      due_date: dueDate.toISOString().split('T')[0],
      status: 'pending',
      total_taxable_value: totalTaxableValue,
      total_tax_amount: totalTax,
      cgst_amount: totalCgst,
      sgst_amount: totalSgst,
      igst_amount: totalIgst,
      cess_amount: totalCess,
      filed_date: null,
      acknowledgment_number: null
    };

    return this.createReturn(newReturn);
  }
}
