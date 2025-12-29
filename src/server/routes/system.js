const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { pool } = require('../config/database');
const { authenticate, requireSuperAdmin } = require('../middleware/authMiddleware');

/**
 * Ensure main-database tables for subscription plans & features exist.
 * This is idempotent and safe to call before plan/feature operations.
 */
async function ensureSubscriptionSchema(client) {
  // subscription_plans
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.subscription_plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      price NUMERIC(12,2) NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'usd',
      interval TEXT NOT NULL DEFAULT 'month',
      is_active BOOLEAN NOT NULL DEFAULT true,
      max_users INTEGER,
      max_agencies INTEGER,
      max_storage_gb INTEGER,
      stripe_product_id TEXT,
      stripe_price_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // plan_features
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.plan_features (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      feature_key TEXT NOT NULL UNIQUE,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // plan_feature_mappings
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.plan_feature_mappings (
      plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
      feature_id UUID NOT NULL REFERENCES public.plan_features(id) ON DELETE CASCADE,
      enabled BOOLEAN NOT NULL DEFAULT true,
      PRIMARY KEY (plan_id, feature_id)
    )
  `);
}

/**
 * Determine which department should handle a ticket based on category and priority
 * Escalates to parent departments for high-priority issues
 */
async function determineTicketDepartment(client, agencyId, category, priority) {
  try {
    // Category-based department mapping
    const categoryDepartmentMap = {
      'error': 'IT Support',
      'bug': 'IT Support',
      'technical': 'IT Support',
      'performance': 'IT Support',
      'ui': 'Design',
      'ux': 'Design',
      'feature': 'Product',
      'billing': 'Finance',
      'payment': 'Finance',
      'account': 'Customer Success',
      'general': 'Operations',
    };

    // Find department by name for the agency
    const deptName = categoryDepartmentMap[category?.toLowerCase()] || 'Operations';
    
    let deptResult = await client.query(
      `SELECT id, name, parent_department_id 
       FROM public.departments 
       WHERE agency_id = $1 AND name ILIKE $2 AND is_active = true 
       LIMIT 1`,
      [agencyId, `%${deptName}%`]
    );

    // If department not found, try to find Operations or any active department
    if (deptResult.rows.length === 0) {
      deptResult = await client.query(
        `SELECT id, name, parent_department_id 
         FROM public.departments 
         WHERE agency_id = $1 AND is_active = true 
         ORDER BY name 
         LIMIT 1`,
        [agencyId]
      );
    }

    if (deptResult.rows.length === 0) {
      return null; // No departments found
    }

    let department = deptResult.rows[0];

    // For high-priority tickets, escalate to parent department if exists
    if (priority === 'high' && department.parent_department_id) {
      const parentResult = await client.query(
        `SELECT id, name FROM public.departments WHERE id = $1 AND is_active = true`,
        [department.parent_department_id]
      );
      if (parentResult.rows.length > 0) {
        department = parentResult.rows[0];
      }
    }

    return department.name;
  } catch (error) {
    console.error('[System] Error determining ticket department:', error);
    return null;
  }
}

/**
 * Ensure main-database tables for support tickets exist.
 */
async function ensureSupportTicketSchema(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.support_tickets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_number TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'open', -- open | in_progress | resolved | closed
      priority TEXT NOT NULL DEFAULT 'medium', -- low | medium | high
      category TEXT NOT NULL DEFAULT 'general',
      user_id UUID,
      agency_id UUID,
      department TEXT,
      console_logs JSONB,
      error_details JSONB,
      browser_info JSONB,
      page_url TEXT,
      screenshot_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      resolved_at TIMESTAMPTZ
    )
  `);
  
  // Add new columns if they don't exist (for existing tables)
  await client.query(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_schema = 'public' 
                     AND table_name = 'support_tickets' 
                     AND column_name = 'user_id') THEN
        ALTER TABLE public.support_tickets ADD COLUMN user_id UUID;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_schema = 'public' 
                     AND table_name = 'support_tickets' 
                     AND column_name = 'agency_id') THEN
        ALTER TABLE public.support_tickets ADD COLUMN agency_id UUID;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_schema = 'public' 
                     AND table_name = 'support_tickets' 
                     AND column_name = 'department') THEN
        ALTER TABLE public.support_tickets ADD COLUMN department TEXT;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_schema = 'public' 
                     AND table_name = 'support_tickets' 
                     AND column_name = 'console_logs') THEN
        ALTER TABLE public.support_tickets ADD COLUMN console_logs JSONB;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_schema = 'public' 
                     AND table_name = 'support_tickets' 
                     AND column_name = 'error_details') THEN
        ALTER TABLE public.support_tickets ADD COLUMN error_details JSONB;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_schema = 'public' 
                     AND table_name = 'support_tickets' 
                     AND column_name = 'browser_info') THEN
        ALTER TABLE public.support_tickets ADD COLUMN browser_info JSONB;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_schema = 'public' 
                     AND table_name = 'support_tickets' 
                     AND column_name = 'page_url') THEN
        ALTER TABLE public.support_tickets ADD COLUMN page_url TEXT;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_schema = 'public' 
                     AND table_name = 'support_tickets' 
                     AND column_name = 'screenshot_url') THEN
        ALTER TABLE public.support_tickets ADD COLUMN screenshot_url TEXT;
      END IF;
    END $$;
  `);
}

/**
 * GET /api/system/agency-settings/:agencyId
 * Fetch main database agency_settings row for a given agency_id.
 * Used to prefill AgencySetup from onboarding wizard metadata.
 *
 * This endpoint requires authentication but NOT super admin privileges,
 * because it is used by regular agency admins during setup.
 */
router.get(
  '/agency-settings/:agencyId',
  authenticate,
  asyncHandler(async (req, res) => {
    const { agencyId } = req.params;

    if (!agencyId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'agencyId is required',
        },
        message: 'agencyId is required',
      });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT 
           id,
           agency_id,
           agency_name,
           logo_url,
           primary_focus,
           enable_gst,
           modules,
           industry,
           phone,
           address_street,
           address_city,
           address_state,
           address_zip,
           address_country,
           employee_count
         FROM public.agency_settings
         WHERE agency_id = $1
         LIMIT 1`,
        [agencyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Agency settings not found',
          },
          message: 'Agency settings not found',
        });
      }

      let modules = result.rows[0].modules;
      if (typeof modules === 'string') {
        try {
          modules = JSON.parse(modules);
        } catch {
          modules = null;
        }
      }

      return res.json({
        success: true,
        data: {
          settings: {
            ...result.rows[0],
            modules,
          },
        },
        message: 'Agency settings fetched successfully',
      });
    } catch (error) {
      console.error('[System] Error fetching agency settings:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch agency settings',
          details: error.message,
        },
        message: 'Failed to fetch agency settings',
      });
    } finally {
      client.release();
    }
  })
);

/**
 * GET /api/system/metrics
 * System-wide statistics for the super admin dashboard.
 *
 * Returns:
 * {
 *   success: true,
 *   data: {
 *     metrics: { ... },
 *     agencies: [ ... ]
 *   }
 * }
 */
/**
 * OPTIONS /api/system/metrics
 * Handle CORS preflight requests
 */
router.options('/metrics', (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  res.sendStatus(204);
});

router.get(
  '/metrics',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    // Set CORS headers explicitly
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
      res.setHeader('Access-Control-Max-Age', '86400');
    }

    let client;
    try {
      client = await pool.connect();
    } catch (connectError) {
      console.error('[System] Failed to get database connection:', connectError);
      // Set CORS headers even on error
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
      }
      return res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_CONNECTION_ERROR',
          message: 'Failed to connect to database',
          details: connectError.message,
        },
        message: 'Failed to load system metrics',
      });
    }

    try {
      // Agencies summary
      let agencies = [];
      try {
        const agenciesResult = await client.query(
          `SELECT 
             id,
             name,
             domain,
             subscription_plan,
             max_users,
             is_active,
             created_at
           FROM public.agencies
           ORDER BY created_at DESC`
        );
        agencies = agenciesResult.rows || [];
      } catch (agenciesError) {
        console.error('[System] Error fetching agencies:', agenciesError);
        // Continue with empty agencies array
        agencies = [];
      }

      // Total users - aggregate from all agency databases
      // Note: profiles table exists in agency databases, not main database
      let totalUsers = 0;
      let activeUsers = 0;
      // We'll calculate this by aggregating from agency databases if needed
      // For now, return 0 to avoid errors

      // Subscription plan distribution - count all agencies by plan type
      // Map database plan names to standardized names (starter->basic, professional->pro)
      let subscriptionPlans = {
        basic: 0,
        pro: 0,
        enterprise: 0,
      };
      try {
        const planResult = await client.query(
          `SELECT 
            subscription_plan,
            COUNT(*)::INTEGER as count
          FROM public.agencies
          WHERE subscription_plan IS NOT NULL
          GROUP BY subscription_plan`
        );
        
        // Map database plan names to display names
        const planMapping = {
          'basic': 'basic',
          'starter': 'basic',
          'pro': 'pro',
          'professional': 'pro',
          'enterprise': 'enterprise',
        };
        
        planResult.rows.forEach((row) => {
          const planName = (row.subscription_plan || '').toLowerCase().trim();
          const mappedPlan = planMapping[planName] || planName;
          
          if (mappedPlan === 'basic') {
            subscriptionPlans.basic += parseInt(row.count, 10) || 0;
          } else if (mappedPlan === 'pro') {
            subscriptionPlans.pro += parseInt(row.count, 10) || 0;
          } else if (mappedPlan === 'enterprise') {
            subscriptionPlans.enterprise += parseInt(row.count, 10) || 0;
          }
        });
      } catch (error) {
        if (error.code !== '42P01') {
          console.warn('[System] Failed to load subscription plans:', error.message);
        }
      }

      // Simplified pricing model for MRR/ARR
      const priceMap = { basic: 29, pro: 79, enterprise: 199 };
      const mrr =
        subscriptionPlans.basic * priceMap.basic +
        subscriptionPlans.pro * priceMap.pro +
        subscriptionPlans.enterprise * priceMap.enterprise;

      // Usage stats – these tables exist in agency databases, not main database
      // Return 0 for now - these would need to be aggregated from all agency databases
      const totalProjects = 0;
      const totalInvoices = 0;
      const totalClients = 0;
      const totalAttendanceRecords = 0;

      // Per-agency statistics - these tables exist in agency databases
      // For now, return 0 counts - would need to query each agency database
      const agenciesWithStats = agencies.map((agency) => ({
        ...agency,
        user_count: 0,
        project_count: 0,
        invoice_count: 0,
      }));

      const metrics = {
        totalAgencies: agencies.length,
        activeAgencies: agencies.filter((a) => a.is_active).length,
        totalUsers,
        activeUsers,
        subscriptionPlans,
        revenueMetrics: {
          mrr,
          arr: mrr * 12,
        },
        usageStats: {
          totalProjects,
          totalInvoices,
          totalClients,
          totalAttendanceRecords,
        },
        systemHealth: {
          // Health metrics are currently synthetic; can be wired to real monitoring later
          uptime: '99.9%',
          responseTime: Math.random() * 100 + 50,
          errorRate: Math.random() * 2,
        },
      };

      return res.json({
        success: true,
        data: {
          metrics,
          agencies: agenciesWithStats,
        },
        message: 'System metrics loaded successfully',
      });
    } catch (error) {
      // Set CORS headers even on error
      const origin = req.headers.origin;
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
      }

      console.error('[System] Error computing system metrics:', error);
      console.error('[System] Error stack:', error.stack);
      console.error('[System] Error code:', error.code);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to load system metrics',
          details: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        },
        message: 'Failed to load system metrics',
      });
    } finally {
      if (client) {
        client.release();
      }
    }
  })
);

/**
 * GET /api/system/plans
 * List all subscription plans with their mapped features.
 */
router.get(
  '/plans',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (_req, res) => {
    const client = await pool.connect();
    try {
      await ensureSubscriptionSchema(client);

      const plansResult = await client.query(
        `SELECT * FROM public.subscription_plans ORDER BY price ASC, created_at DESC`
      );
      const plans = plansResult.rows || [];

      const planIds = plans.map((p) => p.id);
      let mappings = [];
      if (planIds.length > 0) {
        const placeholders = planIds.map((_, i) => `$${i + 1}`).join(',');
        const mappingsResult = await client.query(
          `SELECT 
             pfm.plan_id,
             pfm.feature_id,
             pfm.enabled,
             pf.id,
             pf.name,
             pf.description,
             pf.feature_key
           FROM public.plan_feature_mappings pfm
           INNER JOIN public.plan_features pf ON pfm.feature_id = pf.id
           WHERE pfm.plan_id IN (${placeholders})`,
          planIds
        );
        mappings = mappingsResult.rows || [];
      }

      const mappingsByPlan = mappings.reduce((acc, mapping) => {
        if (!acc[mapping.plan_id]) {
          acc[mapping.plan_id] = [];
        }
        acc[mapping.plan_id].push({
          id: mapping.id,
          name: mapping.name,
          description: mapping.description,
          feature_key: mapping.feature_key,
          enabled: mapping.enabled,
        });
        return acc;
      }, {});

      const transformedPlans = plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        description: plan.description || '',
        price: Number(plan.price),
        currency: plan.currency,
        interval: plan.interval,
        is_active: plan.is_active,
        max_users: plan.max_users,
        max_agencies: plan.max_agencies,
        max_storage_gb: plan.max_storage_gb,
        stripe_product_id: plan.stripe_product_id,
        stripe_price_id: plan.stripe_price_id,
        features: mappingsByPlan[plan.id] || [],
      }));

      return res.json({
        success: true,
        data: {
          plans: transformedPlans,
        },
      });
    } catch (error) {
      console.error('[System] Error fetching plans:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to load subscription plans',
          details: error.message,
        },
      });
    } finally {
      client.release();
    }
  })
);

/**
 * GET /api/system/features
 * List active plan features.
 */
router.get(
  '/features',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (_req, res) => {
    const client = await pool.connect();
    try {
      await ensureSubscriptionSchema(client);

      const featuresResult = await client.query(
        `SELECT * FROM public.plan_features WHERE is_active = $1 ORDER BY name ASC`,
        [true]
      );

      const features =
        featuresResult.rows?.map((feature) => ({
          id: feature.id,
          name: feature.name,
          description: feature.description || '',
          feature_key: feature.feature_key,
          enabled: false,
        })) || [];

      return res.json({
        success: true,
        data: {
          features,
        },
      });
    } catch (error) {
      console.error('[System] Error fetching features:', error);
      // If table doesn't exist yet, return empty array instead of error
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return res.json({
          success: true,
          data: {
            features: [],
          },
        });
      }
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to load available features',
          details: error.message,
        },
      });
    } finally {
      client.release();
    }
  })
);

