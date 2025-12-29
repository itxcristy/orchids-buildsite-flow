/**
 * CRM Service
 * Handles all CRM-related API operations with multi-tenant support
 */

import { selectRecords, selectOne, insertRecord, updateRecord, deleteRecord, queryMany } from './postgresql-service';
import { getAgencyId } from '@/utils/agencyUtils';

export interface Lead {
  id: string;
  lead_number: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  priority: string;
  pipeline_stage?: string | null; // Optional - may not exist in DB
  stage?: string | null; // DB column name
  estimated_value: number | null;
  value: number | null;
  probability: number;
  expected_close_date: string | null;
  follow_up_date: string | null;
  assigned_to: string | null;
  lead_source_id: string | null;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  agency_id: string;
}

export interface PipelineStage {
  id: string;
  stage_name: string;
  stage_order: number;
  description: string | null;
  probability: number;
  color: string | null;
  is_active: boolean;
  agency_id: string;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  lead_id: string | null;
  activity_type: string;
  subject: string;
  description: string | null;
  activity_date: string;
  due_date: string | null;
  status: string;
  assigned_to: string | null;
  created_at: string;
}

export interface PipelineMetrics {
  totalLeads: number;
  totalValue: number;
  weightedValue: number;
  averageTimeInStage: Record<string, number>;
  conversionRates: Record<string, number>;
  stageCounts: Record<string, number>;
  stageValues: Record<string, number>;
}

class CRMService {
  /**
   * Get agency ID from auth context
   */
  private async getAgencyId(profile: any, userId: string | null): Promise<string | null> {
    return await getAgencyId(profile, userId);
  }

  /**
   * Fetch all leads with optional filters
   */
  async getLeads(
    filters: {
      status?: string;
      priority?: string;
      assigned_to?: string;
      lead_source_id?: string;
      search?: string;
      pipeline_stage?: string;
      minValue?: number;
      maxValue?: number;
      tags?: string[];
      dateFrom?: string;
      dateTo?: string;
    } = {},
    profile: any,
    userId: string | null
  ): Promise<Lead[]> {
    const agencyId = await this.getAgencyId(profile, userId);
    if (!agencyId) {
      throw new Error('Agency ID not found');
    }

    const filterConditions: any[] = [
      { column: 'agency_id', operator: 'eq', value: agencyId }
    ];

    if (filters.status && filters.status !== 'all') {
      filterConditions.push({ column: 'status', operator: 'eq', value: filters.status });
    }

    if (filters.priority && filters.priority !== 'all') {
      filterConditions.push({ column: 'priority', operator: 'eq', value: filters.priority });
    }

    if (filters.assigned_to) {
      filterConditions.push({ column: 'assigned_to', operator: 'eq', value: filters.assigned_to });
    }

    if (filters.lead_source_id) {
      filterConditions.push({ column: 'lead_source_id', operator: 'eq', value: filters.lead_source_id });
    }

    if (filters.pipeline_stage) {
      filterConditions.push({ column: 'pipeline_stage', operator: 'eq', value: filters.pipeline_stage });
    }

    if (filters.minValue) {
      filterConditions.push({ column: 'estimated_value', operator: 'gte', value: filters.minValue });
    }

    if (filters.maxValue) {
      filterConditions.push({ column: 'estimated_value', operator: 'lte', value: filters.maxValue });
    }

    if (filters.tags && filters.tags.length > 0) {
      // For array contains, we need to use a different approach
      filterConditions.push({ column: 'tags', operator: 'in', value: filters.tags });
    }

    if (filters.dateFrom) {
      filterConditions.push({ column: 'created_at', operator: 'gte', value: filters.dateFrom });
    }

    if (filters.dateTo) {
      filterConditions.push({ column: 'created_at', operator: 'lte', value: filters.dateTo });
    }

    let leads = await selectRecords<Lead>('leads', {
      filters: filterConditions,
      orderBy: 'created_at DESC'
    });

    // Apply search filter in memory if provided (for text search across multiple fields)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      leads = leads.filter(lead =>
        lead.company_name?.toLowerCase().includes(searchLower) ||
        lead.contact_name?.toLowerCase().includes(searchLower) ||
        lead.lead_number?.toLowerCase().includes(searchLower) ||
        lead.email?.toLowerCase().includes(searchLower) ||
        lead.phone?.toLowerCase().includes(searchLower)
      );
    }

    return leads;
  }

  /**
   * Get single lead by ID
   */
  async getLead(leadId: string, profile: any, userId: string | null): Promise<Lead | null> {
    const agencyId = await this.getAgencyId(profile, userId);
    if (!agencyId) {
      throw new Error('Agency ID not found');
    }

    return await selectOne<Lead>('leads', { id: leadId, agency_id: agencyId });
  }

  /**
   * Update lead status and pipeline stage
   */
  async updateLeadStage(
    leadId: string,
    status: string,
    pipelineStage: string | null,
    profile: any,
    userId: string | null
  ): Promise<Lead> {
    const agencyId = await this.getAgencyId(profile, userId);
    if (!agencyId) {
      throw new Error('Agency ID not found');
    }

    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (pipelineStage !== null) {
      // Update both stage and pipeline_stage for compatibility
      updateData.stage = pipelineStage;
      updateData.pipeline_stage = pipelineStage;
    }

    return await updateRecord<Lead>('leads', updateData, { id: leadId, agency_id: agencyId }, userId);
  }

  /**
   * Bulk update leads
   */
  async bulkUpdateLeads(
    leadIds: string[],
    updates: Partial<Lead>,
    profile: any,
    userId: string | null
  ): Promise<Lead[]> {
    const agencyId = await this.getAgencyId(profile, userId);
    if (!agencyId) {
      throw new Error('Agency ID not found');
    }

    const updatedLeads: Lead[] = [];
    for (const leadId of leadIds) {
      const updated = await updateRecord<Lead>(
        'leads',
        { ...updates, updated_at: new Date().toISOString() },
        { id: leadId, agency_id: agencyId },
        userId
      );
      updatedLeads.push(updated);
    }

    return updatedLeads;
  }

  /**
   * Get all pipeline stages for agency
   */
  async getPipelineStages(profile: any, userId: string | null): Promise<PipelineStage[]> {
    const agencyId = await this.getAgencyId(profile, userId);
    if (!agencyId) {
      throw new Error('Agency ID not found');
    }

    const stages = await selectRecords<PipelineStage>('sales_pipeline', {
      filters: [
        { column: 'agency_id', operator: 'eq', value: agencyId },
        { column: 'is_active', operator: 'eq', value: true }
      ],
      orderBy: 'stage_order ASC'
    });

    // If no custom stages exist, create default stages in database
    if (stages.length === 0) {
      const defaultStages = this.getDefaultStages(agencyId);
      // Insert default stages into database
      const createdStages: PipelineStage[] = [];
      for (const stage of defaultStages) {
        try {
          const created = await insertRecord<PipelineStage>(
            'sales_pipeline',
            {
              stage_name: stage.stage_name,
              stage_order: stage.stage_order,
              description: stage.description,
              probability: stage.probability,
              color: stage.color,
              is_active: stage.is_active,
              agency_id: stage.agency_id,
              created_at: stage.created_at,
              updated_at: stage.updated_at,
            },
            userId,
            agencyId
          );
          createdStages.push(created);
        } catch (error: any) {
          // If stage already exists (race condition), fetch it
          console.warn(`Stage ${stage.stage_name} might already exist:`, error.message);
        }
      }
      
      // Fetch all stages again to get the created ones
      const allStages = await selectRecords<PipelineStage>('sales_pipeline', {
        filters: [
          { column: 'agency_id', operator: 'eq', value: agencyId },
          { column: 'is_active', operator: 'eq', value: true }
        ],
        orderBy: 'stage_order ASC'
      });
      
      return allStages.length > 0 ? allStages : defaultStages;
    }

    return stages;
  }

  /**
   * Get default pipeline stages
   */
  private getDefaultStages(agencyId: string): PipelineStage[] {
    const defaultStages = [
      { name: 'New', order: 1, probability: 10, color: '#3b82f6' },
      { name: 'Contacted', order: 2, probability: 20, color: '#eab308' },
      { name: 'Qualified', order: 3, probability: 40, color: '#22c55e' },
      { name: 'Proposal', order: 4, probability: 60, color: '#a855f7' },
      { name: 'Negotiation', order: 5, probability: 80, color: '#f97316' },
      { name: 'Won', order: 6, probability: 100, color: '#10b981' },
      { name: 'Lost', order: 7, probability: 0, color: '#ef4444' },
    ];

    return defaultStages.map(stage => ({
      id: `default-${stage.name.toLowerCase()}`,
      stage_name: stage.name,
      stage_order: stage.order,
      description: null,
      probability: stage.probability,
      color: stage.color,
      is_active: true,
      agency_id: agencyId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  }

  /**
   * Create or update pipeline stage
   */
  async savePipelineStage(
    stage: Partial<PipelineStage>,
    profile: any,
    userId: string | null
  ): Promise<PipelineStage> {
    const agencyId = await this.getAgencyId(profile, userId);
    if (!agencyId) {
      throw new Error('Agency ID not found');
    }

    if (stage.id && !stage.id.startsWith('default-')) {
      // Update existing stage
      return await updateRecord<PipelineStage>(
        'sales_pipeline',
        { ...stage, updated_at: new Date().toISOString() },
        { id: stage.id, agency_id: agencyId },
        userId
      );
    } else {
      // Create new stage
      return await insertRecord<PipelineStage>(
        'sales_pipeline',
        {
          ...stage,
          agency_id: agencyId,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        userId,
        agencyId
      );
    }
  }

  /**
   * Delete pipeline stage
   */
  async deletePipelineStage(
    stageId: string,
    profile: any,
    userId: string | null
  ): Promise<void> {
    const agencyId = await this.getAgencyId(profile, userId);
    if (!agencyId) {
      throw new Error('Agency ID not found');
    }

    // Don't allow deleting default stages
    if (stageId.startsWith('default-')) {
      throw new Error('Cannot delete default stages');
    }

    await deleteRecord('sales_pipeline', { id: stageId, agency_id: agencyId });
  }

  /**
   * Get activities for a lead
   */
  async getLeadActivities(leadId: string, profile: any, userId: string | null): Promise<Activity[]> {
    const agencyId = await this.getAgencyId(profile, userId);
    if (!agencyId) {
      throw new Error('Agency ID not found');
    }

    return await selectRecords<Activity>('crm_activities', {
      filters: [
        { column: 'lead_id', operator: 'eq', value: leadId },
        { column: 'agency_id', operator: 'eq', value: agencyId }
      ],
      orderBy: 'activity_date DESC'
    });
  }

  /**
   * Get pipeline metrics
   */
  async getPipelineMetrics(profile: any, userId: string | null): Promise<PipelineMetrics> {
    const agencyId = await this.getAgencyId(profile, userId);
    if (!agencyId) {
      throw new Error('Agency ID not found');
    }

    const leads = await this.getLeads({}, profile, userId);
    const stages = await this.getPipelineStages(profile, userId);

    const stageCounts: Record<string, number> = {};
    const stageValues: Record<string, number> = {};
    const stageTimes: Record<string, number[]> = {};

    let totalValue = 0;
    let weightedValue = 0;

    leads.forEach(lead => {
      const stage = (lead.pipeline_stage || lead.stage || lead.status) || 'new';
      const value = lead.estimated_value || lead.value || 0;
      const probability = lead.probability || 0;

      stageCounts[stage] = (stageCounts[stage] || 0) + 1;
      stageValues[stage] = (stageValues[stage] || 0) + value;
      totalValue += value;
      weightedValue += value * (probability / 100);

      // Calculate time in stage (simplified - would need stage_history table for accurate tracking)
      const daysInStage = Math.floor(
        (new Date().getTime() - new Date(lead.updated_at || lead.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (!stageTimes[stage]) {
        stageTimes[stage] = [];
      }
      stageTimes[stage].push(daysInStage);
    });

    // Calculate average time in stage
    const averageTimeInStage: Record<string, number> = {};
    Object.keys(stageTimes).forEach(stage => {
      const times = stageTimes[stage];
      averageTimeInStage[stage] = times.length > 0
        ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
        : 0;
    });

    // Calculate conversion rates between stages
    const conversionRates: Record<string, number> = {};
    stages.forEach((stage, index) => {
      if (index > 0) {
        const prevStage = stages[index - 1];
        const prevCount = stageCounts[prevStage.stage_name] || 0;
        const currentCount = stageCounts[stage.stage_name] || 0;
        conversionRates[stage.stage_name] = prevCount > 0
          ? Math.round((currentCount / prevCount) * 100)
          : 0;
      }
    });

    return {
      totalLeads: leads.length,
      totalValue,
      weightedValue,
      averageTimeInStage,
      conversionRates,
      stageCounts,
      stageValues,
    };
  }

  /**
   * Get leads by stage
   */
  async getLeadsByStage(
    stageName: string,
    profile: any,
    userId: string | null
  ): Promise<Lead[]> {
    return await this.getLeads({ pipeline_stage: stageName }, profile, userId);
  }
}

export const crmService = new CRMService();
