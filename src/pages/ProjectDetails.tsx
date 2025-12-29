/**
 * Project Details Page
 * Full project view with tasks, team, timeline, budget, and resources
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Edit, 
  Calendar, 
  Users, 
  DollarSign, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  FileText,
  BarChart3,
  Mail,
  Phone,
  MapPin,
  Building,
  ExternalLink,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { projectService, Project, Task } from "@/services/api/project-service";
import ProjectFormDialog from "@/components/ProjectFormDialog";
import { TaskKanbanBoard } from "@/components/TaskKanbanBoard";
import { GanttChart } from "@/components/project-management/GanttChart";
import { selectRecords, selectOne } from "@/services/api/postgresql-service";
import { getAgencyId } from "@/utils/agencyUtils";
import { getEmployeesForAssignmentAuto } from "@/services/api/employee-selector-service";
import { getClientById } from "@/services/api/client-selector-service";
import { getDepartmentsForSelectionAuto } from "@/services/api/department-selector-service";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const statusColors: Record<string, string> = {
  planning: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  on_hold: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
};

export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  
  // Integration data
  const [clientDetails, setClientDetails] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingIntegration, setLoadingIntegration] = useState(false);
  const [revenue, setRevenue] = useState<number>(0);

  useEffect(() => {
    if (id) {
      loadProject();
      loadTasks();
    }
  }, [id]);

  useEffect(() => {
    if (project) {
      loadIntegrationData();
    }
  }, [project]);

  const loadProject = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const data = await projectService.getProject(id, profile, user?.id);
      setProject(data);
    } catch (error: any) {
      console.error('Error loading project:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load project",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    if (!id) return;
    
    try {
      const data = await projectService.getTasks({ project_id: id }, profile, user?.id);
      setTasks(data);
    } catch (error: any) {
      console.error('Error loading tasks:', error);
    }
  };

  const loadIntegrationData = async () => {
    if (!project) return;
    
    setLoadingIntegration(true);
    try {
      const agencyId = await getAgencyId(profile, user?.id);
      if (!agencyId) return;

      // Load client details
      if (project.client_id) {
        try {
          const client = await getClientById(project.client_id, agencyId);
          setClientDetails(client);
        } catch (error) {
          console.error('Error loading client details:', error);
        }
      }

      // Load team member details
      if (project.assigned_team && Array.isArray(project.assigned_team) && project.assigned_team.length > 0) {
        try {
          const allEmployees = await getEmployeesForAssignmentAuto(profile, user?.id);
          const teamMemberIds = project.assigned_team.map((m: any) => 
            typeof m === 'string' ? m : m.user_id || m.id || String(m)
          );
          const members = allEmployees.filter(emp => teamMemberIds.includes(emp.user_id));
          setTeamMembers(members);
        } catch (error) {
          console.error('Error loading team members:', error);
        }
      }

      // Load department details
      if (project.departments && Array.isArray(project.departments) && project.departments.length > 0) {
        try {
          const allDepartments = await getDepartmentsForSelectionAuto(profile, user?.id);
          const projectDepts = allDepartments.filter(dept => 
            project.departments.includes(dept.id)
          );
          setDepartments(projectDepts);
        } catch (error) {
          console.error('Error loading departments:', error);
        }
      }

      // Load related invoices
      try {
        const projectInvoices = await selectRecords('invoices', {
          filters: [
            { column: 'agency_id', operator: 'eq', value: agencyId },
            { column: 'client_id', operator: 'eq', value: project.client_id || '' }
          ],
          orderBy: 'issue_date DESC',
          limit: 10
        });
        setInvoices(projectInvoices || []);
        
        // Calculate revenue from paid invoices
        const paidInvoices = (projectInvoices || []).filter((inv: any) => 
          inv.status === 'paid' || inv.status === 'partial'
        );
        const totalRevenue = paidInvoices.reduce((sum: number, inv: any) => {
          return sum + (parseFloat(inv.total_amount) || 0);
        }, 0);
        setRevenue(totalRevenue);
      } catch (error) {
        console.error('Error loading invoices:', error);
      }
    } catch (error: any) {
      console.error('Error loading integration data:', error);
    } finally {
      setLoadingIntegration(false);
    }
  };

  const handleProjectSaved = () => {
    loadProject();
    setShowEditForm(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Project not found</p>
            <Button onClick={() => navigate('/project-management')} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: project.currency || 'USD'
    }).format(amount);
  };

  const budgetVariance = project.budget && project.actual_cost
    ? ((project.actual_cost - project.budget) / project.budget) * 100
    : 0;

  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/project-management')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            {project.project_code && (
              <p className="text-muted-foreground">Code: {project.project_code}</p>
            )}
          </div>
        </div>
        <Button onClick={() => setShowEditForm(true)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Project
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(project.progress)}%</div>
            <Progress value={project.progress} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(project.budget)}</div>
            <p className="text-xs text-muted-foreground">
              Spent: {formatCurrency(project.actual_cost)}
            </p>
            {budgetVariance !== 0 && (
              <p className={`text-xs ${budgetVariance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {budgetVariance > 0 ? '+' : ''}{budgetVariance.toFixed(1)}% variance
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTasks}/{totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round(taskCompletionRate)}% complete
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge className={statusColors[project.status] || statusColors.planning}>
              {project.status.replace('_', ' ')}
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">
              Priority: {project.priority}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Project Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="mt-1">{project.description || 'No description provided'}</p>
                </div>
                {project.project_type && (
                  <div>
                    <p className="text-sm text-muted-foreground">Project Type</p>
                    <p className="mt-1">{project.project_type}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Start Date</p>
                    <p className="mt-1">{formatDate(project.start_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">End Date</p>
                    <p className="mt-1">{formatDate(project.end_date)}</p>
                  </div>
                </div>
                {project.deadline && (
                  <div>
                    <p className="text-sm text-muted-foreground">Deadline</p>
                    <p className="mt-1">{formatDate(project.deadline)}</p>
                  </div>
                )}
                {project.client && (
                  <div>
                    <p className="text-sm text-muted-foreground">Client</p>
                    <p className="mt-1">{project.client.company_name || project.client.name}</p>
                    {clientDetails && (
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto mt-1"
                        onClick={() => navigate(`/clients?client_id=${project.client_id}`)}
                      >
                        View Client Details <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                )}
                {project.project_manager && (
                  <div>
                    <p className="text-sm text-muted-foreground">Project Manager</p>
                    <p className="mt-1">{project.project_manager.full_name}</p>
                  </div>
                )}
                {project.account_manager && (
                  <div>
                    <p className="text-sm text-muted-foreground">Account Manager</p>
                    <p className="mt-1">{project.account_manager.full_name}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Budget</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(project.budget)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Actual Cost</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(project.actual_cost)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Revenue</p>
                  <p className="text-2xl font-bold mt-1 text-green-600">{formatCurrency(revenue)}</p>
                </div>
                {project.budget && project.actual_cost && (
                  <div>
                    <p className="text-sm text-muted-foreground">Profit Margin</p>
                    <p className={`text-2xl font-bold mt-1 ${(revenue - (project.actual_cost || 0)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(revenue - (project.actual_cost || 0))}
                    </p>
                    {project.budget > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {(((revenue - (project.actual_cost || 0)) / project.budget) * 100).toFixed(1)}% margin
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Client Information Section */}
          {clientDetails && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium">{clientDetails.name}</p>
                      {clientDetails.company_name && (
                        <p className="text-sm text-muted-foreground">{clientDetails.company_name}</p>
                      )}
                    </div>
                    {clientDetails.contact_person && (
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{clientDetails.contact_person}</span>
                        {clientDetails.contact_position && (
                          <span className="text-muted-foreground">({clientDetails.contact_position})</span>
                        )}
                      </div>
                    )}
                    {clientDetails.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{clientDetails.email}</span>
                      </div>
                    )}
                    {clientDetails.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{clientDetails.phone}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {clientDetails.address && (
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <span>{clientDetails.address}</span>
                      </div>
                    )}
                    {clientDetails.payment_terms && (
                      <div>
                        <p className="text-sm text-muted-foreground">Payment Terms</p>
                        <p className="text-sm font-medium">{clientDetails.payment_terms} days</p>
                      </div>
                    )}
                    {clientDetails.industry && (
                      <div>
                        <p className="text-sm text-muted-foreground">Industry</p>
                        <Badge variant="outline">{clientDetails.industry}</Badge>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/clients?client_id=${project.client_id}`)}
                    >
                      View Full Client Profile <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Task Progress Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Task Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Completion Rate</span>
                    <span className="font-medium">{Math.round(taskCompletionRate)}%</span>
                  </div>
                  <Progress value={taskCompletionRate} className="h-2" />
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{totalTasks}</p>
                    <p className="text-xs text-muted-foreground">Total Tasks</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{completedTasks}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-600">{totalTasks - completedTasks}</p>
                    <p className="text-xs text-muted-foreground">Remaining</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <TaskKanbanBoard projectId={id} />
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingIntegration ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : teamMembers.length > 0 ? (
                <div className="space-y-3">
                  {teamMembers.map((member) => (
                    <div key={member.user_id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatar_url} />
                          <AvatarFallback>
                            {member.full_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.full_name}</p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            {member.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {member.email}
                              </span>
                            )}
                            {member.department && (
                              <span>{member.department}</span>
                            )}
                            {member.position && (
                              <span>• {member.position}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/employee-management?employee_id=${member.user_id}`)}
                      >
                        View Profile <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No team members assigned</p>
              )}
            </CardContent>
          </Card>

          {/* Department Assignments */}
          {departments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Department Assignments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {departments.map((dept) => (
                    <div key={dept.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{dept.name}</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          {dept.manager_name && (
                            <span>Manager: {dept.manager_name}</span>
                          )}
                          {dept.member_count > 0 && (
                            <span>• {dept.member_count} members</span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/department-management?department_id=${dept.id}`)}
                      >
                        View Department <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <GanttChart projects={[{
                id: project.id,
                title: project.name,
                start_date: project.start_date || new Date().toISOString(),
                end_date: project.end_date || new Date().toISOString(),
                status: project.status,
                progress: project.progress,
                clients: project.client ? { name: project.client.name } : undefined
              }]} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budget" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Budget Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Budget</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(project.budget)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Allocated Budget</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(project.allocated_budget)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Actual Cost</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(project.actual_cost)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Revenue</p>
                  <p className="text-2xl font-bold mt-1 text-green-600">{formatCurrency(revenue)}</p>
                </div>
                {project.cost_center && (
                  <div>
                    <p className="text-sm text-muted-foreground">Cost Center</p>
                    <p className="mt-1">{project.cost_center}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Financial Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {project.budget && project.actual_cost ? (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Budget Utilization</span>
                        <span>{Math.min((project.actual_cost / project.budget) * 100, 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={Math.min((project.actual_cost / project.budget) * 100, 100)} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Remaining Budget</p>
                      <p className={`text-2xl font-bold mt-1 ${(project.budget - project.actual_cost) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(project.budget - project.actual_cost)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Profit Margin</p>
                      <div className="flex items-center gap-2 mt-1">
                        {revenue - (project.actual_cost || 0) >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                        <p className={`text-2xl font-bold ${(revenue - (project.actual_cost || 0)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(revenue - (project.actual_cost || 0))}
                        </p>
                      </div>
                      {project.budget > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {(((revenue - (project.actual_cost || 0)) / project.budget) * 100).toFixed(1)}% margin
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Budget information not available</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Related Invoices */}
          {invoices.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Related Invoices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice Number</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice: any) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell>{formatDate(invoice.issue_date)}</TableCell>
                        <TableCell>
                          <Badge variant={
                            invoice.status === 'paid' ? 'default' :
                            invoice.status === 'overdue' ? 'destructive' :
                            'secondary'
                          }>
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(invoice.total_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/invoices?client_id=${project.client_id}`)}
                  >
                    View All Invoices <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Form Dialog */}
      {showEditForm && (
        <ProjectFormDialog
          isOpen={showEditForm}
          onClose={() => setShowEditForm(false)}
          project={project}
          onProjectSaved={handleProjectSaved}
        />
      )}
    </div>
  );
}
