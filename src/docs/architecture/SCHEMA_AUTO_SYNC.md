# Schema Auto-Sync Mechanism

## Overview

The ERP system now includes an **automatic schema synchronization mechanism** that detects and creates missing columns in database tables. This ensures that your database schema stays in sync with the expected schema definitions.

## How It Works

1. **Schema Extraction**: The system reads all schema files (`server/utils/schema/*.js`) and extracts expected column definitions from CREATE TABLE statements.

2. **Comparison**: For each table, it compares expected columns with actual columns in the database using PostgreSQL's `information_schema`.

3. **Auto-Creation**: Missing columns are automatically created with:
   - Correct data types
   - Nullable/NOT NULL constraints
   - Default values (when specified)
   - Foreign key constraints (when applicable)

## Automatic Execution

The schema sync runs automatically in two scenarios:

### 1. After Schema Creation
When a new agency database is created via `createAgencySchema()`, the sync runs automatically at the end to ensure all columns are present.

### 2. Manual Trigger
You can manually trigger the sync via API endpoint (see below).

## API Endpoints

### POST `/api/schema/sync`
Manually trigger schema synchronization for the current agency database.

**Authentication**: Required (uses agency context)

**Response**:
```json
{
  "success": true,
  "message": "Schema synchronization completed",
  "data": {
    "tablesProcessed": 53,
    "columnsCreated": 5,
    "errors": [],
    "details": [
      {
        "table": "quotations",
        "created": ["agency_id", "quote_number"],
        "errors": []
      }
    ]
  }
}
```

### GET `/api/schema/sync-status`
Check for missing columns without creating them.

**Authentication**: Required (uses agency context)

**Response**:
```json
{
  "success": true,
  "message": "Schema sync status retrieved",
  "data": {
    "tablesChecked": 53,
    "tablesWithMissingColumns": 2,
    "totalMissingColumns": 5,
    "details": [
      {
        "table": "quotations",
        "missingColumns": [
          {
            "name": "agency_id",
            "type": "UUID",
            "nullable": true,
            "default": null
          }
        ]
      }
    ]
  }
}
```

## Usage Examples

### Check for Missing Columns
```bash
curl -X GET http://localhost:3000/api/schema/sync-status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Agency-Database: agency_your_database"
```

### Sync Missing Columns
```bash
curl -X POST http://localhost:3000/api/schema/sync \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Agency-Database: agency_your_database"
```

## Technical Details

### Supported Column Types
- Basic types: TEXT, VARCHAR, INTEGER, BIGINT, NUMERIC, BOOLEAN, DATE
- Advanced types: UUID, TIMESTAMP WITH TIME ZONE, JSONB, JSON
- Types with parameters: NUMERIC(15, 2), VARCHAR(255), etc.

### Constraints Handled
- NOT NULL constraints
- DEFAULT values (including functions like NOW(), uuid_generate_v4())
- Foreign key references
- UNIQUE constraints (detected but not automatically added)

### Safety Features
- **Idempotent**: Safe to run multiple times
- **Non-destructive**: Only adds missing columns, never modifies or deletes existing columns
- **Error handling**: Continues processing other tables/columns even if one fails
- **Transaction-safe**: Each column addition is handled safely

## Limitations

1. **Column Parsing**: The parser extracts columns from CREATE TABLE statements. Complex constraints or computed columns might not be fully parsed.

2. **Foreign Keys**: Foreign key constraints are attempted but may fail if the referenced table doesn't exist yet.

3. **Indexes**: Indexes are not automatically created for new columns (use the indexes schema module for that).

4. **Data Migration**: For NOT NULL columns without defaults, the system sets safe defaults for existing rows (empty string for TEXT, 0 for NUMERIC, etc.).

## Troubleshooting

### Sync Reports Errors
- Check the error messages in the response
- Verify that referenced tables exist
- Ensure the database user has ALTER TABLE permissions

### Columns Not Created
- Verify the column definition exists in the schema files
- Check that the table exists in the database
- Review server logs for detailed error messages

### Performance
- The sync process queries `information_schema` which can be slow on large databases
- Consider running during off-peak hours for production databases

## Files

- **Service**: `server/utils/schemaSyncService.js`
- **Integration**: `server/utils/schemaCreator.js` (Step 21)
- **API Routes**: `server/routes/schema.js`

## Future Enhancements

Potential improvements:
- Automatic index creation for new columns
- Support for column type changes
- Column reordering
- Better handling of complex constraints
- Performance optimizations for large databases

