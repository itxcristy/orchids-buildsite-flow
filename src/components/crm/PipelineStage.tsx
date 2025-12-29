/**
 * PipelineStage Component
 * Stage column with metrics and lead cards
 */

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronUp, Settings, Plus } from 'lucide-react';
import { PipelineCard } from './PipelineCard';
import { Lead, PipelineStage as Stage } from '@/services/api/crm-service';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PipelineStageProps {
  stage: Stage;
  leads: Lead[];
  metrics: {
    count: number;
    totalValue: number;
    averageValue: number;
    conversionRate?: number;
    averageTime?: number;
  };
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onLeadClick?: (lead: Lead) => void;
  onLeadEdit?: (lead: Lead) => void;
  onLeadDelete?: (lead: Lead) => void;
  onLeadConvert?: (lead: Lead) => void;
  onLeadScheduleActivity?: (lead: Lead) => void;
  onLeadDuplicate?: (lead: Lead) => void;
  onLeadArchive?: (lead: Lead) => void;
  onAddLead?: (stage: Stage) => void;
  onEditStage?: (stage: Stage) => void;
  draggedLeadId?: string | null;
}

export const PipelineStage: React.FC<PipelineStageProps> = ({
  stage,
  leads,
  metrics,
  isCollapsed = false,
  onToggleCollapse,
  onDragOver,
  onDragLeave,
  onDrop,
  onLeadClick,
  onLeadEdit,
  onLeadDelete,
  onLeadConvert,
  onLeadScheduleActivity,
  onLeadDuplicate,
  onLeadArchive,
  onAddLead,
  onEditStage,
  draggedLeadId,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const getStageColor = (color: string | null): string => {
    if (color) return color;
    // Default colors based on stage name
    const name = stage.stage_name.toLowerCase();
    if (name.includes('new')) return '#3b82f6';
    if (name.includes('contacted')) return '#eab308';
    if (name.includes('qualified')) return '#22c55e';
    if (name.includes('proposal')) return '#a855f7';
    if (name.includes('negotiation')) return '#f97316';
    if (name.includes('won')) return '#10b981';
    if (name.includes('lost')) return '#ef4444';
    return '#6b7280';
  };

  const stageColor = getStageColor(stage.color);

  return (
    <div
      className="flex flex-col h-full min-w-[280px] max-w-[320px]"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Card className="flex flex-col h-full border-2 transition-colors">
        {/* Stage Header */}
        <div
          className="p-3 border-b"
          style={{ borderTopColor: stageColor, borderTopWidth: '4px' }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-1">
              <h3 className="font-semibold text-sm">{stage.stage_name}</h3>
              <Badge variant="secondary" className="text-xs">
                {metrics.count}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              {onToggleCollapse && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={onToggleCollapse}
                >
                  {isCollapsed ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </Button>
              )}
              {(isHovered || isCollapsed) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEditStage?.(stage)}>
                      Edit Stage
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onAddLead?.(stage)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Lead
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Simple Stage Metrics */}
          {!isCollapsed && metrics.totalValue > 0 && (
            <div className="text-xs text-muted-foreground">
              ₹{metrics.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          )}
        </div>

        {/* Leads Container */}
        {!isCollapsed && (
          <div className="flex-1 overflow-y-auto p-2 min-h-[200px] max-h-[calc(100vh-300px)]">
            {leads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center border-2 border-dashed border-gray-300 rounded-lg text-muted-foreground text-sm">
                <p className="mb-1">Drop leads here</p>
                <p className="text-xs">or click to add</p>
              </div>
            ) : (
              leads.map((lead) => (
                <PipelineCard
                  key={lead.id}
                  lead={lead}
                  isDragging={draggedLeadId === lead.id}
                  onClick={onLeadClick}
                  onEdit={onLeadEdit}
                  onDelete={onLeadDelete}
                  onConvert={onLeadConvert}
                  onScheduleActivity={onLeadScheduleActivity}
                  onDuplicate={onLeadDuplicate}
                  onArchive={onLeadArchive}
                />
              ))
            )}
          </div>
        )}
      </Card>
    </div>
  );
};
