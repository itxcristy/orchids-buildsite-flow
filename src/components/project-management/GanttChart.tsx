import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";

interface Project {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  status: string;
  progress: number;
  clients?: {
    name: string;
  };
}

interface GanttChartProps {
  projects: Project[];
}

const statusColors = {
  planning: '#3b82f6',
  in_progress: '#f59e0b',
  on_hold: '#f97316',
  completed: '#10b981',
  cancelled: '#ef4444'
};

export function GanttChart({ projects }: GanttChartProps) {
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'quarter'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Calculate date range based on projects
  const getDateRange = () => {
    if (projects.length === 0) {
      const now = new Date();
      return {
        startDate: new Date(now.getFullYear(), now.getMonth() - 3, 1),
        endDate: new Date(now.getFullYear(), now.getMonth() + 3, 0)
      };
    }

    const dates = projects.flatMap(p => [new Date(p.start_date), new Date(p.end_date)]);
    const startDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const endDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    // Add buffer
    startDate.setMonth(startDate.getMonth() - 1);
    endDate.setMonth(endDate.getMonth() + 1);
    
    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange();

  // Generate time periods based on view mode
  const generateTimePeriods = () => {
    const periods = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      if (viewMode === 'week') {
        periods.push(new Date(current));
        current.setDate(current.getDate() + 7);
      } else if (viewMode === 'month') {
        periods.push(new Date(current));
        current.setMonth(current.getMonth() + 1);
      } else {
        periods.push(new Date(current));
        current.setMonth(current.getMonth() + 3);
      }
    }
    
    return periods;
  };

  const timePeriods = generateTimePeriods();

  // Calculate position and width for project bars
  const getProjectBarStyle = (project: Project) => {
    const projectStart = new Date(project.start_date);
    const projectEnd = new Date(project.end_date);
    const totalDuration = endDate.getTime() - startDate.getTime();
    const projectDuration = projectEnd.getTime() - projectStart.getTime();
    
    const left = ((projectStart.getTime() - startDate.getTime()) / totalDuration) * 100;
    const width = (projectDuration / totalDuration) * 100;
    
    return {
      left: `${Math.max(0, left)}%`,
      width: `${Math.min(100 - Math.max(0, left), width)}%`
    };
  };

  const formatPeriodLabel = (date: Date) => {
    if (viewMode === 'week') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (viewMode === 'month') {
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } else {
      return `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
    }
  };

  const navigateTime = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 3 : -3));
    }
    setCurrentDate(newDate);
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => navigateTime('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateTime('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('week')}
          >
            Week
          </Button>
          <Button
            variant={viewMode === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('month')}
          >
            Month
          </Button>
          <Button
            variant={viewMode === 'quarter' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('quarter')}
          >
            Quarter
          </Button>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-muted/50 border-b">
          <div className="flex">
            <div className="w-80 p-4 border-r bg-background">
              <h4 className="font-medium">Project</h4>
            </div>
            <div className="flex-1 overflow-x-auto" ref={scrollRef}>
              <div className="flex min-w-max">
                {timePeriods.map((period, index) => (
                  <div key={index} className="flex-1 min-w-[120px] p-4 border-r text-center">
                    <span className="text-sm font-medium">
                      {formatPeriodLabel(period)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Project Rows */}
        <div className="divide-y">
          {projects.map((project, index) => (
            <div key={project.id} className="flex hover:bg-muted/25">
              {/* Project Info */}
              <div className="w-80 p-4 border-r bg-background">
                <div className="space-y-1">
                  <h5 className="font-medium text-sm truncate">{project.title}</h5>
                  <p className="text-xs text-muted-foreground truncate">
                    {project.clients?.name}
                  </p>
                  <div className="flex items-center justify-between">
                    <Badge 
                      variant="outline" 
                      className="text-xs"
                      style={{ 
                        color: statusColors[project.status as keyof typeof statusColors],
                        borderColor: statusColors[project.status as keyof typeof statusColors]
                      }}
                    >
                      {project.status.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(project.progress)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="flex-1 relative p-4">
                <div className="relative h-8">
                  {/* Grid lines */}
                  <div className="absolute inset-0 flex">
                    {timePeriods.map((_, i) => (
                      <div key={i} className="flex-1 border-r border-muted/30" />
                    ))}
                  </div>

                  {/* Project bar */}
                  <div
                    className="absolute top-1 h-6 rounded-md shadow-sm flex items-center px-2"
                    style={{
                      ...getProjectBarStyle(project),
                      backgroundColor: statusColors[project.status as keyof typeof statusColors],
                      opacity: 0.8
                    }}
                  >
                    {/* Progress overlay */}
                    <div
                      className="absolute top-0 left-0 h-full bg-white/30 rounded-md"
                      style={{ width: `${project.progress}%` }}
                    />
                    
                    {/* Project title on bar (if space allows) */}
                    <span className="text-xs text-white font-medium truncate">
                      {project.title}
                    </span>
                  </div>

                  {/* Today indicator */}
                  {(() => {
                    const today = new Date();
                    const totalDuration = endDate.getTime() - startDate.getTime();
                    const todayPosition = ((today.getTime() - startDate.getTime()) / totalDuration) * 100;
                    
                    if (todayPosition >= 0 && todayPosition <= 100) {
                      return (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                          style={{ left: `${todayPosition}%` }}
                        >
                          <div className="absolute -top-2 -left-1 w-2 h-2 bg-red-500 rounded-full" />
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            </div>
          ))}
        </div>

        {projects.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No projects to display
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full" />
          <span>Today</span>
        </div>
        {Object.entries(statusColors).map(([status, color]) => (
          <div key={status} className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
            <span>{status.replace('_', ' ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}