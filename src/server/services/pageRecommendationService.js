/**
 * Page Recommendation Service
 * Provides intelligent page recommendations based on agency characteristics
 */

const { pool } = require('../config/database');

/**
 * Calculate recommendation score for a page based on criteria
 * @param {Object} rule - Recommendation rule from database
 * @param {Object} criteria - Agency criteria (industry, companySize, primaryFocus, businessGoals)
 * @returns {number} Score (0-100+)
 */
function calculateScore(rule, criteria) {
  let score = 0;
  const { industry, companySize, primaryFocus, businessGoals } = criteria;

  // Exact industry match: +10 points
  if (rule.industry && Array.isArray(rule.industry) && rule.industry.length > 0) {
    if (rule.industry.includes(industry)) {
      score += 10;
    }
  }

  // Exact company size match: +5 points
  if (rule.company_size && Array.isArray(rule.company_size) && rule.company_size.length > 0) {
    if (rule.company_size.includes(companySize)) {
      score += 5;
    }
  }

  // Exact primary focus match: +8 points
  if (rule.primary_focus && Array.isArray(rule.primary_focus) && rule.primary_focus.length > 0) {
    if (rule.primary_focus.includes(primaryFocus)) {
      score += 8;
    }
  }

  // Business goal matches: +6 points per matching goal
  if (rule.business_goals && Array.isArray(rule.business_goals) && rule.business_goals.length > 0) {
    if (businessGoals && Array.isArray(businessGoals)) {
      const matchingGoals = businessGoals.filter(goal => rule.business_goals.includes(goal));
      score += matchingGoals.length * 6;
    }
  }

  // Required flag: +20 points (always included)
  if (rule.is_required) {
    score += 20;
  }

  // Priority multiplier: score × (priority / 10)
  const priority = rule.priority || 5; // Default to 5 if not set
  const priorityMultiplier = priority / 10;
  score = score * priorityMultiplier;

  return Math.round(score * 100) / 100; // Round to 2 decimal places
}

/**
 * Get recommended pages based on agency criteria
 * @param {Object} criteria - Agency characteristics
 * @param {string} criteria.industry - Industry type
 * @param {string} criteria.companySize - Company size
 * @param {string} criteria.primaryFocus - Primary focus area
 * @param {string[]} criteria.businessGoals - Array of business goals
 * @returns {Promise<Array>} Array of recommended pages with scores and reasoning
 */
