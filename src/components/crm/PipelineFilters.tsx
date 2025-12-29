/**
 * PipelineFilters Component
 * Advanced filtering for pipeline leads
 */

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Filter, Search } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface PipelineFiltersProps {
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
  };
  onFiltersChange: (filters: any) => void;
  onClearFilters: () => void;
}

export const PipelineFilters: React.FC<PipelineFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    filters.dateFrom ? new Date(filters.dateFrom) : undefined
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    filters.dateTo ? new Date(filters.dateTo) : undefined
  );

  const updateFilter = (key: string, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const removeFilter = (key: string) => {
    const newFilters = { ...filters };
    delete newFilters[key as keyof typeof filters];
    onFiltersChange(newFilters);
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads by company, contact, email, phone..."
            value={filters.search || ''}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <Select
            value={filters.status || 'all'}
            onValueChange={(value) =>
              updateFilter('status', value === 'all' ? undefined : value)
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="proposal">Proposal</SelectItem>
              <SelectItem value="negotiation">Negotiation</SelectItem>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>

          {/* Priority Filter */}
          <Select
            value={filters.priority || 'all'}
            onValueChange={(value) =>
              updateFilter('priority', value === 'all' ? undefined : value)
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          {/* Value Range */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                Value Range
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Min Value</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={filters.minValue || ''}
                    onChange={(e) =>
                      updateFilter('minValue', e.target.value ? parseFloat(e.target.value) : undefined)
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Max Value</label>
                  <Input
                    type="number"
                    placeholder="No limit"
                    value={filters.maxValue || ''}
                    onChange={(e) =>
                      updateFilter('maxValue', e.target.value ? parseFloat(e.target.value) : undefined)
                    }
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Date Range */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                Date Range
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">From Date</label>
                  <Calendar
                    selected={dateFrom}
                    onSelect={(date) => {
                      setDateFrom(date);
                      updateFilter('dateFrom', date ? format(date, 'yyyy-MM-dd') : undefined);
                    }}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">To Date</label>
                  <Calendar
                    selected={dateTo}
                    onSelect={(date) => {
                      setDateTo(date);
                      updateFilter('dateTo', date ? format(date, 'yyyy-MM-dd') : undefined);
                    }}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onClearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>

        {/* Active Filter Badges */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2">
            {filters.status && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Status: {filters.status}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeFilter('status')}
                />
              </Badge>
            )}
            {filters.priority && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Priority: {filters.priority}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeFilter('priority')}
                />
              </Badge>
            )}
            {filters.minValue && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Min: ₹{filters.minValue.toLocaleString('en-IN')}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeFilter('minValue')}
                />
              </Badge>
            )}
            {filters.maxValue && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Max: ₹{filters.maxValue.toLocaleString('en-IN')}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeFilter('maxValue')}
                />
              </Badge>
            )}
            {filters.dateFrom && (
              <Badge variant="secondary" className="flex items-center gap-1">
                From: {format(new Date(filters.dateFrom), 'MMM dd, yyyy')}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeFilter('dateFrom')}
                />
              </Badge>
            )}
            {filters.dateTo && (
              <Badge variant="secondary" className="flex items-center gap-1">
                To: {format(new Date(filters.dateTo), 'MMM dd, yyyy')}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeFilter('dateTo')}
                />
              </Badge>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
