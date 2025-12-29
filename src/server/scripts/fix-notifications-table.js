/**
 * Script to fix/create notifications table
 * Run this if notifications table is missing
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5432/buildflow_db',
});

async function fixNotificationsTable() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing notifications table...');
    
    const { ensureNotificationsTable } = require('../utils/schema/miscSchema');
    await ensureNotificationsTable(client);
    
    console.log('✅ Notifications table fixed successfully!');
    
    // Verify it exists
    const check = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications'
      );
    `);
    
    if (check.rows[0].exists) {
      console.log('✅ Verified: notifications table exists');
    } else {
      console.error('❌ Error: notifications table still does not exist');
    }
  } catch (error) {
    console.error('❌ Error fixing notifications table:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixNotificationsTable()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

