/**
 * Bank Reconciliation Service
 * Handles bank account reconciliation
 */

const { parseDatabaseUrl } = require('../utils/poolManager');
const { Pool } = require('pg');
const crypto = require('crypto');

function generateUUID() {
  return crypto.randomUUID();
}

async function getAgencyConnection(agencyDatabase) {
  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
  return await agencyPool.connect();
}

/**
 * Import bank statement (CSV format)
 */
async function importBankStatement(agencyDatabase, bankAccountId, statementData) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    await client.query('BEGIN');

    const transactions = [];

    for (const row of statementData) {
      // Parse statement row (date, description, debit, credit, balance)
      const transaction = await client.query(
        `INSERT INTO public.bank_transactions (
          id, agency_id, bank_account_id, transaction_date, transaction_type,
          amount, balance_after, description, reference_number, category, reconciled, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, NOW())
        RETURNING *`,
        [
          generateUUID(),
          row.agency_id,
          bankAccountId,
          row.transaction_date,
          parseFloat(row.debit || 0) > 0 ? 'debit' : 'credit',
          parseFloat(row.debit || row.credit || 0),
          row.balance || null,
          row.description || '',
          row.reference_number || null,
          row.category || null,
        ]
      );
      transactions.push(transaction.rows[0]);
    }

    // Update bank account balance
    const balanceResult = await client.query(
      `SELECT 
        SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE -amount END) as balance
       FROM public.bank_transactions
       WHERE bank_account_id = $1`,
      [bankAccountId]
    );

    const newBalance = parseFloat(balanceResult.rows[0].balance || 0);
    await client.query(
      'UPDATE public.bank_accounts SET current_balance = $1, updated_at = NOW() WHERE id = $2',
      [newBalance, bankAccountId]
    );

    await client.query('COMMIT');
    return transactions;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await client.client.pool.end();
  }
}

/**
 * Reconcile bank account
 */
async function reconcileBankAccount(agencyDatabase, reconciliationData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    await client.query('BEGIN');

    // Create reconciliation record
    const reconResult = await client.query(
      `INSERT INTO public.bank_reconciliations (
        id, agency_id, bank_account_id, reconciliation_date,
        statement_balance, book_balance, status, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *`,
      [
        generateUUID(),
        reconciliationData.agency_id,
        reconciliationData.bank_account_id,
        reconciliationData.reconciliation_date,
        reconciliationData.statement_balance,
        reconciliationData.book_balance,
        reconciliationData.status || 'pending',
        reconciliationData.notes || null,
      ]
    );

    const reconciliation = reconResult.rows[0];

    // Mark transactions as reconciled
    if (reconciliationData.transaction_ids && reconciliationData.transaction_ids.length > 0) {
      await client.query(
        `UPDATE public.bank_transactions 
         SET reconciled = true, reconciliation_id = $1 
         WHERE id = ANY($2)`,
        [reconciliation.id, reconciliationData.transaction_ids]
      );
    }

    // Update reconciliation status
    if (reconciliationData.status === 'reconciled') {
      await client.query(
        `UPDATE public.bank_reconciliations 
         SET reconciled_by = $1, reconciled_at = NOW(), status = 'reconciled'
         WHERE id = $2`,
        [userId, reconciliation.id]
      );
      reconciliation.reconciled_by = userId;
      reconciliation.reconciled_at = new Date().toISOString();
      reconciliation.status = 'reconciled';
    }

    await client.query('COMMIT');
    return reconciliation;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await client.client.pool.end();
  }
}

/**
 * Get unreconciled transactions
 */
async function getUnreconciledTransactions(agencyDatabase, bankAccountId, startDate, endDate) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `SELECT * FROM public.bank_transactions
       WHERE bank_account_id = $1
       AND reconciled = false
       AND transaction_date >= $2
       AND transaction_date <= $3
       ORDER BY transaction_date ASC, created_at ASC`,
      [bankAccountId, startDate, endDate]
    );
    return result.rows;
  } finally {
    client.release();
    await client.client.pool.end();
  }
}

module.exports = {
  importBankStatement,
  reconcileBankAccount,
  getUnreconciledTransactions,
};
