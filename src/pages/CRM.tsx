import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Users2, Phone, Mail, Target, TrendingUp, Edit, Trash2, Calendar, UserCheck, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/database';
import LeadFormDialog from '@/components/LeadFormDialog';
import ActivityFormDialog from '@/components/ActivityFormDialog';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import ConvertLeadToClientDialog from '@/components/ConvertLeadToClientDialog';
import { PipelineBoard } from '@/components/crm/PipelineBoard';
import { useNavigate } from 'react-router-dom';

const CRM = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [leads, setLeads] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [leadFormOpen, setLeadFormOpen] = useState(false);
  const [activityFormOpen, setActivityFormOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [leadToConvert, setLeadToConvert] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activityDeleteDialogOpen, setActivityDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<any>(null);
  const [activityToDelete, setActivityToDelete] = useState<any>(null);
  const [draggedLead, setDraggedLead] = useState<string | null>(null);

  useEffect(() => {
    fetchLeads();
    fetchActivities();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const { data, error } = await db
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Normalize field names for backward compatibility
      const normalizedLeads = (data || []).map(lead => ({
        ...lead,
        estimated_value: lead.estimated_value || lead.value || 0,
        contact_name: lead.contact_name || lead.name || '',
        company_name: lead.company_name || lead.name || '',
        lead_source_id: lead.lead_source_id || lead.source_id,
        notes: lead.notes || lead.description || '',
      }));
      setLeads(normalizedLeads);
    } catch (error: any) {
      console.error('Error fetching leads:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch leads',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNewLead = () => {
    setSelectedLead(null);
    setLeadFormOpen(true);
  };

  const handleEditLead = (lead: any) => {
    setSelectedLead(lead);
    setLeadFormOpen(true);
  };

  const handleDeleteLead = (lead: any) => {
    setLeadToDelete(lead);
    setDeleteDialogOpen(true);
  };

  const handleLeadSaved = () => {
    fetchLeads();
  };

  const handleLeadDeleted = () => {
    fetchLeads();
  };

  const fetchActivities = async () => {
    try {
      setActivitiesLoading(true);
      // Fetch activities - order by created_at first, then by due_date if it exists
      let activitiesData: any[] = [];
      let activitiesError: any = null;

      try {
        const result = await db
          .from('crm_activities')
          .select('*')
          .order('created_at', { ascending: false });
        activitiesData = result.data || [];
      } catch (error: any) {
        activitiesError = error;
        // If due_date column doesn't exist, try without ordering by it
        if (error.message?.includes('due_date') || error.message?.includes('does not exist')) {
          try {
            const retryResult = await db
              .from('crm_activities')
              .select('*')
              .order('created_at', { ascending: false });
            activitiesData = retryResult.data || [];
            activitiesError = null;
          } catch (retryError: any) {
            throw retryError;
          }
        } else {
          throw error;
        }
      }

      if (activitiesError) throw activitiesError;

      // Fetch leads separately and map them
      const leadIds = activitiesData?.filter(a => a.lead_id).map(a => a.lead_id) || [];
      let leadsMap: Record<string, any> = {};
      
      if (leadIds.length > 0) {
        const { data: leadsData, error: leadsError } = await db
          .from('leads')
          .select('id, company_name, lead_number')
          .in('id', leadIds);

        if (!leadsError && leadsData) {
          leadsMap = leadsData.reduce((acc, lead) => {
            acc[lead.id] = lead;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // Map activities with lead data and sort properly
      const activitiesWithLeads = activitiesData?.map(activity => ({
        ...activity,
        leads: activity.lead_id ? leadsMap[activity.lead_id] : null
      })) || [];

      // Sort: pending first, then by due_date (if it exists), then by created_at
      activitiesWithLeads.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        if (a.due_date && b.due_date) {
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }
        if (a.due_date) return -1;
        if (b.due_date) return 1;
        // Fallback to created_at
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });

      setActivities(activitiesWithLeads);
    } catch (error: any) {
      console.error('Error fetching activities:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch activities',
        variant: 'destructive',
      });
    } finally {
      setActivitiesLoading(false);
    }
  };

  const handleNewActivity = (leadId?: string) => {
    setSelectedActivity(leadId ? { lead_id: leadId } : null);
    setActivityFormOpen(true);
  };

  const handleEditActivity = (activity: any) => {
    setSelectedActivity(activity);
    setActivityFormOpen(true);
  };

  const handleDeleteActivity = (activity: any) => {
    setActivityToDelete(activity);
    setActivityDeleteDialogOpen(true);
  };

  const handleActivitySaved = () => {
    fetchActivities();
  };

  const handleActivityDeleted = () => {
    fetchActivities();
  };

  const handleConvertToClient = (lead: any) => {
    setLeadToConvert(lead);
    setConvertDialogOpen(true);
  };

  const handleLeadConverted = () => {
    fetchLeads();
    setLeadToConvert(null);
  };

  const handleCreateQuotation = async (lead: any) => {
    try {
      // First check if lead has been converted to client
      // For now, we'll navigate to quotations page with a note to create client first if needed
      // In a full implementation, we'd check for existing client or convert first
      navigate('/quotations', { 
        state: { 
          fromLead: true, 
          leadData: {
            company_name: lead.company_name,
            contact_name: lead.contact_name,
            email: lead.email,
            phone: lead.phone,
            estimated_value: lead.estimated_value,
            notes: lead.notes,
          }
        } 
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create quotation',
        variant: 'destructive',
      });
    }
  };

  // Calculate stats from real data
  const crmStats = {
    totalLeads: leads.length,
    activeLeads: leads.filter(lead => ['new', 'contacted', 'qualified', 'proposal', 'negotiation'].includes(lead.status)).length,
    conversionRate: leads.length > 0 ? parseFloat(((leads.filter(lead => lead.status === 'won').length / leads.length) * 100).toFixed(1)) : 0,
    // Only count active leads (not won/lost) for pipeline value
    pipelineValue: leads
      .filter(lead => ['new', 'contacted', 'qualified', 'proposal', 'negotiation'].includes(lead.status))
      .reduce((sum, lead) => {
        const value = (lead.estimated_value || lead.value) ? parseFloat((lead.estimated_value || lead.value || 0).toString()) : 0;
        return sum + value;
      }, 0),
  };

  // Pipeline stages
  const pipelineStages = [
    { name: 'New', status: 'new', color: 'bg-blue-500' },
    { name: 'Contacted', status: 'contacted', color: 'bg-yellow-500' },
    { name: 'Qualified', status: 'qualified', color: 'bg-green-500' },
    { name: 'Proposal', status: 'proposal', color: 'bg-purple-500' },
    { name: 'Negotiation', status: 'negotiation', color: 'bg-orange-500' },
    { name: 'Won', status: 'won', color: 'bg-emerald-500' },
    { name: 'Lost', status: 'lost', color: 'bg-red-500' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'contacted': return 'bg-yellow-100 text-yellow-800';
      case 'qualified': return 'bg-green-100 text-green-800';
      case 'proposal': return 'bg-purple-100 text-purple-800';
      case 'negotiation': return 'bg-orange-100 text-orange-800';
      case 'won': return 'bg-emerald-100 text-emerald-800';
      case 'lost': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call': return Phone;
      case 'email': return Mail;
      case 'meeting': return Users2;
      default: return Target;
    }
  };

  const filteredLeads = leads.filter(lead => {
    const companyName = lead.company_name || lead.name || '';
    const contactName = lead.contact_name || lead.name || '';
    const matchesSearch = 
      companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.lead_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || (lead.priority || 'medium') === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Group leads by status for pipeline view
  const leadsByStatus = pipelineStages.reduce((acc, stage) => {
    acc[stage.status] = leads.filter(lead => lead.status === stage.status);
    return acc;
  }, {} as Record<string, any[]>);

  // Handle lead status change in pipeline
  const handleLeadStatusChange = async (leadId: string, newStatus: string) => {
    try {
      // Don't include updated_at - it's automatically added by the service
      const { data, error } = await db
        .from('leads')
        .update({ status: newStatus })
        .eq('id', leadId)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Lead status updated successfully',
      });

      // Refresh leads
      fetchLeads();
    } catch (error: any) {
      console.error('Error updating lead status:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update lead status',
        variant: 'destructive',
      });
    }
  };

  // Drag and drop handlers
  const onDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLead(leadId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', leadId);
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const onDragEnd = (e: React.DragEvent) => {
    setDraggedLead(null);
    // Reset visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    // Add visual feedback to drop zone
    const target = e.currentTarget as HTMLElement;
    const dropZone = target.querySelector('.bg-gray-50') as HTMLElement;
    if (dropZone) {
      dropZone.classList.add('border-blue-500', 'bg-blue-50');
    }
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Remove visual feedback from drop zone
    const target = e.currentTarget as HTMLElement;
    const dropZone = target.querySelector('.bg-gray-50') as HTMLElement;
    if (dropZone) {
      dropZone.classList.remove('border-blue-500', 'bg-blue-50');
    }
  };

  const onDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    e.stopPropagation();
    const leadId = e.dataTransfer.getData('text/plain');
    
    // Remove visual feedback
    const target = e.currentTarget as HTMLElement;
    const dropZone = target.querySelector('.bg-gray-50') as HTMLElement;
    if (dropZone) {
      dropZone.classList.remove('border-blue-500', 'bg-blue-50');
    }

    if (leadId) {
      const lead = leads.find(l => l.id === leadId);
      if (lead && lead.status !== newStatus) {
        handleLeadStatusChange(leadId, newStatus);
      }
    }
    
    setDraggedLead(null);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">CRM</h1>
          <p className="text-sm lg:text-base text-muted-foreground">Manage customer relationships and sales pipeline</p>
        </div>
        <Button onClick={handleNewLead} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          New Lead
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
              <Users2 className="h-8 w-8 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground truncate">Total Leads</p>
                <p className="text-xl font-bold truncate">{crmStats.totalLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
              <Target className="h-8 w-8 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground truncate">Active Leads</p>
                <p className="text-xl font-bold truncate">{crmStats.activeLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground truncate">Conversion Rate</p>
                <p className="text-xl font-bold truncate">{crmStats.conversionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
              <Target className="h-8 w-8 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground truncate">Pipeline Value</p>
                <p className="text-xl font-bold truncate">
                  {crmStats.pipelineValue > 0 
                    ? `₹${crmStats.pipelineValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                    : '₹0'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col space-y-2 sm:flex-row sm:gap-4 sm:space-y-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads by company, contact, or lead number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
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
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* CRM Content */}
      <Tabs defaultValue="leads" className="space-y-4">
        <TabsList>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        
        <TabsContent value="leads" className="space-y-4">
          {loading ? (
            <div className="text-center py-8">Loading leads...</div>
          ) : (
            <div className="grid gap-4">
              {filteredLeads.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No leads found. Create your first lead to get started.
                </div>
              ) : (
                filteredLeads.map((lead) => (
                  <Card key={lead.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/crm/leads/${lead.id}`)}>
                    <CardHeader className="pb-3">
                      <div className="flex flex-col space-y-3 sm:flex-row sm:justify-between sm:items-start sm:space-y-0">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{lead.company_name || lead.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {lead.lead_number} • {lead.contact_name || lead.name}
                          </p>
                        </div>
                        <div className="flex gap-2 self-start">
                          <Badge className={getStatusColor(lead.status)}>
                            {lead.status}
                          </Badge>
                          <Badge className={getPriorityColor(lead.priority || 'medium')}>
                            {lead.priority || 'medium'}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Contact</p>
                          <p className="font-medium">{lead.email || 'No email'}</p>
                          <p className="text-sm">{lead.phone || 'No phone'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Estimated Value</p>
                          <p className="font-semibold">
                            {(lead.estimated_value || lead.value)
                              ? `₹${parseFloat((lead.estimated_value || lead.value || 0).toString()).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                              : '₹0'
                            }
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Close: {lead.expected_close_date ? new Date(lead.expected_close_date).toLocaleDateString() : 'Not set'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Probability</p>
                          <div className="flex items-center gap-2">
                            <Progress value={lead.probability || 0} className="flex-1" />
                            <span className="text-sm font-medium">{lead.probability || 0}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-3 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
                        <div className="text-sm text-muted-foreground">
                          Created: {new Date(lead.created_at).toLocaleDateString()}
                        </div>
                        <div className="flex flex-col space-y-2 sm:flex-row sm:gap-2 sm:space-y-0" onClick={(e) => e.stopPropagation()}>
                          <Button variant="outline" size="sm" onClick={() => handleEditLead(lead)} className="w-full sm:w-auto">
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleNewActivity(lead.id)} className="w-full sm:w-auto">
                            <Plus className="h-4 w-4 mr-1" />
                            Add Activity
                          </Button>
                          {lead.status !== 'won' && lead.status !== 'lost' && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handleConvertToClient(lead)} className="w-full sm:w-auto">
                                <UserCheck className="h-4 w-4 mr-1" />
                                Convert
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleCreateQuotation(lead)} className="w-full sm:w-auto">
                                <FileText className="h-4 w-4 mr-1" />
                                Quote
                              </Button>
                            </>
                          )}
                          <Button variant="outline" size="sm" onClick={() => handleDeleteLead(lead)} className="w-full sm:w-auto">
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="activities" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Activities</h3>
            <Button variant="outline" onClick={() => handleNewActivity()}>
              <Plus className="h-4 w-4 mr-2" />
              New Activity
            </Button>
          </div>
          
          {activitiesLoading ? (
            <div className="text-center py-8">Loading activities...</div>
          ) : (
          <div className="grid gap-4">
              {activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No activities found. Create your first activity to get started.
                </div>
              ) : (
                activities.map((activity) => {
                  const ActivityIcon = getActivityIcon(activity.activity_type);
                  const lead = activity.leads || (typeof activity.lead_id === 'object' ? activity.lead_id : null);
              return (
                <Card key={activity.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/crm/activities/${activity.id}`)}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <ActivityIcon className="h-8 w-8 text-blue-600" />
                      <div className="flex-1">
                        <h4 className="font-semibold">{activity.subject}</h4>
                            <p className="text-sm text-muted-foreground">
                              {lead ? `${lead.lead_number} - ${lead.company_name || lead.name}` : 'No lead assigned'}
                            </p>
                            {activity.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{activity.description}</p>
                            )}
                          </div>
                          <div className="text-right flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                            {activity.due_date && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                {new Date(activity.due_date).toLocaleDateString()}
                      </div>
                            )}
                        <Badge variant={activity.status === 'completed' ? 'default' : 'secondary'}>
                          {activity.status}
                        </Badge>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleEditActivity(activity)}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDeleteActivity(activity)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
                })
              )}
          </div>
          )}
        </TabsContent>
        
        <TabsContent value="pipeline" className="space-y-4">
          <PipelineBoard
            onLeadClick={(lead) => navigate(`/crm/leads/${lead.id}`)}
            onLeadEdit={(lead) => {
              setSelectedLead(lead);
              setLeadFormOpen(true);
            }}
            onLeadDelete={(lead) => {
              setLeadToDelete(lead);
              setDeleteDialogOpen(true);
            }}
            onLeadConvert={(lead) => {
              setLeadToConvert(lead);
              setConvertDialogOpen(true);
            }}
            onScheduleActivity={(lead) => {
              setSelectedActivity({ lead_id: lead.id });
              setActivityFormOpen(true);
            }}
            onAddLead={handleNewLead}
          />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>CRM Reports & Analytics</CardTitle>
              <p className="text-muted-foreground">View insights and performance metrics for your CRM</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Lead Source Performance */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Lead Source Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="text-center py-4">Loading...</div>
                    ) : (
                      <div className="space-y-3">
                        {(() => {
                          const sourceStats: Record<string, { count: number; value: number }> = {};
                          leads.forEach(lead => {
                            const sourceId = lead.lead_source_id || lead.source_id || 'unknown';
                            if (!sourceStats[sourceId]) {
                              sourceStats[sourceId] = { count: 0, value: 0 };
                            }
                            sourceStats[sourceId].count++;
                            sourceStats[sourceId].value += (lead.estimated_value || lead.value || 0);
                          });
                          return Object.entries(sourceStats).map(([sourceId, stats]) => (
                            <div key={sourceId} className="flex justify-between items-center p-2 border rounded">
                              <span className="text-sm font-medium">
                                {sourceId === 'unknown' ? 'Unknown Source' : `Source ${sourceId.slice(0, 8)}`}
                              </span>
                              <div className="text-right">
                                <div className="text-sm font-semibold">{stats.count} leads</div>
                                <div className="text-xs text-muted-foreground">
                                  ₹{stats.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </div>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Conversion Funnel */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Conversion Funnel</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="text-center py-4">Loading...</div>
                    ) : (
                      <div className="space-y-3">
                        {pipelineStages.map(stage => {
                          const stageLeads = leads.filter(l => l.status === stage.status);
                          const percentage = leads.length > 0 ? (stageLeads.length / leads.length) * 100 : 0;
                          return (
                            <div key={stage.status} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="font-medium">{stage.name}</span>
                                <span>{stageLeads.length} ({percentage.toFixed(1)}%)</span>
                              </div>
                              <Progress value={percentage} className="h-2" />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Activity Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Activity Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {activitiesLoading ? (
                      <div className="text-center py-4">Loading...</div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex justify-between p-2 border rounded">
                          <span className="text-sm">Total Activities</span>
                          <span className="font-semibold">{activities.length}</span>
                        </div>
                        <div className="flex justify-between p-2 border rounded">
                          <span className="text-sm">Pending</span>
                          <span className="font-semibold">
                            {activities.filter(a => a.status === 'pending').length}
                          </span>
                        </div>
                        <div className="flex justify-between p-2 border rounded">
                          <span className="text-sm">Completed</span>
                          <span className="font-semibold">
                            {activities.filter(a => a.status === 'completed').length}
                          </span>
                        </div>
                        <div className="flex justify-between p-2 border rounded">
                          <span className="text-sm">In Progress</span>
                          <span className="font-semibold">
                            {activities.filter(a => a.status === 'in_progress').length}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Top Leads by Value */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Top Leads by Value</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="text-center py-4">Loading...</div>
                    ) : (
                      <div className="space-y-2">
                        {leads
                          .filter(l => (l.estimated_value || l.value) && (l.estimated_value || l.value || 0) > 0)
                          .sort((a, b) => ((b.estimated_value || b.value || 0) - (a.estimated_value || a.value || 0)))
                          .slice(0, 5)
                          .map(lead => (
                            <div key={lead.id} className="flex justify-between items-center p-2 border rounded">
                              <div>
                                <div className="text-sm font-medium">{lead.company_name || lead.name}</div>
                                <div className="text-xs text-muted-foreground">{lead.lead_number}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold">
                                  ₹{((lead.estimated_value || lead.value || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </div>
                                <Badge className={getStatusColor(lead.status)} variant="outline" style={{ fontSize: '10px' }}>
                                  {lead.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        {leads.filter(l => (l.estimated_value || l.value) && (l.estimated_value || l.value || 0) > 0).length === 0 && (
                          <div className="text-center py-4 text-muted-foreground text-sm">
                            No leads with estimated value
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <LeadFormDialog
        isOpen={leadFormOpen}
        onClose={() => setLeadFormOpen(false)}
        lead={selectedLead}
        onLeadSaved={handleLeadSaved}
      />

      <ActivityFormDialog
        isOpen={activityFormOpen}
        onClose={() => {
          setActivityFormOpen(false);
          setSelectedActivity(null);
        }}
        activity={selectedActivity}
        leadId={selectedActivity?.lead_id || (typeof selectedActivity === 'object' && selectedActivity && 'lead_id' in selectedActivity ? selectedActivity.lead_id : undefined)}
        onActivitySaved={handleActivitySaved}
      />

      <DeleteConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onDeleted={handleLeadDeleted}
        itemType="Lead"
        itemName={leadToDelete?.company_name || ''}
        itemId={leadToDelete?.id || ''}
        tableName="leads"
      />

      <DeleteConfirmDialog
        isOpen={activityDeleteDialogOpen}
        onClose={() => setActivityDeleteDialogOpen(false)}
        onDeleted={handleActivityDeleted}
        itemType="Activity"
        itemName={activityToDelete?.subject || ''}
        itemId={activityToDelete?.id || ''}
        tableName="crm_activities"
      />

      <ConvertLeadToClientDialog
        isOpen={convertDialogOpen}
        onClose={() => {
          setConvertDialogOpen(false);
          setLeadToConvert(null);
        }}
        lead={leadToConvert}
        onConverted={handleLeadConverted}
      />
    </div>
  );
};

export default CRM;