/**
 * POST /api/system/plans
 * Create a new subscription plan.
 */
router.post(
  '/plans',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const {
      name,
      description,
      price,
      currency,
      interval,
      is_active,
      max_users,
      max_agencies,
      max_storage_gb,
      stripe_product_id,
      stripe_price_id,
      features = [],
    } = req.body || {};

    if (!name || typeof price !== 'number' || !currency || !interval) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'name, price, currency, and interval are required',
        },
      });
    }

    const client = await pool.connect();
    try {
      await ensureSubscriptionSchema(client);

      const insertResult = await client.query(
        `INSERT INTO public.subscription_plans 
           (name, description, price, currency, interval, is_active,
            max_users, max_agencies, max_storage_gb, stripe_product_id, stripe_price_id, created_at)
         VALUES ($1, $2, $3, $4, $5, COALESCE($6, true),
                 $7, $8, $9, $10, $11, NOW())
         RETURNING *`,
        [
          name,
          description || '',
          price,
          currency,
          interval,
          is_active,
          max_users,
          max_agencies,
          max_storage_gb,
          stripe_product_id || null,
          stripe_price_id || null,
        ]
      );

      const plan = insertResult.rows[0];
      if (!plan) {
        throw new Error('Failed to create plan');
      }

      if (Array.isArray(features) && features.length > 0) {
        const values = features
          .map((_, i) => `($1, $${i * 2 + 2}, $${i * 2 + 3})`)
          .join(',');
        const params = [
          plan.id,
          ...features.flatMap((f) => [f.id, !!f.enabled]),
        ];

        await client.query(
          `INSERT INTO public.plan_feature_mappings (plan_id, feature_id, enabled)
           VALUES ${values}`,
          params
        );
      }

      return res.status(201).json({
        success: true,
        data: {
          plan,
        },
        message: 'Plan created successfully',
      });
    } catch (error) {
      console.error('[System] Error creating plan:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create plan',
          details: error.message,
        },
      });
    } finally {
      client.release();
    }
  })
);

/**
 * PUT /api/system/plans/:id
 * Update a subscription plan and its feature mappings.
 */
router.put(
  '/plans/:id',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body || {};

    const client = await pool.connect();
    try {
      await ensureSubscriptionSchema(client);

      const updateResult = await client.query(
        `UPDATE public.subscription_plans
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             price = COALESCE($3, price),
             currency = COALESCE($4, currency),
             interval = COALESCE($5, interval),
             is_active = COALESCE($6, is_active),
             max_users = COALESCE($7, max_users),
             max_agencies = COALESCE($8, max_agencies),
             max_storage_gb = COALESCE($9, max_storage_gb),
             stripe_product_id = COALESCE($10, stripe_product_id),
             stripe_price_id = COALESCE($11, stripe_price_id),
             updated_at = NOW()
         WHERE id = $12
         RETURNING *`,
        [
          updates.name,
          updates.description,
          updates.price,
          updates.currency,
          updates.interval,
          updates.is_active,
          updates.max_users,
          updates.max_agencies,
          updates.max_storage_gb,
          updates.stripe_product_id,
          updates.stripe_price_id,
          id,
        ]
      );

      if (updateResult.rowCount === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Plan not found',
          },
        });
      }

      if (Array.isArray(updates.features)) {
        await client.query(
          `DELETE FROM public.plan_feature_mappings WHERE plan_id = $1`,
          [id]
        );

        if (updates.features.length > 0) {
          const values = updates.features
            .map((_, i) => `($1, $${i * 2 + 2}, $${i * 2 + 3})`)
            .join(',');
          const params = [
            id,
            ...updates.features.flatMap((f) => [f.id, !!f.enabled]),
          ];

          await client.query(
            `INSERT INTO public.plan_feature_mappings (plan_id, feature_id, enabled)
             VALUES ${values}
             ON CONFLICT (plan_id, feature_id) DO UPDATE SET enabled = EXCLUDED.enabled`,
            params
          );
        }
      }

      return res.json({
        success: true,
        data: {
          plan: updateResult.rows[0],
        },
        message: 'Plan updated successfully',
      });
    } catch (error) {
      console.error('[System] Error updating plan:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update plan',
          details: error.message,
        },
      });
    } finally {
      client.release();
    }
  })
);

/**
 * DELETE /api/system/plans/:id
 * Soft-deactivate a plan.
 */
router.delete(
  '/plans/:id',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
      await ensureSubscriptionSchema(client);

      const updateResult = await client.query(
        `UPDATE public.subscription_plans
         SET is_active = false, updated_at = NOW()
         WHERE id = $1`,
        [id]
      );

      if (updateResult.rowCount === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Plan not found',
          },
        });
      }

      return res.json({
        success: true,
        message: 'Plan deactivated successfully',
      });
    } catch (error) {
      console.error('[System] Error deactivating plan:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to deactivate plan',
          details: error.message,
        },
      });
    } finally {
      client.release();
    }
  })
);

/**
 * POST /api/system/features
 * Create a new plan feature.
 */
router.post(
  '/features',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { name, description, feature_key } = req.body || {};

    if (!name || !feature_key) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'name and feature_key are required',
        },
      });
    }

    const client = await pool.connect();
    try {
      await ensureSubscriptionSchema(client);

      const insertResult = await client.query(
        `INSERT INTO public.plan_features
           (name, description, feature_key, is_active, created_at)
         VALUES ($1, $2, $3, true, NOW())
         RETURNING *`,
        [name, description || '', feature_key]
      );

      const feature = insertResult.rows[0];
      if (!feature) {
        throw new Error('Failed to create feature');
      }

      return res.status(201).json({
        success: true,
        data: {
          feature,
        },
        message: 'Feature created successfully',
      });
    } catch (error) {
      console.error('[System] Error creating feature:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create feature',
          details: error.message,
        },
      });
    } finally {
      client.release();
    }
  })
);

/**
 * PUT /api/system/features/:id
 * Update an existing feature.
 */
