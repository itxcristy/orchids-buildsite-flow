/**
 * Advanced CRM Schema Enhancements
 * 
 * Adds:
 * - lead_scores: Lead scoring system
 * - opportunities: Opportunity tracking
 * - email_tracking: Email integration tracking
 * - customer_segments: Customer segmentation
 */

/**
 * Ensure lead_scores table exists
 */
async function ensureLeadScoresTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.lead_scores (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
      agency_id UUID NOT NULL,
      score INTEGER DEFAULT 0,
      score_breakdown JSONB, -- {"source": 10, "engagement": 20, "company_size": 15, ...}
      last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_lead_scores_lead_id ON public.lead_scores(lead_id);
    CREATE INDEX IF NOT EXISTS idx_lead_scores_agency_id ON public.lead_scores(agency_id);
    CREATE INDEX IF NOT EXISTS idx_lead_scores_score ON public.lead_scores(score);
  `);
}

/**
 * Ensure opportunities table exists
 */
async function ensureOpportunitiesTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.opportunities (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      lead_id UUID REFERENCES public.leads(id),
      client_id UUID REFERENCES public.clients(id),
      opportunity_name VARCHAR(255) NOT NULL,
      description TEXT,
      stage VARCHAR(50) DEFAULT 'prospecting', -- prospecting, qualification, proposal, negotiation, closed_won, closed_lost
      probability INTEGER DEFAULT 0, -- 0-100
      expected_value DECIMAL(15,2),
      expected_close_date DATE,
      actual_close_date DATE,
      currency VARCHAR(10) DEFAULT 'INR',
      source VARCHAR(100),
      owner_id UUID REFERENCES public.users(id),
      created_by UUID REFERENCES public.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_opportunities_agency_id ON public.opportunities(agency_id);
    CREATE INDEX IF NOT EXISTS idx_opportunities_lead_id ON public.opportunities(lead_id);
    CREATE INDEX IF NOT EXISTS idx_opportunities_client_id ON public.opportunities(client_id);
    CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON public.opportunities(stage);
    CREATE INDEX IF NOT EXISTS idx_opportunities_owner_id ON public.opportunities(owner_id);
  `);
}

/**
 * Ensure email_tracking table exists
 */
async function ensureEmailTrackingTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.email_tracking (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      related_type VARCHAR(50), -- lead, client, opportunity, project
      related_id UUID,
      email_to TEXT NOT NULL,
      email_from TEXT NOT NULL,
      subject TEXT,
      body TEXT,
      status VARCHAR(50) DEFAULT 'sent', -- sent, delivered, opened, clicked, bounced, failed
      sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      opened_at TIMESTAMP WITH TIME ZONE,
      clicked_at TIMESTAMP WITH TIME ZONE,
      open_count INTEGER DEFAULT 0,
      click_count INTEGER DEFAULT 0,
      tracking_id VARCHAR(100) UNIQUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_email_tracking_agency_id ON public.email_tracking(agency_id);
    CREATE INDEX IF NOT EXISTS idx_email_tracking_related ON public.email_tracking(related_type, related_id);
    CREATE INDEX IF NOT EXISTS idx_email_tracking_tracking_id ON public.email_tracking(tracking_id);
    CREATE INDEX IF NOT EXISTS idx_email_tracking_status ON public.email_tracking(status);
  `);
}

/**
 * Ensure customer_segments table exists
 */
async function ensureCustomerSegmentsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.customer_segments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agency_id UUID NOT NULL,
      segment_name VARCHAR(255) NOT NULL,
      description TEXT,
      criteria JSONB, -- {"industry": ["construction", "real_estate"], "revenue_range": ">1000000", ...}
      client_count INTEGER DEFAULT 0,
      created_by UUID REFERENCES public.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_customer_segments_agency_id ON public.customer_segments(agency_id);
  `);
}

/**
 * Ensure client_segment_assignments table exists
 */
async function ensureClientSegmentAssignmentsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.client_segment_assignments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
      segment_id UUID NOT NULL REFERENCES public.customer_segments(id) ON DELETE CASCADE,
      assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(client_id, segment_id)
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_client_segment_assignments_client_id ON public.client_segment_assignments(client_id);
    CREATE INDEX IF NOT EXISTS idx_client_segment_assignments_segment_id ON public.client_segment_assignments(segment_id);
  `);
}

/**
 * Ensure all CRM enhancement tables
 */
async function ensureCrmEnhancementsSchema(client) {
  console.log('[SQL] Ensuring advanced CRM schema...');
  
  try {
    await ensureLeadScoresTable(client);
    await ensureOpportunitiesTable(client);
    await ensureEmailTrackingTable(client);
    await ensureCustomerSegmentsTable(client);
    await ensureClientSegmentAssignmentsTable(client);
    
    console.log('[SQL] ✅ Advanced CRM schema ensured');
  } catch (error) {
    console.error('[SQL] ❌ Error ensuring CRM enhancements schema:', error.message);
    throw error;
  }
}

module.exports = {
  ensureCrmEnhancementsSchema,
  ensureLeadScoresTable,
  ensureOpportunitiesTable,
  ensureEmailTrackingTable,
  ensureCustomerSegmentsTable,
  ensureClientSegmentAssignmentsTable,
};
