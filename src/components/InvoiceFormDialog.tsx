import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { insertRecord, updateRecord, selectRecords } from '@/services/api/postgresql-service';
import { useAuth } from '@/hooks/useAuth';
import { getClientsForSelectionAuto } from '@/services/api/client-selector-service';
import { getProjectsForSelectionAuto } from '@/services/api/project-selector-service';

interface Invoice {
  id?: string;
  invoice_number?: string;
  client_id: string;
  title: string;
  description?: string;
  status: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_rate: number;
  discount?: number;
  notes?: string;
}

interface InvoiceFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: Invoice | null;
  onInvoiceSaved: () => void;
}

const InvoiceFormDialog: React.FC<InvoiceFormDialogProps> = ({ isOpen, onClose, invoice, onInvoiceSaved }) => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [formData, setFormData] = useState<Invoice>({
    client_id: invoice?.client_id || '',
    title: invoice?.title || '',
    description: invoice?.description || '',
    status: invoice?.status || 'draft',
    issue_date: invoice?.issue_date || new Date().toISOString().split('T')[0],
    due_date: invoice?.due_date || '',
    subtotal: invoice?.subtotal || 0,
    tax_rate: invoice?.tax_rate || 18,
    discount: invoice?.discount || 0,
    notes: invoice?.notes || '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchClients();
      fetchProjects();
      if (invoice) {
        setFormData({
          client_id: invoice.client_id || '',
          title: invoice.title || '',
          description: invoice.description || '',
          status: invoice.status || 'draft',
          issue_date: invoice.issue_date || new Date().toISOString().split('T')[0],
          due_date: invoice.due_date || '',
          subtotal: invoice.subtotal || 0,
          tax_rate: invoice.tax_rate || 18,
          discount: invoice.discount || 0,
          notes: invoice.notes || '',
        });
      } else {
        setFormData({
          client_id: '',
          title: '',
          description: '',
          status: 'draft',
          issue_date: new Date().toISOString().split('T')[0],
          due_date: '',
          subtotal: 0,
          tax_rate: 18,
          discount: 0,
          notes: '',
        });
      }
    }
  }, [isOpen, invoice]);

  const fetchClients = async () => {
    try {
      setClientsLoading(true);
      
      // Use standardized client fetching service
      const clientsData = await getClientsForSelectionAuto(profile, user?.id, {
        includeInactive: false,
        status: 'active'
      });
      
      // Transform to component format
      setClients(clientsData.map(c => ({
        id: c.id,
        name: c.name,
        company_name: c.company_name,
        email: c.email
      })));
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: 'Error',
        description: 'Failed to load clients',
        variant: 'destructive',
      });
      setClients([]);
    } finally {
      setClientsLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      setProjectsLoading(true);
      
      // Use standardized project fetching service
      const projectsData = await getProjectsForSelectionAuto(profile, user?.id, {
        includeInactive: false
      });
      
      // Transform to component format
      setProjects(projectsData.map(p => ({
        id: p.id,
        name: p.name,
        project_code: p.project_code,
        client_name: p.client_name || p.client_company_name
      })));
    } catch (error) {
      console.error('Error fetching projects:', error);
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  };

  const calculateTotal = () => {
    const subtotal = parseFloat(String(formData.subtotal || 0));
    const discount = parseFloat(String(formData.discount || 0));
    const taxRate = parseFloat(String(formData.tax_rate || 0));
    const afterDiscount = Math.max(0, subtotal - discount);
    const taxAmount = (afterDiscount * taxRate) / 100;
    return afterDiscount + taxAmount;
  };

  // Update total when form data changes
  useEffect(() => {
    if (isOpen) {
      const total = calculateTotal();
      // This will be saved when form is submitted
    }
  }, [formData.subtotal, formData.discount, formData.tax_rate, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const cleanedData: any = {
        ...formData,
        client_id: formData.client_id || null,
        subtotal: parseFloat(String(formData.subtotal || 0)),
        tax_rate: parseFloat(String(formData.tax_rate || 0)),
        discount: parseFloat(String(formData.discount || 0)) || 0,
      };

      // Remove total_amount for updates - it's a generated column
      if (invoice?.id) {
        // Exclude total_amount from update - database will calculate it automatically
        const { total_amount, ...updateData } = cleanedData;
        await updateRecord('invoices', updateData, { id: invoice.id }, user?.id);
        toast({
          title: 'Success',
          description: 'Invoice updated successfully',
        });
      } else {
        // For inserts, we can include total_amount if needed, but database will calculate it anyway
        const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
        // Don't include total_amount - let database calculate it from the generated column formula
        await insertRecord('invoices', { ...cleanedData, invoice_number: invoiceNumber }, user?.id);
        toast({
          title: 'Success',
          description: 'Invoice created successfully',
        });
      }

      onInvoiceSaved();
      onClose();
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast({
        title: 'Error',
        description: 'Failed to save invoice',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">{invoice?.id ? 'Edit Invoice' : 'Create New Invoice'}</DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            {invoice?.id ? 'Update invoice details below.' : 'Fill in the details to create a new invoice.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Invoice Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
              />
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
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_id">Client</Label>
              <Select 
                value={formData.client_id || undefined} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value === 'none' ? null : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {!clientsLoading && clients.length > 0 ? (
                    <>
                      <SelectItem value="none">No Client</SelectItem>
                      {clients.map((client) => {
                        if (!client || !client.id) return null;
                        const clientId = String(client.id);
                        const clientName = client.name || client.company_name || 'Unnamed Client';
                        const companyName = client.company_name && client.name ? `(${client.company_name})` : '';
                        return (
                          <SelectItem key={clientId} value={clientId}>
                            {clientName} {companyName}
                          </SelectItem>
                        );
                      })}
                    </>
                  ) : clientsLoading ? (
                    <SelectItem value="loading" disabled>Loading clients...</SelectItem>
                  ) : (
                    <SelectItem value="no-clients" disabled>No clients available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subtotal">Subtotal (₹) *</Label>
              <Input
                id="subtotal"
                type="number"
                step="0.01"
                value={formData.subtotal}
                onChange={(e) => setFormData(prev => ({ ...prev, subtotal: Number(e.target.value) || 0 }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax_rate">Tax Rate (%) *</Label>
              <Input
                id="tax_rate"
                type="number"
                step="0.01"
                value={formData.tax_rate}
                onChange={(e) => setFormData(prev => ({ ...prev, tax_rate: Number(e.target.value) || 0 }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount">Discount (₹)</Label>
              <Input
                id="discount"
                type="number"
                step="0.01"
                value={formData.discount || 0}
                onChange={(e) => setFormData(prev => ({ ...prev, discount: Number(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total Amount:</span>
              <span className="text-2xl font-bold">₹{calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
            />
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? 'Saving...' : invoice?.id ? 'Update Invoice' : 'Create Invoice'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceFormDialog;