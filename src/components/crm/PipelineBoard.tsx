/**
 * PipelineBoard Component
 * Simplified Kanban board with drag-and-drop focus
 */

import React, { useState, useEffect, useCallback } from 'react';
import { PipelineStage } from './PipelineStage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Search, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { crmService, Lead, PipelineStage as Stage } from '@/services/api/crm-service';
import { useNavigate } from 'react-router-dom';
import { insertRecord } from '@/services/api/postgresql-service';
import { getAgencyId } from '@/utils/agencyUtils';

interface PipelineBoardProps {
  onLeadClick?: (lead: Lead) => void;
  onLeadEdit?: (lead: Lead) => void;
  onLeadDelete?: (lead: Lead) => void;
  onLeadConvert?: (lead: Lead) => void;
  onScheduleActivity?: (lead: Lead) => void;
  onAddLead?: () => void;
}

type ViewMode = 'kanban' | 'list' | 'table' | 'funnel';

export const PipelineBoard: React.FC<PipelineBoardProps> = ({
  onLeadClick,
  onLeadEdit,
  onLeadDelete,
  onLeadConvert,
  onScheduleActivity,
  onAddLead,
}) => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [collapsedStages, setCollapsedStages] = useState<Set<string>>(new Set());

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (searchTerm) {
        filters.search = searchTerm;
      }
      
      const [leadsData, stagesData] = await Promise.all([
        crmService.getLeads(filters, profile, user?.id || null),
        crmService.getPipelineStages(profile, user?.id || null),
      ]);

      setLeads(leadsData);
      setStages(stagesData);
    } catch (error: any) {
      console.error('Error fetching pipeline data:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch pipeline data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, profile, user?.id, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Group leads by stage
  const leadsByStage = React.useMemo(() => {
    const grouped: Record<string, Lead[]> = {};
    stages.forEach(stage => {
      grouped[stage.stage_name] = leads.filter(lead => {
        const leadStage = (lead.pipeline_stage || lead.stage || lead.status) || 'new';
        return leadStage === stage.stage_name;
      });
    });
    return grouped;
  }, [leads, stages]);

  // Calculate stage metrics (simplified)
  const getStageMetrics = (stageName: string) => {
    const stageLeads = leadsByStage[stageName] || [];
    const totalValue = stageLeads.reduce((sum, lead) => {
      return sum + (lead.estimated_value || lead.value || 0);
    }, 0);

    return {
      count: stageLeads.length,
      totalValue,
      averageValue: stageLeads.length > 0 ? totalValue / stageLeads.length : 0,
    };
  };

  // Handle drag and drop
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', leadId);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedLeadId(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent, stageName: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const leadId = e.dataTransfer.getData('text/plain');
    if (!leadId) return;

    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const stage = stages.find(s => s.stage_name === stageName);
    if (!stage) return;

    // Don't update if already in this stage
    const currentStage = (lead.pipeline_stage || lead.stage || lead.status) || 'new';
    if (currentStage === stageName) {
      setDraggedLeadId(null);
      return;
    }

    try {
      // Optimistic update
      setLeads(prevLeads =>
        prevLeads.map(l =>
          l.id === leadId
            ? { ...l, pipeline_stage: stageName, stage: stageName, status: stageName, updated_at: new Date().toISOString() }
            : l
        )
      );

      // Update in database
      await crmService.updateLeadStage(leadId, stageName, stageName, profile, user?.id || null);

      toast({
        title: 'Success',
        description: `Lead moved to ${stageName}`,
      });

      // Refresh data
      fetchData();
    } catch (error: any) {
      console.error('Error updating lead stage:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update lead stage',
        variant: 'destructive',
      });

      // Revert optimistic update
      fetchData();
    } finally {
      setDraggedLeadId(null);
    }
  };


  // Toggle stage collapse
  const handleToggleStage = (stageId: string) => {
    setCollapsedStages(prev => {
      const next = new Set(prev);
      if (next.has(stageId)) {
        next.delete(stageId);
      } else {
        next.add(stageId);
      }
      return next;
    });
  };

  // Handle lead actions
  const handleLeadClick = (lead: Lead) => {
    if (onLeadClick) {
      onLeadClick(lead);
    } else {
      navigate(`/crm/leads/${lead.id}`);
    }
  };

  const handleLeadEdit = (lead: Lead) => {
    if (onLeadEdit) {
      onLeadEdit(lead);
    } else {
      navigate(`/crm/leads/${lead.id}?edit=true`);
    }
  };

  const handleLeadDelete = (lead: Lead) => {
    if (onLeadDelete) {
      onLeadDelete(lead);
    }
  };

  const handleLeadConvert = (lead: Lead) => {
    if (onLeadConvert) {
      onLeadConvert(lead);
    }
  };

  const handleScheduleActivity = (lead: Lead) => {
    if (onScheduleActivity) {
      onScheduleActivity(lead);
    }
  };

  const handleLeadDuplicate = async (lead: Lead) => {
    try {
      // Create a duplicate lead
      const agencyId = await getAgencyId(profile, user?.id || null);

      const duplicate = {
        ...lead,
        id: undefined,
        lead_number: `${lead.lead_number}-COPY`,
        company_name: `${lead.company_name} (Copy)`,
        created_at: undefined,
        updated_at: undefined,
      };

      await insertRecord('leads', duplicate, user?.id || null, agencyId);

      toast({
        title: 'Success',
        description: 'Lead duplicated successfully',
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to duplicate lead',
        variant: 'destructive',
      });
    }
  };

  const handleLeadArchive = async (lead: Lead) => {
    try {
      await crmService.updateLeadStage(lead.id, 'archived', 'archived', profile, user?.id || null);
      toast({
        title: 'Success',
        description: 'Lead archived',
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to archive lead',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Simple Header with Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {onAddLead && (
          <Button onClick={onAddLead}>
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        )}
      </div>

      {/* Kanban Board */}
      <div className="w-full overflow-x-auto">
        <div className="flex gap-4 pb-4 min-w-max">
          {stages.map((stage) => {
            const stageLeads = leadsByStage[stage.stage_name] || [];
            const stageMetrics = getStageMetrics(stage.stage_name);
            const isCollapsed = collapsedStages.has(stage.id);

            return (
              <PipelineStage
                key={stage.id}
                stage={stage}
                leads={stageLeads}
                metrics={stageMetrics}
                isCollapsed={isCollapsed}
                onToggleCollapse={() => handleToggleStage(stage.id)}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.stage_name)}
                onLeadClick={handleLeadClick}
                onLeadEdit={handleLeadEdit}
                onLeadDelete={handleLeadDelete}
                onLeadConvert={handleLeadConvert}
                onLeadScheduleActivity={handleScheduleActivity}
                onLeadDuplicate={handleLeadDuplicate}
                onLeadArchive={handleLeadArchive}
                draggedLeadId={draggedLeadId}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
