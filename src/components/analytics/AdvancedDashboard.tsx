import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Settings, Download, Trash2, Edit, BarChart3, PieChart, Calendar, Table } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/database';
import { toast } from 'sonner';
import { getAgencyId } from '@/utils/agencyUtils';
import { selectRecords } from '@/services/api/postgresql-service';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart as RechartsPieChart, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface DashboardWidget {
  id: string;
  widget_type: string;
  title: string;
  data_source: string;
  config: any;
  position: any;
  is_active: boolean;
  user_id: string;
  agency_id: string;
  created_at: string;
  updated_at: string;
}

interface CustomReport {
  id: string;
  name: string;
  description: string;
  data_sources: string[];
  filters: any;
  is_public: boolean;
  is_scheduled: boolean;
  user_id: string;
  agency_id: string;
  aggregations: any;
  group_by: string[];
  visualizations: any;
  schedule_config: any;
  created_at: string;
  updated_at: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function AdvancedDashboard() {
  const { user, profile } = useAuth();
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [reports, setReports] = useState<CustomReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [showWidgetDialog, setShowWidgetDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [editingWidget, setEditingWidget] = useState<DashboardWidget | null>(null);
  const [editingReport, setEditingReport] = useState<CustomReport | null>(null);
  const [widgetForm, setWidgetForm] = useState({
    title: '',
    widget_type: 'chart',
    data_source: '',
    config: {}
  });
  const [reportForm, setReportForm] = useState({
    name: '',
    description: '',
    data_sources: [] as string[],
    is_public: false,
    is_scheduled: false
  });

  const fetchWidgets = async () => {
    try {
      if (!agencyId) return;
      
      const { data, error } = await db
        .from('dashboard_widgets')
        .select('*')
        .eq('is_active', true)
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWidgets(data || []);
    } catch (error) {
      logError('Error fetching widgets:', error);
      toast.error('Failed to load dashboard widgets');
    }
  };

  const fetchReports = async () => {
    try {
      if (!agencyId) return;
      
      const { data, error } = await db
        .from('custom_reports')
        .select('*')
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      logError('Error fetching reports:', error);
      toast.error('Failed to load custom reports');
    }
  };

  useEffect(() => {
    const initializeAgency = async () => {
      const id = await getAgencyId(profile, user?.id);
      setAgencyId(id);
      if (id) {
        await Promise.all([fetchWidgets(), fetchReports()]);
      }
      setLoading(false);
    };
    if (user?.id) {
      initializeAgency();
    }
  }, [user?.id, profile?.agency_id]);

  const handleCreateWidget = async () => {
    if (!user || !widgetForm.title || !widgetForm.data_source || !agencyId) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await db
        .from('dashboard_widgets')
        .insert({
          ...widgetForm,
          user_id: user.id,
          agency_id: agencyId
        });

      if (error) throw error;

      toast.success('Widget created successfully');
      setShowWidgetDialog(false);
      setWidgetForm({ title: '', widget_type: 'chart', data_source: '', config: {} });
      fetchWidgets();
    } catch (error) {
      logError('Error creating widget:', error);
      toast.error('Failed to create widget');
    }
  };

  const handleCreateReport = async () => {
    if (!user || !reportForm.name || reportForm.data_sources.length === 0 || !agencyId) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await db
        .from('custom_reports')
        .insert({
          ...reportForm,
          user_id: user.id,
          agency_id: agencyId
        });

      if (error) throw error;

      toast.success('Report created successfully');
      setShowReportDialog(false);
      setReportForm({ name: '', description: '', data_sources: [], is_public: false, is_scheduled: false });
      fetchReports();
    } catch (error) {
      logError('Error creating report:', error);
      toast.error('Failed to create report');
    }
  };

  const handleDeleteWidget = async (widgetId: string) => {
    try {
      const { error } = await db
        .from('dashboard_widgets')
        .update({ is_active: false })
        .eq('id', widgetId);

      if (error) throw error;

      toast.success('Widget deleted successfully');
      fetchWidgets();
    } catch (error) {
      logError('Error deleting widget:', error);
      toast.error('Failed to delete widget');
    }
  };

  const getWidgetIcon = (type: string) => {
    switch (type) {
      case 'chart':
        return <BarChart3 className="h-4 w-4" />;
      case 'metric':
        return <PieChart className="h-4 w-4" />;
      case 'table':
        return <Table className="h-4 w-4" />;
      case 'calendar':
        return <Calendar className="h-4 w-4" />;
      default:
        return <BarChart3 className="h-4 w-4" />;
    }
  };

