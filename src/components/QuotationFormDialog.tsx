import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/database';
import { generateUUID } from '@/lib/uuid';
import { useAuth } from '@/hooks/useAuth';
import { getAgencyId } from '@/utils/agencyUtils';
import { getClientsForSelectionAuto } from '@/services/api/client-selector-service';
import { Plus, Trash2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface QuotationLineItem {
  id: string;
  quotation_id?: string;
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  discount_percentage?: number;
  line_total?: number;
  sort_order?: number;
}

interface Quotation {
  id?: string;
  quote_number?: string;
  quotation_number?: string;
  client_id: string;
  template_id?: string | null;
  title: string;
  description?: string;
  status: string;
  issue_date?: string;
  expiry_date?: string;
  valid_until: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount?: number;
  total_amount: number;
  terms_conditions?: string;
  terms_and_conditions?: string;
  notes?: string;
  created_by?: string;
  agency_id?: string;
}

interface Client {
  id: string;
  name: string;
  company_name?: string;
}

interface QuotationTemplate {
  id: string;
  name: string;
  description?: string;
  template_data?: any;
}

interface QuotationFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  quotation?: Quotation | null;
  onQuotationSaved: () => void;
}

const QuotationFormDialog: React.FC<QuotationFormDialogProps> = ({ isOpen, onClose, quotation, onQuotationSaved }) => {
  const { toast } = useToast();
  const auth = useAuth();
  const user = auth?.user;
  const profile = auth?.profile;
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [templates, setTemplates] = useState<QuotationTemplate[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [lineItems, setLineItems] = useState<QuotationLineItem[]>([]);
  const [formData, setFormData] = useState<Quotation>({
    client_id: quotation?.client_id || '',
    title: quotation?.title || '',
    description: quotation?.description || '',
    status: quotation?.status || 'draft',
    issue_date: quotation?.issue_date || '',
    expiry_date: quotation?.expiry_date || '',
    valid_until: quotation?.valid_until || '',
    subtotal: Number(quotation?.subtotal) || 0,
    tax_rate: Number(quotation?.tax_rate) || 18,
    tax_amount: Number(quotation?.tax_amount) || 0,
    discount: Number(quotation?.discount) || 0,
    total_amount: Number(quotation?.total_amount) || 0,
    terms_conditions: quotation?.terms_conditions || quotation?.terms_and_conditions || '',
    notes: quotation?.notes || '',
    template_id: quotation?.template_id || null,
  });
  const [savingDraft, setSavingDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Format date for HTML date input (YYYY-MM-DD)
  const formatDateForInput = (dateString?: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (e) {
      console.error('Error formatting date:', e);
    }
    return '';
  };

  // Update formData when quotation prop changes
  useEffect(() => {
    if (quotation && quotation.id) {
      setFormData({
        client_id: quotation.client_id || '',
        title: quotation.title || '',
        description: quotation.description || '',
        status: quotation.status || 'draft',
        issue_date: formatDateForInput(quotation.issue_date),
        expiry_date: formatDateForInput(quotation.expiry_date),
        valid_until: formatDateForInput(quotation.valid_until),
        subtotal: Number(quotation.subtotal) || 0,
        tax_rate: Number(quotation.tax_rate) || 18,
        tax_amount: Number(quotation.tax_amount) || 0,
        discount: Number(quotation.discount) || 0,
        total_amount: Number(quotation.total_amount) || 0,
        terms_conditions: quotation.terms_conditions || quotation.terms_and_conditions || '',
        notes: quotation.notes || '',
        template_id: quotation.template_id || null,
      });
    } else if (!quotation) {
      // Reset form for new quotation
      const today = new Date().toISOString().split('T')[0];
      setFormData({
        client_id: '',
        title: '',
        description: '',
        status: 'draft',
        issue_date: today,
        expiry_date: '',
        valid_until: '',
        subtotal: 0,
        tax_rate: 18,
        tax_amount: 0,
        discount: 0,
        total_amount: 0,
        terms_conditions: '',
        notes: '',
        template_id: null,
      });
      setLastSaved(null);
    }
  }, [quotation]);

  useEffect(() => {
    if (isOpen) {
      fetchClients();
      fetchTemplates();
      if (quotation?.id) {
        fetchLineItems(quotation.id);
      } else {
        // Add one empty line item for new quotations
        setLineItems([{
          id: generateUUID(),
          item_name: '',
          description: '',
          quantity: 1,
          unit_price: 0,
          discount_percentage: 0,
          sort_order: 0,
        }]);
      }
    }
  }, [isOpen, quotation?.id]);

  const fetchClients = async () => {
    try {
      setLoadingClients(true);
      if (!user?.id) {
        setClients([]);
        return;
      }

      // Use standardized client fetching service
      const clientsData = await getClientsForSelectionAuto(profile, user.id);
      
      // Transform to component format
      setClients(clientsData.map(c => ({
        id: c.id,
        name: c.name,
        company_name: c.company_name || c.name
      })));
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch clients',
        variant: 'destructive',
      });
      setClients([]);
    } finally {
      setLoadingClients(false);
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
        .select('id, name, description, template_data')
        .eq('is_active', true)
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

  const fetchLineItems = async (quotationId: string) => {
    try {
      const { data, error } = await db
        .from('quotation_line_items')
        .select('*')
        .eq('quotation_id', quotationId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setLineItems(data && data.length > 0 ? data : [{
        id: generateUUID(),
        item_name: '',
        description: '',
        quantity: 1,
        unit_price: 0,
        discount_percentage: 0,
        sort_order: 0,
      }]);
    } catch (error: any) {
      console.error('Error fetching line items:', error);
      setLineItems([{
        id: generateUUID(),
        item_name: '',
        description: '',
        quantity: 1,
        unit_price: 0,
        discount_percentage: 0,
        sort_order: 0,
      }]);
    }
  };

  const calculateLineTotal = (item: QuotationLineItem): number => {
    const subtotal = item.quantity * item.unit_price;
    const discount = subtotal * ((item.discount_percentage || 0) / 100);
    return subtotal - discount;
  };

  // Calculate totals when line items, tax rate, or discount changes
  useEffect(() => {
    const subtotal = lineItems.reduce((sum, item) => {
      if (item.item_name && item.item_name.trim()) {
        const itemSubtotal = item.quantity * item.unit_price;
        const itemDiscount = itemSubtotal * ((item.discount_percentage || 0) / 100);
        return sum + (itemSubtotal - itemDiscount);
      }
      return sum;
    }, 0);
    
    const discountAmount = Number(formData.discount) || 0;
    const subtotalAfterDiscount = Math.max(0, subtotal - discountAmount);
    const taxAmount = subtotalAfterDiscount * (formData.tax_rate / 100);
    const totalAmount = subtotalAfterDiscount + taxAmount;

    setFormData(prev => {
      // Only update if values actually changed to prevent infinite loops
      const prevSubtotal = Number(prev.subtotal) || 0;
      const prevTaxAmount = Number(prev.tax_amount) || 0;
      const prevTotalAmount = Number(prev.total_amount) || 0;
      
      if (Math.abs(prevSubtotal - subtotal) > 0.01 || 
          Math.abs(prevTaxAmount - taxAmount) > 0.01 || 
          Math.abs(prevTotalAmount - totalAmount) > 0.01) {
        return {
          ...prev,
          subtotal: Number(subtotal.toFixed(2)),
          tax_amount: Number(taxAmount.toFixed(2)),
          total_amount: Number(totalAmount.toFixed(2)),
        };
      }
      return prev;
    });
  }, [lineItems, formData.tax_rate, formData.discount]);

  // Auto-save draft functionality
  const saveDraft = useCallback(async () => {
    if (!formData.title.trim() || !formData.client_id) {
      return; // Don't save if required fields are missing
    }

    try {
      setSavingDraft(true);
      const agencyId = await getAgencyId(profile, user?.id);
      if (!agencyId || !user?.id) {
        return;
      }

      const draftData = {
        ...formData,
        status: 'draft',
        agency_id: agencyId,
        created_by: user.id,
      };

      if (quotation?.id) {
        // Update existing draft
        await db
          .from('quotations')
          .update(draftData)
          .eq('id', quotation.id)
          .eq('agency_id', agencyId);
      } else {
        // Create new draft (only if title and client are filled)
        const quoteNumber = `Q-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
        const newDraft = {
          id: generateUUID(),
          quote_number: quoteNumber,
          ...draftData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data: insertedDraft } = await db
          .from('quotations')
          .insert([newDraft])
          .select()
          .single();

        if (insertedDraft) {
          // Update the quotation prop reference for future saves
          setFormData(prev => ({ ...prev, id: insertedDraft.id }));
        }
      }

      setLastSaved(new Date());
    } catch (error: any) {
      console.error('Error saving draft:', error);
      // Don't show error toast for auto-save failures
    } finally {
      setSavingDraft(false);
    }
  }, [formData, quotation, profile, user]);

  // Auto-save draft every 30 seconds when form has changes
  useEffect(() => {
    if (!isOpen || !formData.title.trim() || !formData.client_id) {
      return;
    }

    const autoSaveInterval = setInterval(() => {
      saveDraft();
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [isOpen, formData.title, formData.client_id, saveDraft]);

  const handleLineItemChange = (id: string, field: keyof QuotationLineItem, value: any) => {
    setLineItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        return { ...updated, line_total: calculateLineTotal(updated) };
      }
      return item;
    }));
  };

  const addLineItem = () => {
    setLineItems(prev => [...prev, {
      id: generateUUID(),
      item_name: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      discount_percentage: 0,
      sort_order: prev.length,
    }]);
  };

  const removeLineItem = (id: string) => {
    setLineItems(prev => {
      const filtered = prev.filter(item => item.id !== id);
      if (filtered.length === 0) {
        return [{
          id: generateUUID(),
          item_name: '',
          description: '',
          quantity: 1,
          unit_price: 0,
          discount_percentage: 0,
          sort_order: 0,
        }];
      }
      return filtered.map((item, index) => ({ ...item, sort_order: index }));
    });
  };

  const useTemplate = async (templateId: string) => {
    try {
      const template = templates.find(t => t.id === templateId);
      if (!template || !template.template_data) return;

      const content = typeof template.template_data === 'string' 
        ? JSON.parse(template.template_data) 
        : template.template_data;

      if (content.lineItems && Array.isArray(content.lineItems)) {
        setLineItems(content.lineItems.map((item: any, index: number) => ({
          id: generateUUID(),
          item_name: item.item_name || '',
          description: item.description || '',
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0,
          discount_percentage: item.discount_percentage || 0,
          sort_order: index,
        })));
      }

      if (content.terms_conditions) {
        setFormData(prev => ({ ...prev, terms_conditions: content.terms_conditions }));
      }

      if (content.tax_rate) {
        setFormData(prev => ({ ...prev, tax_rate: content.tax_rate }));
      }

      setFormData(prev => ({ ...prev, template_id: templateId }));

      toast({
        title: 'Success',
        description: 'Template applied successfully',
      });
    } catch (error: any) {
      console.error('Error applying template:', error);
      toast({
        title: 'Error',
        description: 'Failed to apply template',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({
        title: 'Error',
        description: 'Quotation title is required',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.client_id) {
      toast({
        title: 'Error',
        description: 'Please select a client',
        variant: 'destructive',
      });
      return;
    }

    const hasValidLineItems = lineItems.some(item => item.item_name && item.item_name.trim());
    if (!hasValidLineItems) {
      toast({
        title: 'Error',
        description: 'Please add at least one line item',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const validLineItems = lineItems.filter(item => item.item_name && item.item_name.trim());
      
      if (quotation?.id) {
        // Update existing quotation
        // Exclude generated columns (tax_amount, total_amount)
        // updated_at is automatically set by database trigger
        const agencyId = await getAgencyId(profile, user?.id);
        if (!agencyId) {
          toast({
            title: 'Error',
            description: 'Agency ID not found. Please ensure you are logged in.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        const { tax_amount, total_amount, ...updateData } = formData;
        
        // Format dates properly
        const issueDate = formData.issue_date ? new Date(formData.issue_date).toISOString().split('T')[0] : null;
        const expiryDate = formData.expiry_date ? new Date(formData.expiry_date).toISOString().split('T')[0] : null;
        const validUntil = formData.valid_until ? new Date(formData.valid_until).toISOString().split('T')[0] : null;

        const { error: updateError } = await db
          .from('quotations')
          .update({
            ...updateData,
            issue_date: issueDate,
            expiry_date: expiryDate,
            valid_until: validUntil,
            discount: formData.discount || 0,
          })
          .eq('id', quotation.id)
          .eq('agency_id', agencyId);

        if (updateError) throw updateError;

        // Delete existing line items
        await db
          .from('quotation_line_items')
          .delete()
          .eq('quotation_id', quotation.id);

        // Insert new line items
        if (validLineItems.length > 0) {
          const lineItemsToInsert = validLineItems.map((item, index) => {
            // Ensure all numeric values are properly converted and rounded
            const quantity = typeof item.quantity === 'string' 
              ? (item.quantity === '' ? 0 : parseFloat(item.quantity) || 0)
              : (Number(item.quantity) || 0);
            
            const unitPrice = typeof item.unit_price === 'string'
              ? (item.unit_price === '' ? 0 : parseFloat(item.unit_price) || 0)
              : (Number(item.unit_price) || 0);
            
            const discountPct = typeof item.discount_percentage === 'string'
              ? (item.discount_percentage === '' ? 0 : parseFloat(item.discount_percentage) || 0)
              : (Number(item.discount_percentage) || 0);
            
            // Round to appropriate decimal places
            const roundedQuantity = Math.round(quantity * 100) / 100;
            const roundedUnitPrice = Math.round(unitPrice * 100) / 100;
            const roundedDiscountPct = Math.round(discountPct * 100) / 100;
            
            return {
              id: generateUUID(),
              quotation_id: quotation.id,
              item_name: item.item_name.trim(),
              description: item.description?.trim() || null,
              quantity: roundedQuantity,
              unit_price: roundedUnitPrice,
              discount_percentage: roundedDiscountPct,
              sort_order: index,
            };
          });

          // Insert all line items in a single batch
          const { error: lineItemsError } = await db
            .from('quotation_line_items')
            .insert(lineItemsToInsert);

          if (lineItemsError) throw lineItemsError;
        }

        toast({
          title: 'Success',
          description: 'Quotation updated successfully',
        });
      } else {
        // Create new quotation
        // Exclude generated columns (tax_amount, total_amount)
        const { tax_amount, total_amount, ...quotationData } = formData;
        const quoteNumber = `Q-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
        // Get user ID and agency ID from auth context, or use defaults
        const agencyId = await getAgencyId(profile, user?.id);
        if (!agencyId || !user?.id) {
          toast({
            title: 'Error',
            description: 'Agency ID or User ID not found. Please ensure you are logged in.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
        const userId = user.id;

        // Format dates properly
        const issueDate = formData.issue_date ? new Date(formData.issue_date).toISOString().split('T')[0] : null;
        const expiryDate = formData.expiry_date ? new Date(formData.expiry_date).toISOString().split('T')[0] : null;
        const validUntil = formData.valid_until ? new Date(formData.valid_until).toISOString().split('T')[0] : null;

        const newQuotation = {
          id: generateUUID(),
          quote_number: quoteNumber,
          quotation_number: quoteNumber, // Also set quotation_number for compatibility
          ...quotationData,
          issue_date: issueDate,
          expiry_date: expiryDate,
          valid_until: validUntil,
          discount: formData.discount || 0,
          created_by: userId,
          agency_id: agencyId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data: insertedQuotation, error: insertError } = await db
          .from('quotations')
          .insert([newQuotation])
          .select()
          .single();

        if (insertError) throw insertError;

        // Insert line items
        if (validLineItems.length > 0 && insertedQuotation) {
          const lineItemsToInsert = validLineItems.map((item, index) => {
            // Ensure all numeric values are properly converted and rounded
            const quantity = typeof item.quantity === 'string' 
              ? (item.quantity === '' ? 0 : parseFloat(item.quantity) || 0)
              : (Number(item.quantity) || 0);
            
            const unitPrice = typeof item.unit_price === 'string'
              ? (item.unit_price === '' ? 0 : parseFloat(item.unit_price) || 0)
              : (Number(item.unit_price) || 0);
            
            const discountPct = typeof item.discount_percentage === 'string'
              ? (item.discount_percentage === '' ? 0 : parseFloat(item.discount_percentage) || 0)
              : (Number(item.discount_percentage) || 0);
            
            // Round to appropriate decimal places
            const roundedQuantity = Math.round(quantity * 100) / 100;
            const roundedUnitPrice = Math.round(unitPrice * 100) / 100;
            const roundedDiscountPct = Math.round(discountPct * 100) / 100;
            
            return {
              id: generateUUID(),
              quotation_id: insertedQuotation.id,
              item_name: item.item_name.trim(),
              description: item.description?.trim() || null,
              quantity: roundedQuantity,
              unit_price: roundedUnitPrice,
              discount_percentage: roundedDiscountPct,
              sort_order: index,
            };
          });

          // Insert all line items in a single batch
          const { error: lineItemsError } = await db
            .from('quotation_line_items')
            .insert(lineItemsToInsert);

          if (lineItemsError) throw lineItemsError;
        }

        toast({
          title: 'Success',
          description: 'Quotation created successfully',
        });
      }

      onQuotationSaved();
      onClose();
    } catch (error: any) {
      console.error('Error saving quotation:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save quotation',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header with Save Status */}
          <div className="flex justify-between items-center pb-2 border-b">
            <div>
              <DialogTitle className="text-xl font-semibold">
                {quotation?.id ? 'Edit Quotation' : 'Create New Quotation'}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {quotation?.id ? 'Update quotation details below.' : 'Fill in the details to create a new quotation. Your work is automatically saved as draft.'}
              </DialogDescription>
            </div>
            {lastSaved && (
              <div className="text-xs text-muted-foreground">
                Last saved: {lastSaved.toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* Template Selection */}
          {templates.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Quick Start: Use Template</CardTitle>
              </CardHeader>
              <CardContent>
                <Select onValueChange={useTemplate} value={formData.template_id || undefined}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template to pre-fill form (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Basic Information Section */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Quotation Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Website Development Project"
                    required
                  />
                  <p className="text-xs text-muted-foreground">A clear title for this quotation</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client_id">Client *</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value }))}
                    disabled={loadingClients}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.company_name || client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">The client this quotation is for</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the quotation..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">Optional description of what this quotation covers</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="issue_date">Issue Date *</Label>
                  <Input
                    id="issue_date"
                    type="date"
                    value={formData.issue_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, issue_date: e.target.value }))}
                    required
                  />
                  <p className="text-xs text-muted-foreground">When this quotation is issued</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valid_until">Valid Until</Label>
                  <Input
                    id="valid_until"
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">Expiry date for this quotation</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Current status of quotation</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Line Items</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {lineItems.map((item, index) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg">
                  <div className="col-span-4">
                    <Label className="text-xs">Item Name *</Label>
                    <Input
                      value={item.item_name}
                      onChange={(e) => handleLineItemChange(item.id, 'item_name', e.target.value)}
                      placeholder="Item name"
                    />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={item.description || ''}
                      onChange={(e) => handleLineItemChange(item.id, 'description', e.target.value)}
                      placeholder="Description"
                    />
                  </div>
                  <div className="col-span-1">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => handleLineItemChange(item.id, 'quantity', Number(e.target.value))}
                    />
                  </div>
                  <div className="col-span-1">
                    <Label className="text-xs">Unit Price</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => handleLineItemChange(item.id, 'unit_price', Number(e.target.value))}
                    />
                  </div>
                  <div className="col-span-1">
                    <Label className="text-xs">Disc. %</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={item.discount_percentage || 0}
                      onChange={(e) => handleLineItemChange(item.id, 'discount_percentage', Number(e.target.value))}
                    />
                  </div>
                  <div className="col-span-1">
                    <Label className="text-xs">Total</Label>
                    <Input
                      value={calculateLineTotal(item).toFixed(2)}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLineItem(item.id)}
                      disabled={lineItems.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Pricing & Totals Section */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing & Totals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                  <Input
                    id="tax_rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.tax_rate}
                    onChange={(e) => setFormData(prev => ({ ...prev, tax_rate: Number(e.target.value) }))}
                    placeholder="18"
                  />
                  <p className="text-xs text-muted-foreground">Tax percentage to apply</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount">Overall Discount (₹)</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.discount || 0}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount: Number(e.target.value) }))}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground">Total discount amount (applied before tax)</p>
                </div>
              </div>

              {/* Totals Summary */}
              <div className="grid grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <Label className="text-sm text-muted-foreground">Subtotal</Label>
                  <p className="text-lg font-semibold">₹{(Number(formData.subtotal) || 0).toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Discount</Label>
                  <p className="text-lg font-semibold text-red-600">-₹{(Number(formData.discount) || 0).toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Tax ({Number(formData.tax_rate) || 0}%)</Label>
                  <p className="text-lg font-semibold">₹{(Number(formData.tax_amount) || 0).toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Total Amount</Label>
                  <p className="text-2xl font-bold">₹{(Number(formData.total_amount) || 0).toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Information Section */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="terms_conditions">Terms & Conditions</Label>
                <Textarea
                  id="terms_conditions"
                  value={formData.terms_conditions}
                  onChange={(e) => setFormData(prev => ({ ...prev, terms_conditions: e.target.value }))}
                  placeholder="Enter payment terms, delivery conditions, etc."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">Standard terms and conditions for this quotation</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Internal Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Internal notes (not visible to client)..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">Private notes for your reference only</p>
              </div>
            </CardContent>
          </Card>

          <DialogFooter className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={saveDraft}
                disabled={savingDraft || !formData.title.trim() || !formData.client_id}
              >
                {savingDraft ? 'Saving Draft...' : 'Save Draft'}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : quotation?.id ? 'Update Quotation' : 'Create Quotation'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default QuotationFormDialog;
