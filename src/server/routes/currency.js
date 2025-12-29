/**
 * Currency Management Routes
 * Handles currency and exchange rate operations
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireAgencyContext } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');
const currencyService = require('../services/currencyService');

/**
 * GET /api/currency/currencies
 * Get all currencies with exchange rates
 */
router.get('/currencies', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;

  const currencies = await currencyService.getCurrencies(agencyDatabase);

  res.json({
    success: true,
    data: currencies,
  });
}));

/**
 * POST /api/currency/update-rates
 * Update exchange rates from external API
 */
router.post('/update-rates', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;

  const rates = await currencyService.updateExchangeRates(agencyDatabase, agencyId);

  res.json({
    success: true,
    data: rates,
    message: 'Exchange rates updated successfully',
  });
}));

/**
 * POST /api/currency/convert
 * Convert amount between currencies
 */
router.post('/convert', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const { amount, from_currency, to_currency } = req.body;

  if (!amount || !from_currency || !to_currency) {
    return res.status(400).json({
      success: false,
      error: 'Amount, from_currency, and to_currency are required',
    });
  }

  const converted = await currencyService.convertCurrency(
    agencyDatabase,
    amount,
    from_currency,
    to_currency
  );

  res.json({
    success: true,
    data: {
      original_amount: parseFloat(amount),
      from_currency,
      to_currency,
      converted_amount: converted,
      exchange_rate: converted / parseFloat(amount),
    },
  });
}));

module.exports = router;
