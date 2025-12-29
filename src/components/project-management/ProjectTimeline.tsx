import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Calendar, Clock, User } from "lucide-react";

interface Project {
  id: string;
  title: string;
  status: string;
  start_date: string;
  end_date: string;
  progress: number;
  clients?: {
    name: string;
  };
  profiles?: {
    full_name: string;
  };
}

interface ProjectTimelineProps {
  projects: Project[];
}

const statusColors = {
  planning: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  on_hold: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
};

export function ProjectTimeline({ projects }: ProjectTimelineProps) {
  // Sort projects by start date
  const sortedProjects = [...projects].sort((a, b) => 
    new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );

  // Group projects by month/year
  const groupedProjects = sortedProjects.reduce((groups, project) => {
    const date = new Date(project.start_date);
    const key = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(project);
    
    return groups;
  }, {} as Record<string, Project[]>);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const calculateDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 7) {
      return `${diffDays} days`;
    } else if (diffDays < 30) {
      return `${Math.ceil(diffDays / 7)} weeks`;
    } else {
      return `${Math.ceil(diffDays / 30)} months`;
    }
  };

  const isOverdue = (endDate: string, status: string) => {
    return new Date(endDate) < new Date() && status !== 'completed';
  };

  return (
    <div className="space-y-8">
      {Object.entries(groupedProjects).map(([period, periodProjects]) => (
        <div key={period} className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="h-px bg-border flex-1" />
            <h3 className="text-lg font-semibold px-4 bg-background">{period}</h3>
            <div className="h-px bg-border flex-1" />
          </div>

          <div className="space-y-4">
            {periodProjects.map((project, index) => (
              <div key={project.id} className="relative">
                {/* Timeline connector */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
                
                {/* Timeline dot */}
                <div className="absolute left-4 top-6 w-4 h-4 rounded-full border-2 border-background bg-primary" />
                
                {/* Project card */}
                <Card className="ml-12 hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="text-lg font-semibold">{project.title}</h4>
                          <Badge className={statusColors[project.status as keyof typeof statusColors]}>
                            {project.status.replace('_', ' ')}
                          </Badge>
                          {isOverdue(project.end_date, project.status) && (
                            <Badge variant="destructive">Overdue</Badge>
                          )}
                        </div>

                        <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(project.start_date)} - {formatDate(project.end_date)}</span>
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{calculateDuration(project.start_date, project.end_date)}</span>
                          </div>
                          
                          {project.profiles?.full_name && (
                            <div className="flex items-center space-x-1">
                              <User className="h-4 w-4" />
                              <span>{project.profiles.full_name}</span>
                            </div>
                          )}
                        </div>

                        {project.clients?.name && (
                          <p className="text-sm text-muted-foreground">
                            Client: {project.clients.name}
                          </p>
                        )}

                        {/* Progress bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span>{Math.round(project.progress)}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Project status indicator */}
                      <div className="ml-4">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: 
                              project.status === 'completed' ? '#10b981' :
                              project.status === 'in_progress' ? '#f59e0b' :
                              project.status === 'on_hold' ? '#f97316' :
                              project.status === 'cancelled' ? '#ef4444' : '#3b82f6'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      ))}

      {sortedProjects.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No projects to display in timeline
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 text-sm pt-8 border-t">
        {Object.entries(statusColors).map(([status, colorClass]) => (
          <div key={status} className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor: 
                  status === 'completed' ? '#10b981' :
                  status === 'in_progress' ? '#f59e0b' :
                  status === 'on_hold' ? '#f97316' :
                  status === 'cancelled' ? '#ef4444' : '#3b82f6'
              }}
            />
            <span>{status.replace('_', ' ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}