router.put(
  '/features/:id',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body || {};

    const client = await pool.connect();
    try {
      await ensureSubscriptionSchema(client);

      const updateResult = await client.query(
        `UPDATE public.plan_features
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             feature_key = COALESCE($3, feature_key),
             updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [updates.name, updates.description, updates.feature_key, id]
      );

      if (updateResult.rowCount === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Feature not found',
          },
        });
      }

      return res.json({
        success: true,
        data: {
          feature: updateResult.rows[0],
        },
        message: 'Feature updated successfully',
      });
    } catch (error) {
      console.error('[System] Error updating feature:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update feature',
          details: error.message,
        },
      });
    } finally {
      client.release();
    }
  })
);

/**
 * DELETE /api/system/features/:id
 * Deactivate or delete a feature depending on usage.
 */
router.delete(
  '/features/:id',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
      await ensureSubscriptionSchema(client);

      const usageResult = await client.query(
        `SELECT COUNT(*) as count FROM public.plan_feature_mappings WHERE feature_id = $1`,
        [id]
      );
      const usageCount = parseInt(usageResult.rows[0]?.count || '0', 10);

      if (usageCount > 0) {
        await client.query(
          `UPDATE public.plan_features
           SET is_active = false, updated_at = NOW()
           WHERE id = $1`,
          [id]
        );
        return res.json({
          success: true,
          message: 'Feature deactivated (it is still used in plans)',
        });
      }

      const deleteResult = await client.query(
        `DELETE FROM public.plan_features WHERE id = $1`,
        [id]
      );

      if (deleteResult.rowCount === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Feature not found',
          },
        });
      }

      return res.json({
        success: true,
        message: 'Feature deleted successfully',
      });
    } catch (error) {
      console.error('[System] Error deleting feature:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete feature',
          details: error.message,
        },
      });
    } finally {
      client.release();
    }
  })
);

/**
 * GET /api/system/tickets/summary
 * Support ticket stats + recent tickets for the widget.
 */
router.get(
  '/tickets/summary',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (_req, res) => {
    const client = await pool.connect();
    try {
      await ensureSupportTicketSchema(client);

      const statsResult = await client.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'open') as open,
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
          COUNT(*) FILTER (WHERE status = 'resolved') as resolved
        FROM public.support_tickets
      `);

      const todayResult = await client.query(`
        SELECT
          COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE) as new_today,
          COUNT(*) FILTER (WHERE resolved_at::date = CURRENT_DATE) as resolved_today
        FROM public.support_tickets
      `);

      const resolutionResult = await client.query(`
        SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600.0) as avg_hours
        FROM public.support_tickets
        WHERE resolved_at IS NOT NULL
      `);

      const statsRow = statsResult.rows[0] || {};
      const todayRow = todayResult.rows[0] || {};
      const resolutionRow = resolutionResult.rows[0] || {};

      const stats = {
        total: Number(statsRow.total || 0),
        open: Number(statsRow.open || 0),
        inProgress: Number(statsRow.in_progress || 0),
        resolved: Number(statsRow.resolved || 0),
        avgResolutionTime: Number(resolutionRow.avg_hours || 0),
        newToday: Number(todayRow.new_today || 0),
        resolvedToday: Number(todayRow.resolved_today || 0),
      };

      const recentResult = await client.query(
        `SELECT
           id,
           ticket_number,
           title,
           status,
           priority,
           created_at,
           category
         FROM public.support_tickets
         ORDER BY created_at DESC
         LIMIT 20`
      );

      return res.json({
        success: true,
        data: {
          stats,
          recentTickets: recentResult.rows || [],
        },
      });
    } catch (error) {
      console.error('[System] Error fetching ticket summary:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to load support ticket data',
          details: error.message,
        },
      });
    } finally {
      client.release();
    }
  })
);

/**
 * GET /api/system/tickets
 * List all support tickets with optional filtering
 */
router.get(
  '/tickets',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { status, priority, category, limit = 50, offset = 0 } = req.query;
    const client = await pool.connect();
    try {
      await ensureSupportTicketSchema(client);

      let query = 'SELECT * FROM public.support_tickets WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (status) {
        query += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (priority) {
        query += ` AND priority = $${paramIndex}`;
        params.push(priority);
        paramIndex++;
      }

      if (category) {
        query += ` AND category = $${paramIndex}`;
        params.push(category);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(parseInt(limit, 10), parseInt(offset, 10));

      const result = await client.query(query, params);

      return res.json({
        success: true,
        data: {
          tickets: result.rows || [],
        },
      });
    } catch (error) {
      console.error('[System] Error fetching tickets:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to load tickets',
          details: error.message,
        },
      });
    } finally {
      client.release();
    }
  })
);

/**
 * POST /api/system/tickets/public
 * Create a new support ticket (accessible to all authenticated users)
 * This endpoint allows any user to create tickets with console logs and error details
 * NOTE: This route MUST be defined BEFORE /tickets/:id to avoid route conflicts
 */
router.post(
  '/tickets/public',
  authenticate,
  asyncHandler(async (req, res) => {
    const { 
      title, 
      description, 
      priority = 'medium', 
      category = 'general',
      console_logs,
      error_details,
      browser_info,
      page_url,
      department
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'title and description are required',
        },
      });
    }

    const validPriorities = ['low', 'medium', 'high'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `priority must be one of: ${validPriorities.join(', ')}`,
        },
      });
    }

    const client = await pool.connect();
    try {
      await ensureSupportTicketSchema(client);

      // Get user info from authenticated request
      const userId = req.user?.id || null;
      const agencyId = req.user?.agencyId || null;

      // Determine department escalation based on priority and category
      let assignedDepartment = department || null;
      if (!assignedDepartment && agencyId) {
        // Auto-assign department based on category and priority
        assignedDepartment = await determineTicketDepartment(client, agencyId, category, priority);
      }

      // Generate unique ticket number
      const ticketNumberResult = await client.query(
        'SELECT COUNT(*) as count FROM public.support_tickets'
      );
      const count = parseInt(ticketNumberResult.rows[0]?.count || '0', 10);
      const ticketNumber = `TKT-${String(count + 1).padStart(6, '0')}`;

      const result = await client.query(
        `INSERT INTO public.support_tickets 
         (ticket_number, title, description, status, priority, category, 
          user_id, agency_id, department, console_logs, error_details, 
          browser_info, page_url, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
         RETURNING *`,
        [
          ticketNumber, 
          title, 
          description, 
          'open', // Always start as open for user-created tickets
          priority, 
          category,
          userId,
          agencyId,
          assignedDepartment,
          console_logs ? JSON.stringify(console_logs) : null,
          error_details ? JSON.stringify(error_details) : null,
          browser_info ? JSON.stringify(browser_info) : null,
          page_url || null
        ]
      );

      return res.status(201).json({
        success: true,
        data: {
          ticket: result.rows[0],
        },
        message: 'Ticket created successfully',
      });
    } catch (error) {
      console.error('[System] Error creating ticket:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create ticket',
          details: error.message,
        },
      });
    } finally {
      client.release();
    }
  })
);

/**
 * GET /api/system/tickets/:id
 * Get a single ticket by ID
 * NOTE: This route MUST be defined AFTER /tickets/public to avoid route conflicts
 */
router.get(
  '/tickets/:id',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
      await ensureSupportTicketSchema(client);

      const result = await client.query(
        'SELECT * FROM public.support_tickets WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Ticket not found',
          },
        });
      }

      return res.json({
        success: true,
        data: {
          ticket: result.rows[0],
        },
      });
    } catch (error) {
      console.error('[System] Error fetching ticket:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to load ticket',
          details: error.message,
        },
      });
    } finally {
      client.release();
    }
  })
);

/**
 * POST /api/system/tickets
 * Create a new support ticket (super admin only - for admin panel)
 */
