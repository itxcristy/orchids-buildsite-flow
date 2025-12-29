/**
 * Session Store using Redis
 * Stores user sessions in Redis for scalability
 */

const { getRedisClient, isRedisAvailable } = require('../config/redis');

// Session TTL (24 hours)
const SESSION_TTL = 24 * 60 * 60;

/**
 * Store session in Redis
 * @param {string} sessionId - Session ID (usually user ID or token)
 * @param {Object} sessionData - Session data to store
 * @param {number} ttl - Time to live in seconds (default: 24 hours)
 */
async function setSession(sessionId, sessionData, ttl = SESSION_TTL) {
  try {
    if (await isRedisAvailable()) {
      const client = await getRedisClient();
      await client.setEx(
        `session:${sessionId}`,
        ttl,
        JSON.stringify(sessionData)
      );
      return true;
    }
  } catch (error) {
    console.error('[Session] Failed to store session in Redis:', error);
  }
  return false;
}

/**
 * Get session from Redis
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object|null>} Session data or null
 */
async function getSession(sessionId) {
  try {
    if (await isRedisAvailable()) {
      const client = await getRedisClient();
      const data = await client.get(`session:${sessionId}`);
      if (data) {
        return JSON.parse(data);
      }
    }
  } catch (error) {
    console.error('[Session] Failed to get session from Redis:', error);
  }
  return null;
}

/**
 * Delete session from Redis
 * @param {string} sessionId - Session ID
 */
async function deleteSession(sessionId) {
  try {
    if (await isRedisAvailable()) {
      const client = await getRedisClient();
      await client.del(`session:${sessionId}`);
      return true;
    }
  } catch (error) {
    console.error('[Session] Failed to delete session from Redis:', error);
  }
  return false;
}

/**
 * Refresh session TTL
 * @param {string} sessionId - Session ID
 * @param {number} ttl - New TTL in seconds
 */
async function refreshSession(sessionId, ttl = SESSION_TTL) {
  try {
    if (await isRedisAvailable()) {
      const client = await getRedisClient();
      await client.expire(`session:${sessionId}`, ttl);
      return true;
    }
  } catch (error) {
    console.error('[Session] Failed to refresh session in Redis:', error);
  }
  return false;
}

/**
 * Get all active sessions for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of session IDs
 */
async function getUserSessions(userId) {
  try {
    if (await isRedisAvailable()) {
      const client = await getRedisClient();
      const keys = await client.keys(`session:${userId}:*`);
      return keys.map(key => key.replace('session:', ''));
    }
  } catch (error) {
    console.error('[Session] Failed to get user sessions from Redis:', error);
  }
  return [];
}

module.exports = {
  setSession,
  getSession,
  deleteSession,
  refreshSession,
  getUserSessions,
};
