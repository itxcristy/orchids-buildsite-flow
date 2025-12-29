import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Lightbulb, 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  DollarSign, 
  Calendar, 
  Target,
  Zap,
  Brain,
  BarChart3
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getAgencyId } from "@/utils/agencyUtils";
import { selectRecords, rawQuery } from "@/services/api/postgresql-service";

interface Insight {
  id: string;
  title: string;
  description: string;
  type: 'opportunity' | 'warning' | 'trend' | 'recommendation';
  impact: 'low' | 'medium' | 'high';
  confidence: number;
  actionable: boolean;
  data: any;
  created_at: string;
}

export function AIInsights() {
  const { user, profile } = useAuth();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInsights();
  }, [user?.id, profile?.agency_id]);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const agencyId = await getAgencyId(profile, user?.id);
      if (!agencyId) {
        setInsights([]);
        return;
      }

      // Fetch real data to generate insights
      const [projects, invoices, clients, tasks] = await Promise.all([
        selectRecords('projects', {
          where: { agency_id: agencyId },
          orderBy: 'created_at DESC',
          limit: 500
        }).catch(() => []),
        selectRecords('invoices', {
          where: { agency_id: agencyId },
          orderBy: 'created_at DESC',
          limit: 500
        }).catch(() => []),
        selectRecords('clients', {
          where: { agency_id: agencyId, status: 'active' },
          orderBy: 'created_at DESC',
          limit: 500
        }).catch(() => []),
        selectRecords('tasks', {
          where: { agency_id: agencyId },
          orderBy: 'created_at DESC',
          limit: 500
        }).catch(() => [])
      ]);

      const generatedInsights: Insight[] = [];

      // Budget overrun warning
      const overBudgetProjects = (projects || []).filter((p: any) => {
        if (!p.budget || !p.actual_cost) return false;
        return p.actual_cost > p.budget;
      });
      if (overBudgetProjects.length > 0) {
        generatedInsights.push({
          id: 'insight-budget-overrun',
          title: 'Budget Overrun Detected',
          description: `${overBudgetProjects.length} project(s) have exceeded their allocated budget. Immediate review recommended.`,
          type: 'warning',
          impact: 'high',
          confidence: 95,
          actionable: true,
          data: { project_count: overBudgetProjects.length },
          created_at: new Date().toISOString()
        });
      }

      // Revenue opportunity from pending invoices
      const pendingInvoices = (invoices || []).filter((inv: any) => 
        inv.status === 'sent' || inv.status === 'pending'
      );
      const pendingAmount = pendingInvoices.reduce((sum: number, inv: any) => 
        sum + (Number(inv.total_amount) || 0), 0
      );
      if (pendingAmount > 0) {
        generatedInsights.push({
          id: 'insight-pending-revenue',
          title: 'Revenue Collection Opportunity',
          description: `$${pendingAmount.toLocaleString()} in pending invoices. Implementing automated follow-ups could improve collection rates.`,
          type: 'opportunity',
          impact: 'high',
          confidence: 85,
          actionable: true,
          data: { pending_amount: pendingAmount, invoice_count: pendingInvoices.length },
          created_at: new Date().toISOString()
        });
      }

      // Project completion trend
      const completedProjects = (projects || []).filter((p: any) => p.status === 'completed').length;
      const totalProjects = projects.length || 1;
      const completionRate = (completedProjects / totalProjects) * 100;
      if (completionRate < 70 && totalProjects > 5) {
        generatedInsights.push({
          id: 'insight-completion-trend',
          title: 'Project Completion Rate Below Target',
          description: `Current completion rate is ${Math.round(completionRate)}%. Consider reviewing project management processes.`,
          type: 'trend',
          impact: 'medium',
          confidence: 88,
          actionable: true,
          data: { completion_rate: Math.round(completionRate), total_projects: totalProjects },
          created_at: new Date().toISOString()
        });
      }

      // Client engagement opportunity
      const clientsWithoutRecentProjects = (clients || []).filter((c: any) => {
        const clientProjects = (projects || []).filter((p: any) => p.client_id === c.id);
        if (clientProjects.length === 0) return true;
        const lastProject = clientProjects.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        const daysSinceLastProject = (Date.now() - new Date(lastProject.created_at).getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceLastProject > 90;
      });
      if (clientsWithoutRecentProjects.length > 0) {
        generatedInsights.push({
          id: 'insight-client-engagement',
          title: 'Client Re-engagement Opportunity',
          description: `${clientsWithoutRecentProjects.length} active client(s) haven't had a project in 90+ days. Consider reaching out for new opportunities.`,
          type: 'opportunity',
          impact: 'medium',
          confidence: 82,
          actionable: true,
          data: { client_count: clientsWithoutRecentProjects.length },
          created_at: new Date().toISOString()
        });
      }

      // Task completion efficiency
      const overdueTasks = (tasks || []).filter((t: any) => {
        if (!t.due_date || t.status === 'completed') return false;
        return new Date(t.due_date) < new Date();
      });
      if (overdueTasks.length > 0) {
        const overduePercent = (overdueTasks.length / (tasks.length || 1)) * 100;
        generatedInsights.push({
          id: 'insight-task-efficiency',
          title: 'Task Completion Efficiency Alert',
          description: `${overdueTasks.length} task(s) (${Math.round(overduePercent)}%) are overdue. Consider resource reallocation or deadline adjustments.`,
          type: 'warning',
          impact: 'medium',
          confidence: 91,
          actionable: true,
          data: { overdue_count: overdueTasks.length, overdue_percent: Math.round(overduePercent) },
          created_at: new Date().toISOString()
        });
      }

      // Revenue growth recommendation
      const recentInvoices = (invoices || []).slice(0, 6);
      if (recentInvoices.length >= 3) {
        const avgRevenue = recentInvoices.reduce((sum: number, inv: any) => 
          sum + (Number(inv.total_amount) || 0), 0
        ) / recentInvoices.length;
        const potentialGrowth = avgRevenue * 0.2; // 20% growth potential
        generatedInsights.push({
          id: 'insight-revenue-growth',
          title: 'Revenue Growth Potential',
          description: `Based on current trends, implementing client retention strategies could increase revenue by approximately $${Math.round(potentialGrowth).toLocaleString()} per month.`,
          type: 'recommendation',
          impact: 'high',
          confidence: 78,
          actionable: true,
          data: { potential_growth: Math.round(potentialGrowth) },
          created_at: new Date().toISOString()
        });
      }

      setInsights(generatedInsights);
    } catch (error) {
      console.error('Error fetching insights:', error);
      setInsights([]);
    } finally {
      setLoading(false);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'trend':
        return <BarChart3 className="h-5 w-5 text-blue-500" />;
      case 'recommendation':
        return <Lightbulb className="h-5 w-5 text-yellow-500" />;
      default:
        return <Brain className="h-5 w-5 text-gray-500" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'opportunity':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-red-100 text-red-800';
      case 'trend':
        return 'bg-blue-100 text-blue-800';
      case 'recommendation':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const refreshInsights = async () => {
    await fetchInsights();
  };

  const implementInsight = async (insightId: string) => {
    try {
      // In a real app, this would trigger automated actions or create tasks
    } catch (error) {
      console.error('Error implementing insight:', error);
    }
  };

  // Group insights by type
  const groupedInsights = insights.reduce((groups, insight) => {
    const type = insight.type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(insight);
    return groups;
  }, {} as Record<string, Insight[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          AI-Generated Insights
        </h3>
        <Button 
          variant="outline" 
          size="sm"
          onClick={refreshInsights}
          disabled={loading}
        >
          <Zap className="h-4 w-4 mr-2" />
          {loading ? 'Analyzing...' : 'Refresh Insights'}
        </Button>
      </div>

      {/* Insight Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Opportunities</span>
            </div>
            <p className="text-2xl font-bold mt-2">{groupedInsights.opportunity?.length || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">Warnings</span>
            </div>
            <p className="text-2xl font-bold mt-2">{groupedInsights.warning?.length || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Trends</span>
            </div>
            <p className="text-2xl font-bold mt-2">{groupedInsights.trend?.length || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">Recommendations</span>
            </div>
            <p className="text-2xl font-bold mt-2">{groupedInsights.recommendation?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* High Priority Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            High Priority Insights
          </CardTitle>
          <CardDescription>
            AI-identified insights requiring immediate attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {insights
              .filter(insight => insight.impact === 'high')
              .map((insight) => (
                <div key={insight.id} className="p-4 border rounded-lg hover:bg-muted/25">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {getInsightIcon(insight.type)}
                      <div className="flex-1">
                        <h4 className="font-semibold">{insight.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {insight.description}
                        </p>
                        
                        <div className="flex items-center space-x-4 mt-3">
                          <Badge className={getInsightColor(insight.type)} variant="outline">
                            {insight.type}
                          </Badge>
                          <span className={`text-sm font-medium ${getImpactColor(insight.impact)}`}>
                            {insight.impact} impact
                          </span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-muted-foreground">Confidence:</span>
                            <span className="text-sm font-medium">{insight.confidence}%</span>
                            <Progress value={insight.confidence} className="w-16 h-2" />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {insight.actionable && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => implementInsight(insight.id)}
                      >
                        Take Action
                      </Button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* All Insights by Category */}
      <div className="grid gap-6 md:grid-cols-2">
        {Object.entries(groupedInsights).map(([type, typeInsights]) => (
          <Card key={type}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 capitalize">
                {getInsightIcon(type)}
                {type}s
              </CardTitle>
              <CardDescription>
                AI-detected {type}s for your business
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {typeInsights.map((insight) => (
                  <div key={insight.id} className="p-3 border rounded-lg">
                    <h5 className="font-medium text-sm">{insight.title}</h5>
                    <p className="text-xs text-muted-foreground mt-1">
                      {insight.description}
                    </p>
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs ${getImpactColor(insight.impact)}`}>
                          {insight.impact}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {insight.confidence}% confidence
                        </span>
                      </div>
                      
                      {insight.actionable && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => implementInsight(insight.id)}
                        >
                          Act
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}