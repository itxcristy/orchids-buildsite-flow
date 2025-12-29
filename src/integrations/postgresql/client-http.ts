// HTTP-based PostgreSQL Client for Browser
// Makes API calls to backend server that connects to PostgreSQL

import { getApiRoot } from '@/config/api';

type QueryResult<T> = {
  rows: T[];
  rowCount: number;
};

const API_URL = getApiRoot();

/**
 * HTTP-based PostgreSQL client that makes API calls to backend
 */
class HttpDatabaseClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
    body?: any,
    useMainDatabase: boolean = false,
    retryCount: number = 0
  ): Promise<QueryResult<T>> {
    try {
      const url = `${this.baseUrl}/database${endpoint}`;

      // Build headers with optional auth + agency context so backend
      // can route queries to the correct per-agency database
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (typeof window !== 'undefined') {
        const token = window.localStorage.getItem('auth_token') || '';
        const agencyDatabase = window.localStorage.getItem('agency_database') || '';

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        // Only add agency database header if not using main database
        // For system-level queries (agencies table, etc.), we need to query main database
        if (agencyDatabase && !useMainDatabase) {
          headers['X-Agency-Database'] = agencyDatabase;
        }
      }

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }

        // Handle rate limiting (429) - retry with exponential backoff (max 2 retries)
        if (response.status === 429 && retryCount < 2) {
          const retryAfter = response.headers.get('Retry-After') || '5';
          const retryDelay = parseInt(retryAfter) * 1000; // Convert to milliseconds
          
          console.warn(`[HTTP DB] Rate limit exceeded, retrying after ${retryAfter}s... (attempt ${retryCount + 1}/2)`);
          
          // Wait before retrying (max 10 seconds)
          await new Promise(resolve => setTimeout(resolve, Math.min(retryDelay, 10000)));
          
          // Retry the request with incremented retry count
          return this.makeRequest<T>(endpoint, method, body, useMainDatabase, retryCount + 1);
        }

        // Handle missing agency database - clear auth and redirect to login
        // Only logout for database-level errors (3D000), NOT for column/table errors (42703, 42P01, 42P10)
        const isDatabaseNotFound = errorData.code === 'AGENCY_DB_NOT_FOUND' || errorData.code === '3D000';
        
        // Schema errors (missing columns/tables) should NOT cause logout
        const isSchemaError = errorData.code === '42703' || // column does not exist
                             errorData.code === '42P01' || // relation does not exist
                             errorData.code === '42P10' || // invalid ORDER BY in DISTINCT
                             (errorData.message && (
                               (errorData.message.includes('column') && errorData.message.includes('does not exist')) ||
                               (errorData.message.includes('relation') && errorData.message.includes('does not exist')) ||
                               errorData.message.includes('SELECT DISTINCT, ORDER BY expressions')
                             )) ||
                             (errorData.error && (
                               (errorData.error.includes('column') && errorData.error.includes('does not exist')) ||
                               (errorData.error.includes('relation') && errorData.error.includes('does not exist')) ||
                               errorData.error.includes('SELECT DISTINCT, ORDER BY expressions')
                             ));
        
        if (isDatabaseNotFound && !isSchemaError) {
          console.warn('[HTTP DB] Agency database not found, clearing auth...');
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('agency_database');
            localStorage.removeItem('user_id');
            // Redirect to login after a short delay
            setTimeout(() => {
              window.location.href = '/login';
            }, 1000);
          }
        } else if (isSchemaError) {
          // Log schema errors but don't logout - these are expected during migrations
          console.warn('[HTTP DB] Schema error (expected during migrations):', errorData.message || errorData.error);
        }

        const error = new Error(
          errorData.message || errorData.error || `Database API error: ${response.status} ${errorText}`
        );
        (error as any).status = response.status;
        (error as any).data = errorData;
        (error as any).code = errorData.code;
        throw error;
      }

      const result = await response.json();
      
      // Handle different response formats
      if (result.rows !== undefined) {
        return result as QueryResult<T>;
      } else if (Array.isArray(result)) {
        return {
          rows: result as T[],
          rowCount: result.length,
        };
      } else if (result.data !== undefined) {
        return {
          rows: Array.isArray(result.data) ? result.data as T[] : [result.data as T],
          rowCount: Array.isArray(result.data) ? result.data.length : 1,
        };
      } else {
        // Single object response
        return {
          rows: [result as T],
          rowCount: 1,
        };
      }
    } catch (error: any) {
      // Network, DNS, or CORS style failures often surface as TypeError in fetch
      console.error('[HTTP DB Client] Request failed:', {
        error,
        baseUrl: this.baseUrl,
        endpoint,
      });

      if (error instanceof TypeError) {
        throw new Error(
          `Unable to reach the API server at ${this.baseUrl}. ` +
          'Check that the backend is running, accessible from this device (including over LAN), and that CORS is configured correctly.'
        );
      }

      throw error;
    }
  }

  async query<T = any>(sql: string, params: any[] = [], userId?: string, useMainDatabase: boolean = false): Promise<QueryResult<T>> {
    
    return this.makeRequest<T>('/query', 'POST', {
      sql,
      params,
      userId, // Pass userId to backend to set context
    }, useMainDatabase);
  }

  /**
   * Query the main database (not agency-specific database)
   * Use this for system-level queries like agencies table
   */
  async queryMainDatabase<T = any>(sql: string, params: any[] = [], userId?: string): Promise<QueryResult<T>> {
    return this.query<T>(sql, params, userId, true);
  }
}

