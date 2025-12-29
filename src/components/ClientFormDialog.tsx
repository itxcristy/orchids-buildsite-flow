import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
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

interface Client {
  id?: string;
  client_number?: string;
  name: string;
  company_name?: string;
  industry?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  website?: string;
  contact_person?: string;
  contact_position?: string;
  contact_email?: string;
  contact_phone?: string;
  status: string;
  billing_address?: string;
  billing_city?: string;
  billing_state?: string;
  billing_postal_code?: string;
  billing_country?: string;
  tax_id?: string;
  payment_terms?: number;
  notes?: string;
}

interface ClientFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  client?: Client | null;
  onClientSaved: () => void;
}

const ClientFormDialog: React.FC<ClientFormDialogProps> = ({
  isOpen,
  onClose,
  client,
  onClientSaved,
}) => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Client>({
    name: '',
    company_name: '',
    industry: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    website: '',
    contact_person: '',
    contact_position: '',
    contact_email: '',
    contact_phone: '',
    status: 'active',
    billing_address: '',
    billing_city: '',
    billing_state: '',
    billing_postal_code: '',
    billing_country: '',
    tax_id: '',
    payment_terms: 30,
    notes: '',
  });

  useEffect(() => {
    if (client) {
      setFormData({
        id: client.id,
        client_number: client.client_number,
        name: client.name || '',
        company_name: client.company_name || '',
        industry: client.industry || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        city: client.city || '',
        state: client.state || '',
        postal_code: client.postal_code || '',
        country: client.country || '',
        website: client.website || '',
        contact_person: client.contact_person || '',
        contact_position: client.contact_position || '',
        contact_email: client.contact_email || '',
        contact_phone: client.contact_phone || '',
        status: client.status || 'active',
        billing_address: client.billing_address || '',
        billing_city: client.billing_city || '',
        billing_state: client.billing_state || '',
        billing_postal_code: client.billing_postal_code || '',
        billing_country: client.billing_country || '',
        tax_id: client.tax_id || '',
        payment_terms: client.payment_terms || 30,
        notes: client.notes || '',
      });
    } else {
      setFormData({
        name: '',
        company_name: '',
        industry: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        postal_code: '',
        country: '',
        website: '',
        contact_person: '',
        contact_position: '',
        contact_email: '',
        contact_phone: '',
        status: 'active',
        billing_address: '',
        billing_city: '',
        billing_state: '',
        billing_postal_code: '',
        billing_country: '',
        tax_id: '',
        payment_terms: 30,
        notes: '',
      });
    }
  }, [client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Basic validation
      if (!formData.name.trim()) {
        toast({
          title: 'Validation Error',
          description: 'Client name is required',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (formData.email && !emailRegex.test(formData.email)) {
        toast({
          title: 'Validation Error',
          description: 'Please enter a valid email address',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      if (formData.contact_email && !emailRegex.test(formData.contact_email)) {
        toast({
          title: 'Validation Error',
          description: 'Please enter a valid contact email address',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const dataToSubmit: any = { ...formData };
      
      // Clean up data: convert empty strings to null for optional fields, remove undefined
      // Keep required fields even if empty (they'll be validated)
      const optionalFields = [
        'company_name', 'industry', 'email', 'phone', 'address', 'city', 'state', 
        'postal_code', 'country', 'website', 'contact_person', 'contact_position',
        'contact_email', 'contact_phone', 'billing_address', 'billing_city',
        'billing_state', 'billing_postal_code', 'billing_country', 'tax_id', 'notes'
      ];
      
      Object.keys(dataToSubmit).forEach(key => {
        const value = dataToSubmit[key];
        if (value === '' || value === undefined) {
          if (optionalFields.includes(key)) {
            // Set optional fields to null instead of deleting (so they're explicitly null in DB)
            dataToSubmit[key] = null;
          } else {
            // Remove undefined/empty required fields (they'll cause validation errors)
            delete dataToSubmit[key];
          }
        }
      });

      if (client) {
        // Update existing client
        const { id, client_number, ...updateData } = dataToSubmit;
        const { error } = await db
          .from('clients')
          .update(updateData)
          .eq('id', client.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Client updated successfully',
        });
      } else {
        // Create new client - generate client number
        const { data: clientNumberData } = await db
          .rpc('generate_client_number');

        const agencyId = await getAgencyId(profile, user?.id);

        const { id, client_number, ...insertData } = dataToSubmit;
        const { error } = await db
          .from('clients')
          .insert({
            id: generateUUID(),
            ...insertData,
            client_number: clientNumberData || `CLT-${Date.now().toString(36).toUpperCase()}`,
            agency_id: agencyId || undefined,
            is_active: true,
          });

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Client created successfully',
        });
      }

      onClientSaved();
      onClose();
    } catch (error) {
      console.error('Error saving client:', error);
      toast({
        title: 'Error',
        description: `Failed to ${client ? 'update' : 'create'} client`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? 'Edit Client' : 'Create New Client'}</DialogTitle>
          <DialogDescription>
            {client ? 'Update client information' : 'Add a new client to your database'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="name">Client Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Client name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="Company name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  placeholder="Industry"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Phone number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://website.com"
                />
              </div>
            </div>

            {/* Contact & Address Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Contact Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  placeholder="Contact person name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_position">Contact Position</Label>
                <Input
                  id="contact_position"
                  value={formData.contact_position}
                  onChange={(e) => setFormData({ ...formData, contact_position: e.target.value })}
                  placeholder="Position/Title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  placeholder="contact@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  placeholder="Contact phone number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street address"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="State"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="postal_code">Postal Code</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    placeholder="Postal code"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="Country"
                  />
                </div>
              </div>
            </div>

            {/* Billing Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Billing Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="billing_address">Billing Address</Label>
                <Input
                  id="billing_address"
                  value={formData.billing_address}
                  onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
                  placeholder="Billing street address"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="billing_city">Billing City</Label>
                  <Input
                    id="billing_city"
                    value={formData.billing_city}
                    onChange={(e) => setFormData({ ...formData, billing_city: e.target.value })}
                    placeholder="Billing city"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billing_state">Billing State</Label>
                  <Input
                    id="billing_state"
                    value={formData.billing_state}
                    onChange={(e) => setFormData({ ...formData, billing_state: e.target.value })}
                    placeholder="Billing state"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="billing_postal_code">Billing Postal Code</Label>
                  <Input
                    id="billing_postal_code"
                    value={formData.billing_postal_code}
                    onChange={(e) => setFormData({ ...formData, billing_postal_code: e.target.value })}
                    placeholder="Billing postal code"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billing_country">Billing Country</Label>
                  <Input
                    id="billing_country"
                    value={formData.billing_country}
                    onChange={(e) => setFormData({ ...formData, billing_country: e.target.value })}
                    placeholder="Billing country"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax_id">Tax ID</Label>
                <Input
                  id="tax_id"
                  value={formData.tax_id}
                  onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                  placeholder="Tax identification number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_terms">Payment Terms (Days)</Label>
                <Input
                  id="payment_terms"
                  type="number"
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({ ...formData, payment_terms: parseInt(e.target.value) || 30 })}
                  placeholder="30"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Additional Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={4}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : client ? 'Update Client' : 'Create Client'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ClientFormDialog;