import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { insertRecord, updateRecord } from '@/services/api/postgresql-service';
import { useAuth } from '@/hooks/useAuth';

interface PayrollPeriod {
  id?: string;
  name: string;
  start_date: string;
  end_date: string;
  pay_date?: string | null;
  status: 'draft' | 'processing' | 'approved' | 'paid';
}

interface PayrollPeriodFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  period?: PayrollPeriod | null;
  onPeriodSaved: () => void;
}

const PayrollPeriodFormDialog: React.FC<PayrollPeriodFormDialogProps> = ({ 
  isOpen, 
  onClose, 
  period, 
  onPeriodSaved 
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<PayrollPeriod>({
    name: period?.name || '',
    start_date: period?.start_date || new Date().toISOString().split('T')[0],
    end_date: period?.end_date || '',
    pay_date: period?.pay_date || null,
    status: period?.status || 'draft',
  });

  useEffect(() => {
    if (isOpen) {
      if (period) {
        setFormData({
          name: period.name,
          start_date: period.start_date,
          end_date: period.end_date,
          pay_date: period.pay_date || null,
          status: period.status,
        });
      } else {
        // Generate default name for new period
        const now = new Date();
        const month = now.toLocaleString('default', { month: 'long' });
        const year = now.getFullYear();
        setFormData({
          name: `${month} ${year} Payroll`,
          start_date: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
          end_date: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
          pay_date: null,
          status: 'draft',
        });
      }
    }
  }, [isOpen, period]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate dates
      if (new Date(formData.end_date) < new Date(formData.start_date)) {
        toast({
          title: 'Error',
          description: 'End date must be after start date',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const cleanedData: any = {
        name: formData.name.trim(),
        start_date: formData.start_date,
        end_date: formData.end_date,
        pay_date: formData.pay_date || null,
        status: formData.status,
      };

      if (period?.id) {
        await updateRecord('payroll_periods', cleanedData, { id: period.id }, user?.id);
        toast({
          title: 'Success',
          description: 'Payroll period updated successfully',
        });
      } else {
        await insertRecord('payroll_periods', cleanedData, user?.id);
        toast({
          title: 'Success',
          description: 'Payroll period created successfully',
        });
      }

      onPeriodSaved();
      onClose();
    } catch (error: any) {
      console.error('Error saving payroll period:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save payroll period',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{period?.id ? 'Edit Payroll Period' : 'Create New Payroll Period'}</DialogTitle>
          <DialogDescription>
            {period?.id ? 'Update payroll period details below.' : 'Fill in the details to create a new payroll period.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Period Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., January 2024 Payroll"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date *</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay_date">Pay Date</Label>
              <Input
                id="pay_date"
                type="date"
                value={formData.pay_date || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, pay_date: e.target.value || null }))}
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? 'Saving...' : period?.id ? 'Update Period' : 'Create Period'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PayrollPeriodFormDialog;

