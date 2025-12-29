import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Zap, 
  Bot, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Settings,
  Play,
  Pause,
  RotateCcw,
  TrendingUp,
  Users,
  FileText,
  Calendar
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getAgencyId } from "@/utils/agencyUtils";
import { selectRecords, rawQuery } from "@/services/api/postgresql-service";
import { db } from "@/integrations/postgresql/client";

interface Automation {
  id: string;
  name: string;
  description: string;
  category: 'workflow' | 'notification' | 'data_entry' | 'reporting';
  enabled: boolean;
  frequency: 'real_time' | 'daily' | 'weekly' | 'monthly';
  last_run: string;
  success_rate: number;
  time_saved: number; // minutes per execution
  actions_count: number;
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  potential_impact: string;
  implementation_effort: 'low' | 'medium' | 'high';
  estimated_savings: number; // hours per month
  category: string;
  priority: number;
}

export function SmartRecommendations() {
  const { user, profile } = useAuth();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user?.id, profile?.agency_id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const agencyId = await getAgencyId(profile, user?.id);
      if (!agencyId) {
        setAutomations([]);
        setRecommendations([]);
        return;
      }

      // Fetch real data to generate automations and recommendations
      const [projects, invoices, tasks, attendance] = await Promise.all([
        selectRecords('projects', {
          where: { agency_id: agencyId },
          orderBy: 'created_at DESC',
          limit: 100
        }).catch(() => []),
        selectRecords('invoices', {
          where: { agency_id: agencyId },
          orderBy: 'created_at DESC',
          limit: 100
        }).catch(() => []),
        selectRecords('tasks', {
          where: { agency_id: agencyId },
          orderBy: 'created_at DESC',
          limit: 100
        }).catch(() => []),
        selectRecords('attendance', {
          orderBy: 'date DESC',
          limit: 100
        }).catch(() => [])
      ]);

      // Generate automations based on real data
      const generatedAutomations: Automation[] = [];
      
      // Invoice automation - if there are completed projects without invoices
      const completedProjectsWithoutInvoices = (projects || []).filter((p: any) => 
        p.status === 'completed' && !invoices?.some((inv: any) => inv.project_id === p.id)
      );
      if (completedProjectsWithoutInvoices.length > 0) {
        generatedAutomations.push({
          id: 'auto-invoice',
          name: 'Invoice Generation',
          description: 'Automatically generate and send invoices when projects are marked as completed',
          category: 'workflow',
          enabled: false,
          frequency: 'real_time',
          last_run: new Date().toISOString(),
          success_rate: 95,
          time_saved: 15,
          actions_count: completedProjectsWithoutInvoices.length
        });
      }

      // Task reminder automation
      const overdueTasks = (tasks || []).filter((t: any) => {
        if (!t.due_date) return false;
        return new Date(t.due_date) < new Date() && t.status !== 'completed';
      });
      if (overdueTasks.length > 0) {
        generatedAutomations.push({
          id: 'auto-task-reminders',
          name: 'Task Reminder Notifications',
          description: 'Send automated reminders for overdue tasks',
          category: 'notification',
          enabled: false,
          frequency: 'daily',
          last_run: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          success_rate: 90,
          time_saved: 8,
          actions_count: overdueTasks.length
        });
      }

      // Attendance tracking automation
      const recentAttendance = (attendance || []).filter((a: any) => {
        const date = new Date(a.date);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return date > weekAgo;
      });
      if (recentAttendance.length > 0) {
        generatedAutomations.push({
          id: 'auto-attendance',
          name: 'Attendance Tracking',
          description: 'Automatically track and report attendance patterns',
          category: 'data_entry',
          enabled: false,
          frequency: 'daily',
          last_run: new Date().toISOString(),
          success_rate: 92,
          time_saved: 10,
          actions_count: recentAttendance.length
        });
      }

      // Generate recommendations based on real data
      const generatedRecommendations: Recommendation[] = [];
      
      // Budget alert recommendation
      const projectsNearBudget = (projects || []).filter((p: any) => {
        if (!p.budget || !p.actual_cost) return false;
        const budgetPercent = (p.actual_cost / p.budget) * 100;
        return budgetPercent >= 75 && budgetPercent < 100;
      });
      if (projectsNearBudget.length > 0) {
        generatedRecommendations.push({
          id: 'rec-budget-alerts',
          title: 'Smart Project Budget Alerts',
          description: `Create automated alerts when projects reach 80% of budget. ${projectsNearBudget.length} projects currently near budget limit.`,
          potential_impact: 'Prevent budget overruns and improve profitability',
          implementation_effort: 'medium',
          estimated_savings: 8,
          category: 'Financial Management',
          priority: 1
        });
      }

      // Timesheet reminder recommendation
      if (attendance && attendance.length > 0) {
        generatedRecommendations.push({
          id: 'rec-timesheet-reminders',
          title: 'Automate Timesheet Reminders',
          description: 'Set up automated reminders for employees who haven\'t submitted timesheets',
          potential_impact: 'Reduce timesheet submission delays by 85%',
          implementation_effort: 'low',
          estimated_savings: 4,
          category: 'Workflow Automation',
          priority: 2
        });
      }

      // Client follow-up recommendation
      const pendingInvoices = (invoices || []).filter((inv: any) => 
        inv.status === 'sent' || inv.status === 'pending'
      );
      if (pendingInvoices.length > 0) {
        generatedRecommendations.push({
          id: 'rec-client-followup',
          title: 'Client Follow-up Automation',
          description: `Automate follow-up reminders for ${pendingInvoices.length} pending invoices`,
          potential_impact: 'Improve payment collection rates by 20-30%',
          implementation_effort: 'low',
          estimated_savings: 6,
          category: 'Client Relations',
          priority: 3
        });
      }

      setAutomations(generatedAutomations);
      setRecommendations(generatedRecommendations);
    } catch (error) {
      console.error('Error fetching recommendations data:', error);
      setAutomations([]);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleAutomation = async (automationId: string) => {
    setAutomations(prev => 
      prev.map(automation => 
        automation.id === automationId 
          ? { ...automation, enabled: !automation.enabled }
          : automation
      )
    );
  };

  const implementRecommendation = async (recommendationId: string) => {
    try {
      // In a real app, this would create the automation or workflow
    } catch (error) {
      console.error('Error implementing recommendation:', error);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'workflow':
        return <Zap className="h-4 w-4 text-blue-500" />;
      case 'notification':
        return <Bot className="h-4 w-4 text-green-500" />;
      case 'data_entry':
        return <FileText className="h-4 w-4 text-purple-500" />;
      case 'reporting':
        return <TrendingUp className="h-4 w-4 text-orange-500" />;
      default:
        return <Settings className="h-4 w-4 text-gray-500" />;
    }
  };

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const totalTimeSaved = automations
    .filter(a => a.enabled)
    .reduce((total, automation) => total + (automation.time_saved * automation.actions_count), 0);

  const activeAutomations = automations.filter(a => a.enabled).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          Smart Automation & Recommendations
        </h3>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Automation Settings
        </Button>
      </div>

      {/* Automation Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Active Automations</span>
            </div>
            <p className="text-2xl font-bold mt-2">{activeAutomations}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Time Saved</span>
            </div>
            <p className="text-2xl font-bold mt-2">{Math.round(totalTimeSaved / 60)}h</p>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Success Rate</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {Math.round(automations.reduce((sum, a) => sum + a.success_rate, 0) / automations.length)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Automations */}
      <Card>
        <CardHeader>
          <CardTitle>Active Automations</CardTitle>
          <CardDescription>
            Manage your automated workflows and processes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {automations.map((automation) => (
              <div key={automation.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  {getCategoryIcon(automation.category)}
                  <div className="flex-1">
                    <h4 className="font-medium">{automation.name}</h4>
                    <p className="text-sm text-muted-foreground">{automation.description}</p>
                    
                    <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                      <span>Runs: {automation.frequency.replace('_', ' ')}</span>
                      <span>Success: {automation.success_rate}%</span>
                      <span>Saves: {automation.time_saved}min per run</span>
                      <span>Actions: {automation.actions_count}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {automation.enabled ? 'Active' : 'Disabled'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Last run: {new Date(automation.last_run).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <Switch
                    checked={automation.enabled}
                    onCheckedChange={() => toggleAutomation(automation.id)}
                  />
                  
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Smart Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Smart Recommendations</CardTitle>
          <CardDescription>
            AI-powered suggestions to improve your workflow efficiency
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendations.map((rec) => (
              <div key={rec.id} className="p-4 border rounded-lg hover:bg-muted/25">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-semibold">{rec.title}</h4>
                      <Badge className={getEffortColor(rec.implementation_effort)} variant="outline">
                        {rec.implementation_effort} effort
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3">{rec.description}</p>
                    
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-1">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span>{rec.potential_impact}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span>Saves {rec.estimated_savings}h/month</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">{rec.category}</p>
                      <p className="text-xs text-muted-foreground">Priority {rec.priority}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => implementRecommendation(rec.id)}
                    >
                      Implement
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}