router.post(
  '/tickets',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { 
      title, 
      description, 
      priority = 'medium', 
      category = 'general', 
      status = 'open',
      user_id,
      agency_id,
      department,
      console_logs,
      error_details,
      browser_info,
      page_url
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'title and description are required',
        },
      });
    }

    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    const validPriorities = ['low', 'medium', 'high'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `status must be one of: ${validStatuses.join(', ')}`,
        },
      });
    }

    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `priority must be one of: ${validPriorities.join(', ')}`,
        },
      });
    }

    const client = await pool.connect();
    try {
      await ensureSupportTicketSchema(client);

      // Generate unique ticket number
      const ticketNumberResult = await client.query(
        'SELECT COUNT(*) as count FROM public.support_tickets'
      );
      const count = parseInt(ticketNumberResult.rows[0]?.count || '0', 10);
      const ticketNumber = `TKT-${String(count + 1).padStart(6, '0')}`;

      const result = await client.query(
        `INSERT INTO public.support_tickets 
         (ticket_number, title, description, status, priority, category, 
          user_id, agency_id, department, console_logs, error_details, 
          browser_info, page_url, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
         RETURNING *`,
        [
          ticketNumber, 
          title, 
          description, 
          status, 
          priority, 
          category,
          user_id || null,
          agency_id || null,
          department || null,
          console_logs ? JSON.stringify(console_logs) : null,
          error_details ? JSON.stringify(error_details) : null,
          browser_info ? JSON.stringify(browser_info) : null,
          page_url || null
        ]
      );

      return res.status(201).json({
        success: true,
        data: {
          ticket: result.rows[0],
        },
        message: 'Ticket created successfully',
      });
    } catch (error) {
      console.error('[System] Error creating ticket:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create ticket',
          details: error.message,
        },
      });
    } finally {
      client.release();
    }
  })
);

/**
 * PUT /api/system/tickets/:id
 * Update a support ticket
 */
