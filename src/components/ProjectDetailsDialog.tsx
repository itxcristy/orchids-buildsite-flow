import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, Users, DollarSign, FileText, Edit } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  client_id: string | null;
  progress: number;
  assigned_team: any; // JSONB
  created_at: string;
  updated_at: string;
  created_by: string | null;
  agency_id: string;
  client?: {
    name: string;
    company_name: string | null;
  };
}

interface ProjectDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onEdit: () => void;
}

const ProjectDetailsDialog: React.FC<ProjectDetailsDialogProps> = ({
  isOpen,
  onClose,
  project,
  onEdit,
}) => {
  if (!project) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in-progress':
      case 'in_progress': return 'secondary';
      case 'planning': return 'outline';
      case 'on-hold':
      case 'on_hold': return 'destructive';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    // Handle both database format (in_progress) and display format (in-progress)
    const normalizedStatus = status === 'in_progress' ? 'in-progress' : 
                            status === 'on_hold' ? 'on-hold' : status;
    switch (normalizedStatus) {
      case 'in-progress':
      case 'in_progress': return 'In Progress';
      case 'on-hold':
      case 'on_hold': return 'On Hold';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const parseAssignedTeam = () => {
    if (!project.assigned_team) return [];
    if (typeof project.assigned_team === 'string') {
      try {
        return JSON.parse(project.assigned_team);
      } catch {
        return [];
      }
    }
    if (Array.isArray(project.assigned_team)) {
      return project.assigned_team;
    }
    return [];
  };

  const assignedTeam = parseAssignedTeam();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">{project.name}</DialogTitle>
            <Badge variant={getStatusColor(project.status)}>
              {getStatusLabel(project.status)}
            </Badge>
          </div>
          <DialogDescription>
            Project details and information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress Section */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Progress</span>
              <span className="font-bold">{project.progress}%</span>
            </div>
            <Progress value={project.progress} className="h-3" />
          </div>

          {/* Description */}
          {project.description && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4" />
                Description
              </div>
              <p className="text-sm text-muted-foreground pl-6">{project.description}</p>
            </div>
          )}

          {/* Project Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {project.start_date && (
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Start Date</p>
                  <p className="text-sm font-medium">
                    {new Date(project.start_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            )}

            {project.end_date && (
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">End Date</p>
                  <p className="text-sm font-medium">
                    {new Date(project.end_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            )}

            {project.budget !== null && (
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Budget</p>
                  <p className="text-sm font-medium">₹{project.budget.toLocaleString()}</p>
                </div>
              </div>
            )}

            {project.client && (
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Client</p>
                  <p className="text-sm font-medium">
                    {project.client.company_name || project.client.name}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Assigned Team */}
          {assignedTeam.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4" />
                Assigned Team
              </div>
              <div className="flex flex-wrap gap-2 pl-6">
                {assignedTeam.map((member: any, index: number) => (
                  <Badge key={index} variant="outline">
                    {typeof member === 'string' ? member : member.name || member}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-4 border-t space-y-2">
            <p className="text-xs text-muted-foreground">
              Created: {new Date(project.created_at).toLocaleString()}
            </p>
            {project.updated_at !== project.created_at && (
              <p className="text-xs text-muted-foreground">
                Last Updated: {new Date(project.updated_at).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectDetailsDialog;

