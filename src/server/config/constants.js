/**
 * Application Constants and Environment Configuration
 */

// Helper function to URL-encode password in connection string
function encodeDatabaseUrl(urlString) {
  if (!urlString) return urlString;
  
  // If URL parsing fails (due to special chars in password), encode it manually
  try {
    const url = new URL(urlString);
    // If we can parse it, return as-is (password might already be encoded)
    return urlString;
  } catch (error) {
    // Parse manually and encode password
    // Format: postgresql://user:password@host:port/database
    const match = urlString.match(/^(postgresql:\/\/)([^:@]+)(?::([^@]+))?@([^:]+)(?::(\d+))?\/(.+)$/);
    if (match) {
      const [, protocol, user, password, host, port, database] = match;
      const encodedPassword = password ? encodeURIComponent(password) : '';
      const portPart = port ? `:${port}` : '';
      return `${protocol}${user}${encodedPassword ? ':' + encodedPassword : ''}@${host}${portPart}/${database}`;
    }
    // If regex doesn't match, return original (let pg handle it)
    return urlString;
  }
}

// Get database port from environment
const POSTGRES_PORT = parseInt(process.env.POSTGRES_PORT || process.env.DATABASE_PORT || '5432', 10);

// Build default database URL with environment-based port
const defaultDatabaseUrl = `postgresql://postgres:admin@localhost:${POSTGRES_PORT}/buildflow_db`;

const rawDatabaseUrl = process.env.DATABASE_URL || 
  process.env.VITE_DATABASE_URL ||
  defaultDatabaseUrl;

const DATABASE_URL = encodeDatabaseUrl(rawDatabaseUrl);

// Get backend port from environment (support both PORT and BACKEND_PORT)
const PORT = parseInt(process.env.PORT || process.env.BACKEND_PORT || '3000', 10);

const POOL_CONFIG = {
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000, // Increased from 2000ms to 30000ms (30 seconds)
  statement_timeout: 60000, // 60 seconds for query execution
  query_timeout: 60000, // 60 seconds for query timeout
};

const JSON_LIMIT = '50mb';

module.exports = {
  DATABASE_URL,
  PORT,
  POOL_CONFIG,
  JSON_LIMIT,
};