router.put(
  '/tickets/:id',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description, status, priority, category } = req.body;

    const client = await pool.connect();
    try {
      await ensureSupportTicketSchema(client);

      // Validate status if provided
      if (status) {
        const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: `status must be one of: ${validStatuses.join(', ')}`,
            },
          });
        }
      }

      // Validate priority if provided
      if (priority) {
        const validPriorities = ['low', 'medium', 'high'];
        if (!validPriorities.includes(priority)) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: `priority must be one of: ${validPriorities.join(', ')}`,
            },
          });
        }
      }

      const updates = [];
      const params = [];
      let paramIndex = 1;

      if (title !== undefined) {
        updates.push(`title = $${paramIndex}`);
        params.push(title);
        paramIndex++;
      }

      if (description !== undefined) {
        updates.push(`description = $${paramIndex}`);
        params.push(description);
        paramIndex++;
      }

      if (status !== undefined) {
        updates.push(`status = $${paramIndex}`);
        params.push(status);
        paramIndex++;

        // Set resolved_at if status is resolved
        if (status === 'resolved') {
          updates.push(`resolved_at = NOW()`);
        } else if (status !== 'resolved') {
          updates.push(`resolved_at = NULL`);
        }
      }

      if (priority !== undefined) {
        updates.push(`priority = $${paramIndex}`);
        params.push(priority);
        paramIndex++;
      }

      if (category !== undefined) {
        updates.push(`category = $${paramIndex}`);
        params.push(category);
        paramIndex++;
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'No fields to update',
          },
        });
      }

      updates.push(`updated_at = NOW()`);
      params.push(id);

      const query = `
        UPDATE public.support_tickets
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(query, params);

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Ticket not found',
          },
        });
      }

      return res.json({
        success: true,
        data: {
          ticket: result.rows[0],
        },
        message: 'Ticket updated successfully',
      });
    } catch (error) {
      console.error('[System] Error updating ticket:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update ticket',
          details: error.message,
        },
      });
    } finally {
      client.release();
    }
  })
);

/**
 * DELETE /api/system/tickets/:id
 * Delete a support ticket
 */
router.delete(
  '/tickets/:id',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
      await ensureSupportTicketSchema(client);

      const result = await client.query(
        'DELETE FROM public.support_tickets WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Ticket not found',
          },
        });
      }

      return res.json({
        success: true,
        message: 'Ticket deleted successfully',
      });
    } catch (error) {
      console.error('[System] Error deleting ticket:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete ticket',
          details: error.message,
        },
      });
    } finally {
      client.release();
    }
  })
);

/**
 * POST /api/system/agencies/:id/export-backup
 * Export all agency database tables to CSV and create ZIP archive
 * Requires super_admin role
 * NOTE: This route MUST be defined BEFORE /agencies/:id to avoid route conflicts
 */
router.post(
  '/agencies/:id/export-backup',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { exportAgencyToCSV } = require('../services/agencyExportService');
    const client = await pool.connect();

    try {
      // Get agency information
      const agencyResult = await client.query(
        'SELECT id, name, database_name FROM public.agencies WHERE id = $1',
        [id]
      );

      if (agencyResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'AGENCY_NOT_FOUND',
            message: 'Agency not found',
          },
        });
      }

      const agency = agencyResult.rows[0];
      let databaseName = agency.database_name;

      // If database_name is not set, try to discover it
      if (!databaseName) {
        console.log(`[API] Agency ${id} has no database_name, attempting discovery...`);
        const { discoverAndUpdateAgencyDatabase } = require('../services/agencyDatabaseDiscovery');
        const discoveredDb = await discoverAndUpdateAgencyDatabase(id);
        
        if (discoveredDb) {
          databaseName = discoveredDb;
          console.log(`[API] Discovered database ${databaseName} for agency ${id}`);
        } else {
          return res.status(400).json({
            success: false,
            error: {
              code: 'NO_DATABASE',
              message: 'Agency database not found. This agency may not have a database assigned.',
              details: `Agency "${agency.name}" (${id}) does not have a database_name set and no matching database could be found.`,
            },
          });
        }
      }

      // Verify database exists before attempting export
      try {
        const { parseDatabaseUrl } = require('../utils/poolManager');
        const { host, port, user, password } = parseDatabaseUrl();
        const { Pool } = require('pg');
        const postgresPool = new Pool({
          host,
          port,
          user,
          password,
          database: 'postgres',
        });
        const postgresClient = await postgresPool.connect();
        
        try {
          const dbCheck = await postgresClient.query(
            'SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) as exists',
            [databaseName]
          );
          
          if (!dbCheck.rows[0].exists) {
            return res.status(400).json({
              success: false,
              error: {
                code: 'DATABASE_NOT_EXISTS',
                message: `Database "${databaseName}" does not exist`,
                details: `The database for agency "${agency.name}" was not found. It may have been deleted.`,
              },
            });
          }
        } finally {
          postgresClient.release();
          await postgresPool.end();
        }
      } catch (checkError) {
        console.error('[API] Error checking database existence:', checkError);
        // Continue with export attempt - connection error will be caught below
      }

      // Export to ZIP
      console.log(`[API] Exporting backup for agency: ${agency.name} (${id}), database: ${databaseName}`);
      const zipBuffer = await exportAgencyToCSV(id, databaseName);

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const safeName = agency.name.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `agency_backup_${safeName}_${timestamp}.zip`;

      // Set response headers
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', zipBuffer.length);

      // Send ZIP file
      res.send(zipBuffer);
      console.log(`[API] ✅ Backup exported successfully: ${filename}`);
    } catch (error) {
      console.error('[API] Error exporting agency backup:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'EXPORT_FAILED',
          message: 'Failed to export agency backup',
          details: error.message,
        },
      });
    } finally {
      client.release();
    }
  })
);

/**
 * DELETE /api/system/agencies/:id
 * Delete an agency completely (database and records)
 * Requires super_admin role
 * NOTE: This route MUST be defined BEFORE /agencies/:id to avoid route conflicts
 */
router.delete(
  '/agencies/:id',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { deleteAgency, checkAgencyDeletionSafety } = require('../services/agencyDeleteService');

    try {
      // Check deletion safety (optional - for warnings)
      const safetyCheck = await checkAgencyDeletionSafety(id);

      // Delete the agency
      console.log(`[API] Deleting agency: ${id}`);
      const result = await deleteAgency(id);

      return res.json({
        success: true,
        message: result.message,
        data: {
          agencyId: id,
          agencyName: result.agencyName,
          databaseName: result.databaseName,
          warnings: safetyCheck.warnings || [],
        },
      });
    } catch (error) {
      console.error('[API] Error deleting agency:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: 'Failed to delete agency',
          details: error.message,
        },
      });
    }
  })
);

/**
 * GET /api/system/agencies/:id
 * Get detailed information about a specific agency
 */
router.get(
  '/agencies/:id',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();

    try {
      const agencyResult = await client.query(
        `SELECT 
           id,
           name,
           domain,
           subscription_plan,
           max_users,
           is_active,
           created_at
         FROM public.agencies
         WHERE id = $1`,
        [id]
      );

      if (agencyResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Agency not found',
          },
        });
      }

      const agency = agencyResult.rows[0];

      // Get user count
      let userCount = 0;
      try {
        const userCountResult = await client.query(
          'SELECT COUNT(*) as count FROM public.profiles WHERE agency_id = $1',
          [id]
        );
        userCount = parseInt(userCountResult.rows[0]?.count || '0', 10);
      } catch (error) {
        if (error.code !== '42P01') {
          console.warn('[System] Failed to count users:', error.message);
        }
      }

      // Get project count
      let projectCount = 0;
      try {
        const projectCountResult = await client.query(
          'SELECT COUNT(*) as count FROM public.projects WHERE agency_id = $1',
          [id]
        );
        projectCount = parseInt(projectCountResult.rows[0]?.count || '0', 10);
      } catch (error) {
        if (error.code !== '42P01') {
          console.warn('[System] Failed to count projects:', error.message);
        }
      }

      // Get invoice count
      let invoiceCount = 0;
      try {
        const invoiceCountResult = await client.query(
          'SELECT COUNT(*) as count FROM public.invoices WHERE agency_id = $1',
          [id]
        );
        invoiceCount = parseInt(invoiceCountResult.rows[0]?.count || '0', 10);
      } catch (error) {
        if (error.code !== '42P01') {
          console.warn('[System] Failed to count invoices:', error.message);
        }
      }

      return res.json({
        success: true,
        data: {
          agency: {
            ...agency,
            user_count: userCount,
            project_count: projectCount,
            invoice_count: invoiceCount,
          },
        },
      });
    } catch (error) {
      console.error('[System] Error fetching agency details:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to load agency details',
          details: error.message,
        },
      });
    } finally {
      client.release();
    }
  })
);

/**
 * PUT /api/system/agencies/:id
 * Update agency information (including activate/deactivate)
 */
router.put(
  '/agencies/:id',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, domain, subscription_plan, max_users, is_active } = req.body;
    const client = await pool.connect();

    try {
      const updates = [];
      const params = [];
      let paramIndex = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramIndex}`);
        params.push(name);
        paramIndex++;
      }

      if (domain !== undefined) {
        updates.push(`domain = $${paramIndex}`);
        params.push(domain);
        paramIndex++;
      }

      if (subscription_plan !== undefined) {
        updates.push(`subscription_plan = $${paramIndex}`);
        params.push(subscription_plan);
        paramIndex++;
      }

      if (max_users !== undefined) {
        updates.push(`max_users = $${paramIndex}`);
        params.push(max_users);
        paramIndex++;
      }

      if (is_active !== undefined) {
        updates.push(`is_active = $${paramIndex}`);
        params.push(is_active);
        paramIndex++;
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'No fields to update',
          },
        });
      }

      params.push(id);

      const query = `
        UPDATE public.agencies
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(query, params);

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Agency not found',
          },
        });
      }

      return res.json({
        success: true,
        data: {
          agency: result.rows[0],
        },
        message: 'Agency updated successfully',
      });
    } catch (error) {
      console.error('[System] Error updating agency:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update agency',
          details: error.message,
        },
      });
    } finally {
      client.release();
    }
  })
);

/**
 * GET /api/system/agencies/:id/users
 * Get all users for a specific agency
 */
router.get(
  '/agencies/:id/users',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();

    try {
      // Verify agency exists
      const agencyCheck = await client.query(
        'SELECT id FROM public.agencies WHERE id = $1',
        [id]
      );

      if (agencyCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Agency not found',
          },
        });
      }

      // Get users
      let users = [];
      try {
        const usersResult = await client.query(
          `SELECT 
             id,
             email,
             full_name,
             is_active,
             created_at
           FROM public.profiles
           WHERE agency_id = $1
           ORDER BY created_at DESC`,
          [id]
        );
        users = usersResult.rows || [];
      } catch (error) {
        if (error.code !== '42P01') {
          console.warn('[System] Failed to fetch users:', error.message);
        }
      }

      return res.json({
        success: true,
        data: {
          users,
        },
      });
    } catch (error) {
      console.error('[System] Error fetching agency users:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to load agency users',
          details: error.message,
        },
      });
    } finally {
      client.release();
    }
  })
);

/**
 * GET /api/system/agencies/:id/usage
 * Get usage statistics for a specific agency
 */
router.get(
  '/agencies/:id/usage',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();

    try {
      // Verify agency exists
      const agencyCheck = await client.query(
        'SELECT id FROM public.agencies WHERE id = $1',
        [id]
      );

      if (agencyCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Agency not found',
          },
        });
      }

      const safeCountQuery = async (sql, params = []) => {
        try {
          const result = await client.query(sql, params);
          return parseInt(result.rows[0]?.count || '0', 10);
        } catch (error) {
          if (error.code !== '42P01') {
            console.warn('[System] Usage query failed:', error.message);
          }
          return 0;
        }
      };

      const [userCount, projectCount, invoiceCount, clientCount, taskCount] =
        await Promise.all([
          safeCountQuery('SELECT COUNT(*) as count FROM public.profiles WHERE agency_id = $1', [id]),
          safeCountQuery('SELECT COUNT(*) as count FROM public.projects WHERE agency_id = $1', [id]),
          safeCountQuery('SELECT COUNT(*) as count FROM public.invoices WHERE agency_id = $1', [id]),
          safeCountQuery('SELECT COUNT(*) as count FROM public.clients WHERE agency_id = $1', [id]),
          safeCountQuery('SELECT COUNT(*) as count FROM public.tasks WHERE agency_id = $1', [id]),
        ]);

      return res.json({
        success: true,
        data: {
          usage: {
            users: userCount,
            projects: projectCount,
            invoices: invoiceCount,
            clients: clientCount,
            tasks: taskCount,
          },
        },
      });
    } catch (error) {
      console.error('[System] Error fetching agency usage:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to load agency usage',
          details: error.message,
        },
      });
    } finally {
      client.release();
    }
  })
);

/**
 * OPTIONS /api/system/usage/realtime
 * Handle CORS preflight requests
 */
router.options('/usage/realtime', (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  res.sendStatus(204);
});

/**
 * GET /api/system/usage/realtime
 * Get real-time usage statistics from audit logs and active sessions
 */
router.get(
  '/usage/realtime',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    // Set CORS headers explicitly
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
      res.setHeader('Access-Control-Max-Age', '86400');
    }

    const client = await pool.connect();
    try {
      // Get active users (users who have activity in last 15 minutes)
      let activeUsers = 0;
      let recentActions = 0;
      let totalActionsToday = 0;
      let peakHour = '00:00';

      try {
        // Check if audit_logs table exists
        const tableCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'audit_logs'
          )
        `);

        if (tableCheck.rows[0]?.exists) {
          // Active users (distinct users with activity in last 15 minutes)
          const activeUsersResult = await client.query(`
            SELECT COUNT(DISTINCT user_id) as count
            FROM public.audit_logs
            WHERE created_at > NOW() - INTERVAL '15 minutes'
            AND user_id IS NOT NULL
          `);
          activeUsers = parseInt(activeUsersResult.rows[0]?.count || '0', 10);

          // Recent actions (last 5 minutes)
          const recentActionsResult = await client.query(`
            SELECT COUNT(*) as count
            FROM public.audit_logs
            WHERE created_at > NOW() - INTERVAL '5 minutes'
          `);
          recentActions = parseInt(recentActionsResult.rows[0]?.count || '0', 10);

          // Total actions today
          const todayActionsResult = await client.query(`
            SELECT COUNT(*) as count
            FROM public.audit_logs
            WHERE created_at::date = CURRENT_DATE
          `);
          totalActionsToday = parseInt(todayActionsResult.rows[0]?.count || '0', 10);

          // Peak hour (hour with most activity today)
          const peakHourResult = await client.query(`
            SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as count
            FROM public.audit_logs
            WHERE created_at::date = CURRENT_DATE
            GROUP BY EXTRACT(HOUR FROM created_at)
            ORDER BY count DESC
            LIMIT 1
          `);
          if (peakHourResult.rows.length > 0) {
            const hour = parseInt(peakHourResult.rows[0].hour || '0', 10);
            peakHour = `${String(hour).padStart(2, '0')}:00`;
          }
        }
      } catch (error) {
        if (error.code !== '42P01') {
          console.warn('[System] Failed to query audit logs:', error.message);
        }
      }

      // Active sessions (estimate based on unique user_ids in last hour)
      let activeSessions = 0;
      try {
        const sessionsResult = await client.query(`
          SELECT COUNT(DISTINCT user_id) as count
          FROM public.audit_logs
          WHERE created_at > NOW() - INTERVAL '1 hour'
          AND user_id IS NOT NULL
        `);
        activeSessions = parseInt(sessionsResult.rows[0]?.count || '0', 10);
      } catch (error) {
        if (error.code !== '42P01') {
          console.warn('[System] Failed to count sessions:', error.message);
        }
      }

      // Recent activity (last 10 actions)
      let recentActivity = [];
      try {
        const activityResult = await client.query(`
          SELECT 
            id,
            table_name as resource_type,
            action as action_type,
            created_at as timestamp,
            user_id
          FROM public.audit_logs
          WHERE user_id IS NOT NULL
          ORDER BY created_at DESC
          LIMIT 10
        `);
        recentActivity = activityResult.rows.map(row => ({
          id: row.id,
          action_type: row.action_type,
          resource_type: row.resource_type,
          timestamp: row.timestamp,
          user_count: 1, // Each row represents one user action
        }));
      } catch (error) {
        if (error.code !== '42P01') {
          console.warn('[System] Failed to fetch recent activity:', error.message);
        }
      }

      // Average response time (synthetic for now, can be enhanced with actual metrics)
      const avgResponseTime = 75 + Math.random() * 25; // 75-100ms range

      return res.json({
        success: true,
        data: {
          metrics: {
            activeUsers,
            activeSessions,
            recentActions,
            peakHour,
            totalActionsToday,
            avgResponseTime,
          },
          recentActivity,
        },
      });
    } catch (error) {
      // Set CORS headers even on error
      const origin = req.headers.origin;
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
      }

      console.error('[System] Error fetching real-time usage:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to load real-time usage data',
          details: error.message,
        },
      });
    } finally {
      client.release();
    }
  })
);

