/**
 * Database Connection Configuration
 * 
 * This module now uses the GlobalPoolManager for connection management.
 * The old implementation is deprecated in favor of the centralized pool manager.
 * 
 * @deprecated Use poolManager from utils/poolManager.js instead
 * This file is kept for backward compatibility
 */

const { getAgencyPool, getMainPool } = require('../utils/poolManager');

// Export main pool (from pool manager)
const pool = getMainPool();

// Export getAgencyPool (from pool manager)
// This maintains backward compatibility
function getAgencyPoolCompat(databaseName) {
  return getAgencyPool(databaseName);
}

// Legacy export for backward compatibility
const agencyPools = {
  // This is a dummy object for backward compatibility
  // Actual pools are managed by GlobalPoolManager
  size: () => 0,
  has: () => false,
  get: () => null,
};

module.exports = {
  pool,
  getAgencyPool: getAgencyPoolCompat,
  agencyPools,
};
