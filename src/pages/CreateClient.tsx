import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/database";
import { generateUUID } from "@/lib/uuid";
import { useAuth } from "@/hooks/useAuth";
import { getAgencyId } from "@/utils/agencyUtils";
import { ArrowLeft, Save, Building2, User, MapPin, CreditCard, FileText, AlertCircle, UserPlus, Clock, Edit } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ClientFormData {
  name: string;
  company_name: string;
  industry: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  website: string;
  contact_person: string;
  contact_position: string;
  contact_email: string;
  contact_phone: string;
  status: string;
  billing_address: string;
  billing_city: string;
  billing_state: string;
  billing_postal_code: string;
  billing_country: string;
  tax_id: string;
  payment_terms: string;
  notes: string;
}

const DRAFT_STORAGE_KEY = 'client_form_draft';

const CreateClient: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingClient, setLoadingClient] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [clientId, setClientId] = useState<string | null>(id || null);
  const [creatorInfo, setCreatorInfo] = useState<{
    name: string;
    email: string;
    created_at: string;
  } | null>(null);
  const [updaterInfo, setUpdaterInfo] = useState<{
    name: string;
    email: string;
    updated_at: string;
  } | null>(null);

  const [formData, setFormData] = useState<ClientFormData>({
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
    payment_terms: '30',
    notes: '',
  });

  // Load client data if editing
  useEffect(() => {
    const loadClient = async () => {
      if (id) {
        setLoadingClient(true);
        try {
          const agencyId = await getAgencyId(profile, user?.id);
          if (!agencyId) {
            toast({
              title: 'Error',
              description: 'Agency context is missing. Please re-login.',
              variant: 'destructive',
            });
            navigate('/clients');
            return;
          }

          const { data, error } = await db
            .from('clients')
            .select('*')
            .eq('id', id)
            .eq('agency_id', agencyId)
            .single();

          if (error) throw error;

          if (data) {
            setClientId(data.id);
            setFormData({
              name: data.name || '',
              company_name: data.company_name || '',
              industry: data.industry || '',
              email: data.email || '',
              phone: data.phone || '',
              address: data.address || '',
              city: data.city || '',
              state: data.state || '',
              postal_code: data.postal_code || '',
              country: data.country || '',
              website: data.website || '',
              contact_person: data.contact_person || '',
              contact_position: data.contact_position || '',
              contact_email: data.contact_email || '',
              contact_phone: data.contact_phone || '',
              status: data.status || 'active',
              billing_address: data.billing_address || '',
              billing_city: data.billing_city || '',
              billing_state: data.billing_state || '',
              billing_postal_code: data.billing_postal_code || '',
              billing_country: data.billing_country || '',
              tax_id: data.tax_id || '',
              payment_terms: data.payment_terms?.toString() || '30',
              notes: data.notes || '',
            });

            // Fetch creator information
            if (data.created_by) {
              try {
                const { data: creatorData } = await db
                  .from('users')
                  .select('email')
                  .eq('id', data.created_by)
                  .single();

                const { data: creatorProfile } = await db
                  .from('profiles')
                  .select('full_name')
                  .eq('user_id', data.created_by)
                  .single();

                if (creatorData) {
                  setCreatorInfo({
                    name: creatorProfile?.full_name || creatorData.email || 'Unknown User',
                    email: creatorData.email || '',
                    created_at: data.created_at || '',
                  });
                }
              } catch (error) {
                console.error('Error fetching creator info:', error);
              }
            }

            // Fetch updater information (if updated_at is different from created_at)
            if (data.updated_at && data.updated_at !== data.created_at) {
              // For now, we'll show the updated timestamp
              // In a full implementation, you might want to track who updated it
              setUpdaterInfo({
                name: 'System',
                email: '',
                updated_at: data.updated_at || '',
              });
            }
          }
        } catch (error: any) {
          console.error('Error loading client:', error);
          toast({
            title: 'Error',
            description: error.message || 'Failed to load client',
            variant: 'destructive',
          });
          navigate('/clients');
        } finally {
          setLoadingClient(false);
        }
      }
    };

    loadClient();
  }, [id, profile, user?.id, navigate, toast]);

  // Load draft from localStorage on mount (only if not editing)
  useEffect(() => {
    if (!id) {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          setFormData(parsed);
          setHasDraft(true);
        } catch (error) {
          console.error('Error loading draft:', error);
        }
      }
    }
  }, [id]);

  // Save draft to localStorage whenever form data changes (only if not editing)
  useEffect(() => {
    if (!id) {
      const hasData = Object.values(formData).some(value => value !== '' && value !== 'active' && value !== '30');
      if (hasData) {
        const draftData = {
          ...formData,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
        setHasDraft(true);
      }
    }
  }, [formData, id]);


  const clearDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setHasDraft(false);
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
      payment_terms: '30',
      notes: '',
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Client name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      newErrors.contact_email = 'Please enter a valid contact email address';
    }

    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = 'Website must start with http:// or https://';
    }

    if (formData.payment_terms && isNaN(Number(formData.payment_terms))) {
      newErrors.payment_terms = 'Payment terms must be a number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
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

      // Generate client number
      const { data: clientNumberData } = await db.rpc('generate_client_number');

      // Prepare data for submission
      const dataToSubmit: any = {
        name: formData.name.trim(),
        company_name: formData.company_name.trim() || null,
        industry: formData.industry.trim() || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        state: formData.state.trim() || null,
        postal_code: formData.postal_code.trim() || null,
        country: formData.country.trim() || null,
        website: formData.website.trim() || null,
        contact_person: formData.contact_person.trim() || null,
        contact_position: formData.contact_position.trim() || null,
        contact_email: formData.contact_email.trim() || null,
        contact_phone: formData.contact_phone.trim() || null,
        status: formData.status,
        billing_address: formData.billing_address.trim() || null,
        billing_city: formData.billing_city.trim() || null,
        billing_state: formData.billing_state.trim() || null,
        billing_postal_code: formData.billing_postal_code.trim() || null,
        billing_country: formData.billing_country.trim() || null,
        tax_id: formData.tax_id.trim() || null,
        payment_terms: formData.payment_terms && formData.payment_terms.trim() ? formData.payment_terms.trim() : null,
        notes: formData.notes.trim() || null,
      };

      if (clientId) {
        // Update existing client
        // Remove fields that shouldn't be updated
        const { id, client_number, created_by, created_at, updated_at, ...updateData } = dataToSubmit;
        
        // Fetch the updated record to get the actual updated_at timestamp
        const { data: updatedClient, error } = await db
          .from('clients')
          .update(updateData)
          .eq('id', clientId)
          .eq('agency_id', agencyId)
          .select()
          .single();

        if (error) throw error;

        // Update updater info after successful update
        // Use the actual updated_at from the database response
        const actualUpdatedAt = updatedClient?.updated_at || new Date().toISOString();
        setUpdaterInfo({
          name: profile?.full_name || user?.email || 'Current User',
          email: user?.email || '',
          updated_at: actualUpdatedAt,
        });

        toast({
          title: 'Success',
          description: 'Client updated successfully',
        });
      } else {
        // Insert new client
        const newClientId = generateUUID();
        const { data: insertedData, error } = await db
          .from('clients')
          .insert({
            id: newClientId,
            ...dataToSubmit,
            client_number: clientNumberData || `CLT-${Date.now().toString(36).toUpperCase()}`,
            agency_id: agencyId,
            is_active: true,
            created_by: user?.id,
          })
          .select()
          .single();

        if (error) throw error;

        // Clear draft on success
        clearDraft();

        // Set creator info after successful creation
        const createdAt = insertedData?.created_at || new Date().toISOString();
        setCreatorInfo({
          name: profile?.full_name || user?.email || 'Current User',
          email: user?.email || '',
          created_at: createdAt,
        });
        setClientId(newClientId);

        toast({
          title: 'Success',
          description: 'Client created successfully',
        });
      }

      // Navigate back to clients list
      navigate('/clients');
    } catch (error: any) {
      console.error('Error creating client:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create client',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ClientFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const isEditing = !!clientId;

  if (loadingClient) {
    return (
      <div className="container max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading client data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/clients')}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isEditing ? 'Edit Client' : 'Create New Client'}
            </h1>
            <p className="text-muted-foreground">
              {isEditing 
                ? 'Update client information and details'
                : 'Add a new client to your database. All fields are automatically saved as draft.'}
            </p>
          </div>
        </div>
        {hasDraft && !isEditing && (
          <Button variant="outline" onClick={clearDraft}>
            Clear Draft
          </Button>
        )}
      </div>

      {/* Draft Notice */}
      {hasDraft && !isEditing && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have a saved draft. Your changes are automatically saved as you type.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Basic Information
                </CardTitle>
                <CardDescription>
                  Essential details about the client
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Client Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter client name"
                    className={errors.name ? 'border-destructive' : ''}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Company Name</Label>
                    <Input
                      id="company_name"
                      value={formData.company_name}
                      onChange={(e) => handleInputChange('company_name', e.target.value)}
                      placeholder="Company name (if different)"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Input
                      id="industry"
                      value={formData.industry}
                      onChange={(e) => handleInputChange('industry', e.target.value)}
                      placeholder="e.g., Technology, Healthcare"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="client@example.com"
                      className={errors.email ? 'border-destructive' : ''}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      placeholder="https://www.example.com"
                      className={errors.website ? 'border-destructive' : ''}
                    />
                    {errors.website && (
                      <p className="text-sm text-destructive">{errors.website}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => handleInputChange('status', value)}
                    >
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
                </div>
              </CardContent>
            </Card>

            {/* Contact Person Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Contact Person Information
                </CardTitle>
                <CardDescription>
                  Primary contact details for this client
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact_person">Contact Person Name</Label>
                    <Input
                      id="contact_person"
                      value={formData.contact_person}
                      onChange={(e) => handleInputChange('contact_person', e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_position">Position/Title</Label>
                    <Input
                      id="contact_position"
                      value={formData.contact_position}
                      onChange={(e) => handleInputChange('contact_position', e.target.value)}
                      placeholder="e.g., CEO, Manager"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact_email">Contact Email</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => handleInputChange('contact_email', e.target.value)}
                      placeholder="contact@example.com"
                      className={errors.contact_email ? 'border-destructive' : ''}
                    />
                    {errors.contact_email && (
                      <p className="text-sm text-destructive">{errors.contact_email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_phone">Contact Phone</Label>
                    <Input
                      id="contact_phone"
                      value={formData.contact_phone}
                      onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Address Information
                </CardTitle>
                <CardDescription>
                  Physical location and mailing address
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="123 Main Street"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="City"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">State/Province</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      placeholder="State or Province"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="postal_code">Postal/ZIP Code</Label>
                    <Input
                      id="postal_code"
                      value={formData.postal_code}
                      onChange={(e) => handleInputChange('postal_code', e.target.value)}
                      placeholder="12345"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      placeholder="Country"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Billing Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Billing Information
                </CardTitle>
                <CardDescription>
                  Billing address and payment terms
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="billing_address">Billing Street Address</Label>
                  <Input
                    id="billing_address"
                    value={formData.billing_address}
                    onChange={(e) => handleInputChange('billing_address', e.target.value)}
                    placeholder="Leave empty if same as address above"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="billing_city">Billing City</Label>
                    <Input
                      id="billing_city"
                      value={formData.billing_city}
                      onChange={(e) => handleInputChange('billing_city', e.target.value)}
                      placeholder="Billing city"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="billing_state">Billing State/Province</Label>
                    <Input
                      id="billing_state"
                      value={formData.billing_state}
                      onChange={(e) => handleInputChange('billing_state', e.target.value)}
                      placeholder="Billing state"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="billing_postal_code">Billing Postal/ZIP Code</Label>
                    <Input
                      id="billing_postal_code"
                      value={formData.billing_postal_code}
                      onChange={(e) => handleInputChange('billing_postal_code', e.target.value)}
                      placeholder="Billing postal code"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="billing_country">Billing Country</Label>
                    <Input
                      id="billing_country"
                      value={formData.billing_country}
                      onChange={(e) => handleInputChange('billing_country', e.target.value)}
                      placeholder="Billing country"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tax_id">Tax ID / VAT Number</Label>
                    <Input
                      id="tax_id"
                      value={formData.tax_id}
                      onChange={(e) => handleInputChange('tax_id', e.target.value)}
                      placeholder="Tax identification number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payment_terms">Payment Terms (Days)</Label>
                    <Input
                      id="payment_terms"
                      type="number"
                      value={formData.payment_terms}
                      onChange={(e) => handleInputChange('payment_terms', e.target.value)}
                      placeholder="30"
                      min="0"
                      className={errors.payment_terms ? 'border-destructive' : ''}
                    />
                    {errors.payment_terms && (
                      <p className="text-sm text-destructive">{errors.payment_terms}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Number of days until payment is due (e.g., 30 for Net 30)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Additional Information
                </CardTitle>
                <CardDescription>
                  Any additional notes or information about this client
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Add any additional notes, special instructions, or important information about this client..."
                    rows={6}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Actions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {isEditing ? 'Update Client' : 'Create Client'}
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/clients')}
                  disabled={loading}
                >
                  Cancel
                </Button>

                {hasDraft && !isEditing && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={clearDraft}
                  >
                    Clear Draft
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Form Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Required Fields:</span>
                  <span className={formData.name.trim() ? 'text-green-600' : 'text-destructive'}>
                    {formData.name.trim() ? '✓ Complete' : '✗ Incomplete'}
                  </span>
                </div>
                {hasDraft && !isEditing && (
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-muted-foreground">Draft Status:</span>
                    <span className="text-blue-600">Saved</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Creator & Update Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Record Information
                </CardTitle>
                <CardDescription>
                  Transparency and audit trail
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {creatorInfo ? (
                  <>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <UserPlus className="h-3 w-3" />
                        <span className="text-xs font-medium">Created By</span>
                      </div>
                      <div className="pl-5">
                        <p className="font-medium">{creatorInfo.name}</p>
                        {creatorInfo.email && (
                          <p className="text-xs text-muted-foreground">{creatorInfo.email}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {new Date(creatorInfo.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {updaterInfo && (
                      <div className="space-y-1 pt-2 border-t">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Edit className="h-3 w-3" />
                          <span className="text-xs font-medium">Last Updated</span>
                        </div>
                        <div className="pl-5">
                          {updaterInfo.name !== 'System' && (
                            <p className="font-medium text-xs">{updaterInfo.name}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {new Date(updaterInfo.updated_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                ) : isEditing ? (
                  <div className="text-center py-2 text-muted-foreground text-xs">
                    Loading record information...
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <UserPlus className="h-3 w-3" />
                      <span className="text-xs font-medium">Will be created by</span>
                    </div>
                    <div className="pl-5">
                      <p className="font-medium">{profile?.full_name || user?.email || 'Current User'}</p>
                      {user?.email && (
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateClient;
