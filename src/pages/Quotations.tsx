import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, FileCheck, Send, DollarSign, Calendar, Edit, Trash2, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/database';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getAgencyId } from '@/utils/agencyUtils';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import QuotationTemplateDialog from '@/components/QuotationTemplateDialog';
import QuotationPreviewDialog from '@/components/QuotationPreviewDialog';

interface Quotation {
  id: string;
  quote_number: string;
  client_id: string;
  template_id?: string | null;
  title: string;
  description?: string;
  status: string;
  valid_until: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  terms_conditions?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  client?: {
    id: string;
    name: string;
    company_name?: string;
  };
  line_items?: Array<{
    id: string;
    item_name: string;
    description?: string;
    quantity: number;
    unit_price: number;
    discount_percentage: number;
    line_total: number;
  }>;
}

interface QuotationTemplate {
  id: string;
  name: string;
  description?: string;
  template_data?: any;
  is_active: boolean;
  last_used?: string;
  created_at: string;
}

const Quotations = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const auth = useAuth();
  const user = auth?.user;
  const profile = auth?.profile;
  const [searchTerm, setSearchTerm] = useState('');
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [templates, setTemplates] = useState<QuotationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<QuotationTemplate | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewQuotationId, setPreviewQuotationId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const clientFilterId = searchParams.get('client_id');

  useEffect(() => {
    fetchQuotations();
    fetchTemplates();
  }, []);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const agencyId = await getAgencyId(profile, user?.id);
      if (!agencyId) {
        console.warn('No agency_id available for fetching quotations');
        setQuotations([]);
        setLoading(false);
        return;
      }

      let query = db
        .from('quotations')
        .select('*')
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      // Fetch client names (filtered by agency)
      const clientIds = [...new Set((data || []).map((q: any) => q.client_id).filter(Boolean))];
      let clientsMap = new Map();

      if (clientIds.length > 0) {
        const { data: clientsData, error: clientsError } = await db
          .from('clients')
          .select('id, name, company_name')
          .eq('agency_id', agencyId)
          .eq('is_active', true)
          .in('id', clientIds);

        if (!clientsError && clientsData) {
          clientsMap = new Map(clientsData.map((c: any) => [c.id, c]));
        }
      }

      // Fetch line items for all quotations
      const quotationIds = (data || []).map((q: any) => q.id);
      let lineItemsMap = new Map();

      if (quotationIds.length > 0) {
        const { data: lineItemsData, error: lineItemsError } = await db
          .from('quotation_line_items')
          .select('*')
          .in('quotation_id', quotationIds)
          .order('sort_order', { ascending: true });

        if (!lineItemsError && lineItemsData) {
          lineItemsData.forEach((item: any) => {
            if (!lineItemsMap.has(item.quotation_id)) {
              lineItemsMap.set(item.quotation_id, []);
            }
            lineItemsMap.get(item.quotation_id).push(item);
          });
        }
      }

      // Combine data
      let quotationsWithDetails = (data || []).map((quote: any) => ({
        ...quote,
        client: clientsMap.get(quote.client_id),
        line_items: lineItemsMap.get(quote.id) || [],
      }));

      // If filtering by client from URL, apply client filter
      if (clientFilterId) {
        quotationsWithDetails = quotationsWithDetails.filter((q: any) => q.client_id === clientFilterId);
      }

      setQuotations(quotationsWithDetails);
    } catch (error: any) {
      console.error('Error fetching quotations:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch quotations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const agencyId = await getAgencyId(profile, user?.id);
      if (!agencyId) {
        console.warn('No agency_id available for fetching templates');
        setTemplates([]);
        return;
      }

      const { data, error } = await db
        .from('quotation_templates')
        .select('*')
        .eq('agency_id', agencyId)
        .order('name', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch templates',
        variant: 'destructive',
      });
    }
  };

  const handleNewQuotation = () => {
    navigate('/quotations/new');
  };

  const handleEditQuotation = (quotation: Quotation) => {
    navigate(`/quotations/${quotation.id}`);
  };

  const handlePreviewQuotation = (quotation: Quotation) => {
    setPreviewQuotationId(quotation.id);
    setPreviewDialogOpen(true);
  };

  const handleDeleteQuotation = async (quotation: Quotation) => {
    if (!confirm(`Are you sure you want to delete quotation "${quotation.title}"? This will also delete all associated line items. This action cannot be undone.`)) {
      return;
    }

    try {
      const agencyId = await getAgencyId(profile, user?.id);
      if (!agencyId) {
        toast({
          title: 'Error',
          description: 'Agency ID not found',
          variant: 'destructive',
        });
        return;
      }

      // Delete line items first
      const { error: lineItemsError } = await db
        .from('quotation_line_items')
        .delete()
        .eq('quotation_id', quotation.id);

      if (lineItemsError) throw lineItemsError;

      // Delete quotation (with agency check)
      const { error: quotationError } = await db
        .from('quotations')
        .delete()
        .eq('id', quotation.id)
        .eq('agency_id', agencyId);

      if (quotationError) throw quotationError;

      toast({
        title: 'Success',
        description: 'Quotation deleted successfully',
      });

      fetchQuotations();
    } catch (error: any) {
      console.error('Error deleting quotation:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete quotation',
        variant: 'destructive',
      });
    }
  };

  const handleSendQuotation = async (quotation: Quotation) => {
    try {
      const agencyId = await getAgencyId(profile, user?.id);
      if (!agencyId) {
        toast({
          title: 'Error',
          description: 'Agency ID not found',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await db
        .from('quotations')
        .update({ 
          status: 'sent',
        })
        .eq('id', quotation.id)
        .eq('agency_id', agencyId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Quotation sent successfully',
      });

      fetchQuotations();
    } catch (error: any) {
      console.error('Error sending quotation:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send quotation',
        variant: 'destructive',
      });
    }
  };

  const handleUseTemplate = async (template: QuotationTemplate) => {
    setSelectedQuotation(null);
    setQuotationFormOpen(true);
    
    // Update template last_used if column exists
    try {
      const agencyId = await getAgencyId(profile, user?.id);
      if (agencyId) {
        await db
          .from('quotation_templates')
          .update({ 
            last_used: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', template.id)
          .eq('agency_id', agencyId);
        
        fetchTemplates();
      }
    } catch (error) {
      // Column might not exist, ignore error
      console.error('Error updating template:', error);
    }
  };

  const handleNewTemplate = () => {
    setSelectedTemplate(null);
    setTemplateDialogOpen(true);
  };

  const handleEditTemplate = (template: QuotationTemplate) => {
    setSelectedTemplate(template);
    setTemplateDialogOpen(true);
  };

  const handleDeleteTemplate = async (template: QuotationTemplate) => {
    try {
      const agencyId = await getAgencyId(profile, user?.id);
      if (!agencyId) {
        toast({
          title: 'Error',
          description: 'Agency ID not found',
          variant: 'destructive',
        });
        return;
      }

      // Check if any quotations are using this template
      const { data: quotationsUsingTemplate, error: checkError } = await db
        .from('quotations')
        .select('id, title')
        .eq('template_id', template.id)
        .eq('agency_id', agencyId);

      if (checkError) throw checkError;

      const quotationCount = quotationsUsingTemplate?.length || 0;

      if (quotationCount > 0) {
        const quotationList = quotationsUsingTemplate
          ?.slice(0, 5)
          .map(q => `"${q.title}"`)
          .join(', ');
        const moreText = quotationCount > 5 ? ` and ${quotationCount - 5} more` : '';
        
        const message = `Cannot delete template "${template.name}" because it is being used by ${quotationCount} quotation(s): ${quotationList}${moreText}.\n\nPlease remove the template reference from these quotations first, or delete the quotations.`;
        
        toast({
          title: 'Cannot Delete Template',
          description: message,
          variant: 'destructive',
        });
        return;
      }

      // Confirm deletion if no quotations are using it
      if (!confirm(`Are you sure you want to delete template "${template.name}"? This action cannot be undone.`)) {
        return;
      }

      // Delete the template
      const { error } = await db
        .from('quotation_templates')
        .delete()
        .eq('id', template.id)
        .eq('agency_id', agencyId);

      if (error) {
        // Check if it's a foreign key constraint error
        if (error.message?.includes('foreign key constraint') || error.message?.includes('violates foreign key')) {
          toast({
            title: 'Cannot Delete Template',
            description: `This template is being used by one or more quotations. Please remove the template reference from those quotations first.`,
            variant: 'destructive',
          });
          return;
        }
        throw error;
      }

      toast({
        title: 'Success',
        description: 'Template deleted successfully',
      });

      fetchTemplates();
    } catch (error: any) {
      console.error('Error deleting template:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to delete template';
      if (error.message?.includes('foreign key constraint') || error.message?.includes('violates foreign key')) {
        errorMessage = 'This template is being used by one or more quotations. Please remove the template reference from those quotations first.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleQuotationSaved = () => {
    fetchQuotations();
  };

  const handleQuotationDeleted = () => {
    fetchQuotations();
  };

  const handleTemplateSaved = () => {
    fetchTemplates();
  };

  // Calculate stats from real data
  const quotationStats = {
    totalQuotations: quotations.length,
    pending: quotations.filter(q => q.status === 'sent').length,
    accepted: quotations.filter(q => q.status === 'accepted').length,
    totalValue: quotations.reduce((sum, q) => sum + (q.total_amount || 0), 0),
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredQuotations = quotations.filter(quote => {
    const matchesSearch = 
      quote.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.quote_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.client?.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Quotations</h1>
          <p className="text-sm lg:text-base text-muted-foreground">Manage quotes and estimates for potential clients</p>
        </div>
        <Button onClick={handleNewQuotation} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          New Quotation
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <FileCheck className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Quotes</p>
                <p className="text-2xl font-bold">{quotationStats.totalQuotations}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Send className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{quotationStats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Accepted</p>
                <p className="text-2xl font-bold">{quotationStats.accepted}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">₹{quotationStats.totalValue.toLocaleString()}</p>
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
            placeholder="Search quotations by title, number, or client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Quotations Content */}
      <Tabs defaultValue="quotations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="quotations">Quotations</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>
        
        <TabsContent value="quotations" className="space-y-4">
          {loading ? (
            <div className="text-center py-8">Loading quotations...</div>
          ) : (
            <div className="grid gap-4">
              {filteredQuotations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No quotations found. Create your first quotation to get started.
                </div>
              ) : (
                filteredQuotations.map((quote) => (
                  <Card key={quote.id} className="hover:shadow-md">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{quote.title}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {quote.quote_number} • {quote.client?.company_name || quote.client?.name || 'No client'}
                          </p>
                        </div>
                        <Badge className={getStatusColor(quote.status)}>
                          {quote.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Amount</p>
                          <p className="font-semibold">₹{(quote.total_amount || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Subtotal</p>
                          <p className="font-semibold">₹{(quote.subtotal || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Valid Until</p>
                          <p className="font-semibold">
                            {quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : 'Not set'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Created</p>
                          <p className="font-semibold">{new Date(quote.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      
                      {quote.line_items && quote.line_items.length > 0 && (
                        <div className="mb-4 p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium mb-2">Line Items ({quote.line_items.length})</p>
                          <div className="space-y-1">
                            {quote.line_items.slice(0, 3).map((item, idx) => (
                              <p key={idx} className="text-xs text-muted-foreground">
                                {item.item_name} - Qty: {item.quantity} × ₹{item.unit_price.toLocaleString()}
                              </p>
                            ))}
                            {quote.line_items.length > 3 && (
                              <p className="text-xs text-muted-foreground">+{quote.line_items.length - 3} more items</p>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="mt-4 flex flex-col space-y-2 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
                        <div className="flex flex-col space-y-2 sm:flex-row sm:gap-2 sm:space-y-0">
                          <Button variant="outline" size="sm" onClick={() => handleEditQuotation(quote)} className="w-full sm:w-auto">
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          {quote.status === 'draft' && (
                            <Button size="sm" onClick={() => handleSendQuotation(quote)} className="w-full sm:w-auto">
                              <Send className="h-4 w-4 mr-1" />
                              Send Quote
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handlePreviewQuotation(quote)} 
                            className="w-full sm:w-auto"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Preview
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDeleteQuotation(quote)} 
                            className="w-full sm:w-auto text-destructive hover:text-destructive"
                          >
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
        
        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Quotation Templates</h3>
            <Button variant="outline" onClick={handleNewTemplate}>
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </div>
          
          <div className="grid gap-4">
            {templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No templates found. Create your first template to get started.
              </div>
            ) : (
              templates.map((template) => (
                <Card key={template.id} className="hover:shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{template.description || 'No description'}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {template.last_used 
                            ? `Last used: ${new Date(template.last_used).toLocaleDateString()}`
                            : 'Never used'}
                        </p>
                        <Badge variant={template.is_active ? 'default' : 'secondary'} className="mt-2">
                          {template.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditTemplate(template)}>
                          Edit
                        </Button>
                        <Button size="sm" onClick={() => handleUseTemplate(template)}>
                          Use Template
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDeleteTemplate(template)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>


      <QuotationTemplateDialog
        isOpen={templateDialogOpen}
        onClose={() => {
          setTemplateDialogOpen(false);
          setSelectedTemplate(null);
        }}
        template={selectedTemplate}
        onTemplateSaved={handleTemplateSaved}
      />

      <QuotationPreviewDialog
        isOpen={previewDialogOpen}
        onClose={() => {
          setPreviewDialogOpen(false);
          setPreviewQuotationId(null);
        }}
        quotationId={previewQuotationId}
      />

    </div>
  );
};

export default Quotations;
