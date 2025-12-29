/**
 * Currency & Exchange Rate Service
 * Handles multi-currency support with real-time exchange rates
 */

const { parseDatabaseUrl } = require('../utils/poolManager');
const { Pool } = require('pg');
const crypto = require('crypto');

// Generate UUID v4
function generateUUID() {
  return crypto.randomUUID();
}

/**
 * Get agency database connection
 */
async function getAgencyConnection(agencyDatabase) {
  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
  const client = await agencyPool.connect();
  // Attach pool to client for cleanup
  client.pool = agencyPool;
  return client;
}

/**
 * Fetch exchange rates from external API
 * Uses exchangerate-api.com (free tier) or fixer.io
 */
async function fetchExchangeRates(baseCurrency = 'INR') {
  // In test environment, always use fallback rates to avoid network timeouts
  if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
    console.log('[Currency] Test environment detected, using fallback rates');
    return getFallbackRates(baseCurrency);
  }
  
  try {
    // Option 1: exchangerate-api.com (free, no API key needed for basic)
    // Use a shorter timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates');
    }

    const data = await response.json();
    return data.rates; // { USD: 0.012, EUR: 0.011, ... }
  } catch (error) {
    // Always return fallback rates on any error (network, timeout, etc.)
    console.warn('[Currency] Error fetching exchange rates, using fallback:', error.message);
    return getFallbackRates(baseCurrency);
  }
}

/**
 * Fallback exchange rates (for development/offline)
 */
function getFallbackRates(baseCurrency) {
  const rates = {
    INR: {
      USD: 0.012,
      EUR: 0.011,
      GBP: 0.0095,
      JPY: 1.8,
      AUD: 0.018,
      CAD: 0.016,
      CHF: 0.011,
      CNY: 0.087,
      AED: 0.044,
      SAR: 0.045,
    },
    USD: {
      INR: 83.33,
      EUR: 0.92,
      GBP: 0.79,
      JPY: 150,
      AUD: 1.5,
      CAD: 1.35,
    },
    EUR: {
      INR: 90.91,
      USD: 1.09,
      GBP: 0.86,
      JPY: 163,
    },
  };

  return rates[baseCurrency] || {};
}

/**
 * Update exchange rates in database
 */
async function updateExchangeRates(agencyDatabase, agencyId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    // Get base currency from agency settings (agency_settings is in agency database, no agency_id needed)
    const settingsResult = await client.query(
      'SELECT default_currency, currency FROM public.agency_settings LIMIT 1'
    );

    const baseCurrency = settingsResult.rows[0]?.default_currency || settingsResult.rows[0]?.currency || 'INR';

    // Fetch latest rates (with fallback to hardcoded rates on error)
    // In test environment or on network errors, use fallback rates
    let rates;
    try {
      rates = await fetchExchangeRates(baseCurrency);
      // If rates are empty or invalid, use fallback
      if (!rates || Object.keys(rates).length === 0) {
        console.warn('[Currency] No rates returned, using fallback');
        rates = getFallbackRates(baseCurrency);
      }
    } catch (error) {
      console.warn('[Currency] Error in fetchExchangeRates, using fallback:', error.message);
      rates = getFallbackRates(baseCurrency);
    }

    // Update or insert rates
    for (const [code, rate] of Object.entries(rates)) {
      try {
        await client.query(
          `INSERT INTO public.currencies (id, code, name, exchange_rate, updated_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (code) 
           DO UPDATE SET exchange_rate = $4, updated_at = NOW()`,
          [generateUUID(), code, code, parseFloat(rate)]
        );
      } catch (error) {
        console.error(`[Currency] Error inserting rate for ${code}:`, error.message);
        throw error;
      }
    }

    // Also update base currency
    try {
      await client.query(
        `INSERT INTO public.currencies (id, code, name, exchange_rate, is_base, updated_at)
         VALUES ($1, $2, $3, 1, true, NOW())
         ON CONFLICT (code) 
         DO UPDATE SET exchange_rate = 1, is_base = true, updated_at = NOW()`,
        [generateUUID(), baseCurrency, baseCurrency]
      );
    } catch (error) {
      console.error(`[Currency] Error inserting base currency ${baseCurrency}:`, error.message);
      throw error;
    }

    return rates;
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}

/**
 * Convert amount between currencies
 */
async function convertCurrency(agencyDatabase, amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const client = await getAgencyConnection(agencyDatabase);
  try {
    // Get exchange rates
    const fromRate = await client.query(
      'SELECT exchange_rate FROM public.currencies WHERE code = $1',
      [fromCurrency]
    );
    const toRate = await client.query(
      'SELECT exchange_rate FROM public.currencies WHERE code = $1',
      [toCurrency]
    );

    if (fromRate.rows.length === 0 || toRate.rows.length === 0) {
      throw new Error(`Exchange rate not found for ${fromCurrency} or ${toCurrency}`);
    }

    // Convert: amount * (toRate / fromRate)
    const converted = parseFloat(amount) * (parseFloat(toRate.rows[0].exchange_rate) / parseFloat(fromRate.rows[0].exchange_rate));
    return converted;
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}

/**
 * Get all currencies with rates
 */
async function getCurrencies(agencyDatabase) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      'SELECT * FROM public.currencies ORDER BY is_base DESC, code ASC'
    );
    return result.rows;
  } finally {
    client.release();
    if (client.pool) {
      await client.pool.end();
    }
  }
}

module.exports = {
  fetchExchangeRates,
  updateExchangeRates,
  convertCurrency,
  getCurrencies,
};