/**
 * POST /api/system/agencies/repair-database-names
 * Discover and update database_name for all agencies that don't have it set
 * Requires super_admin role
 */
router.post(
  '/agencies/repair-database-names',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { discoverAndUpdateAgencyDatabase } = require('../services/agencyDatabaseDiscovery');
    const client = await pool.connect();

    try {
      // Get all agencies without database_name
      const agenciesResult = await client.query(
        'SELECT id, name, domain FROM public.agencies WHERE database_name IS NULL OR database_name = \'\''
      );

      const agencies = agenciesResult.rows;
      console.log(`[Repair] Found ${agencies.length} agencies without database_name`);

      const results = [];
      for (const agency of agencies) {
        try {
          const discoveredDb = await discoverAndUpdateAgencyDatabase(agency.id);
          results.push({
            agencyId: agency.id,
            agencyName: agency.name,
            success: !!discoveredDb,
            databaseName: discoveredDb || null,
          });
        } catch (error) {
          console.error(`[Repair] Error processing agency ${agency.id}:`, error);
          results.push({
            agencyId: agency.id,
            agencyName: agency.name,
            success: false,
            error: error.message,
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;

      return res.json({
        success: true,
        message: `Repaired ${successCount} of ${agencies.length} agencies`,
        data: {
          total: agencies.length,
          successful: successCount,
          failed: failCount,
          results,
        },
      });
    } catch (error) {
      console.error('[Repair] Error repairing database names:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'REPAIR_FAILED',
          message: 'Failed to repair database names',
          details: error.message,
        },
      });
    } finally {
      client.release();
    }
  })
);

/**
 * Ensure system_settings table exists
 */
async function ensureSystemSettingsSchema(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.system_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      system_name TEXT NOT NULL DEFAULT 'BuildFlow ERP',
      system_tagline TEXT,
      system_description TEXT,
      logo_url TEXT,
      favicon_url TEXT,
      login_logo_url TEXT,
      email_logo_url TEXT,
      meta_title TEXT,
      meta_description TEXT,
      meta_keywords TEXT,
      og_image_url TEXT,
      og_title TEXT,
      og_description TEXT,
      twitter_card_type TEXT DEFAULT 'summary_large_image',
      twitter_site TEXT,
      twitter_creator TEXT,
      google_analytics_id TEXT,
      google_tag_manager_id TEXT,
      facebook_pixel_id TEXT,
      custom_tracking_code TEXT,
      ad_network_enabled BOOLEAN DEFAULT false,
      ad_network_code TEXT,
      ad_placement_header BOOLEAN DEFAULT false,
      ad_placement_sidebar BOOLEAN DEFAULT false,
      ad_placement_footer BOOLEAN DEFAULT false,
      support_email TEXT,
      support_phone TEXT,
      support_address TEXT,
      facebook_url TEXT,
      twitter_url TEXT,
      linkedin_url TEXT,
      instagram_url TEXT,
      youtube_url TEXT,
      terms_of_service_url TEXT,
      privacy_policy_url TEXT,
      cookie_policy_url TEXT,
      maintenance_mode BOOLEAN DEFAULT false,
      maintenance_message TEXT,
      default_language TEXT DEFAULT 'en',
      default_timezone TEXT DEFAULT 'UTC',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_by UUID,
      updated_by UUID
    )
  `);

  // Note: We'll enforce single record via application logic instead of a unique index
  // PostgreSQL doesn't support unique indexes on constant expressions

  // Drop foreign key constraints if they exist (users from agency DBs may not exist in main DB)
  try {
    await client.query(`
      ALTER TABLE public.system_settings 
      DROP CONSTRAINT IF EXISTS system_settings_created_by_fkey,
      DROP CONSTRAINT IF EXISTS system_settings_updated_by_fkey
    `);
  } catch (err) {
    // Table might not exist yet or constraints might not exist, that's okay
    console.warn('[System] Could not drop foreign key constraints (this is okay if table is new):', err.message);
  }

  // Create updated_at trigger function if it doesn't exist
  await client.query(`
    CREATE OR REPLACE FUNCTION public.update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = now();
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  // Create trigger for updated_at
  await client.query(`
    DROP TRIGGER IF EXISTS update_system_settings_updated_at ON public.system_settings;
    CREATE TRIGGER update_system_settings_updated_at
        BEFORE UPDATE ON public.system_settings
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
  `);

  // Insert default system settings if none exist
  await client.query(`
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM public.system_settings LIMIT 1) THEN
            INSERT INTO public.system_settings (system_name, system_tagline, system_description, created_by, updated_by)
            VALUES ('BuildFlow ERP', 'Complete Business Management Solution', 'A comprehensive ERP system for managing your business operations', NULL, NULL);
        END IF;
    END $$;
  `);
}

