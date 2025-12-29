// Database Query Builder - PostgreSQL API
// This provides a familiar query builder API for PostgreSQL database operations

import { selectRecords, selectOne, insertRecord, updateRecord, deleteRecord } from '@/services/api/postgresql-service';
import { generateUUID } from './uuid';

type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is' | 'not';

interface QueryFilter {
  column: string;
  operator: FilterOperator;
  value: any;
  negated?: boolean;
}

interface QueryBuilder<T = any> {
  _table: string;
  _select: string;
  _filters: QueryFilter[];
  _orderBy: { column: string; ascending: boolean } | null;
  _limit: number | null;
  _single: boolean;

  select(columns?: string): QueryBuilder<T>;
  eq(column: string, value: any): QueryBuilder<T>;
  neq(column: string, value: any): QueryBuilder<T>;
  gt(column: string, value: any): QueryBuilder<T>;
  gte(column: string, value: any): QueryBuilder<T>;
  lt(column: string, value: any): QueryBuilder<T>;
  lte(column: string, value: any): QueryBuilder<T>;
  like(column: string, value: string): QueryBuilder<T>;
  ilike(column: string, value: string): QueryBuilder<T>;
  in(column: string, values: any[]): QueryBuilder<T>;
  is(column: string, value: null | boolean): QueryBuilder<T>;
  not(column: string, operator: string, value: any): QueryBuilder<T>;
  or(filters: string): QueryBuilder<T>;
  order(column: string, options?: { ascending?: boolean }): QueryBuilder<T>;
  limit(count: number): QueryBuilder<T>;
  single(): QueryBuilder<T>;
  maybeSingle(): QueryBuilder<T>;

  insert(data: Partial<T> | Partial<T>[]): InsertBuilder<T>;
  update(data: Partial<T>): UpdateBuilder<T>;
  delete(): DeleteBuilder<T>;

  then<TResult = { data: T[] | T | null; error: Error | null }>(
    onfulfilled?: (value: { data: T[] | T | null; error: Error | null }) => TResult | PromiseLike<TResult>
  ): Promise<TResult>;
}

interface InsertBuilder<T> {
  select(columns?: string): InsertBuilder<T>;
  single(): InsertBuilder<T>;
  then<TResult = { data: T | T[] | null; error: Error | null }>(
    onfulfilled?: (value: { data: T | T[] | null; error: Error | null }) => TResult | PromiseLike<TResult>
  ): Promise<TResult>;
}

interface UpdateBuilder<T> {
  eq(column: string, value: any): UpdateBuilder<T>;
  select(columns?: string): UpdateBuilder<T>;
  single(): UpdateBuilder<T>;
  then<TResult = { data: T | null; error: Error | null }>(
    onfulfilled?: (value: { data: T | null; error: Error | null }) => TResult | PromiseLike<TResult>
  ): Promise<TResult>;
}

interface DeleteBuilder<T> {
  eq(column: string, value: any): DeleteBuilder<T>;
  then<TResult = { data: null; error: Error | null }>(
    onfulfilled?: (value: { data: null; error: Error | null }) => TResult | PromiseLike<TResult>
  ): Promise<TResult>;
}