  const [widgetData, setWidgetData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (widgets.length > 0 && agencyId) {
      fetchWidgetData();
    }
  }, [widgets, agencyId]);

  const fetchWidgetData = async () => {
    try {
      const dataMap: Record<string, any> = {};
      
      for (const widget of widgets) {
        try {
          let data: any[] = [];
          
          // Fetch data based on widget data_source
          switch (widget.data_source) {
            case 'invoices':
              data = await selectRecords('invoices', {
                where: { agency_id: agencyId },
                orderBy: 'created_at DESC',
                limit: 12
              }).catch(() => []);
              // Transform to chart data (monthly revenue)
              const monthlyData = transformToMonthlyData(data, 'total_amount', 'created_at');
              dataMap[widget.id] = monthlyData;
              break;
              
            case 'projects':
              data = await selectRecords('projects', {
                where: { agency_id: agencyId },
                orderBy: 'created_at DESC',
                limit: 12
              }).catch(() => []);
              const projectMonthlyData = transformToMonthlyData(data, 'budget', 'created_at');
              dataMap[widget.id] = projectMonthlyData;
              break;
              
            case 'clients':
              data = await selectRecords('clients', {
                where: { agency_id: agencyId, status: 'active' },
                orderBy: 'created_at DESC',
                limit: 12
              }).catch(() => []);
              const clientMonthlyData = transformToMonthlyData(data, 'id', 'created_at', true); // count
              dataMap[widget.id] = clientMonthlyData;
              break;
              
            case 'tasks':
              data = await selectRecords('tasks', {
                where: { agency_id: agencyId },
                orderBy: 'created_at DESC',
                limit: 12
              }).catch(() => []);
              const taskMonthlyData = transformToMonthlyData(data, 'id', 'created_at', true); // count
              dataMap[widget.id] = taskMonthlyData;
              break;
              
            default:
              // Default sample data if data_source not recognized
              dataMap[widget.id] = [
                { name: 'Jan', value: 0 },
                { name: 'Feb', value: 0 },
                { name: 'Mar', value: 0 },
                { name: 'Apr', value: 0 },
                { name: 'May', value: 0 }
              ];
          }
        } catch (error: any) {
          logError(`Error fetching data for widget ${widget.id}:`, error);
          // Set empty data on error
          dataMap[widget.id] = [
            { name: 'Jan', value: 0 },
            { name: 'Feb', value: 0 },
            { name: 'Mar', value: 0 },
            { name: 'Apr', value: 0 },
            { name: 'May', value: 0 }
          ];
        }
      }
      
      setWidgetData(dataMap);
    } catch (error) {
      logError('Error fetching widget data:', error);
    }
  };

  const transformToMonthlyData = (data: any[], valueKey: string, dateKey: string, isCount = false) => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const monthlyMap: Record<string, number> = {};
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = monthNames[date.getMonth()];
      monthlyMap[monthKey] = 0;
    }
    
    // Aggregate data by month
    (data || []).forEach((item: any) => {
      if (!item[dateKey]) return;
      const date = new Date(item[dateKey]);
      const monthKey = monthNames[date.getMonth()];
      if (monthlyMap.hasOwnProperty(monthKey)) {
        if (isCount) {
          monthlyMap[monthKey]++;
        } else {
          monthlyMap[monthKey] += Number(item[valueKey]) || 0;
        }
      }
    });
    
    return Object.entries(monthlyMap).map(([name, value]) => ({ name, value: Math.round(value) }));
  };

  const getWidgetMetric = async (widget: DashboardWidget): Promise<number> => {
    try {
      switch (widget.data_source) {
        case 'invoices':
          const invoices = await selectRecords('invoices', {
            where: { agency_id: agencyId },
            limit: 1000
          }).catch(() => []);
          return (invoices || []).reduce((sum: number, inv: any) => 
            sum + (Number(inv.total_amount) || 0), 0
          );
        case 'projects':
          const projects = await selectRecords('projects', {
            where: { agency_id: agencyId }
          }).catch(() => []);
          return (projects || []).length;
        case 'clients':
          const clients = await selectRecords('clients', {
            where: { agency_id: agencyId, status: 'active' }
          }).catch(() => []);
          return (clients || []).length;
        case 'tasks':
          const tasks = await selectRecords('tasks', {
            where: { agency_id: agencyId }
          }).catch(() => []);
          return (tasks || []).length;
        default:
          return 0;
      }
    } catch (error) {
      logError(`Error fetching metric for widget ${widget.id}:`, error);
      return 0;
    }
  };

  const renderWidget = (widget: DashboardWidget) => {
    const chartData = widgetData[widget.id] || [
      { name: 'Jan', value: 0 },
      { name: 'Feb', value: 0 },
      { name: 'Mar', value: 0 },
      { name: 'Apr', value: 0 },
      { name: 'May', value: 0 }
    ];

    return (
      <Card key={widget.id} className="relative">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center space-x-2">
            {getWidgetIcon(widget.widget_type)}
            <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingWidget(widget);
                setWidgetForm({
                  title: widget.title,
                  widget_type: widget.widget_type,
                  data_source: widget.data_source,
                  config: widget.config
                });
                setShowWidgetDialog(true);
              }}
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteWidget(widget.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] w-full">
            {widget.widget_type === 'chart' && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
            {widget.widget_type === 'metric' && (
              <WidgetMetricDisplay widget={widget} />
            )}
            {widget.widget_type === 'table' && (
              <div className="text-center text-muted-foreground">
                <Table className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Table widget for {widget.data_source}</p>
              </div>
            )}
            {widget.widget_type === 'calendar' && (
              <div className="text-center text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Calendar widget for {widget.data_source}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const WidgetMetricDisplay = ({ widget }: { widget: DashboardWidget }) => {
    const [metric, setMetric] = useState<number | null>(null);
    
    useEffect(() => {
      getWidgetMetric(widget).then(setMetric);
    }, [widget.id, agencyId]);
    
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-3xl font-bold text-primary">
            {metric !== null ? metric.toLocaleString() : '...'}
          </div>
          <p className="text-sm text-muted-foreground">Total {widget.data_source}</p>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading advanced dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Advanced Analytics Dashboard</h1>
          <p className="text-muted-foreground">Customize your analytics experience with widgets and reports</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => setShowReportDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Report
          </Button>
          <Button onClick={() => setShowWidgetDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Widget
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="reports">Custom Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          {widgets.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No widgets yet</p>
                <p className="text-muted-foreground mb-4">Create your first widget to start building your dashboard</p>
                <Button onClick={() => setShowWidgetDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Widget
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {widgets.map(renderWidget)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          {reports.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <PieChart className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No custom reports</p>
                <p className="text-muted-foreground mb-4">Create custom reports to analyze your data</p>
                <Button onClick={() => setShowReportDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Report
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {reports.map((report) => (
                <Card key={report.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          <span>{report.name}</span>
                          {report.is_public && <Badge variant="secondary">Public</Badge>}
                          {report.is_scheduled && <Badge variant="outline">Scheduled</Badge>}
                        </CardTitle>
                        <CardDescription>{report.description}</CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {report.data_sources.map((source, index) => (
                        <Badge key={index} variant="outline">{source}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Widget Creation Dialog */}
      <Dialog open={showWidgetDialog} onOpenChange={setShowWidgetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingWidget ? 'Edit Widget' : 'Create New Widget'}</DialogTitle>
            <DialogDescription>
              {editingWidget ? 'Update your widget configuration' : 'Add a new widget to your dashboard'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="widget-title">Title</Label>
              <Input
                id="widget-title"
                value={widgetForm.title}
                onChange={(e) => setWidgetForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Widget title"
              />
            </div>

            <div>
              <Label htmlFor="widget-type">Widget Type</Label>
              <Select
                value={widgetForm.widget_type}
                onValueChange={(value) => setWidgetForm(prev => ({ ...prev, widget_type: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select widget type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chart">Chart</SelectItem>
                  <SelectItem value="metric">Metric</SelectItem>
                  <SelectItem value="table">Table</SelectItem>
                  <SelectItem value="calendar">Calendar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="data-source">Data Source</Label>
              <Select
                value={widgetForm.data_source}
                onValueChange={(value) => setWidgetForm(prev => ({ ...prev, data_source: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select data source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="projects">Projects</SelectItem>
                  <SelectItem value="invoices">Invoices</SelectItem>
                  <SelectItem value="employees">Employees</SelectItem>
                  <SelectItem value="clients">Clients</SelectItem>
                  <SelectItem value="tasks">Tasks</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWidgetDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateWidget}>
              {editingWidget ? 'Update Widget' : 'Create Widget'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Creation Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Custom Report</DialogTitle>
            <DialogDescription>
              Build a custom report with your preferred data sources and filters
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="report-name">Report Name</Label>
              <Input
                id="report-name"
                value={reportForm.name}
                onChange={(e) => setReportForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Report name"
              />
            </div>

            <div>
              <Label htmlFor="report-description">Description</Label>
              <Textarea
                id="report-description"
                value={reportForm.description}
                onChange={(e) => setReportForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Report description"
              />
            </div>

            <div>
              <Label>Data Sources</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {['projects', 'invoices', 'employees', 'clients', 'tasks'].map((source) => (
                  <Badge
                    key={source}
                    variant={reportForm.data_sources.includes(source) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      setReportForm(prev => ({
                        ...prev,
                        data_sources: prev.data_sources.includes(source)
                          ? prev.data_sources.filter(s => s !== source)
                          : [...prev.data_sources, source]
                      }));
                    }}
                  >
                    {source}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateReport}>
              Create Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}