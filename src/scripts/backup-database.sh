#!/bin/sh
# Database Backup Script for Multi-Tenant System
# Backs up main database and all agency databases

set -e

# Configuration
BACKUP_DIR="/backups"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
MAIN_DB=${POSTGRES_DB:-buildflow_db}
PGUSER=${POSTGRES_USER:-postgres}
PGPASSWORD=${POSTGRES_PASSWORD:-admin}
PGHOST=${PGHOST:-postgres}
PGPORT=${PGPORT:-5432}

export PGPASSWORD

echo "[Backup] Starting database backup at $(date)"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Function to backup a database
backup_database() {
    local db_name=$1
    local backup_file="${BACKUP_DIR}/${db_name}_${TIMESTAMP}.sql"
    
    echo "[Backup] Backing up database: ${db_name}"
    
    if pg_dump -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d "${db_name}" -F c -f "${backup_file}.dump" 2>/dev/null; then
        echo "[Backup] ✅ Successfully backed up ${db_name} to ${backup_file}.dump"
        
        # Also create a plain SQL backup for easier inspection
        pg_dump -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d "${db_name}" -F p -f "${backup_file}" 2>/dev/null || true
        
        # Compress the SQL backup
        if [ -f "${backup_file}" ]; then
            gzip -f "${backup_file}"
            echo "[Backup] ✅ Compressed SQL backup: ${backup_file}.gz"
        fi
    else
        echo "[Backup] ❌ Failed to backup ${db_name}"
        return 1
    fi
}

# Backup main database
backup_database "${MAIN_DB}"

# Get list of all agency databases
echo "[Backup] Discovering agency databases..."
AGENCY_DBS=$(psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d postgres -t -c "
    SELECT datname 
    FROM pg_database 
    WHERE datname LIKE 'agency_%' 
    AND datistemplate = false
    ORDER BY datname;
" 2>/dev/null | tr -d ' ')

if [ -n "${AGENCY_DBS}" ]; then
    echo "[Backup] Found agency databases:"
    echo "${AGENCY_DBS}" | while read -r db; do
        if [ -n "${db}" ]; then
            echo "  - ${db}"
            backup_database "${db}" || true
        fi
    done
else
    echo "[Backup] No agency databases found"
fi

# Cleanup old backups
echo "[Backup] Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "*.dump" -type f -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}" -name "*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete
echo "[Backup] ✅ Cleanup complete"

# Summary
BACKUP_COUNT=$(find "${BACKUP_DIR}" -name "*_${TIMESTAMP}*" -type f | wc -l)
echo "[Backup] ✅ Backup completed: ${BACKUP_COUNT} files created"
echo "[Backup] Backup location: ${BACKUP_DIR}"
