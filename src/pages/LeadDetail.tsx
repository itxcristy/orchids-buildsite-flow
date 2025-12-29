import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, UserCheck, FileText, Calendar, Phone, Mail, MapPin, Globe, Briefcase, Building2, Tag, Plus, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/database';
import LeadFormDialog from '@/components/LeadFormDialog';
import ActivityFormDialog from '@/components/ActivityFormDialog';
import ConvertLeadToClientDialog from '@/components/ConvertLeadToClientDialog';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

const LeadDetail = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [lead, setLead] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [relatedProjects, setRelatedProjects] = useState<any[]>([]);
  const [relatedQuotations, setRelatedQuotations] = useState<any[]>([]);
  const [relatedClient, setRelatedClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [leadFormOpen, setLeadFormOpen] = useState(false);
  const [activityFormOpen, setActivityFormOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (leadId) {
      fetchLeadDetails();
      fetchActivities();
      fetchRelatedRecords();
    }
  }, [leadId]);

  const fetchLeadDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await db
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (error) throw error;
      setLead(data);
    } catch (error: any) {
      console.error('Error fetching lead:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch lead details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const { data, error } = await db
        .from('crm_activities')
        .select('*')
        .eq('lead_id', leadId)
        .order('activity_date', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (error: any) {
      console.error('Error fetching activities:', error);
    }
  };

  const fetchRelatedRecords = async () => {
    try {
      // Fetch related client if converted
      if (lead?.converted_to_client_id) {
        const { data: clientData } = await db
          .from('clients')
          .select('*')
          .eq('id', lead.converted_to_client_id)
          .single();
        setRelatedClient(clientData);
      }

      // Fetch related projects (if client exists)
      if (lead?.converted_to_client_id) {
        const { data: projectsData } = await db
          .from('projects')
          .select('*')
          .eq('client_id', lead.converted_to_client_id);
        setRelatedProjects(projectsData || []);
      }

      // Fetch related quotations (if client exists)
      if (lead?.converted_to_client_id) {
        const { data: quotationsData } = await db
          .from('quotations')
          .select('*')
          .eq('client_id', lead.converted_to_client_id);
        setRelatedQuotations(quotationsData || []);
      }
    } catch (error: any) {
      console.error('Error fetching related records:', error);
    }
  };

  const handleEdit = () => {
    setLeadFormOpen(true);
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const handleConvert = () => {
    setConvertDialogOpen(true);
  };

  const handleNewActivity = () => {
    setActivityFormOpen(true);
  };

  const handleLeadSaved = () => {
    fetchLeadDetails();
    setLeadFormOpen(false);
  };

  const handleActivitySaved = () => {
    fetchActivities();
    setActivityFormOpen(false);
  };

  const handleLeadDeleted = () => {
    navigate('/crm');
  };

  const handleLeadConverted = () => {
    fetchLeadDetails();
    fetchRelatedRecords();
    setConvertDialogOpen(false);
  };

  const handleCreateQuotation = async () => {
    try {
      if (!lead?.converted_to_client_id) {
        toast({
          title: 'Error',
          description: 'Please convert this lead to a client first',
          variant: 'destructive',
        });
        return;
      }
      navigate('/quotations', {
        state: {
          fromLead: true,
          clientId: lead.converted_to_client_id,
          leadData: lead,
        },
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create quotation',
        variant: 'destructive',
      });
    }
  };

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
      case 'meeting': return Calendar;
      default: return FileText;
    }
  };

  const getActivityStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle2;
      case 'in_progress': return Clock;
      case 'cancelled': return XCircle;
      default: return Clock;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Lead not found</p>
        <Button onClick={() => navigate('/crm')} className="mt-4">
          Back to CRM
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-start sm:space-y-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/crm')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">{lead.company_name || lead.name}</h1>
            <p className="text-sm text-muted-foreground">
              {lead.lead_number} • {lead.contact_name || lead.name}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          {lead.status !== 'won' && lead.status !== 'lost' && (
            <>
              <Button variant="outline" onClick={handleConvert}>
                <UserCheck className="h-4 w-4 mr-2" />
                Convert to Client
              </Button>
              {lead.converted_to_client_id && (
                <Button variant="outline" onClick={handleCreateQuotation}>
                  <FileText className="h-4 w-4 mr-2" />
                  Create Quotation
                </Button>
              )}
            </>
          )}
          <Button variant="outline" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Status and Priority Badges */}
      <div className="flex gap-2">
        <Badge className={getStatusColor(lead.status)}>
          {lead.status}
        </Badge>
        <Badge className={getPriorityColor(lead.priority)}>
          {lead.priority}
        </Badge>
        {lead.converted_to_client_id && (
          <Badge className="bg-green-100 text-green-800">
            Converted to Client
          </Badge>
        )}
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activities">Activities ({activities.length})</TabsTrigger>
          <TabsTrigger value="related">Related Records</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Main Information */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {lead.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium">{lead.email}</p>
                        </div>
                      </div>
                    )}
                    {lead.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Phone</p>
                          <p className="font-medium">{lead.phone}</p>
                        </div>
                      </div>
                    )}
                    {lead.address && (
                      <div className="flex items-center gap-2 md:col-span-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Address</p>
                          <p className="font-medium">{lead.address}</p>
                        </div>
                      </div>
                    )}
                    {lead.website && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Website</p>
                          <a href={lead.website} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">
                            {lead.website}
                          </a>
                        </div>
                      </div>
                    )}
                    {lead.job_title && (
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Job Title</p>
                          <p className="font-medium">{lead.job_title}</p>
                        </div>
                      </div>
                    )}
                    {lead.industry && (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Industry</p>
                          <p className="font-medium">{lead.industry}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sales Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Estimated Value</p>
                      <p className="text-xl font-semibold">
                        {lead.estimated_value || lead.value
                          ? `₹${parseFloat((lead.estimated_value || lead.value || 0).toString()).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                          : '₹0'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Probability</p>
                      <div className="flex items-center gap-2">
                        <Progress value={lead.probability || 0} className="flex-1" />
                        <span className="text-sm font-medium">{lead.probability || 0}%</span>
                      </div>
                    </div>
                    {lead.expected_close_date && (
                      <div>
                        <p className="text-sm text-muted-foreground">Expected Close Date</p>
                        <p className="font-medium">
                          {new Date(lead.expected_close_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {lead.due_date && (
                      <div>
                        <p className="text-sm text-muted-foreground">Due Date</p>
                        <p className="font-medium">
                          {new Date(lead.due_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {lead.follow_up_date && (
                      <div>
                        <p className="text-sm text-muted-foreground">Follow-up Date</p>
                        <p className="font-medium">
                          {new Date(lead.follow_up_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {(lead.notes || lead.description) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{lead.notes || lead.description}</p>
                  </CardContent>
                </Card>
              )}

              {lead.tags && lead.tags.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Tags</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {lead.tags.map((tag: string, index: number) => (
                        <Badge key={index} variant="outline">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full" onClick={handleNewActivity}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Activity
                  </Button>
                  {lead.status !== 'won' && lead.status !== 'lost' && (
                    <Button variant="outline" className="w-full" onClick={handleConvert}>
                      <UserCheck className="h-4 w-4 mr-2" />
                      Convert to Client
                    </Button>
                  )}
                  {lead.converted_to_client_id && (
                    <Button variant="outline" className="w-full" onClick={handleCreateQuotation}>
                      <FileText className="h-4 w-4 mr-2" />
                      Create Quotation
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="text-sm font-medium">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Last Updated</p>
                    <p className="text-sm font-medium">
                      {new Date(lead.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="activities" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Activity Timeline</h3>
            <Button onClick={handleNewActivity}>
              <Plus className="h-4 w-4 mr-2" />
              New Activity
            </Button>
          </div>
          {activities.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No activities found. Create your first activity to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => {
                const ActivityIcon = getActivityIcon(activity.activity_type);
                const StatusIcon = getActivityStatusIcon(activity.status);
                return (
                  <Card key={activity.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <ActivityIcon className="h-5 w-5 text-blue-600 mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold">{activity.subject}</h4>
                            <Badge variant={activity.status === 'completed' ? 'default' : 'secondary'}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {activity.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {activity.activity_type} • {new Date(activity.activity_date).toLocaleString()}
                          </p>
                          {activity.description && (
                            <p className="text-sm mt-2">{activity.description}</p>
                          )}
                          {activity.due_date && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Due: {new Date(activity.due_date).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/crm/activities/${activity.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="related" className="space-y-4">
          {relatedClient && (
            <Card>
              <CardHeader>
                <CardTitle>Converted Client</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{relatedClient.name || relatedClient.company_name}</p>
                    <p className="text-sm text-muted-foreground">{relatedClient.client_number}</p>
                  </div>
                  <Button variant="outline" onClick={() => navigate(`/clients/${relatedClient.id}`)}>
                    View Client
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {relatedProjects.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Related Projects ({relatedProjects.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {relatedProjects.map((project) => (
                    <div key={project.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="font-medium">{project.name}</p>
                        <p className="text-sm text-muted-foreground">{project.status}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${project.id}`)}>
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {relatedQuotations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Related Quotations ({relatedQuotations.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {relatedQuotations.map((quotation) => (
                    <div key={quotation.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="font-medium">{quotation.title || quotation.quote_number}</p>
                        <p className="text-sm text-muted-foreground">{quotation.status}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/quotations/${quotation.id}`)}>
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {!relatedClient && relatedProjects.length === 0 && relatedQuotations.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No related records found. Convert this lead to a client to see related projects and quotations.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <LeadFormDialog
        isOpen={leadFormOpen}
        onClose={() => setLeadFormOpen(false)}
        lead={lead}
        onLeadSaved={handleLeadSaved}
      />

      <ActivityFormDialog
        isOpen={activityFormOpen}
        onClose={() => setActivityFormOpen(false)}
        leadId={leadId}
        onActivitySaved={handleActivitySaved}
      />

      <ConvertLeadToClientDialog
        isOpen={convertDialogOpen}
        onClose={() => setConvertDialogOpen(false)}
        lead={lead}
        onConverted={handleLeadConverted}
      />

      <DeleteConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onDeleted={handleLeadDeleted}
        itemType="Lead"
        itemName={lead.company_name || lead.name}
        itemId={lead.id}
        tableName="leads"
      />
    </div>
  );
};

export default LeadDetail;
