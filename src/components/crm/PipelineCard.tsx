/**
 * PipelineCard Component
 * Modern, feature-rich lead card for the pipeline Kanban board
 */

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  UserCheck, 
  Calendar, 
  Mail, 
  Phone,
  TrendingUp,
  Clock,
  AlertCircle,
  Copy,
  Archive
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Lead } from '@/services/api/crm-service';
import { formatDistanceToNow } from 'date-fns';

interface PipelineCardProps {
  lead: Lead;
  isDragging?: boolean;
  onEdit?: (lead: Lead) => void;
  onDelete?: (lead: Lead) => void;
  onConvert?: (lead: Lead) => void;
  onScheduleActivity?: (lead: Lead) => void;
  onDuplicate?: (lead: Lead) => void;
  onArchive?: (lead: Lead) => void;
  onClick?: (lead: Lead) => void;
}

export const PipelineCard: React.FC<PipelineCardProps> = ({
  lead,
  isDragging = false,
  onEdit,
  onDelete,
  onConvert,
  onScheduleActivity,
  onDuplicate,
  onArchive,
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const getInitials = (name: string | null | undefined): string => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getValueColor = (value: number | null): string => {
    if (!value || value === 0) return 'text-gray-500';
    if (value >= 100000) return 'text-green-600 font-bold';
    if (value >= 50000) return 'text-blue-600 font-semibold';
    if (value >= 10000) return 'text-purple-600';
    return 'text-gray-600';
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return <AlertCircle className="h-3 w-3" />;
      default: return null;
    }
  };

  const value = lead.estimated_value || lead.value || 0;
  const daysInStage = Math.floor(
    (new Date().getTime() - new Date(lead.updated_at || lead.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  const isStale = daysInStage > 7;

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger onClick if clicking on interactive elements
    if (
      (e.target as HTMLElement).closest('button') ||
      (e.target as HTMLElement).closest('[role="menuitem"]') ||
      (e.target as HTMLElement).closest('input[type="checkbox"]')
    ) {
      return;
    }
    onClick?.(lead);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', lead.id);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  return (
    <Card
      className={`
        relative p-3 mb-2 cursor-pointer transition-all duration-200
        ${isDragging ? 'opacity-50 scale-95' : 'opacity-100'}
        hover:shadow-md
        ${isStale ? 'border-l-4 border-l-orange-500' : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Header with Avatar and Actions */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
              {getInitials(lead.company_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <h4 className="font-semibold text-sm truncate">{lead.company_name}</h4>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{lead.company_name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {lead.contact_name && (
              <p className="text-xs text-muted-foreground truncate">{lead.contact_name}</p>
            )}
          </div>
        </div>

        {/* Actions Menu */}
        {isHovered && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4 text-gray-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => onEdit?.(lead)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Lead
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onClick?.(lead)}>
                <TrendingUp className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onScheduleActivity?.(lead)}>
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Activity
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onConvert?.(lead)}>
                <UserCheck className="h-4 w-4 mr-2" />
                Convert to Client
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDuplicate?.(lead)}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onArchive?.(lead)}>
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete?.(lead)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Lead Number */}
      {lead.lead_number && (
        <p className="text-xs text-muted-foreground mb-2">#{lead.lead_number}</p>
      )}

      {/* Value Badge */}
      {value > 0 && (
        <div className="mb-2">
          <Badge 
            variant="outline" 
            className={`${getValueColor(value)} border-current text-xs font-semibold`}
          >
            ₹{value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </Badge>
        </div>
      )}

      {/* Priority and Probability */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <Badge 
          variant="outline" 
          className={`${getPriorityColor(lead.priority || 'medium')} text-xs flex items-center gap-1`}
        >
          {getPriorityIcon(lead.priority || 'medium')}
          {lead.priority || 'medium'}
        </Badge>
        <div className="flex items-center gap-1 flex-1">
          <Progress 
            value={lead.probability || 0} 
            className="h-1.5 flex-1"
          />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {lead.probability || 0}%
          </span>
        </div>
      </div>

      {/* Contact Info */}
      <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
        {lead.email && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Mail className="h-3 w-3" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{lead.email}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {lead.phone && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Phone className="h-3 w-3" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{lead.phone}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Days in Stage / Stale Indicator */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{daysInStage}d in stage</span>
        </div>
        {isStale && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertCircle className="h-3 w-3 text-orange-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p>No activity for {daysInStage} days</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Follow-up Date */}
      {lead.follow_up_date && (
        <div className="mt-2 pt-2 border-t text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              Follow-up: {formatDistanceToNow(new Date(lead.follow_up_date), { addSuffix: true })}
            </span>
          </div>
        </div>
      )}

      {/* Tags */}
      {lead.tags && lead.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {lead.tags.slice(0, 2).map((tag, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {lead.tags.length > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{lead.tags.length - 2}
            </Badge>
          )}
        </div>
      )}
    </Card>
  );
};
