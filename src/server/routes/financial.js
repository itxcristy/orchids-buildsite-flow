/**
 * Financial Management Routes
 * Handles financial enhancements: currencies, bank reconciliation, budgets
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireAgencyContext } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');
const currencyService = require('../services/currencyService');
const bankReconciliationService = require('../services/bankReconciliationService');
const budgetService = require('../services/budgetService');

/**
 * Currency Routes
 */
router.get('/currencies', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const currencies = await currencyService.getCurrencies(agencyDatabase);
  res.json({ success: true, data: currencies });
}));

router.post('/currencies/update-rates', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const rates = await currencyService.updateExchangeRates(agencyDatabase, agencyId);
  res.json({ success: true, data: rates, message: 'Exchange rates updated' });
}));

router.post('/currencies/convert', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const { amount, from_currency, to_currency } = req.body;
  const converted = await currencyService.convertCurrency(agencyDatabase, amount, from_currency, to_currency);
  res.json({
    success: true,
    data: {
      original_amount: parseFloat(amount),
      from_currency,
      to_currency,
      converted_amount: converted,
    },
  });
}));

/**
 * Bank Reconciliation Routes
 */
router.post('/bank-reconciliation/import', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const { bank_account_id, statement_data } = req.body;
  const transactions = await bankReconciliationService.importBankStatement(
    agencyDatabase,
    bank_account_id,
    statement_data
  );
  res.json({ success: true, data: transactions, message: 'Bank statement imported' });
}));

router.post('/bank-reconciliation/reconcile', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;
  const reconciliation = await bankReconciliationService.reconcileBankAccount(
    agencyDatabase,
    { ...req.body, agency_id: req.user.agencyId },
    userId
  );
  res.json({ success: true, data: reconciliation, message: 'Bank account reconciled' });
}));

router.get('/bank-reconciliation/unreconciled', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const { bank_account_id, start_date, end_date } = req.query;
  const transactions = await bankReconciliationService.getUnreconciledTransactions(
    agencyDatabase,
    bank_account_id,
    start_date,
    end_date
  );
  res.json({ success: true, data: transactions });
}));

/**
 * Budget Routes
 */
router.post('/budgets', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;
  const budget = await budgetService.createBudget(
    agencyDatabase,
    { ...req.body, agency_id: req.user.agencyId },
    userId
  );
  res.json({ success: true, data: budget, message: 'Budget created' });
}));

router.get('/budgets', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const agencyId = req.user.agencyId;
  const filters = {
    fiscal_year: req.query.fiscal_year,
    status: req.query.status,
  };
  const budgets = await budgetService.getBudgetsWithVariance(agencyDatabase, agencyId, filters);
  res.json({ success: true, data: budgets });
}));

module.exports = router;