function createQueryBuilder<T = any>(table: string): QueryBuilder<T> {
  const state = {
    _table: table,
    _select: '*',
    _filters: [] as QueryFilter[],
    _orderBy: null as { column: string; ascending: boolean } | null,
    _limit: null as number | null,
    _single: false,
    _insertData: null as any,
    _updateData: null as any,
    _isInsert: false,
    _isUpdate: false,
    _isDelete: false,
  };

  const builder: QueryBuilder<T> = {
    get _table() { return state._table; },
    get _select() { return state._select; },
    get _filters() { return state._filters; },
    get _orderBy() { return state._orderBy; },
    get _limit() { return state._limit; },
    get _single() { return state._single; },

    select(columns = '*') {
      state._select = columns;
      return builder;
    },

    eq(column: string, value: any) {
      state._filters.push({ column, operator: 'eq', value });
      return builder;
    },

    neq(column: string, value: any) {
      state._filters.push({ column, operator: 'neq', value });
      return builder;
    },

    gt(column: string, value: any) {
      state._filters.push({ column, operator: 'gt', value });
      return builder;
    },

    gte(column: string, value: any) {
      state._filters.push({ column, operator: 'gte', value });
      return builder;
    },

    lt(column: string, value: any) {
      state._filters.push({ column, operator: 'lt', value });
      return builder;
    },

    lte(column: string, value: any) {
      state._filters.push({ column, operator: 'lte', value });
      return builder;
    },

    like(column: string, value: string) {
      state._filters.push({ column, operator: 'like', value });
      return builder;
    },

    ilike(column: string, value: string) {
      state._filters.push({ column, operator: 'ilike', value });
      return builder;
    },

    in(column: string, values: any[]) {
      state._filters.push({ column, operator: 'in', value: values });
      return builder;
    },

    is(column: string, value: null | boolean) {
      state._filters.push({ column, operator: 'is', value });
      return builder;
    },

    not(column: string, operator: string, value: any) {
      state._filters.push({ column, operator: operator as FilterOperator, value, negated: true });
      return builder;
    },

    or(filters: string) {
      // Parse OR filter string like "col1.eq.val1,col2.eq.val2"
      // Store as special OR filter that will be handled in the execution
      state._filters.push({ column: '__or__', operator: 'eq', value: filters });
      return builder;
    },

    order(column: string, options = { ascending: true }) {
      state._orderBy = { column, ascending: options.ascending ?? true };
      return builder;
    },

    limit(count: number) {
      state._limit = count;
      return builder;
    },

    single() {
      state._single = true;
      state._limit = 1;
      return builder;
    },

    maybeSingle() {
      state._single = true;
      state._limit = 1;
      return builder;
    },

    insert(data: Partial<T> | Partial<T>[]) {
      state._isInsert = true;
      state._insertData = data;
      
      const insertBuilder: InsertBuilder<T> = {
        select(columns = '*') {
          state._select = columns;
          return insertBuilder;
        },
        single() {
          state._single = true;
          return insertBuilder;
        },
        async then<TResult = { data: T | T[] | null; error: Error | null }>(
          onfulfilled?: (value: { data: T | T[] | null; error: Error | null }) => TResult | PromiseLike<TResult>
        ): Promise<TResult> {
          try {
            // Get agency_id from localStorage if available
            let agencyId: string | null = null;
            if (typeof window !== 'undefined') {
              agencyId = localStorage.getItem('agency_id') || null;
            }
            
            const dataArray = Array.isArray(state._insertData) ? state._insertData : [state._insertData];
            const results: T[] = [];
            
            for (const item of dataArray) {
              const result = await insertRecord<T>(state._table, item, undefined, agencyId);
              results.push(result);
            }
            
            const response = {
              data: state._single ? results[0] : results,
              error: null as Error | null
            };
            const result = onfulfilled ? await onfulfilled(response) : response;
            return result as TResult;
          } catch (error: any) {
            const response = { data: null as T | T[] | null, error: error as Error };
            const result = onfulfilled ? await onfulfilled(response) : response;
            return result as TResult;
          }
        }
      };
      
      return insertBuilder;
    },

    update(data: Partial<T>) {
      state._isUpdate = true;
      state._updateData = data;
      
      const updateBuilder: UpdateBuilder<T> = {
        eq(column: string, value: any) {
          state._filters.push({ column, operator: 'eq', value });
          return updateBuilder;
        },
        select(columns = '*') {
          state._select = columns;
          return updateBuilder;
        },
        single() {
          state._single = true;
          return updateBuilder;
        },
        async then<TResult = { data: T | null; error: Error | null }>(
          onfulfilled?: (value: { data: T | null; error: Error | null }) => TResult | PromiseLike<TResult>
        ): Promise<TResult> {
          try {
            const where: Record<string, any> = {};
            state._filters.forEach(f => {
              if (f.operator === 'eq') {
                where[f.column] = f.value;
              }
            });
            
            const result = await updateRecord<T>(state._table, state._updateData, where);
            const response = { data: result, error: null as Error | null };
            const fulfilled = onfulfilled ? await onfulfilled(response) : response;
            return fulfilled as TResult;
          } catch (error: any) {
            const response = { data: null as T | null, error: error as Error };
            const fulfilled = onfulfilled ? await onfulfilled(response) : response;
            return fulfilled as TResult;
          }
        }
      };
      
      return updateBuilder;
    },

    delete() {
      state._isDelete = true;
      
      const deleteBuilder: DeleteBuilder<T> = {
        eq(column: string, value: any) {
          state._filters.push({ column, operator: 'eq', value });
          return deleteBuilder;
        },
        async then<TResult = { data: null; error: Error | null }>(
          onfulfilled?: (value: { data: null; error: Error | null }) => TResult | PromiseLike<TResult>
        ): Promise<TResult> {
          try {
            const where: Record<string, any> = {};
            state._filters.forEach(f => {
              if (f.operator === 'eq') {
                where[f.column] = f.value;
              }
            });
            
            await deleteRecord(state._table, where);
            const response = { data: null, error: null as Error | null };
            const fulfilled = onfulfilled ? await onfulfilled(response) : response;
            return fulfilled as TResult;
          } catch (error: any) {
            const response = { data: null, error: error as Error };
            const fulfilled = onfulfilled ? await onfulfilled(response) : response;
            return fulfilled as TResult;
          }
        }
      };
      
      return deleteBuilder;
    },

    async then<TResult = { data: T | T[] | null; error: Error | null }>(
      onfulfilled?: (value: { data: T | T[] | null; error: Error | null }) => TResult | PromiseLike<TResult>
    ): Promise<TResult> {
      try {
        // Build filters object with all operators
        const filters = state._filters.map(f => ({
          column: f.column,
          operator: f.operator,
          value: f.value,
          negated: f.negated || false
        }));

        let data: T | T[] | null;

        if (state._single) {
          // For single record, use simple where clause with eq filters only
          const where: Record<string, any> = {};
          state._filters.forEach(f => {
            if (f.operator === 'eq' && !f.negated) {
              where[f.column] = f.value;
            }
          });
          data = await selectOne<T>(state._table, where);
        } else {
          data = await selectRecords<T>(state._table, {
            select: state._select,
            filters,
            orderBy: state._orderBy?.column 
              ? `${state._orderBy.column} ${state._orderBy.ascending ? 'ASC' : 'DESC'}` 
              : undefined,
            limit: state._limit || undefined,
          });
        }

        const response = { data, error: null as Error | null };
        const fulfilled = onfulfilled ? await onfulfilled(response) : response;
        return fulfilled as TResult;
      } catch (error: any) {
        const response = { data: null as T | T[] | null, error: error as Error };
        const fulfilled = onfulfilled ? await onfulfilled(response) : response;
        return fulfilled as TResult;
      }
    }
  };

  return builder;
}

