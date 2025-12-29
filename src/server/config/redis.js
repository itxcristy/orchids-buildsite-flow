/**
 * Redis Configuration
 * Connection and caching setup for Redis using ioredis
 */

let Redis;
try {
  Redis = require('ioredis');
} catch (error) {
  // Redis is optional - fallback to in-memory cache
  Redis = null;
}

// If ioredis module is not available, export fallback functions
if (!Redis) {
  module.exports = {
    getRedisClient: async () => null,
    isRedisAvailable: async () => false,
    closeRedisConnection: async () => {},
  };
} else {
  // Redis connection configuration
  const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
  const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
  const REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';
  const REDIS_DB = parseInt(process.env.REDIS_DB || '0', 10);

  // Create Redis client
  let redisClient = null;
  let lastConnectionAttempt = 0;
  let connectionFailed = false;
  const CONNECTION_RETRY_DELAY = 30000; // 30 seconds between retry attempts

  /**
   * Get or create Redis client
   * @returns {Promise<Redis>} Redis client instance
   */
  async function getRedisClient() {
    // If we have a valid client, return it
    if (redisClient && redisClient.status === 'ready') {
      return redisClient;
    }

    // If connection recently failed, don't retry immediately
    const now = Date.now();
    if (connectionFailed && (now - lastConnectionAttempt) < CONNECTION_RETRY_DELAY) {
      return null;
    }

    // Reset failure flag if enough time has passed
    if (connectionFailed && (now - lastConnectionAttempt) >= CONNECTION_RETRY_DELAY) {
      connectionFailed = false;
    }

    lastConnectionAttempt = now;

    try {
      const client = new Redis({
        host: REDIS_HOST,
        port: REDIS_PORT,
        password: REDIS_PASSWORD || undefined,
        db: REDIS_DB,
        retryStrategy: (times) => {
          // Don't retry if we've failed too many times
          if (times > 3) {
            connectionFailed = true;
            return null; // Stop retrying
          }
          return Math.min(times * 100, 3000); // Exponential backoff, max 3s
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false,
      });

      // Error handling - only log once per connection attempt
      let errorLogged = false;
      client.on('error', (err) => {
        if (!errorLogged) {
          // Only log the first error, then suppress subsequent errors
          if (!connectionFailed) {
            console.warn('[Redis] Connection error (Redis not available, using fallback):', err.code || err.message);
          }
          errorLogged = true;
          connectionFailed = true;
        }
        redisClient = null;
      });

      client.on('connect', () => {
        if (!connectionFailed) {
          console.log('[Redis] Connecting to Redis...');
        }
      });

      client.on('ready', () => {
        console.log('[Redis] ✅ Connected to Redis');
        connectionFailed = false;
        errorLogged = false;
      });

      client.on('close', () => {
        if (!connectionFailed) {
          console.log('[Redis] Connection closed');
        }
        redisClient = null;
      });
      
      redisClient = client;
      connectionFailed = false;
      return redisClient;
    } catch (error) {
      connectionFailed = true;
      // Only log the first failure, then suppress
      if (!error.message || !error.message.includes('timeout')) {
        // Silent failure - Redis is optional
        return null;
      }
      return null;
    }
  }

  /**
   * Close Redis connection
   */
  async function closeRedisConnection() {
    if (redisClient && redisClient.status === 'ready') {
      await redisClient.quit();
      redisClient = null;
      console.log('[Redis] Connection closed');
    }
  }

  /**
   * Check if Redis is available
   * Caches the result to avoid repeated connection attempts
   */
  let cachedAvailability = null;
  let availabilityCheckTime = 0;
  const AVAILABILITY_CACHE_TTL = 10000; // Cache for 10 seconds

  async function isRedisAvailable() {
    const now = Date.now();
    
    // Return cached result if still valid
    if (cachedAvailability !== null && (now - availabilityCheckTime) < AVAILABILITY_CACHE_TTL) {
      return cachedAvailability;
    }

    // If connection recently failed, don't check again immediately
    if (connectionFailed && (now - lastConnectionAttempt) < CONNECTION_RETRY_DELAY) {
      cachedAvailability = false;
      availabilityCheckTime = now;
      return false;
    }

    try {
      const client = await getRedisClient();
      if (!client || client.status !== 'ready') {
        cachedAvailability = false;
        availabilityCheckTime = now;
        return false;
      }
      
      const result = await client.ping();
      cachedAvailability = result === 'PONG';
      availabilityCheckTime = now;
      return cachedAvailability;
    } catch (error) {
      cachedAvailability = false;
      availabilityCheckTime = now;
      return false;
    }
  }

  module.exports = {
    getRedisClient,
    closeRedisConnection,
    isRedisAvailable,
  };
}
