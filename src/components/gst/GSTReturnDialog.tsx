import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Info } from 'lucide-react';

interface GSTReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (returnType: 'GSTR1' | 'GSTR3B' | 'GSTR9' | 'GSTR4', filingPeriod: string) => Promise<void>;
  loading?: boolean;
}

export const GSTReturnDialog: React.FC<GSTReturnDialogProps> = ({
  open,
  onOpenChange,
  onGenerate,
  loading = false
}) => {
  const [returnType, setReturnType] = useState<'GSTR1' | 'GSTR3B' | 'GSTR9' | 'GSTR4'>('GSTR1');
  const [filingPeriod, setFilingPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGenerate = async () => {
    if (!filingPeriod) {
      return;
    }

    try {
      setIsSubmitting(true);
      await onGenerate(returnType, filingPeriod);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to generate GST return:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getReturnDescription = (type: string) => {
    switch (type) {
      case 'GSTR1':
        return 'Outward supplies of goods or services';
      case 'GSTR3B':
        return 'Monthly summary return of outward and inward supplies';
      case 'GSTR4':
        return 'Quarterly return for composition taxpayers';
      case 'GSTR9':
        return 'Annual return';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate GST Return</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Generate a GST return based on transactions for the selected period. The return will include all sales transactions for the period.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="return_type">Return Type *</Label>
              <Select
                value={returnType}
                onValueChange={(value: 'GSTR1' | 'GSTR3B' | 'GSTR9' | 'GSTR4') => setReturnType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GSTR1">GSTR-1 (Outward Supplies)</SelectItem>
                  <SelectItem value="GSTR3B">GSTR-3B (Monthly Summary)</SelectItem>
                  <SelectItem value="GSTR4">GSTR-4 (Composition Scheme)</SelectItem>
                  <SelectItem value="GSTR9">GSTR-9 (Annual Return)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">{getReturnDescription(returnType)}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filing_period">Filing Period *</Label>
              <Input
                id="filing_period"
                type="month"
                value={filingPeriod}
                onChange={(e) => setFilingPeriod(e.target.value)}
                required
              />
              <p className="text-sm text-muted-foreground">
                Select the month/year for which you want to generate the return
              </p>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Return Details</h4>
              <div className="space-y-1 text-sm">
                <p><strong>Return Type:</strong> {returnType}</p>
                <p><strong>Period:</strong> {filingPeriod ? new Date(filingPeriod + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : 'Not selected'}</p>
                <p className="text-muted-foreground">
                  The return will be generated based on all sales transactions for the selected period.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleGenerate}
            disabled={!filingPeriod || isSubmitting || loading}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate Return
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
