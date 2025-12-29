/**
 * Agency Routes
 * Handles agency management endpoints
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/authMiddleware');
const {
  checkDomainAvailability,
  checkSetupStatus,
  getSetupProgress,
  createAgency,
  repairAgencyDatabase,
  completeAgencySetup,
} = require('../services/agencyService');

/**
 * GET /api/agencies/check-domain
 * Check if domain is available
 */
router.get('/check-domain', asyncHandler(async (req, res) => {
  const { domain } = req.query;

  if (!domain || typeof domain !== 'string') {
    return res.json({ available: false, error: 'Domain is required' });
  }

  try {
    const available = await checkDomainAvailability(domain);
    res.json({
      available,
      domain: domain.toLowerCase().trim(),
    });
  } catch (error) {
    console.error('[API] Domain check error:', error);
    console.error('[API] Domain check error stack:', error.stack);
    
    // Return 200 with error flag instead of 500 to avoid CORS issues
    res.json({
      available: false,
      error: error.message || 'Error checking domain availability',
      domain: domain.toLowerCase().trim(),
    });
  }
}));

/**
 * GET /api/agencies/check-setup
 * Check agency setup status
 */
router.get('/check-setup', asyncHandler(async (req, res) => {
  try {
    const agencyDatabase = req.headers['x-agency-database'] ||
      req.query.database ||
      null;

    if (!agencyDatabase) {
      return res.json({ setupComplete: false });
    }

    // If detailed progress is requested
    if (req.query.detailed === 'true') {
      try {
        const progress = await getSetupProgress(agencyDatabase);
        // Ensure response has all required fields
        return res.json({
          setupComplete: progress.setupComplete || false,
          progress: progress.progress || 0,
          completedSteps: Array.isArray(progress.completedSteps) ? progress.completedSteps : [],
          totalSteps: progress.totalSteps || 7,
          lastUpdated: progress.lastUpdated || null,
          agencyName: progress.agencyName || null,
        });
      } catch (progressError) {
        console.error('[API] Get setup progress error:', progressError);
        // Return default structure on error
        return res.json({
          setupComplete: false,
          progress: 0,
          completedSteps: [],
          totalSteps: 7,
          lastUpdated: null,
          agencyName: null,
        });
      }
    }

    const setupComplete = await checkSetupStatus(agencyDatabase);
    res.json({ setupComplete });
  } catch (error) {
    console.error('[API] Check setup error:', error);
    res.json({ setupComplete: false });
  }
}));

/**
 * GET /api/agencies/agency-settings
 * Fetch agency_settings from agency database (for prefill in AgencySetup)
 */
router.get('/agency-settings', authenticate, asyncHandler(async (req, res) => {
  try {
    const agencyDatabase = req.headers['x-agency-database'] ||
      req.query.database ||
      null;

    if (!agencyDatabase) {
      return res.status(400).json({
        success: false,
        error: 'Agency database not specified',
        message: 'Provide database name in header: x-agency-database or in query: ?database=agency_name',
      });
    }

    const { parseDatabaseUrl } = require('../utils/poolManager');
    const { host, port, user, password } = parseDatabaseUrl();
    const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
    const { Pool: AgencyPool } = require('pg');
    const agencyPool = new AgencyPool({ connectionString: agencyDbUrl, max: 1 });
    const agencyClient = await agencyPool.connect();

    try {
      // Fetch agency_settings from agency database
      const result = await agencyClient.query(`
        SELECT 
          id,
          agency_name,
          logo_url,
          setup_complete,
          industry,
          phone,
          address_street,
          address_city,
          address_state,
          address_zip,
          address_country,
          employee_count,
          company_tagline,
          business_type,
          founded_year,
          description,
          legal_name,
          registration_number,
          tax_id,
          tax_id_type,
          email,
          website,
          social_linkedin,
          social_twitter,
          social_facebook,
          currency,
          fiscal_year_start,
          payment_terms,
          invoice_prefix,
          tax_rate,
          enable_gst,
          gst_number,
          bank_account_name,
          bank_account_number,
          bank_name,
          bank_routing_number,
          bank_swift_code,
          timezone,
          date_format,
          time_format,
          week_start,
          language,
          notifications_email,
          notifications_sms,
          notifications_push,
          notifications_weekly_report,
          notifications_monthly_report,
          features_enable_payroll,
          features_enable_projects,
          features_enable_crm,
          features_enable_inventory,
          features_enable_reports,
          created_at,
          updated_at
        FROM public.agency_settings
        LIMIT 1
      `);

      if (result.rows.length === 0) {
        return res.json({
          success: true,
          data: {
            settings: null,
          },
          message: 'No agency settings found',
        });
      }

      const settings = result.rows[0];

      return res.json({
        success: true,
        data: {
          settings: {
            ...settings,
            // Construct address object for easier frontend consumption
            address: settings.address_street || settings.address_city || settings.address_state
              ? {
                  street: settings.address_street || '',
                  city: settings.address_city || '',
                  state: settings.address_state || '',
                  zipCode: settings.address_zip || '',
                  country: settings.address_country || '',
                }
              : null,
          },
        },
        message: 'Agency settings fetched successfully',
      });
    } finally {
      agencyClient.release();
      await agencyPool.end();
    }
  } catch (error) {
    console.error('[API] Error fetching agency settings from agency database:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch agency settings',
      message: 'Failed to fetch agency settings',
    });
  }
}));

