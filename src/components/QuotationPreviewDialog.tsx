import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/database';
import { Download, Printer, Mail, X, Building, MapPin, Phone, Mail as MailIcon, Calendar, FileText } from 'lucide-react';

interface Quotation {
  id: string;
  quote_number?: string;
  quotation_number?: string;
  client_id: string;
  template_id?: string | null;
  title: string;
  description?: string;
  status: string;
  issue_date?: string;
  expiry_date?: string;
  valid_until?: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount?: number;
  total_amount: number;
  terms_conditions?: string;
  terms_and_conditions?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface Client {
  id: string;
  name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  billing_address?: string;
  billing_city?: string;
  billing_state?: string;
  billing_postal_code?: string;
  billing_country?: string;
  tax_id?: string;
}

interface LineItem {
  id: string;
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  discount_percentage?: number;
  line_total?: number;
  sort_order?: number;
}

interface AgencyInfo {
  agency_name?: string;
  logo_url?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  tax_id?: string;
}

interface QuotationPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  quotationId: string | null;
}

const QuotationPreviewDialog: React.FC<QuotationPreviewDialogProps> = ({
  isOpen,
  onClose,
  quotationId,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [agencyInfo, setAgencyInfo] = useState<AgencyInfo>({});

  useEffect(() => {
    if (isOpen && quotationId) {
      fetchQuotationData();
    }
  }, [isOpen, quotationId]);

  const calculateLineTotal = (item: LineItem): number => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unit_price) || 0;
    const subtotal = qty * price;
    const discountPct = Number(item.discount_percentage) || 0;
    const discount = subtotal * (discountPct / 100);
    return subtotal - discount;
  };

  const fetchQuotationData = async () => {
    try {
      setLoading(true);

      // Fetch quotation
      const { data: quotationData, error: quotationError } = await db
        .from('quotations')
        .select('*')
        .eq('id', quotationId)
        .single();

      if (quotationError) throw quotationError;
      if (!quotationData) {
        toast({
          title: 'Error',
          description: 'Quotation not found',
          variant: 'destructive',
        });
        return;
      }

      setQuotation(quotationData);

      // Fetch client
      if (quotationData.client_id) {
        const { data: clientData, error: clientError } = await db
          .from('clients')
          .select('*')
          .eq('id', quotationData.client_id)
          .single();

        if (!clientError && clientData) {
          setClient(clientData);
        }
      }

      // Fetch line items
      const { data: lineItemsData, error: lineItemsError } = await db
        .from('quotation_line_items')
        .select('*')
        .eq('quotation_id', quotationId)
        .order('sort_order', { ascending: true });

      if (!lineItemsError && lineItemsData) {
        // Calculate line totals if not present
        const itemsWithTotals = lineItemsData.map(item => ({
          ...item,
          line_total: item.line_total || calculateLineTotal(item),
        }));
        setLineItems(itemsWithTotals);
      }

      // Fetch agency info
      const { data: agencyData, error: agencyError } = await db
        .from('agency_settings')
        .select('*')
        .limit(1)
        .single();

      if (!agencyError && agencyData) {
        setAgencyInfo({
          agency_name: agencyData.agency_name,
          logo_url: agencyData.logo_url,
          address: agencyData.address_street || agencyData.address,
          city: agencyData.address_city || agencyData.city,
          state: agencyData.address_state || agencyData.state,
          postal_code: agencyData.address_zip || agencyData.postal_code,
          country: agencyData.address_country || agencyData.country,
          phone: agencyData.phone,
          email: agencyData.email,
          website: agencyData.website,
          tax_id: agencyData.tax_id,
        });
      }
    } catch (error: any) {
      console.error('Error fetching quotation data:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load quotation',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // Create a printable version
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = document.getElementById('quotation-preview-content');
    if (!content) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Quotation ${quotation?.quote_number}</title>
          <style>
            @page {
              margin: 1cm;
            }
            @media print {
              body { margin: 0; padding: 0; font-family: Arial, sans-serif; font-size: 12px; }
              .no-print { display: none !important; }
              .print-break { page-break-after: always; }
            }
            body { font-family: Arial, sans-serif; padding: 20px; color: #000; }
            .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
            .logo { max-width: 150px; max-height: 80px; }
            .section { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .totals { float: right; margin-top: 20px; }
            .totals table { width: 300px; border: none; }
            .totals td { padding: 5px 10px; border: none; }
            .totals .total-row { font-weight: bold; font-size: 1.2em; border-top: 2px solid #000; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 10px; color: #666; }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Loading Quotation</DialogTitle>
            <DialogDescription>Please wait while we load the quotation details</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading quotation...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!quotation) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Quotation Not Found</DialogTitle>
            <DialogDescription>The requested quotation could not be found</DialogDescription>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Quotation not found</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; }
          .quotation-content { padding: 0 !important; }
        }
      `}</style>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto p-0 print:max-w-full print:max-h-full">
          <DialogHeader className="px-6 pt-6 pb-4 border-b no-print">
            <DialogTitle>Quotation Preview</DialogTitle>
            <DialogDescription>
              Review your quotation details before sending or printing
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pt-4 pb-4 border-b no-print">
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

        <div id="quotation-preview-content" className="px-6 py-8 bg-white quotation-content print:p-4">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-start gap-6 mb-8 border-b pb-6">
            <div className="flex-1">
              {agencyInfo.logo_url && (
                <img
                  src={agencyInfo.logo_url}
                  alt={agencyInfo.agency_name || 'Agency Logo'}
                  className="h-16 mb-4 object-contain"
                  onError={(e) => {
                    // Hide image if it fails to load (invalid URI)
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              )}
              <h2 className="text-2xl font-bold mb-2">
                {agencyInfo.agency_name || 'Agency Name'}
              </h2>
              <div className="text-sm text-muted-foreground space-y-1">
                {agencyInfo.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {agencyInfo.address}
                      {agencyInfo.city && `, ${agencyInfo.city}`}
                      {agencyInfo.state && `, ${agencyInfo.state}`}
                      {agencyInfo.postal_code && ` ${agencyInfo.postal_code}`}
                      {agencyInfo.country && `, ${agencyInfo.country}`}
                    </span>
                  </div>
                )}
                {agencyInfo.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>{agencyInfo.phone}</span>
                  </div>
                )}
                {agencyInfo.email && (
                  <div className="flex items-center gap-2">
                    <MailIcon className="h-4 w-4" />
                    <span>{agencyInfo.email}</span>
                  </div>
                )}
                {agencyInfo.website && (
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    <span>{agencyInfo.website}</span>
                  </div>
                )}
                {agencyInfo.tax_id && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>Tax ID: {agencyInfo.tax_id}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="text-left md:text-right w-full md:w-auto">
              <h1 className="text-3xl font-bold mb-3">QUOTATION</h1>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Quote #: </span>
                  <span className="font-semibold text-base">{quotation.quote_number || quotation.quotation_number || 'N/A'}</span>
                </div>
                {quotation.issue_date && (
                  <div>
                    <span className="text-muted-foreground">Issue Date: </span>
                    <span className="font-medium">{formatDate(quotation.issue_date)}</span>
                  </div>
                )}
                {!quotation.issue_date && (
                  <div>
                    <span className="text-muted-foreground">Date: </span>
                    <span className="font-medium">{formatDate(quotation.created_at)}</span>
                  </div>
                )}
                <div className="mt-2">
                  <Badge className={getStatusColor(quotation.status)}>
                    {quotation.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Client Information */}
          {client && (
            <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2 text-sm text-muted-foreground">BILL TO:</h3>
                <div className="space-y-1">
                  <p className="font-semibold">
                    {client.company_name || client.name}
                  </p>
                  {client.contact_person && (
                    <p className="text-sm">Attn: {client.contact_person}</p>
                  )}
                  {(client.billing_address || client.address) && (
                    <p className="text-sm text-muted-foreground">
                      {client.billing_address || client.address}
                      {client.billing_city && `, ${client.billing_city}`}
                      {client.billing_state && `, ${client.billing_state}`}
                      {client.billing_postal_code && ` ${client.billing_postal_code}`}
                      {client.billing_country && `, ${client.billing_country}`}
                    </p>
                  )}
                  {client.contact_email && (
                    <p className="text-sm text-muted-foreground">
                      <MailIcon className="h-3 w-3 inline mr-1" />
                      {client.contact_email}
                    </p>
                  )}
                  {client.contact_phone && (
                    <p className="text-sm text-muted-foreground">
                      <Phone className="h-3 w-3 inline mr-1" />
                      {client.contact_phone}
                    </p>
                  )}
                  {client.tax_id && (
                    <p className="text-sm text-muted-foreground">
                      Tax ID: {client.tax_id}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-sm text-muted-foreground">QUOTATION DETAILS:</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Title: </span>
                    <span className="font-medium">{quotation.title}</span>
                  </div>
                  {quotation.issue_date && (
                    <div>
                      <span className="text-muted-foreground">Issue Date: </span>
                      <span className="font-medium">{formatDate(quotation.issue_date)}</span>
                    </div>
                  )}
                  {quotation.expiry_date && (
                    <div>
                      <span className="text-muted-foreground">Expiry Date: </span>
                      <span className="font-medium">{formatDate(quotation.expiry_date)}</span>
                    </div>
                  )}
                  {quotation.valid_until && (
                    <div>
                      <span className="text-muted-foreground">Valid Until: </span>
                      <span className="font-medium">{formatDate(quotation.valid_until)}</span>
                    </div>
                  )}
                  {quotation.description && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-muted-foreground whitespace-pre-line">{quotation.description}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Line Items Table */}
          <div className="mb-6 overflow-x-auto">
            <table className="w-full border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-muted border-b-2 border-border">
                  <th className="border border-border p-4 text-left font-semibold text-sm">#</th>
                  <th className="border border-border p-4 text-left font-semibold text-sm w-[25%]">Item Name</th>
                  <th className="border border-border p-4 text-left font-semibold text-sm w-[20%]">Description</th>
                  <th className="border border-border p-4 text-center font-semibold text-sm w-[8%]">Qty</th>
                  <th className="border border-border p-4 text-right font-semibold text-sm w-[12%]">Unit Price</th>
                  <th className="border border-border p-4 text-center font-semibold text-sm w-[10%]">Disc. %</th>
                  <th className="border border-border p-4 text-right font-semibold text-sm w-[15%]">Line Total</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.length > 0 && lineItems.filter(item => item.item_name && item.item_name.trim()).length > 0 ? (
                  lineItems
                    .filter(item => item.item_name && item.item_name.trim())
                    .map((item, index) => {
                      const lineTotal = item.line_total || calculateLineTotal(item);
                      return (
                        <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-muted/20 hover:bg-muted/40 transition-colors'}>
                          <td className="border border-border p-3 text-center text-muted-foreground font-medium">{index + 1}</td>
                          <td className="border border-border p-3 font-medium">{item.item_name}</td>
                          <td className="border border-border p-3 text-sm text-muted-foreground">
                            {item.description || <span className="text-muted-foreground/50">-</span>}
                          </td>
                          <td className="border border-border p-3 text-center">{Number(item.quantity) || 0}</td>
                          <td className="border border-border p-3 text-right font-medium">{formatCurrency(Number(item.unit_price) || 0)}</td>
                          <td className="border border-border p-3 text-center">
                            {item.discount_percentage && Number(item.discount_percentage) > 0 ? (
                              <span className="text-orange-600 font-medium">{Number(item.discount_percentage).toFixed(1)}%</span>
                            ) : (
                              <span className="text-muted-foreground/50">-</span>
                            )}
                          </td>
                          <td className="border border-border p-3 text-right font-semibold text-base">
                            {formatCurrency(lineTotal)}
                          </td>
                        </tr>
                      );
                    })
                ) : (
                  <tr>
                    <td colSpan={7} className="border border-border p-8 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="h-8 w-8 text-muted-foreground/50" />
                        <p>No line items found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-6">
            <div className="w-full max-w-md border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <tbody>
                  <tr className="bg-muted/30">
                    <td className="p-3 text-right text-muted-foreground font-medium">Subtotal:</td>
                    <td className="p-3 text-right font-semibold">{formatCurrency(Number(quotation.subtotal) || 0)}</td>
                  </tr>
                  {quotation.discount && Number(quotation.discount) > 0 && (
                    <tr>
                      <td className="p-3 text-right text-muted-foreground">
                        <span className="text-red-600">Discount:</span>
                      </td>
                      <td className="p-3 text-right font-semibold text-red-600">
                        -{formatCurrency(Number(quotation.discount))}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td className="p-3 text-right text-muted-foreground">
                      Tax ({Number(quotation.tax_rate) || 0}%):
                    </td>
                    <td className="p-3 text-right font-semibold">{formatCurrency(Number(quotation.tax_amount) || 0)}</td>
                  </tr>
                  <tr className="border-t-2 border-foreground bg-muted/50">
                    <td className="p-4 text-right font-bold text-lg">Total Amount:</td>
                    <td className="p-4 text-right font-bold text-xl text-primary">
                      {formatCurrency(Number(quotation.total_amount) || 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Terms & Conditions */}
          {(quotation.terms_conditions || quotation.terms_and_conditions) && (
            <div className="mb-6 p-5 bg-muted/50 rounded-lg border border-border">
              <h3 className="font-semibold mb-3 text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Terms & Conditions
              </h3>
              <div className="text-sm whitespace-pre-line text-foreground leading-relaxed">
                {quotation.terms_conditions || quotation.terms_and_conditions}
              </div>
            </div>
          )}

          {/* Notes */}
          {quotation.notes && (
            <div className="mb-6 p-5 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold mb-3 text-blue-900 dark:text-blue-100 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Internal Notes
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-line leading-relaxed">
                {quotation.notes}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-10 pt-6 border-t text-center space-y-2">
            <p className="text-base font-semibold text-foreground">Thank you for your business!</p>
            <div className="text-sm text-muted-foreground space-y-1">
              {quotation.valid_until && (
                <p>
                  This quotation is valid until <span className="font-medium text-foreground">{formatDate(quotation.valid_until)}</span>
                </p>
              )}
              {(quotation.expiry_date && quotation.expiry_date !== quotation.valid_until) && (
                <p>
                  Expiry Date: <span className="font-medium text-foreground">{formatDate(quotation.expiry_date)}</span>
                </p>
              )}
              <p>
                Generated on {formatDate(quotation.created_at)}
                {quotation.updated_at !== quotation.created_at && (
                  <span> • Last updated: {formatDate(quotation.updated_at)}</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default QuotationPreviewDialog;

