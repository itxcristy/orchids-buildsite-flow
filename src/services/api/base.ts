import { TIMEOUT_CONFIG, RETRY_CONFIG, ERROR_MESSAGES } from '@/constants';
import { useAppStore } from '@/stores/appStore';
import { pgClient } from '@/integrations/postgresql/client';

export interface ApiResponse<T = any> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface ApiOptions {
  timeout?: number;
  retries?: number;
  showLoading?: boolean;
  showErrorToast?: boolean;
}

class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class BaseApiService {
  private static async withRetry<T>(
    operation: () => Promise<T>,
    options: ApiOptions = {}
  ): Promise<T> {
    const maxRetries = options.retries ?? RETRY_CONFIG.MAX_ATTEMPTS;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on auth errors or client errors
        if (error instanceof ApiError && error.statusCode && error.statusCode < 500) {
          throw error;
        }

        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Exponential backoff
        const delay = Math.min(
          RETRY_CONFIG.INITIAL_DELAY * Math.pow(RETRY_CONFIG.BACKOFF_FACTOR, attempt),
          RETRY_CONFIG.MAX_DELAY
        );

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  private static async withTimeout<T>(
    operation: () => Promise<T>,
    timeout: number = TIMEOUT_CONFIG.DEFAULT_REQUEST
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new ApiError(ERROR_MESSAGES.NETWORK_ERROR, 'TIMEOUT')), timeout)
      ),
    ]);
  }

  protected static async execute<T>(
    operation: () => Promise<T>,
    options: ApiOptions = {}
  ): Promise<ApiResponse<T>> {
    const { setLoading, addNotification } = useAppStore.getState();

    try {
      if (options.showLoading) {
        setLoading(true);
      }

      const result = await this.withTimeout(
        () => this.withRetry(operation, options),
        options.timeout
      );

      return {
        data: result,
        error: null,
        success: true
      };
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : (error as any)?.message || ERROR_MESSAGES.SERVER_ERROR;

      if (options.showErrorToast) {
        addNotification({
          type: 'error',
          title: 'Request Failed',
          message: errorMessage,
          priority: 'high'
        });
      }

      return {
        data: null,
        error: errorMessage,
        success: false
      };
    } finally {
      if (options.showLoading) {
        setLoading(false);
      }
    }
  }

  // PostgreSQL query helpers
  protected static async query<T = any>(
    table: string,
    options: {
      select?: string;
      filters?: Record<string, any>;
      orderBy?: { column: string; ascending?: boolean };
      limit?: number;
      single?: boolean;
    } = {},
    apiOptions: ApiOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.execute(async () => {
      const columns = options.select || '*';
      // Ensure table name has schema prefix if not already present
      const tableName = table.includes('.') ? table : `public.${table}`;
      let query = `SELECT ${columns} FROM ${tableName}`;
      const params: any[] = [];
      let paramIndex = 1;

      // Add filters
      if (options.filters && Object.keys(options.filters).length > 0) {
        const conditions = Object.entries(options.filters)
          .filter(([, value]) => value !== undefined && value !== null)
          .map(([key]) => `${key} = $${paramIndex++}`)
          .join(' AND ');

        if (conditions) {
          query += ` WHERE ${conditions}`;
          Object.values(options.filters).forEach((value) => {
            if (value !== undefined && value !== null) {
              params.push(value);
            }
          });
        }
      }

      // Add ordering
      if (options.orderBy) {
        query += ` ORDER BY ${options.orderBy.column} ${options.orderBy.ascending ? 'ASC' : 'DESC'}`;
      }

      // Add limit
      if (options.limit) {
        query += ` LIMIT ${options.limit}`;
      }

      const result = await pgClient.query(query, params);
      
      if (options.single) {
        return result.rows[0] || null;
      }

      return result.rows as T[];
    }, apiOptions);
  }

  protected static async insert<T = any>(
    table: string,
    data: any,
    options: ApiOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.execute(async () => {
      // Filter out null values and prepare data
      const filteredData: Record<string, any> = {};
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined) {
          filteredData[key] = data[key];
        }
      });

      const columns = Object.keys(filteredData);
      const values = Object.values(filteredData);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

      // Ensure table name has schema prefix if not already present
      const tableName = table.includes('.') ? table : `public.${table}`;

      const query = `
        INSERT INTO ${tableName} (${columns.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;

      console.log('Insert query:', query);
      console.log('Insert values:', values);

      const result = await pgClient.query(query, values);
      return result.rows[0] as T;
    }, options);
  }

  protected static async update<T = any>(
    table: string,
    data: any,
    filters: Record<string, any>,
    options: ApiOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.execute(async () => {
      const updateColumns = Object.keys(data);
      const updateValues = Object.values(data);
      const setClause = updateColumns.map((col, i) => `${col} = $${i + 1}`).join(', ');

      const filterKeys = Object.keys(filters);
      const filterValues = Object.values(filters);
      const whereClause = filterKeys.map((key, i) => `${key} = $${updateColumns.length + i + 1}`).join(' AND ');

      // Ensure table name has schema prefix if not already present
      const tableName = table.includes('.') ? table : `public.${table}`;

      const query = `
        UPDATE ${tableName}
        SET ${setClause}
        WHERE ${whereClause}
        RETURNING *
      `;

      const allValues = [...updateValues, ...filterValues];
      const result = await pgClient.query(query, allValues);
      return result.rows[0] as T;
    }, options);
  }

  protected static async delete<T = any>(
    table: string,
    filters: Record<string, any>,
    options: ApiOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.execute(async () => {
      const filterKeys = Object.keys(filters);
      const filterValues = Object.values(filters);
      const whereClause = filterKeys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');

      // Ensure table name has schema prefix if not already present
      const tableName = table.includes('.') ? table : `public.${table}`;

      const query = `DELETE FROM ${tableName} WHERE ${whereClause}`;

      await pgClient.query(query, filterValues);
      return null as T;
    }, options);
  }

  protected static async rpc<T = any>(
    functionName: string,
    params: Record<string, any> = {},
    options: ApiOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.execute(async () => {
      const paramNames = Object.keys(params);
      const paramValues = Object.values(params);
      const paramString = paramNames.map((name, i) => `$${i + 1}`).join(', ');

      const query = `SELECT * FROM ${functionName}(${paramString})`;
      const result = await pgClient.query(query, paramValues);
      const rows = result.rows as T[];
      // Return single item if only one result, otherwise return array
      return rows.length === 1 ? rows[0] : rows;
    }, options);
  }
}