// Singleton instance
const httpClient = new HttpDatabaseClient();

// Query helper with error handling
export async function query<T = any>(
  text: string,
  params?: any[],
  userId?: string
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await httpClient.query<T>(text, params || [], userId);
    return result;
  } catch (error) {
    console.error('[HTTP DB Error]', { text, error });
    throw error;
  }
}

// Get a single row
export async function queryOne<T = any>(
  text: string,
  params?: any[],
  userId?: string
): Promise<T | null> {
  const result = await query<T>(text, params, userId);
  return result.rows[0] || null;
}

// Get multiple rows
export async function queryMany<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const result = await query<T>(text, params);
  return result.rows;
}

// Query the main database (not agency-specific database)
// Use this for system-level queries like agencies table
export async function queryMainDatabase<T = any>(
  text: string,
  params: any[] = [],
  userId?: string
): Promise<QueryResult<T>> {
  return httpClient.queryMainDatabase<T>(text, params, userId);
}

// Execute without returning rows
export async function execute(
  text: string,
  params?: any[]
): Promise<number> {
  const result = await query(text, params);
  return result.rowCount || 0;
}

// Transaction helper for HTTP
export async function transaction<T>(
  callback: (client: { query: (sql: string, params?: any[]) => Promise<{ rows: any[]; rowCount: number }> }) => Promise<T>
): Promise<T> {
  // Collect all queries during the callback
  const queries: Array<{ sql: string; params: any[] }> = [];
  const queryResults: Array<{ rows: any[]; rowCount: number }> = [];
  let queryIndex = 0;
  
  // Create a mock client that collects queries and stores results
  const mockClient = {
    query: async (sql: string, params: any[] = []): Promise<{ rows: any[]; rowCount: number }> => {
      const currentIndex = queryIndex++;
      queries.push({ sql, params });
      
      // Return a promise that will be resolved with actual results
      return new Promise((resolve) => {
        // Store resolver to call after transaction completes
        (mockClient as any)._resolvers = (mockClient as any)._resolvers || [];
        (mockClient as any)._resolvers.push({ index: currentIndex, resolve });
      });
    }
  };
  
  // Start callback execution (it will collect queries)
  const callbackPromise = callback(mockClient);
  
  // Wait for all queries to be collected
  await new Promise(resolve => setTimeout(resolve, 0));
  
  // If no queries, just return callback result
  if (queries.length === 0) {
    return await callbackPromise;
  }
  
  // Execute all queries in a transaction via backend
  try {
    const response = await fetch(`${httpClient['baseUrl']}/database/transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        queries,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Transaction failed: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    
    // Resolve all query promises with actual results
    if (result.results && (mockClient as any)._resolvers) {
      result.results.forEach((queryResult: any, index: number) => {
        const resolver = (mockClient as any)._resolvers.find((r: any) => r.index === index);
        if (resolver) {
          resolver.resolve({
            rows: queryResult.rows || [],
            rowCount: queryResult.rowCount || 0,
          });
        }
      });
    }
    
    // Wait for callback to complete
    return await callbackPromise;
  } catch (error) {
    console.error('[HTTP Transaction] Error:', error);
    throw error;
  }
}

// Close pool (no-op for HTTP)
export async function closePool(): Promise<void> {
  // No-op
}

// Export for use in base.ts
export const pgClient = {
  query: async (text: string, params?: any[]) => query(text, params),
};

export default httpClient;

