import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { Plus, Trash2, ArrowLeft, Save, Copy, Calculator } from 'lucide-react';
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

const QuotationForm: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
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
    client_id: '',
    title: '',
    description: '',
    status: 'draft',
    issue_date: new Date().toISOString().split('T')[0],
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

  // Load quotation if editing
  useEffect(() => {
    const loadQuotation = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const agencyId = await getAgencyId(profile, user?.id);
        if (!agencyId) {
          toast({
            title: 'Error',
            description: 'Agency ID not found',
            variant: 'destructive',
          });
          navigate('/quotations');
          return;
        }

        const { data: quotation, error } = await db
          .from('quotations')
          .select('*')
          .eq('id', id)
          .eq('agency_id', agencyId)
          .single();

        if (error) throw error;
        if (!quotation) {
          toast({
            title: 'Error',
            description: 'Quotation not found',
            variant: 'destructive',
          });
          navigate('/quotations');
          return;
        }

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

        // Load line items
        const { data: items, error: itemsError } = await db
          .from('quotation_line_items')
          .select('*')
          .eq('quotation_id', id)
          .order('sort_order', { ascending: true });

        if (!itemsError && items && items.length > 0) {
          setLineItems(items);
        } else {
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
      } catch (error: any) {
        console.error('Error loading quotation:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to load quotation',
          variant: 'destructive',
        });
        navigate('/quotations');
      } finally {
        setLoading(false);
      }
    };

    loadQuotation();
  }, [id, profile, user, navigate, toast]);

  useEffect(() => {
    fetchClients();
    fetchTemplates();
    if (!id) {
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
  }, [id]);

  const fetchClients = async () => {
    try {
      setLoadingClients(true);
      const agencyId = await getAgencyId(profile, user?.id);
      if (!agencyId) {
        console.warn('No agency_id available for fetching clients');
        setClients([]);
        return;
      }

      const { data, error } = await db
        .from('clients')
        .select('id, name, company_name')
        .eq('agency_id', agencyId)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch clients',
        variant: 'destructive',
      });
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
    }
  };

  const calculateLineTotal = (item: QuotationLineItem): number => {
    // Safely convert to numbers, handling strings and empty values
    const qty = typeof item.quantity === 'string' 
      ? (item.quantity === '' ? 0 : parseFloat(item.quantity) || 0)
      : (Number(item.quantity) || 0);
    
    const price = typeof item.unit_price === 'string'
      ? (item.unit_price === '' ? 0 : parseFloat(item.unit_price) || 0)
      : (Number(item.unit_price) || 0);
    
    const discountPct = typeof item.discount_percentage === 'string'
      ? (item.discount_percentage === '' ? 0 : parseFloat(item.discount_percentage) || 0)
      : (Number(item.discount_percentage) || 0);
    
    const subtotal = qty * price;
    const discount = subtotal * (discountPct / 100);
    const total = subtotal - discount;
    
    // Round to 2 decimal places
    return Math.round(total * 100) / 100;
  };

  // Calculate totals when line items, tax rate, or discount changes
  useEffect(() => {
    const subtotal = lineItems.reduce((sum, item) => {
      if (item.item_name && item.item_name.trim()) {
        // Safely convert to numbers
        const qty = typeof item.quantity === 'string' 
          ? (item.quantity === '' ? 0 : parseFloat(item.quantity) || 0)
          : (Number(item.quantity) || 0);
        
        const price = typeof item.unit_price === 'string'
          ? (item.unit_price === '' ? 0 : parseFloat(item.unit_price) || 0)
          : (Number(item.unit_price) || 0);
        
        const discountPct = typeof item.discount_percentage === 'string'
          ? (item.discount_percentage === '' ? 0 : parseFloat(item.discount_percentage) || 0)
          : (Number(item.discount_percentage) || 0);
        
        const itemSubtotal = qty * price;
        const itemDiscount = itemSubtotal * (discountPct / 100);
        const lineTotal = itemSubtotal - itemDiscount;
        
        return sum + lineTotal;
      }
      return sum;
    }, 0);
    
    // Round subtotal to 2 decimal places
    const roundedSubtotal = Math.round(subtotal * 100) / 100;
    
    // Get discount amount (handle string or number)
    const discountAmount = typeof formData.discount === 'string' && formData.discount === ''
      ? 0
      : (Number(formData.discount) || 0);
    
    const subtotalAfterDiscount = Math.max(0, roundedSubtotal - discountAmount);
    const taxRate = Number(formData.tax_rate) || 0;
    const taxAmount = subtotalAfterDiscount * (taxRate / 100);
    const totalAmount = subtotalAfterDiscount + taxAmount;

    // Round all amounts to 2 decimal places
    const roundedTaxAmount = Math.round(taxAmount * 100) / 100;
    const roundedTotalAmount = Math.round(totalAmount * 100) / 100;

    setFormData(prev => {
      const prevSubtotal = Number(prev.subtotal) || 0;
      const prevTaxAmount = Number(prev.tax_amount) || 0;
      const prevTotalAmount = Number(prev.total_amount) || 0;
      
      // Only update if values actually changed (more than 0.01 difference)
      if (Math.abs(prevSubtotal - roundedSubtotal) > 0.01 || 
          Math.abs(prevTaxAmount - roundedTaxAmount) > 0.01 || 
          Math.abs(prevTotalAmount - roundedTotalAmount) > 0.01) {
        return {
          ...prev,
          subtotal: roundedSubtotal,
          tax_amount: roundedTaxAmount,
          total_amount: roundedTotalAmount,
        };
      }
      return prev;
    });
  }, [lineItems, formData.tax_rate, formData.discount]);

  // Track if user is actively typing
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save draft functionality (silent, non-intrusive)
  const saveDraft = useCallback(async (silent = true) => {
    if (!formData.title.trim() || !formData.client_id || isTyping) {
      return;
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

      if (id) {
        // Update existing draft
        const issueDate = formData.issue_date ? new Date(formData.issue_date).toISOString().split('T')[0] : null;
        const expiryDate = formData.expiry_date ? new Date(formData.expiry_date).toISOString().split('T')[0] : null;
        const validUntil = formData.valid_until ? new Date(formData.valid_until).toISOString().split('T')[0] : null;

        await db
          .from('quotations')
          .update({
            ...draftData,
            issue_date: issueDate,
            expiry_date: expiryDate,
            valid_until: validUntil,
            discount: formData.discount || 0,
          })
          .eq('id', id)
          .eq('agency_id', agencyId);
      } else {
        // Create new draft
        const quoteNumber = `Q-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
        const issueDate = formData.issue_date ? new Date(formData.issue_date).toISOString().split('T')[0] : null;
        const expiryDate = formData.expiry_date ? new Date(formData.expiry_date).toISOString().split('T')[0] : null;
        const validUntil = formData.valid_until ? new Date(formData.valid_until).toISOString().split('T')[0] : null;

        const newDraft = {
          id: generateUUID(),
          quote_number: quoteNumber,
          quotation_number: quoteNumber,
          ...draftData,
          issue_date: issueDate,
          expiry_date: expiryDate,
          valid_until: validUntil,
          discount: formData.discount || 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data: insertedDraft } = await db
          .from('quotations')
          .insert([newDraft])
          .select()
          .single();

        if (insertedDraft) {
          navigate(`/quotations/${insertedDraft.id}`, { replace: true });
        }
      }

      setLastSaved(new Date());
    } catch (error: any) {
      console.error('Error saving draft:', error);
      // Silent fail - don't interrupt user
    } finally {
      setSavingDraft(false);
    }
  }, [formData, id, profile, user, navigate, isTyping]);

  // Handle typing detection
  const handleTyping = useCallback(() => {
    setIsTyping(true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 2000); // Wait 2 seconds after user stops typing
  }, []);

  // Auto-save draft when user stops typing (after 2 seconds) or every 60 seconds
  useEffect(() => {
    if (!formData.title.trim() || !formData.client_id) {
      return;
    }

    // Save when user stops typing
    if (!isTyping) {
      const saveTimeout = setTimeout(() => {
        saveDraft(true);
      }, 2000);

      return () => clearTimeout(saveTimeout);
    }
  }, [isTyping, formData.title, formData.client_id, saveDraft]);

  // Also auto-save every 60 seconds as backup
  useEffect(() => {
    if (!formData.title.trim() || !formData.client_id || isTyping) {
      return;
    }

    const autoSaveInterval = setInterval(() => {
      saveDraft(true);
    }, 60000); // Every 60 seconds

    return () => clearInterval(autoSaveInterval);
  }, [formData.title, formData.client_id, isTyping, saveDraft]);

  const handleLineItemChange = (itemId: string, field: keyof QuotationLineItem, value: any) => {
    handleTyping(); // Track typing activity
    setLineItems(prev => prev.map(item => {
      if (item.id === itemId) {
        // For number fields, allow empty string instead of forcing 0
        let processedValue = value;
        if ((field === 'quantity' || field === 'unit_price' || field === 'discount_percentage') && value === '') {
          processedValue = '';
        } else if ((field === 'quantity' || field === 'unit_price' || field === 'discount_percentage')) {
          processedValue = Number(value) || 0;
        }
        const updated = { ...item, [field]: processedValue };
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

  const removeLineItem = (itemId: string) => {
    setLineItems(prev => {
      const filtered = prev.filter(item => item.id !== itemId);
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

  const duplicateLineItem = (itemId: string) => {
    const itemToDuplicate = lineItems.find(item => item.id === itemId);
    if (itemToDuplicate) {
      const newItem: QuotationLineItem = {
        id: generateUUID(),
        item_name: itemToDuplicate.item_name,
        description: itemToDuplicate.description,
        quantity: itemToDuplicate.quantity,
        unit_price: itemToDuplicate.unit_price,
        discount_percentage: itemToDuplicate.discount_percentage || 0,
        sort_order: lineItems.length,
      };
      setLineItems(prev => [...prev, newItem]);
      toast({
        title: 'Success',
        description: 'Item duplicated',
      });
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
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

      // Format dates properly
      const issueDate = formData.issue_date ? new Date(formData.issue_date).toISOString().split('T')[0] : null;
      const expiryDate = formData.expiry_date ? new Date(formData.expiry_date).toISOString().split('T')[0] : null;
      const validUntil = formData.valid_until ? new Date(formData.valid_until).toISOString().split('T')[0] : null;

      if (id) {
        // Update existing quotation
        const { tax_amount, total_amount, ...updateData } = formData;
        const { error: updateError } = await db
          .from('quotations')
          .update({
            ...updateData,
            issue_date: issueDate,
            expiry_date: expiryDate,
            valid_until: validUntil,
            discount: formData.discount || 0,
          })
          .eq('id', id)
          .eq('agency_id', agencyId);

        if (updateError) throw updateError;

        // Delete existing line items
        await db
          .from('quotation_line_items')
          .delete()
          .eq('quotation_id', id);

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
              quotation_id: id,
              item_name: item.item_name.trim(),
              description: item.description?.trim() || null,
              quantity: roundedQuantity,
              unit_price: roundedUnitPrice,
              discount_percentage: roundedDiscountPct,
              sort_order: index,
            };
          });

          // Insert all line items in a single batch
          if (lineItemsToInsert.length > 0) {
            const { error: lineItemsError } = await db
              .from('quotation_line_items')
              .insert(lineItemsToInsert);

            if (lineItemsError) throw lineItemsError;
          }
        }

        toast({
          title: 'Success',
          description: 'Quotation updated successfully',
        });
      } else {
        // Create new quotation
        const { tax_amount, total_amount, ...quotationData } = formData;
        const quoteNumber = `Q-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
        const userId = user.id;

        const newQuotation = {
          id: generateUUID(),
          quote_number: quoteNumber,
          quotation_number: quoteNumber,
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
          if (lineItemsToInsert.length > 0) {
            const { error: lineItemsError } = await db
              .from('quotation_line_items')
              .insert(lineItemsToInsert);

            if (lineItemsError) throw lineItemsError;
          }
        }

        toast({
          title: 'Success',
          description: 'Quotation created successfully',
        });
      }

      navigate('/quotations');
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

  if (loading && id) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading quotation...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/quotations')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Quotations
          </Button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">
              {id ? 'Edit Quotation' : 'Create New Quotation'}
            </h1>
            <p className="text-sm lg:text-base text-muted-foreground">
              {id ? 'Update quotation details below.' : 'Fill in the details to create a new quotation. Your work is automatically saved as draft.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {savingDraft && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
              <span>Saving...</span>
            </div>
          )}
          {lastSaved && !savingDraft && (
            <div className="text-xs text-muted-foreground">
              Auto-saved: {lastSaved.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Quotation Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => {
                    handleTyping();
                    setFormData(prev => ({ ...prev, title: e.target.value }));
                  }}
                  placeholder="e.g., Website Development Project"
                  required
                />
                <p className="text-xs text-muted-foreground">A clear title for this quotation</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="client_id">Client *</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => {
                    handleTyping();
                    setFormData(prev => ({ ...prev, client_id: value }));
                  }}
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
                onChange={(e) => {
                  handleTyping();
                  setFormData(prev => ({ ...prev, description: e.target.value }));
                }}
                placeholder="Brief description of the quotation..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">Optional description of what this quotation covers</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="issue_date">Issue Date *</Label>
                <Input
                  id="issue_date"
                  type="date"
                  value={formData.issue_date}
                  onChange={(e) => {
                    handleTyping();
                    setFormData(prev => ({ ...prev, issue_date: e.target.value }));
                  }}
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
                  onChange={(e) => {
                    handleTyping();
                    setFormData(prev => ({ ...prev, valid_until: e.target.value }));
                  }}
                />
                <p className="text-xs text-muted-foreground">Expiry date for this quotation</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => {
                  handleTyping();
                  setFormData(prev => ({ ...prev, status: value }));
                }}>
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

        {/* Line Items - Enhanced Section */}
        <Card className="border-2">
          <CardHeader className="bg-muted/50 pb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-xl">Line Items</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Add products or services to your quotation. At least one item is required.
                </p>
              </div>
              <Button 
                type="button" 
                variant="default" 
                size="sm" 
                onClick={addLineItem}
                className="w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b sticky top-0 z-10">
                  <tr>
                    <th className="text-left p-4 font-semibold text-sm w-[25%]">Item Name *</th>
                    <th className="text-left p-4 font-semibold text-sm w-[20%]">Description</th>
                    <th className="text-center p-4 font-semibold text-sm w-[10%]">Qty</th>
                    <th className="text-right p-4 font-semibold text-sm w-[12%]">Unit Price (₹)</th>
                    <th className="text-center p-4 font-semibold text-sm w-[10%]">Disc. %</th>
                    <th className="text-right p-4 font-semibold text-sm w-[13%]">Line Total (₹)</th>
                    <th className="text-center p-4 font-semibold text-sm w-[10%]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, index) => (
                    <tr 
                      key={item.id} 
                      className="border-b hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-3">
                        <Input
                          value={item.item_name}
                          onChange={(e) => {
                            handleTyping();
                            handleLineItemChange(item.id, 'item_name', e.target.value);
                          }}
                          placeholder="Enter item name"
                          className="border-0 focus-visible:ring-2"
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          value={item.description || ''}
                          onChange={(e) => {
                            handleTyping();
                            handleLineItemChange(item.id, 'description', e.target.value);
                          }}
                          placeholder="Optional description"
                          className="border-0 focus-visible:ring-2"
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantity === 0 && typeof item.quantity === 'number' ? '' : item.quantity}
                          onChange={(e) => handleLineItemChange(item.id, 'quantity', e.target.value)}
                          onBlur={(e) => {
                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                            handleLineItemChange(item.id, 'quantity', val);
                          }}
                          className="text-center border-0 focus-visible:ring-2 w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="1"
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-muted-foreground text-sm">₹</span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price === 0 && typeof item.unit_price === 'number' ? '' : item.unit_price}
                            onChange={(e) => handleLineItemChange(item.id, 'unit_price', e.target.value)}
                            onBlur={(e) => {
                              const val = e.target.value === '' ? 0 : Number(e.target.value);
                              handleLineItemChange(item.id, 'unit_price', val);
                            }}
                            className="text-right border-0 focus-visible:ring-2 w-full min-w-[100px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="0.00"
                          />
                        </div>
                      </td>
                      <td className="p-3">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={(item.discount_percentage === 0 || !item.discount_percentage) && typeof item.discount_percentage !== 'string' ? '' : item.discount_percentage}
                          onChange={(e) => handleLineItemChange(item.id, 'discount_percentage', e.target.value)}
                          onBlur={(e) => {
                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                            handleLineItemChange(item.id, 'discount_percentage', val);
                          }}
                          className="text-center border-0 focus-visible:ring-2 w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="0"
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-muted-foreground text-sm">₹</span>
                          <div className="text-right bg-muted px-3 py-2 rounded-md font-semibold min-w-[100px] text-foreground">
                            {formatCurrency(calculateLineTotal(item))}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => duplicateLineItem(item.id)}
                            className="h-8 w-8 p-0 hover:bg-primary/10"
                            title="Duplicate item"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLineItem(item.id)}
                            disabled={lineItems.length === 1}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4 p-4">
              {lineItems.map((item, index) => (
                <Card key={item.id} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <Input
                          value={item.item_name}
                          onChange={(e) => handleLineItemChange(item.id, 'item_name', e.target.value)}
                          placeholder="Item name *"
                          className="font-medium text-base border-0 focus-visible:ring-2 p-0 h-auto"
                        />
                      </div>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => duplicateLineItem(item.id)}
                          className="h-8 w-8 p-0 hover:bg-primary/10"
                          title="Duplicate item"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLineItem(item.id)}
                          disabled={lineItems.length === 1}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Description</Label>
                      <Input
                        value={item.description || ''}
                        onChange={(e) => handleLineItemChange(item.id, 'description', e.target.value)}
                        placeholder="Optional description"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Quantity</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantity === 0 && typeof item.quantity === 'number' ? '' : item.quantity}
                          onChange={(e) => handleLineItemChange(item.id, 'quantity', e.target.value)}
                          onBlur={(e) => {
                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                            handleLineItemChange(item.id, 'quantity', val);
                          }}
                          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Unit Price (₹)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price === 0 && typeof item.unit_price === 'number' ? '' : item.unit_price}
                          onChange={(e) => handleLineItemChange(item.id, 'unit_price', e.target.value)}
                          onBlur={(e) => {
                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                            handleLineItemChange(item.id, 'unit_price', val);
                          }}
                          placeholder="0.00"
                          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Discount (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={(item.discount_percentage === 0 || !item.discount_percentage) && typeof item.discount_percentage !== 'string' ? '' : item.discount_percentage}
                          onChange={(e) => handleLineItemChange(item.id, 'discount_percentage', e.target.value)}
                          onBlur={(e) => {
                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                            handleLineItemChange(item.id, 'discount_percentage', val);
                          }}
                          placeholder="0"
                          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Line Total (₹)</Label>
                        <div className="bg-muted px-3 py-2 rounded-md font-semibold text-center">
                          {formatCurrency(calculateLineTotal(item))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Summary Footer */}
            {lineItems.length > 0 && (
              <div className="border-t bg-muted/50 p-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {lineItems.filter(item => item.item_name && item.item_name.trim()).length}
                      </span> valid item(s)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground block">Subtotal</span>
                      <span className="font-bold text-xl">₹{formatCurrency(Number(formData.subtotal) || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {lineItems.length === 0 && (
              <div className="p-12 text-center">
                <p className="text-muted-foreground mb-4">No items added yet</p>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={addLineItem}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Item
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pricing & Totals Section */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing & Totals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                <Input
                  id="tax_rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.tax_rate}
                  onChange={(e) => {
                    handleTyping();
                    setFormData(prev => ({ ...prev, tax_rate: Number(e.target.value) || 0 }));
                  }}
                  placeholder="18"
                  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                  value={formData.discount === 0 ? '' : (formData.discount || '')}
                  onChange={(e) => {
                    handleTyping();
                    setFormData(prev => ({ ...prev, discount: e.target.value === '' ? '' : Number(e.target.value) }));
                  }}
                  onBlur={(e) => {
                    setFormData(prev => ({ ...prev, discount: e.target.value === '' ? 0 : Number(e.target.value) || 0 }));
                  }}
                  placeholder="0.00"
                  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <p className="text-xs text-muted-foreground">Total discount amount (applied before tax)</p>
              </div>
            </div>

            {/* Totals Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
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
                onChange={(e) => {
                  handleTyping();
                  setFormData(prev => ({ ...prev, terms_conditions: e.target.value }));
                }}
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
                onChange={(e) => {
                  handleTyping();
                  setFormData(prev => ({ ...prev, notes: e.target.value }));
                }}
                placeholder="Internal notes (not visible to client)..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">Private notes for your reference only</p>
            </div>
          </CardContent>
        </Card>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button 
            type="button" 
            variant="outline" 
            onClick={saveDraft}
            disabled={savingDraft || !formData.title.trim() || !formData.client_id}
          >
            <Save className="h-4 w-4 mr-2" />
            {savingDraft ? 'Saving Draft...' : 'Save Draft'}
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => navigate('/quotations')}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : id ? 'Update Quotation' : 'Create Quotation'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default QuotationForm;
