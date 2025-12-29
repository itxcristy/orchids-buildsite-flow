import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Filter, Edit, Trash2, Mail, Phone, MapPin, Building, Calendar, User, DollarSign, FileText, ExternalLink, TrendingUp, Activity } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/database';
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { useAuth } from "@/hooks/useAuth";
import { getAgencyId } from "@/utils/agencyUtils";
import { RoleGuard } from "@/components/RoleGuard";
import { hasRoleOrHigher, AppRole } from "@/utils/roleUtils";
import { useNavigate } from "react-router-dom";
import { selectRecords } from "@/services/api/postgresql-service";
import { getProjectsForSelectionAuto } from "@/services/api/project-selector-service";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

const Clients = () => {
  const { toast } = useToast();
  const { user, profile, userRole } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [clientProjects, setClientProjects] = useState<Record<string, any[]>>({});
  const [clientInvoices, setClientInvoices] = useState<Record<string, any[]>>({});
  const [clientFinancials, setClientFinancials] = useState<Record<string, any>>({});
  const [clientActivities, setClientActivities] = useState<Record<string, any[]>>({});
  const [loadingIntegration, setLoadingIntegration] = useState<Record<string, boolean>>({});
  const [clientStats, setClientStats] = useState({
    totalClients: 0,
    activeClients: 0,
    inactiveClients: 0,
    suspendedClients: 0
  });

  const canManageClients = userRole ? hasRoleOrHigher(userRole, 'sales_manager' as AppRole) : false;
  const canDeleteClients = userRole ? hasRoleOrHigher(userRole, 'admin' as AppRole) : false;

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const agencyId = await getAgencyId(profile, user?.id);
      if (!agencyId) {
        toast({
          title: 'Error',
          description: 'Agency context is missing. Please re-login.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const { data, error } = await db
        .from('clients')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setClients(data || []);
      
      // Calculate stats
      const total = data?.length || 0;
      const active = data?.filter(c => c.status === 'active').length || 0;
      const inactive = data?.filter(c => c.status === 'inactive').length || 0;
      const suspended = data?.filter(c => c.status === 'suspended').length || 0;
      
      setClientStats({
        totalClients: total,
        activeClients: active,
        inactiveClients: inactive,
        suspendedClients: suspended
      });
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch clients',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditClient = (client: any) => {
    navigate('/clients/edit/' + client.id, { state: { client } });
  };

  const handleDeleteClient = (client: any) => {
    setSelectedClient(client);
    setIsDeleteDialogOpen(true);
  };

  const handleClientSaved = () => {
    fetchClients();
    setSelectedClient(null);
  };

  const handleClientDeleted = () => {
    fetchClients();
    setSelectedClient(null);
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.phone?.includes(searchTerm) ||
                         client.contact_person?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = selectedTab === 'all' || client.status === selectedTab;
    
    return matchesSearch && matchesTab;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'suspended': return 'destructive';
      default: return 'secondary';
    }
  };

  const getIndustryColor = (industry: string) => {
    switch (industry?.toLowerCase()) {
      case 'technology': return 'bg-blue-100 text-blue-800';
      case 'healthcare': return 'bg-green-100 text-green-800';
      case 'software': return 'bg-purple-100 text-purple-800';
      case 'marketing': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const loadClientIntegrationData = async (clientId: string) => {
    if (loadingIntegration[clientId]) return;
    
    setLoadingIntegration(prev => ({ ...prev, [clientId]: true }));
    try {
      const agencyId = await getAgencyId(profile, user?.id);
      if (!agencyId) return;

      // Load projects for client
      try {
        const projects = await getProjectsForSelectionAuto(profile, user?.id, {
          clientId: clientId,
          includeInactive: false
        });
        setClientProjects(prev => ({ ...prev, [clientId]: projects }));
      } catch (error) {
        console.error('Error loading client projects:', error);
      }

      // Load invoices for client
      try {
        const invoices = await selectRecords('invoices', {
          filters: [
            { column: 'agency_id', operator: 'eq', value: agencyId },
            { column: 'client_id', operator: 'eq', value: clientId }
          ],
          orderBy: 'issue_date DESC',
          limit: 10
        });
        setClientInvoices(prev => ({ ...prev, [clientId]: invoices || [] }));

        // Calculate financial summary
        const totalInvoiced = invoices.reduce((sum: number, inv: any) => {
          return sum + (parseFloat(inv.total_amount) || 0);
        }, 0);
        
        const paidInvoices = invoices.filter((inv: any) => inv.status === 'paid');
        const totalPaid = paidInvoices.reduce((sum: number, inv: any) => {
          return sum + (parseFloat(inv.total_amount) || 0);
        }, 0);

        const outstanding = totalInvoiced - totalPaid;

        setClientFinancials(prev => ({
          ...prev,
          [clientId]: {
            totalInvoiced,
            totalPaid,
            outstanding,
            invoiceCount: invoices.length
          }
        }));
      } catch (error) {
        console.error('Error loading client invoices:', error);
      }

      // Load CRM activities for client
      try {
        const activities = await selectRecords('crm_activities', {
          filters: [
            { column: 'agency_id', operator: 'eq', value: agencyId },
            { column: 'related_entity_type', operator: 'eq', value: 'client' },
            { column: 'related_entity_id', operator: 'eq', value: clientId }
          ],
          orderBy: 'created_at DESC',
          limit: 10
        });
        setClientActivities(prev => ({ ...prev, [clientId]: activities || [] }));
      } catch (error) {
        console.error('Error loading client activities:', error);
      }
    } catch (error) {
      console.error('Error loading client integration data:', error);
    } finally {
      setLoadingIntegration(prev => ({ ...prev, [clientId]: false }));
    }
  };

  const handleClientExpand = (clientId: string) => {
    if (expandedClientId === clientId) {
      setExpandedClientId(null);
    } else {
      setExpandedClientId(clientId);
      loadClientIntegrationData(clientId);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const ClientCard = ({ client }: { client: any }) => {
    const isExpanded = expandedClientId === client.id;
    const projects = clientProjects[client.id] || [];
    const invoices = clientInvoices[client.id] || [];
    const financials = clientFinancials[client.id];
    const activities = clientActivities[client.id] || [];
    const isLoading = loadingIntegration[client.id];

    return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Building className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold">{client.name}</h3>
                <span className="text-sm text-muted-foreground">#{client.client_number}</span>
                <Badge variant={getStatusColor(client.status)}>
                  {client.status}
                </Badge>
                {client.industry && (
                  <span className={`text-xs px-2 py-1 rounded-full ${getIndustryColor(client.industry)}`}>
                    {client.industry}
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  {client.contact_person && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{client.contact_person}</span>
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span>{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{client.address}</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  {client.company_name && (
                    <div>
                      <p className="text-muted-foreground">Company</p>
                      <p className="font-medium">{client.company_name}</p>
                    </div>
                  )}
                  {client.payment_terms && (
                    <div>
                      <p className="text-muted-foreground">Payment Terms</p>
                      <p className="font-medium">{client.payment_terms} days</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">Created</p>
                    <p className="font-medium">{new Date(client.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            {canManageClients && (
              <Button variant="outline" size="sm" onClick={() => handleEditClient(client)}>
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {canDeleteClients && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleDeleteClient(client)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleClientExpand(client.id)}
          >
            {isExpanded ? 'Hide Details' : 'View Details'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/projects?client_id=${client.id}`)}
          >
            View Projects
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/invoices?client_id=${client.id}`)}
          >
            View Invoices
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/quotations?client_id=${client.id}`)}
          >
            View Quotations
          </Button>
        </div>

        {/* Expanded Integration Details */}
        {isExpanded && (
          <div className="mt-6 border-t pt-6">
            <Tabs defaultValue="projects" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="projects">
                  Projects ({projects.length})
                </TabsTrigger>
                <TabsTrigger value="financials">
                  Financial Summary
                </TabsTrigger>
                <TabsTrigger value="activities">
                  CRM Activities ({activities.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="projects" className="mt-4">
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading projects...</p>
                  </div>
                ) : projects.length > 0 ? (
                  <div className="space-y-3">
                    {projects.map((project: any) => (
                      <Card key={project.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold">{project.name}</h4>
                                {project.project_code && (
                                  <Badge variant="outline">{project.project_code}</Badge>
                                )}
                                <Badge variant={
                                  project.status === 'completed' ? 'default' :
                                  project.status === 'in_progress' ? 'secondary' :
                                  'outline'
                                }>
                                  {project.status}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                {project.start_date && (
                                  <span>Start: {new Date(project.start_date).toLocaleDateString()}</span>
                                )}
                                {project.budget && (
                                  <span>Budget: {formatCurrency(project.budget)}</span>
                                )}
                                <span>Progress: {project.progress}%</span>
                              </div>
                              {project.progress > 0 && (
                                <Progress value={project.progress} className="mt-2 h-2" />
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/project-management/${project.id}`)}
                            >
                              View <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-sm text-muted-foreground">No projects found for this client</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => navigate(`/project-management?client_id=${client.id}`)}
                    >
                      Create Project
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="financials" className="mt-4">
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading financial data...</p>
                  </div>
                ) : financials ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-sm text-muted-foreground mb-1">Total Invoiced</p>
                          <p className="text-2xl font-bold">{formatCurrency(financials.totalInvoiced)}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-sm text-muted-foreground mb-1">Total Paid</p>
                          <p className="text-2xl font-bold text-green-600">{formatCurrency(financials.totalPaid)}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-sm text-muted-foreground mb-1">Outstanding</p>
                          <p className="text-2xl font-bold text-orange-600">{formatCurrency(financials.outstanding)}</p>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {invoices.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Recent Invoices</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Invoice #</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {invoices.slice(0, 5).map((invoice: any) => (
                                <TableRow key={invoice.id}>
                                  <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                                  <TableCell>{new Date(invoice.issue_date).toLocaleDateString()}</TableCell>
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
                                    {formatCurrency(invoice.total_amount || 0)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          <div className="mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/invoices?client_id=${client.id}`)}
                            >
                              View All Invoices <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <DollarSign className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-sm text-muted-foreground">No financial data available</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="activities" className="mt-4">
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading activities...</p>
                  </div>
                ) : activities.length > 0 ? (
                  <div className="space-y-3">
                    {activities.map((activity: any) => (
                      <Card key={activity.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Activity className="h-4 w-4 text-muted-foreground" />
                                <h4 className="font-semibold">{activity.title || activity.type}</h4>
                                <Badge variant="outline">{activity.type}</Badge>
                              </div>
                              {activity.description && (
                                <p className="text-sm text-muted-foreground mb-2">{activity.description}</p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {new Date(activity.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-sm text-muted-foreground">No CRM activities found</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading clients...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Clients</h1>
          <p className="text-muted-foreground">Manage client relationships and project details</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Export List
          </Button>
          {canManageClients && (
            <Button onClick={() => navigate('/clients/create')}>
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Building className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Clients</p>
                <p className="text-2xl font-bold">{clientStats.totalClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active Clients</p>
                <p className="text-2xl font-bold">{clientStats.activeClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Inactive Clients</p>
                <p className="text-2xl font-bold">{clientStats.inactiveClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Suspended Clients</p>
                <p className="text-2xl font-bold">{clientStats.suspendedClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search clients..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Clients ({clientStats.totalClients})</TabsTrigger>
          <TabsTrigger value="active">Active ({clientStats.activeClients})</TabsTrigger>
          <TabsTrigger value="inactive">Inactive ({clientStats.inactiveClients})</TabsTrigger>
          <TabsTrigger value="suspended">Suspended ({clientStats.suspendedClients})</TabsTrigger>
        </TabsList>
        
        <TabsContent value={selectedTab} className="mt-6">
          {filteredClients.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Building className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">No clients found</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first client.'}
                  </p>
                  {canManageClients && (
                    <Button onClick={() => navigate('/clients/create')}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Client
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredClients.map((client) => (
                <ClientCard key={client.id} client={client} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>


      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setSelectedClient(null);
        }}
        onDeleted={handleClientDeleted}
        itemType="Client"
        itemName={selectedClient?.name || ''}
        itemId={selectedClient?.id || ''}
        tableName="clients"
        softDelete={true}
        userId={user?.id}
      />
    </div>
  );
};

export default Clients;