/**
 * POST /api/agencies/complete-setup
 * Complete agency setup with extended settings
 */
router.post('/complete-setup', asyncHandler(async (req, res) => {
  try {
    const agencyDatabase = req.headers['x-agency-database'] ||
      req.body.database;

    if (!agencyDatabase) {
      return res.status(400).json({ error: 'Agency database not specified' });
    }

    const result = await completeAgencySetup(agencyDatabase, req.body);

    res.json({
      success: true,
      message: 'Agency setup completed successfully',
      teamCredentials: result?.teamCredentials || [],
      teamCredentialsCsv: result?.teamCredentialsCsv || '',
    });
  } catch (error) {
    console.error('[API] Complete setup error:', error);
    res.status(500).json({
      error: error.message || 'Failed to complete setup',
      detail: error.detail,
      code: error.code,
    });
  }
}));

/**
 * POST /api/agencies/create
 * Create a new agency with isolated database
 */
router.post('/create', asyncHandler(async (req, res) => {
  try {
    const {
      agencyName,
      domain,
      industry,
      companySize,
      address,
      phone,
      adminName,
      adminEmail,
      adminPassword,
      subscriptionPlan,
      // New optional fields from onboarding wizard
      primaryFocus,
      enableGST,
      modules,
      business_goals,
      page_ids,
    } = req.body;

    if (!agencyName || !domain || !adminName || !adminEmail || !adminPassword || !subscriptionPlan) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['agencyName', 'domain', 'adminName', 'adminEmail', 'adminPassword', 'subscriptionPlan'],
        message: 'Please fill in all required fields before continuing.',
      });
    }

    console.log('[Agency] Create request received:', {
      agencyName,
      domain,
      subscriptionPlan,
      adminEmail,
      page_ids: page_ids?.length || 0,
      business_goals: business_goals?.length || 0,
      origin: req.headers.origin,
    });

    const result = await createAgency({
      agencyName,
      domain,
      adminName,
      adminEmail,
      adminPassword,
      subscriptionPlan,
      phone,
      primaryFocus,
      enableGST,
      modules,
      industry,
      companySize,
      address,
      business_goals,
      page_ids,
    });

    res.json({
      success: true,
      ...result,
      message: 'Agency created successfully with separate database',
    });
  } catch (error) {
    console.error('[API] Agency creation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create agency',
      detail: error.detail,
      code: error.code,
      message: 'Failed to create agency. Please try again or contact support.',
    });
  }
}));

/**
 * POST /api/agencies/repair-database
 * Repair agency database by adding missing tables
 */
router.post('/repair-database', asyncHandler(async (req, res) => {
  try {
    const agencyDatabase = req.headers['x-agency-database'] || req.body.database;

    if (!agencyDatabase) {
      return res.status(400).json({
        error: 'Agency database name is required',
        message: 'Provide database name in header: x-agency-database or in body: { database: "agency_name" }',
      });
    }

    console.log(`[API] Starting database repair for: ${agencyDatabase}`);

    const result = await repairAgencyDatabase(agencyDatabase);

    res.json({
      success: true,
      message: 'Database repair completed successfully',
      ...result,
    });
  } catch (error) {
    console.error('[API] Database repair failed:', error);
    res.status(500).json({
      error: error.message || 'Failed to repair database',
      detail: error.detail,
      code: error.code,
    });
  }
}));

module.exports = router;