// Realtime subscription stub (no-op for browser-only mode)
interface RealtimeChannel {
  on(event: string, config: any, callback: (payload: any) => void): RealtimeChannel;
  subscribe(): RealtimeChannel;
  unsubscribe(): void;
}

function createRealtimeChannel(name: string): RealtimeChannel {
  // No-op implementation for browser-only mode
  const channel: RealtimeChannel = {
    on(_event: string, _config: any, _callback: (payload: any) => void) {
      // No-op - realtime not available in browser-only mode
      return channel;
    },
    subscribe() {
      return channel;
    },
    unsubscribe() {
      return channel;
    }
  };
  return channel;
}

// RPC function stubs for common operations
async function handleRpcCall(functionName: string, params: Record<string, any>): Promise<{ data: any; error: Error | null }> {
  try {
    switch (functionName) {
      case 'get_unread_notification_count': {
        const userId = params.p_user_id;
        const notifications = await selectRecords('notifications', {
          where: { user_id: userId }
        });
        const unreadCount = notifications.filter((n: any) => !n.read_at).length;
        return { data: unreadCount, error: null };
      }
      case 'mark_notification_read': {
        const notificationId = params.p_notification_id;
        await updateRecord('notifications', { read_at: new Date().toISOString() }, { id: notificationId });
        return { data: null, error: null };
      }
      case 'create_notification': {
        // Get agency_id from params or try to get it from user's profile
        let agencyId = params.p_agency_id;
        if (!agencyId && params.p_user_id) {
          // Try to get agency_id from user's profile
          const profile = await selectOne('profiles', { user_id: params.p_user_id });
          if (profile) {
            agencyId = (profile as any).agency_id;
          }
        }
        
        const notification = await insertRecord('notifications', {
          id: generateUUID(),
          user_id: params.p_user_id,
          title: params.p_title,
          message: params.p_message,
          type: params.p_type || 'in_app',
          category: params.p_category || 'system',
          priority: params.p_priority || 'normal',
          action_url: params.p_action_url || null,
          metadata: params.p_metadata || {},
          created_at: new Date().toISOString(),
        }, params.p_user_id, agencyId);
        return { data: notification, error: null };
      }
      case 'has_permission': {
        // Check if user has specific permission
        const roles = await selectRecords('user_roles', {
          where: { user_id: params.p_user_id }
        });
        // Super admin and admin have all permissions
        const hasPermission = roles.some((r: any) => 
          r.role === 'super_admin' || r.role === 'admin' || r.role === params.p_permission
        );
        return { data: hasPermission, error: null };
      }
      case 'list_employees_secure': {
        // List all employees with their profiles
        const employees = await selectRecords('employee_details', {});
        return { data: employees, error: null };
      }
      case 'get_leave_balance_summary': {
        // Get leave balance summary for user
        const userId = params.p_user_id;
        const leaveBalances = await selectRecords('leave_balances', {
          where: { user_id: userId }
        });
        return { data: leaveBalances, error: null };
      }
      case 'calculate_gst_liability': {
        // Calculate GST liability - return mock data for now
        return { 
          data: {
            total_sales: 0,
            total_purchases: 0,
            gst_payable: 0,
            gst_credit: 0,
            net_liability: 0
          }, 
          error: null 
        };
      }
      case 'generate_client_number': {
        // Generate unique client number
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substr(2, 4).toUpperCase();
        return { data: `CLT-${timestamp}-${random}`, error: null };
      }
      default:
        console.warn(`RPC function "${functionName}" not implemented`);
        return { data: null, error: null };
    }
  } catch (error: any) {
    return { data: null, error };
  }
}

