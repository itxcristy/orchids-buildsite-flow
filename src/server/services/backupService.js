/**
 * Automated Backup Service
 * Handles database backups with scheduling and retention
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const { DATABASE_URL } = require('../config/constants');

const execAsync = promisify(exec);

// Backup configuration
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);
const BACKUP_SCHEDULE = process.env.BACKUP_SCHEDULE || '0 2 * * *'; // Daily at 2 AM

/**
 * Parse database URL to get connection details
 */
function parseDatabaseUrl() {
  try {
    const url = new URL(DATABASE_URL);
    return {
      host: url.hostname,
      port: url.port || 5432,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1), // Remove leading /
    };
  } catch (error) {
    throw new Error(`Invalid DATABASE_URL: ${error.message}`);
  }
}

/**
 * Create backup directory if it doesn't exist
 */
async function ensureBackupDirectory() {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  } catch (error) {
    throw new Error(`Failed to create backup directory: ${error.message}`);
  }
}

/**
 * Create a database backup
 * @param {string} databaseName - Database name to backup
 * @param {string} backupType - Type of backup: 'full', 'schema', 'data'
 * @returns {Promise<string>} Path to backup file
 */
async function createBackup(databaseName, backupType = 'full') {
  await ensureBackupDirectory();

  const dbConfig = parseDatabaseUrl();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `${databaseName}_${backupType}_${timestamp}.sql`;
  const backupPath = path.join(BACKUP_DIR, backupFileName);

  // Set PGPASSWORD environment variable for pg_dump
  const env = {
    ...process.env,
    PGPASSWORD: dbConfig.password,
  };

  let command;
  
  if (backupType === 'schema') {
    // Schema only (no data)
    command = `pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${databaseName} --schema-only -F p > "${backupPath}"`;
  } else if (backupType === 'data') {
    // Data only (no schema)
    command = `pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${databaseName} --data-only -F p > "${backupPath}"`;
  } else {
    // Full backup
    command = `pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${databaseName} -F p > "${backupPath}"`;
  }

  try {
    await execAsync(command, { env });
    
    // Verify backup file was created
    const stats = await fs.stat(backupPath);
    if (stats.size === 0) {
      throw new Error('Backup file is empty');
    }

    console.log(`[Backup] ✅ Created backup: ${backupFileName} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    
    return backupPath;
  } catch (error) {
    console.error(`[Backup] ❌ Backup failed: ${error.message}`);
    throw error;
  }
}

/**
 * Restore database from backup
 * @param {string} backupPath - Path to backup file
 * @param {string} databaseName - Database name to restore to
 * @returns {Promise<void>}
 */
async function restoreBackup(backupPath, databaseName) {
  const dbConfig = parseDatabaseUrl();
  
  // Verify backup file exists
  try {
    await fs.access(backupPath);
  } catch (error) {
    throw new Error(`Backup file not found: ${backupPath}`);
  }

  const env = {
    ...process.env,
    PGPASSWORD: dbConfig.password,
  };

  const command = `psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${databaseName} < "${backupPath}"`;

  try {
    await execAsync(command, { env });
    console.log(`[Backup] ✅ Restored backup: ${backupPath} to ${databaseName}`);
  } catch (error) {
    console.error(`[Backup] ❌ Restore failed: ${error.message}`);
    throw error;
  }
}

/**
 * List all backup files
 * @returns {Promise<Array>} Array of backup file info
 */
async function listBackups() {
  await ensureBackupDirectory();

  try {
    const files = await fs.readdir(BACKUP_DIR);
    const backups = [];

    for (const file of files) {
      if (file.endsWith('.sql')) {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = await fs.stat(filePath);
        
        backups.push({
          filename: file,
          path: filePath,
          size: stats.size,
          sizeHuman: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
        });
      }
    }

    // Sort by creation time (newest first)
    backups.sort((a, b) => b.createdAt - a.createdAt);

    return backups;
  } catch (error) {
    console.error(`[Backup] Error listing backups: ${error.message}`);
    return [];
  }
}

/**
 * Delete old backups based on retention policy
 * @returns {Promise<number>} Number of backups deleted
 */
async function cleanupOldBackups() {
  const backups = await listBackups();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

  let deleted = 0;

  for (const backup of backups) {
    if (backup.createdAt < cutoffDate) {
      try {
        await fs.unlink(backup.path);
        console.log(`[Backup] Deleted old backup: ${backup.filename}`);
        deleted++;
      } catch (error) {
        console.error(`[Backup] Failed to delete ${backup.filename}: ${error.message}`);
      }
    }
  }

  return deleted;
}

/**
 * Get backup statistics
 * @returns {Promise<Object>} Backup statistics
 */
async function getBackupStats() {
  const backups = await listBackups();
  const totalSize = backups.reduce((sum, b) => sum + b.size, 0);
  
  return {
    totalBackups: backups.length,
    totalSize: totalSize,
    totalSizeHuman: `${(totalSize / 1024 / 1024).toFixed(2)} MB`,
    oldestBackup: backups.length > 0 ? backups[backups.length - 1].createdAt : null,
    newestBackup: backups.length > 0 ? backups[0].createdAt : null,
    retentionDays: RETENTION_DAYS,
    backupDirectory: BACKUP_DIR,
  };
}

module.exports = {
  createBackup,
  restoreBackup,
  listBackups,
  cleanupOldBackups,
  getBackupStats,
  BACKUP_SCHEDULE,
};
