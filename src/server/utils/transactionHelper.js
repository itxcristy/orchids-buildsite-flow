/**
 * Transaction Helper Utilities
 * Provides safe transaction wrappers for multi-step database operations
 */

/**
 * Execute a function within a database transaction
 * Automatically handles BEGIN, COMMIT, and ROLLBACK
 * 
 * @param {Pool|Client} poolOrClient - Database pool or client
 * @param {Function} callback - Async function that receives the client and returns a result
 * @returns {Promise<any>} Result from callback function
 * 
 * @example
 * const result = await withTransaction(pool, async (client) => {
 *   await client.query('INSERT INTO users ...');
 *   await client.query('INSERT INTO profiles ...');
 *   return { success: true };
 * });
 */
async function withTransaction(poolOrClient, callback) {
  // If a client is passed, use it directly (already in transaction)
  if (poolOrClient.query && !poolOrClient.connect) {
    // It's a client, not a pool
    return await callback(poolOrClient);
  }

  // It's a pool, get a client
  const client = await poolOrClient.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Execute multiple queries in a transaction
 * 
 * @param {Pool|Client} poolOrClient - Database pool or client
 * @param {Array<{query: string, params?: any[]}>} queries - Array of queries to execute
 * @returns {Promise<Array>} Array of query results
 * 
 * @example
 * const results = await executeInTransaction(pool, [
 *   { query: 'INSERT INTO users ...', params: [...] },
 *   { query: 'INSERT INTO profiles ...', params: [...] },
 * ]);
 */
async function executeInTransaction(poolOrClient, queries) {
  return await withTransaction(poolOrClient, async (client) => {
    const results = [];
    for (const { query, params = [] } of queries) {
      const result = await client.query(query, params);
      results.push(result);
    }
    return results;
  });
}

/**
 * Retry a transaction if it fails due to serialization errors
 * Useful for handling concurrent transaction conflicts
 * 
 * @param {Pool|Client} poolOrClient - Database pool or client
 * @param {Function} callback - Async function that receives the client
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.retryDelay - Delay between retries in ms (default: 100)
 * @returns {Promise<any>} Result from callback function
 */
async function withTransactionRetry(poolOrClient, callback, options = {}) {
  const { maxRetries = 3, retryDelay = 100 } = options;
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await withTransaction(poolOrClient, callback);
    } catch (error) {
      lastError = error;
      
      // Check if error is a serialization failure (can be retried)
      const isSerializationError = 
        error.code === '40001' || // serialization_failure
        error.code === '40P01' || // deadlock_detected
        error.message?.includes('serialization') ||
        error.message?.includes('deadlock');
      
      if (!isSerializationError || attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      const delay = retryDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

module.exports = {
  withTransaction,
  executeInTransaction,
  withTransactionRetry,
};