// Generate a secure temporary password
function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Auth interface for authentication compatibility
const auth = {
  async signUp(options: {
    email: string;
    password: string;
    options?: { data?: Record<string, any> };
  }): Promise<{ data: { user: any; session: any } | null; error: Error | null }> {
    try {
      const userId = generateUUID();
      
      // Create user in users table
      await insertRecord('users', {
        id: userId,
        email: options.email,
        password_hash: options.password, // In real app, this would be hashed
        is_active: true,
        email_confirmed: true,
        created_at: new Date().toISOString(),
      });

      const user = {
        id: userId,
        email: options.email,
        user_metadata: options.options?.data || {},
        created_at: new Date().toISOString(),
      };

      return {
        data: { user, session: null },
        error: null,
      };
    } catch (error: any) {
      return {
        data: null,
        error: new Error(error.message || 'Failed to sign up'),
      };
    }
  },

  async signInWithPassword(options: {
    email: string;
    password: string;
  }): Promise<{ data: { user: any; session: any } | null; error: Error | null }> {
    try {
      const users = await selectRecords('users', {
        where: { email: options.email }
      });

      if (!users || users.length === 0) {
        return {
          data: null,
          error: new Error('Invalid email or password'),
        };
      }

      const user = users[0] as any;
      
      // Simple password check (in real app, use bcrypt)
      if (user.password_hash !== options.password) {
        return {
          data: null,
          error: new Error('Invalid email or password'),
        };
      }

      const token = btoa(JSON.stringify({
        userId: user.id,
        email: user.email,
        exp: Math.floor(Date.now() / 1000) + 86400
      }));

      return {
        data: {
          user: {
            id: user.id,
            email: user.email,
            created_at: user.created_at,
          },
          session: {
            access_token: token,
            token_type: 'bearer',
            expires_in: 86400,
          },
        },
        error: null,
      };
    } catch (error: any) {
      return {
        data: null,
        error: new Error(error.message || 'Failed to sign in'),
      };
    }
  },

  async signOut(): Promise<{ error: Error | null }> {
    localStorage.removeItem('auth_token');
    return { error: null };
  },

  async getUser(): Promise<{ data: { user: any } | null; error: Error | null }> {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        return { data: null, error: null };
      }

      const decoded = JSON.parse(atob(token));
      if (decoded.exp * 1000 < Date.now()) {
        return { data: null, error: null };
      }

      return {
        data: {
          user: {
            id: decoded.userId,
            email: decoded.email,
          },
        },
        error: null,
      };
    } catch {
      return { data: null, error: null };
    }
  },

  // Admin functions (stub)
  admin: {
    async listUsers(): Promise<{ data: { users: any[] } | null; error: Error | null }> {
      try {
        const users = await selectRecords('users', {});
        return {
          data: { users: users || [] },
          error: null,
        };
      } catch (error: any) {
        return {
          data: null,
          error: new Error(error.message || 'Failed to list users'),
        };
      }
    },
  },

  // Edge functions stub
  functions: {
    async invoke(functionName: string, options?: { body?: any }): Promise<{ data: any; error: Error | null }> {
      console.warn(`Edge function "${functionName}" called but not implemented in browser mode`);
      
      // Handle common functions
      if (functionName === 'create-agency-user') {
        const { fullName, email, role } = options?.body || {};
        const userId = generateUUID();
        const tempPassword = generatePassword();
        
        try {
          await insertRecord('users', {
            id: userId,
            email,
            password_hash: tempPassword,
            is_active: true,
            email_confirmed: true,
          });

          return {
            data: {
              userId,
              email,
              temporaryPassword: tempPassword,
              userRole: role || 'employee',
            },
            error: null,
          };
        } catch (error: any) {
          return { data: null, error };
        }
      }
      
      return { data: null, error: null };
    },
  },
};