/**
 * GET /api/system/settings
 * Get system settings (super admin only)
 */
router.get(
  '/settings',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const client = await pool.connect();
    try {
      await ensureSystemSettingsSchema(client);

      const result = await client.query(
        `SELECT * FROM public.system_settings ORDER BY created_at DESC LIMIT 1`
      );

      if (result.rows.length === 0) {
        // Create default settings if none exist
        // Don't set created_by/updated_by in GET endpoint as we don't have user context
        const insertResult = await client.query(
          `INSERT INTO public.system_settings (system_name, system_tagline, system_description, created_by, updated_by)
           VALUES ('BuildFlow ERP', 'Complete Business Management Solution', 'A comprehensive ERP system for managing your business operations', NULL, NULL)
           RETURNING *`
        );
        return res.json({
          success: true,
          data: {
            settings: insertResult.rows[0],
          },
        });
      }

      return res.json({
        success: true,
        data: {
          settings: result.rows[0],
        },
      });
    } catch (error) {
      console.error('[System] Error fetching system settings:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch system settings',
          details: error.message,
        },
      });
    } finally {
      client.release();
    }
  })
);

/**
 * PUT /api/system/settings
 * Update system settings (super admin only)
 * 
 * Note: This endpoint works for super admins from both main database and agency databases.
 * The user ID might not exist in the main database's users table if they're from an agency database,
 * so we handle created_by/updated_by fields gracefully by checking user existence first.
 */
router.put(
  '/settings',
  authenticate,
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const updates = req.body || {};

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'No fields to update',
        },
      });
    }

    const client = await pool.connect();
    try {
      await ensureSystemSettingsSchema(client);

      // Build dynamic update query
      const allowedFields = [
        'system_name', 'system_tagline', 'system_description',
        'logo_url', 'favicon_url', 'login_logo_url', 'email_logo_url',
        'meta_title', 'meta_description', 'meta_keywords',
        'og_image_url', 'og_title', 'og_description',
        'twitter_card_type', 'twitter_site', 'twitter_creator',
        'google_analytics_id', 'google_tag_manager_id', 'facebook_pixel_id', 'custom_tracking_code',
        'ad_network_enabled', 'ad_network_code',
        'ad_placement_header', 'ad_placement_sidebar', 'ad_placement_footer',
        'support_email', 'support_phone', 'support_address',
        'facebook_url', 'twitter_url', 'linkedin_url', 'instagram_url', 'youtube_url',
        'terms_of_service_url', 'privacy_policy_url', 'cookie_policy_url',
        'maintenance_mode', 'maintenance_message',
        'default_language', 'default_timezone'
      ];

      const updateFields = [];
      const params = [];
      let paramIndex = 1;

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          updateFields.push(`${field} = $${paramIndex}`);
          params.push(updates[field]);
          paramIndex++;
        }
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'No valid fields to update',
          },
        });
      }

      // Add updated_by (updated_at is handled by trigger)
      // Note: Super admins from agency databases may not exist in main DB's users table.
      // We check if the user exists in main DB before setting updated_by to avoid foreign key errors.
      // If user doesn't exist in main DB, we leave updated_by as NULL (which is fine).
      if (userId) {
        try {
          const userCheck = await client.query(
            `SELECT id FROM public.users WHERE id = $1 LIMIT 1`,
            [userId]
          );
          if (userCheck.rows.length > 0) {
            // User exists in main DB, safe to set updated_by
            updateFields.push(`updated_by = $${paramIndex}`);
            params.push(userId);
            paramIndex++;
          }
          // If user doesn't exist in main DB (e.g., from agency DB), we skip setting updated_by
          // This is expected behavior and not an error
        } catch (err) {
          // If users table doesn't exist or query fails, skip setting updated_by
          // This shouldn't happen in normal operation, but we handle it gracefully
          console.warn('[System] Could not verify user in main DB, skipping updated_by:', err.message);
        }
      }

      // Ensure a record exists first (insert default if needed)
      // First, check if any record exists
      let checkResult = await client.query(
        `SELECT id FROM public.system_settings ORDER BY created_at DESC LIMIT 1`
      );

      let settingsId;
      
      if (checkResult.rows.length === 0) {
        // Insert default record first
        // Check if user exists in main DB before setting foreign keys.
        // Super admins from agency databases may not exist in main DB, which is fine.
        let createdBy = null;
        let updatedBy = null;
        
        if (userId) {
          try {
            const userCheck = await client.query(
              `SELECT id FROM public.users WHERE id = $1 LIMIT 1`,
              [userId]
            );
            if (userCheck.rows.length > 0) {
              // User exists in main DB, safe to set created_by/updated_by
              createdBy = userId;
              updatedBy = userId;
            }
            // If user doesn't exist in main DB, we leave created_by/updated_by as NULL
            // This is expected for super admins from agency databases
          } catch (err) {
            // If users table doesn't exist or query fails, leave as null
            // This shouldn't happen in normal operation, but we handle it gracefully
            console.warn('[System] Could not verify user in main DB for insert, leaving created_by/updated_by as null:', err.message);
          }
        }
        
        const insertResult = await client.query(
          `INSERT INTO public.system_settings (system_name, system_tagline, system_description, created_by, updated_by)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          ['BuildFlow ERP', 'Complete Business Management Solution', 'A comprehensive ERP system for managing your business operations', createdBy, updatedBy]
        );
        settingsId = insertResult.rows[0].id;
      } else {
        settingsId = checkResult.rows[0].id;
      }

      // Update existing settings using the id
      // Note: updated_at is set via trigger, so we don't need to include it in params
      const updateQuery = `UPDATE public.system_settings
         SET ${updateFields.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`;
      
      const result = await client.query(
        updateQuery,
        [...params, settingsId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'System settings not found',
          },
        });
      }

      return res.json({
        success: true,
        data: {
          settings: result.rows[0],
        },
        message: 'System settings updated successfully',
      });
    } catch (error) {
      console.error('[System] Error updating system settings:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update system settings',
          details: error.message,
        },
      });
    } finally {
      client.release();
    }
  })
);

module.exports = router;