async function getRecommendedPages(criteria) {
  let client;
  try {
    // Get database connection
    if (!pool) {
      console.error('[Page Recommendations] Database pool is not initialized');
      throw new Error('Database connection pool is not available');
    }

    client = await pool.connect();
    
    if (!client) {
      console.error('[Page Recommendations] Failed to get database client');
      throw new Error('Failed to establish database connection');
    }

    const { industry, companySize, primaryFocus, businessGoals } = criteria;

    // First, check if tables exist
    let tableCheck;
    try {
      tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'page_catalog'
        ) as catalog_exists,
        EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'page_recommendation_rules'
        ) as rules_exists
      `);
    } catch (queryError) {
      console.error('[Page Recommendations] Error checking table existence:', queryError);
      // If we can't check tables, assume they don't exist and return empty
      if (client) {
        try {
          client.release();
        } catch (e) {
          // Ignore release errors
        }
      }
      return {
        all: [],
        categorized: {
          required: [],
          recommended: [],
          optional: []
        },
        summary: {
          total: 0,
          required: 0,
          recommended: 0,
          optional: 0
        }
      };
    }

    if (!tableCheck || !tableCheck.rows || tableCheck.rows.length === 0) {
      console.warn('[Page Recommendations] Could not check table existence');
      if (client) {
        try {
          client.release();
        } catch (e) {
          // Ignore release errors
        }
      }
      return {
        all: [],
        categorized: {
          required: [],
          recommended: [],
          optional: []
        },
        summary: {
          total: 0,
          required: 0,
          recommended: 0,
          optional: 0
        }
      };
    }

    const { catalog_exists, rules_exists } = tableCheck.rows[0];

    if (!catalog_exists) {
      console.warn('[Page Recommendations] page_catalog table does not exist');
      // Return empty recommendations if tables don't exist
      if (client) {
        try {
          client.release();
        } catch (e) {
          // Ignore release errors
        }
      }
      return {
        all: [],
        categorized: {
          required: [],
          recommended: [],
          optional: []
        },
        summary: {
          total: 0,
          required: 0,
          recommended: 0,
          optional: 0
        }
      };
    }

    // Check if page_recommendation_rules table exists, if not create it
    if (!rules_exists) {
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS public.page_recommendation_rules (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            page_id UUID NOT NULL REFERENCES public.page_catalog(id) ON DELETE CASCADE,
            industry TEXT[],
            company_size TEXT[],
            primary_focus TEXT[],
            business_goals TEXT[],
            priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
            is_required BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
          );
        `);
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_page_recommendation_rules_page_id ON public.page_recommendation_rules(page_id);
        `);
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_page_recommendation_rules_priority ON public.page_recommendation_rules(priority);
        `);
        console.log('[Page Recommendations] Created page_recommendation_rules table');
      } catch (createError) {
        // Table might already exist or there's a constraint issue, continue anyway
        console.warn('[Page Recommendations] Could not create page_recommendation_rules table:', createError.message);
      }
    }

    // Get all active pages with their recommendation rules
    let result;
    try {
      // Re-check if table exists after creation attempt
      const finalTableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'page_recommendation_rules'
        );
      `);
      
      const tableExists = finalTableCheck.rows[0]?.exists || false;
      
      if (tableExists) {
        // Table exists, use LEFT JOIN
        result = await client.query(`
          SELECT 
            pc.id,
            pc.path,
            pc.title,
            pc.description,
            pc.icon,
            pc.category,
            pc.base_cost,
            pc.requires_approval,
            pc.metadata,
            prr.id as rule_id,
            prr.industry,
            prr.company_size,
            prr.primary_focus,
            prr.business_goals,
            prr.priority,
            prr.is_required
          FROM public.page_catalog pc
          LEFT JOIN public.page_recommendation_rules prr ON pc.id = prr.page_id
          WHERE pc.is_active = true
          ORDER BY pc.category, pc.title
        `);
      } else {
        // Table doesn't exist, query without JOIN (fallback)
        result = await client.query(`
          SELECT 
            pc.id,
            pc.path,
            pc.title,
            pc.description,
            pc.icon,
            pc.category,
            pc.base_cost,
            pc.requires_approval,
            pc.metadata,
            NULL::UUID as rule_id,
            NULL::TEXT[] as industry,
            NULL::TEXT[] as company_size,
            NULL::TEXT[] as primary_focus,
            NULL::TEXT[] as business_goals,
            NULL::INTEGER as priority,
            NULL::BOOLEAN as is_required
          FROM public.page_catalog pc
          WHERE pc.is_active = true
          ORDER BY pc.category, pc.title
        `);
      }
    } catch (queryError) {
      console.error('[Page Recommendations] Error querying pages:', queryError);
      console.error('[Page Recommendations] Query error details:', {
        message: queryError.message,
        code: queryError.code,
        detail: queryError.detail
      });
      throw new Error(`Database query failed: ${queryError.message}`);
    }

    // Group pages by page_id (a page can have multiple rules)
    const pageMap = new Map();

    for (const row of result.rows) {
      const pageId = row.id;
      
      if (!pageMap.has(pageId)) {
        // Safely parse metadata JSONB field
        let metadata = {};
        if (row.metadata) {
          if (typeof row.metadata === 'string') {
            try {
              metadata = JSON.parse(row.metadata);
            } catch {
              metadata = {};
            }
          } else if (typeof row.metadata === 'object') {
            metadata = row.metadata;
          }
        }

        pageMap.set(pageId, {
          id: row.id,
          path: row.path,
          title: row.title,
          description: row.description,
          icon: row.icon,
          category: row.category,
          base_cost: parseFloat(row.base_cost) || 0,
          requires_approval: row.requires_approval || false,
          metadata: metadata,
          rules: [],
          score: 0,
          reasoning: []
        });
      }

      const page = pageMap.get(pageId);

      // Add rule if it exists
      if (row.rule_id) {
        // Safely parse JSONB/array fields
        let industry = row.industry;
        let company_size = row.company_size;
        let primary_focus = row.primary_focus;
        let business_goals = row.business_goals;

        // Handle JSONB/array fields - they might come as strings or arrays
        if (typeof industry === 'string') {
          try {
            industry = JSON.parse(industry);
          } catch {
            industry = industry ? [industry] : null;
          }
        }
        if (typeof company_size === 'string') {
          try {
            company_size = JSON.parse(company_size);
          } catch {
            company_size = company_size ? [company_size] : null;
          }
        }
        if (typeof primary_focus === 'string') {
          try {
            primary_focus = JSON.parse(primary_focus);
          } catch {
            primary_focus = primary_focus ? [primary_focus] : null;
          }
        }
        if (typeof business_goals === 'string') {
          try {
            business_goals = JSON.parse(business_goals);
          } catch {
            business_goals = business_goals ? [business_goals] : null;
          }
        }

        const rule = {
          id: row.rule_id,
          industry: industry,
          company_size: company_size,
          primary_focus: primary_focus,
          business_goals: business_goals,
          priority: row.priority || 5,
          is_required: row.is_required || false
        };
        page.rules.push(rule);

        // Calculate score for this rule
        const ruleScore = calculateScore(rule, { industry, companySize, primaryFocus, businessGoals });
        
        // Use highest score from all rules
        if (ruleScore > page.score) {
          page.score = ruleScore;
        }

        // Build reasoning (safely handle array fields)
        if (rule.is_required) {
          page.reasoning.push('Required for your agency type');
        }
        if (rule.industry && Array.isArray(rule.industry) && rule.industry.includes(industry)) {
          page.reasoning.push(`Recommended for ${industry} industry`);
        }
        if (rule.company_size && Array.isArray(rule.company_size) && rule.company_size.includes(companySize)) {
          page.reasoning.push(`Recommended for ${companySize} companies`);
        }
        if (rule.primary_focus && Array.isArray(rule.primary_focus) && rule.primary_focus.includes(primaryFocus)) {
          page.reasoning.push(`Matches your primary focus: ${primaryFocus}`);
        }
        if (rule.business_goals && Array.isArray(rule.business_goals) && businessGoals && Array.isArray(businessGoals)) {
          const matchingGoals = businessGoals.filter(goal => rule.business_goals.includes(goal));
          if (matchingGoals.length > 0) {
            page.reasoning.push(`Supports your goals: ${matchingGoals.join(', ')}`);
          }
        }
      } else {
        // Page has no rules, give it a base score of 1 (optional)
        if (page.score === 0) {
          page.score = 1;
        }
      }
    }

    // Convert map to array and sort by score (descending)
    const pages = Array.from(pageMap.values());
    
    // Sort by: required first, then by score descending
    pages.sort((a, b) => {
      const aRequired = a.rules.some(r => r.is_required);
      const bRequired = b.rules.some(r => r.is_required);
      
      if (aRequired && !bRequired) return -1;
      if (!aRequired && bRequired) return 1;
      
      return b.score - a.score;
    });

    // Categorize pages
    const categorized = {
      required: pages.filter(p => p.rules.some(r => r.is_required)),
      recommended: pages.filter(p => 
        !p.rules.some(r => r.is_required) && 
        p.score >= 10
      ),
      optional: pages.filter(p => 
        !p.rules.some(r => r.is_required) && 
        p.score < 10 && 
        p.score > 0
      )
    };

    // Release client before returning
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        // Ignore double release errors
        if (!releaseError.message.includes('already been released')) {
          console.error('[Page Recommendations] Error releasing client:', releaseError);
        }
      }
    }

    return {
      all: pages,
      categorized,
      summary: {
        total: pages.length,
        required: categorized.required.length,
        recommended: categorized.recommended.length,
        optional: categorized.optional.length
      }
    };
  } catch (error) {
    console.error('[Page Recommendations] Error in getRecommendedPages:', error);
    console.error('[Page Recommendations] Error stack:', error.stack);
    console.error('[Page Recommendations] Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      name: error.name
    });
    
    // Release client if it exists
    if (client) {
      try {
        // Check if client has already been released
        if (!client._ending && !client._released) {
          client.release();
        }
      } catch (releaseError) {
        // Ignore double release errors
        if (!releaseError.message.includes('already been released')) {
          console.error('[Page Recommendations] Error releasing client:', releaseError);
        }
      }
    }
    
    // Re-throw to be handled by route handler
    throw error;
  }
}

/**
 * Preview recommendations without saving
 * @param {Object} criteria - Agency characteristics
 * @returns {Promise<Object>} Preview of recommendations
 */
async function previewRecommendations(criteria) {
  return await getRecommendedPages(criteria);
}

module.exports = {
  getRecommendedPages,
  previewRecommendations,
  calculateScore
};