// Storage wrapper for compatibility
const storage = {
  from(bucket: string) {
    return {
      upload: async (path: string, file: File | Blob): Promise<{ data: any; error: Error | null }> => {
        try {
          const { uploadFile } = await import('@/services/file-storage');
          const fileBuffer = await file.arrayBuffer();
          // Use null instead of 'system' string - uploaded_by expects UUID or null
          const userId = (window as any).__currentUserId || null;
          // Pass ArrayBuffer directly - uploadFile now handles it
          const result = await uploadFile(bucket, path, fileBuffer, userId, file.type);
          // Return the full path (bucket/path) for documents table
          // The API returns path in result.data.path, or use bucket + file_path
          const resultData = (result as any).data || {};
          const fullPath = resultData.path || `${bucket}/${(result as any).file_path || path}`;
          return { data: { path: fullPath }, error: null };
        } catch (error: any) {
          return { data: null, error };
        }
      },
      download: async (path: string): Promise<{ data: Blob | null; error: Error | null }> => {
        try {
          const { downloadFile } = await import('@/services/file-storage');
          const buffer = await downloadFile(bucket, path);
          const blob = new Blob([buffer]);
          return { data: blob, error: null };
        } catch (error: any) {
          return { data: null, error };
        }
      },
      remove: async (paths: string[]): Promise<{ data: any; error: Error | null }> => {
        try {
          const { deleteFile } = await import('@/services/file-storage');
          for (const path of paths) {
            await deleteFile(bucket, path);
          }
          return { data: paths, error: null };
        } catch (error: any) {
          return { data: null, error };
        }
      },
      list: async (path?: string): Promise<{ data: any[]; error: Error | null }> => {
        try {
          const { listFiles } = await import('@/services/file-storage');
          const files = await listFiles(bucket, path);
          return { data: files, error: null };
        } catch (error: any) {
          return { data: [], error };
        }
      },
      getPublicUrl: (path: string): { data: { publicUrl: string } } => {
        // Use dynamic import to avoid require() in ES modules
        const getFileUrl = (bucket: string, filePath: string): string => {
          return `/api/files/${bucket}/${filePath}`;
        };
        return { data: { publicUrl: getFileUrl(bucket, path) } };
      }
    };
  }
};

// Main database interface - PostgreSQL query builder
export const db = {
  from<T = any>(table: string): QueryBuilder<T> {
    return createQueryBuilder<T>(table);
  },

  // Realtime subscriptions (stub for browser-only mode)
  channel(name: string): RealtimeChannel {
    return createRealtimeChannel(name);
  },

  // RPC function calls
  rpc(functionName: string, params: Record<string, any> = {}): Promise<{ data: any; error: Error | null }> {
    return handleRpcCall(functionName, params);
  },

  // Storage methods
  storage,

  // Auth methods
  auth,

  // Edge functions
  functions: auth.functions,

  // Direct access to low-level functions
  selectRecords,
  selectOne,
  insertRecord,
  updateRecord,
  deleteRecord,
};

// Export database instance

export default db;

