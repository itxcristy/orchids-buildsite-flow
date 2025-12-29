/**
 * Seed Script: Create Test Data for Journal Entries
 * This script creates test chart of accounts and journal entries for testing
 * 
 * Usage: node scripts/seed-journal-entries.cjs [database_name] [agency_id]
 * Example: node scripts/seed-journal-entries.cjs agency_bambulabs_83e24745
 * 
 * If no database_name is provided, it will use the main buildflow_db database
 * If no agency_id is provided, it will use the placeholder UUID
 */

const { Pool } = require('pg');

// Use the exact connection string from rules
const DATABASE_URL = process.env.DATABASE_URL || 
  process.env.VITE_DATABASE_URL ||
  'postgresql://postgres:admin@localhost:5432/buildflow_db';

// Placeholder agency_id for testing
const PLACEHOLDER_AGENCY_ID = '00000000-0000-0000-0000-000000000000';

// Parse database URL to get connection details
function parseDatabaseUrl(url) {
  const dbUrl = new URL(url);
  return {
    host: dbUrl.hostname,
    port: dbUrl.port || 5432,
    user: dbUrl.username || 'postgres',
    password: dbUrl.password || 'admin',
    database: dbUrl.pathname.slice(1) || 'buildflow_db'
  };
}

// Generate UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function seedJournalEntries(databaseName = null, agencyId = null) {
  const { host, port, user, password } = parseDatabaseUrl(DATABASE_URL);
  const targetDatabase = databaseName || parseDatabaseUrl(DATABASE_URL).database;
  const targetAgencyId = agencyId || PLACEHOLDER_AGENCY_ID;
  
  const dbUrl = `postgresql://${user}:${password}@${host}:${port}/${targetDatabase}`;
  
  console.log(`\n🌱 Starting seed for database: ${targetDatabase}`);
  console.log(`   Using agency_id: ${targetAgencyId}\n`);

  const pool = new Pool({
    connectionString: dbUrl,
  });

  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to database\n');

    // Step 1: Create test chart of accounts
    console.log('📊 Creating test chart of accounts...');
    
    const testAccounts = [
      {
        account_code: '1000',
        account_name: 'Cash',
        account_type: 'asset',
        is_active: true,
        description: 'Cash and cash equivalents'
      },
      {
        account_code: '1100',
        account_name: 'Accounts Receivable',
        account_type: 'asset',
        is_active: true,
        description: 'Amounts owed by customers'
      },
      {
        account_code: '2000',
        account_name: 'Accounts Payable',
        account_type: 'liability',
        is_active: true,
        description: 'Amounts owed to suppliers'
      },
      {
        account_code: '3000',
        account_name: 'Owner\'s Equity',
        account_type: 'equity',
        is_active: true,
        description: 'Owner\'s capital'
      },
      {
        account_code: '4000',
        account_name: 'Sales Revenue',
        account_type: 'revenue',
        is_active: true,
        description: 'Revenue from sales'
      },
      {
        account_code: '5000',
        account_name: 'Office Expenses',
        account_type: 'expense',
        is_active: true,
        description: 'General office expenses'
      },
      {
        account_code: '5100',
        account_name: 'Rent Expense',
        account_type: 'expense',
        is_active: true,
        description: 'Monthly rent payments'
      },
      {
        account_code: '5200',
        account_name: 'Utilities Expense',
        account_type: 'expense',
        is_active: true,
        description: 'Electricity, water, internet'
      }
    ];

    const createdAccounts = [];
    
    for (const account of testAccounts) {
      try {
        // Check if account already exists
        const existing = await pool.query(
          'SELECT id FROM chart_of_accounts WHERE account_code = $1 AND (agency_id = $2 OR agency_id IS NULL)',
          [account.account_code, targetAgencyId]
        );

        if (existing.rows.length > 0) {
          console.log(`   ⚠️  Account ${account.account_code} already exists, skipping...`);
          createdAccounts.push(existing.rows[0].id);
          continue;
        }

        // Insert account
        const result = await pool.query(
          `INSERT INTO chart_of_accounts 
           (id, account_code, account_name, account_type, is_active, description, agency_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
           RETURNING id, account_code, account_name`,
          [
            generateUUID(),
            account.account_code,
            account.account_name,
            account.account_type,
            account.is_active,
            account.description,
            targetAgencyId
          ]
        );

        createdAccounts.push(result.rows[0].id);
        console.log(`   ✅ Created account: ${account.account_code} - ${account.account_name}`);
      } catch (error) {
        // Try without agency_id if column doesn't exist
        if (error.code === '42703' || error.message.includes('agency_id')) {
          const result = await pool.query(
            `INSERT INTO chart_of_accounts 
             (id, account_code, account_name, account_type, is_active, description, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
             RETURNING id, account_code, account_name`,
            [
              generateUUID(),
              account.account_code,
              account.account_name,
              account.account_type,
              account.is_active,
              account.description
            ]
          );
          createdAccounts.push(result.rows[0].id);
          console.log(`   ✅ Created account (no agency_id): ${account.account_code} - ${account.account_name}`);
        } else {
          console.error(`   ❌ Error creating account ${account.account_code}:`, error.message);
        }
      }
    }

    console.log(`\n✅ Created ${createdAccounts.length} accounts\n`);

    // Step 2: Create test journal entries
    console.log('📝 Creating test journal entries...\n');

    // Get account IDs for use in journal entries
    const accountIds = await pool.query(
      'SELECT id, account_code, account_name FROM chart_of_accounts WHERE is_active = true ORDER BY account_code LIMIT 8'
    );

    if (accountIds.rows.length < 4) {
      console.error('❌ Error: Need at least 4 accounts to create journal entries');
      process.exit(1);
    }

    const accounts = accountIds.rows;
    console.log(`   Using ${accounts.length} accounts for journal entries\n`);

    // Test Journal Entry 1: Cash Purchase (Debit Expense, Credit Cash)
    const entry1 = {
      entry_number: `JE-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
      entry_date: new Date().toISOString().split('T')[0],
      description: 'Office supplies purchase',
      reference: 'INV-001',
      status: 'posted',
      total_debit: 500.00,
      total_credit: 500.00,
      lines: [
        { account_id: accounts.find(a => a.account_code === '5000')?.id || accounts[4].id, description: 'Office supplies', debit_amount: 500.00, credit_amount: 0, line_number: 1 },
        { account_id: accounts.find(a => a.account_code === '1000')?.id || accounts[0].id, description: 'Cash payment', debit_amount: 0, credit_amount: 500.00, line_number: 2 }
      ]
    };

    // Test Journal Entry 2: Revenue Recognition (Debit Cash, Credit Revenue)
    const entry2 = {
      entry_number: `JE-${new Date().getFullYear()}-${String(Date.now() + 1).slice(-6)}`,
      entry_date: new Date().toISOString().split('T')[0],
      description: 'Customer payment received',
      reference: 'PAY-001',
      status: 'posted',
      total_debit: 1500.00,
      total_credit: 1500.00,
      lines: [
        { account_id: accounts.find(a => a.account_code === '1000')?.id || accounts[0].id, description: 'Cash received', debit_amount: 1500.00, credit_amount: 0, line_number: 1 },
        { account_id: accounts.find(a => a.account_code === '4000')?.id || accounts[3].id, description: 'Sales revenue', debit_amount: 0, credit_amount: 1500.00, line_number: 2 }
      ]
    };

    // Test Journal Entry 3: Rent Payment (Debit Rent Expense, Credit Cash)
    const entry3 = {
      entry_number: `JE-${new Date().getFullYear()}-${String(Date.now() + 2).slice(-6)}`,
      entry_date: new Date().toISOString().split('T')[0],
      description: 'Monthly rent payment',
      reference: 'RENT-001',
      status: 'draft',
      total_debit: 2000.00,
      total_credit: 2000.00,
      lines: [
        { account_id: accounts.find(a => a.account_code === '5100')?.id || accounts[5].id, description: 'Rent expense', debit_amount: 2000.00, credit_amount: 0, line_number: 1 },
        { account_id: accounts.find(a => a.account_code === '1000')?.id || accounts[0].id, description: 'Cash payment', debit_amount: 0, credit_amount: 2000.00, line_number: 2 }
      ]
    };

    // Test Journal Entry 4: Complex Entry (Multiple accounts)
    const entry4 = {
      entry_number: `JE-${new Date().getFullYear()}-${String(Date.now() + 3).slice(-6)}`,
      entry_date: new Date().toISOString().split('T')[0],
      description: 'Utilities and office expenses',
      reference: 'UTIL-001',
      status: 'posted',
      total_debit: 750.00,
      total_credit: 750.00,
      lines: [
        { account_id: accounts.find(a => a.account_code === '5200')?.id || accounts[6].id, description: 'Electricity bill', debit_amount: 300.00, credit_amount: 0, line_number: 1 },
        { account_id: accounts.find(a => a.account_code === '5000')?.id || accounts[4].id, description: 'Office maintenance', debit_amount: 450.00, credit_amount: 0, line_number: 2 },
        { account_id: accounts.find(a => a.account_code === '2000')?.id || accounts[2].id, description: 'Accounts payable', debit_amount: 0, credit_amount: 750.00, line_number: 3 }
      ]
    };

    const testEntries = [entry1, entry2, entry3, entry4];

    for (const entry of testEntries) {
      try {
        // Check if entry already exists
        const existing = await pool.query(
          'SELECT id FROM journal_entries WHERE entry_number = $1',
          [entry.entry_number]
        );

        if (existing.rows.length > 0) {
          console.log(`   ⚠️  Entry ${entry.entry_number} already exists, skipping...`);
          continue;
        }

        // Insert journal entry
        let entryId;
        try {
          const entryResult = await pool.query(
            `INSERT INTO journal_entries 
             (id, entry_number, entry_date, description, reference, status, total_debit, total_credit, agency_id, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
             RETURNING id`,
            [
              generateUUID(),
              entry.entry_number,
              entry.entry_date,
              entry.description,
              entry.reference,
              entry.status,
              entry.total_debit,
              entry.total_credit,
              targetAgencyId
            ]
          );
          entryId = entryResult.rows[0].id;
        } catch (error) {
          // Try without agency_id if column doesn't exist
          if (error.code === '42703' || error.message.includes('agency_id')) {
            const entryResult = await pool.query(
              `INSERT INTO journal_entries 
               (id, entry_number, entry_date, description, reference, status, total_debit, total_credit, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
               RETURNING id`,
              [
                generateUUID(),
                entry.entry_number,
                entry.entry_date,
                entry.description,
                entry.reference,
                entry.status,
                entry.total_debit,
                entry.total_credit
              ]
            );
            entryId = entryResult.rows[0].id;
          } else {
            throw error;
          }
        }

        // Insert journal entry lines
        for (const line of entry.lines) {
          try {
            await pool.query(
              `INSERT INTO journal_entry_lines 
               (id, journal_entry_id, account_id, description, debit_amount, credit_amount, line_number, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
              [
                generateUUID(),
                entryId,
                line.account_id,
                line.description,
                line.debit_amount,
                line.credit_amount,
                line.line_number
              ]
            );
          } catch (error) {
            console.error(`   ❌ Error creating line for entry ${entry.entry_number}:`, error.message);
          }
        }

        console.log(`   ✅ Created entry: ${entry.entry_number} - ${entry.description} (${entry.lines.length} lines)`);
      } catch (error) {
        console.error(`   ❌ Error creating entry ${entry.entry_number}:`, error.message);
      }
    }

    console.log(`\n✅ Seeding complete!\n`);
    console.log(`📊 Summary:`);
    console.log(`   - Accounts created/verified: ${createdAccounts.length}`);
    console.log(`   - Journal entries created: ${testEntries.length}`);
    console.log(`   - Database: ${targetDatabase}`);
    console.log(`   - Agency ID: ${targetAgencyId}\n`);

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Main execution
const databaseName = process.argv[2] || null;
const agencyId = process.argv[3] || null;

seedJournalEntries(databaseName, agencyId)
  .then(() => {
    console.log('✨ Script completed successfully!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
