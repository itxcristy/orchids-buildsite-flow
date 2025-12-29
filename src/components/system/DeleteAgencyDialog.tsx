import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { AgencyDetails } from '@/services/system-agencies';

interface DeleteAgencyDialogProps {
  agency: AgencyDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

export function DeleteAgencyDialog({
  agency,
  open,
  onOpenChange,
  onConfirm,
}: DeleteAgencyDialogProps) {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!isConfirmed || !agency) return;

    setIsDeleting(true);
    setError(null);

    try {
      await onConfirm();
      // Reset state and close dialog on success
      setIsConfirmed(false);
      setIsDeleting(false);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Failed to delete agency');
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isDeleting) {
      // Reset state when closing
      if (!newOpen) {
        setIsConfirmed(false);
        setError(null);
      }
      onOpenChange(newOpen);
    }
  };

  if (!agency) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Agency
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. All agency data will be permanently deleted.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> You are about to permanently delete the agency{' '}
              <strong>&quot;{agency.name}&quot;</strong> and all its data. This includes:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All users and profiles</li>
                <li>All projects and tasks</li>
                <li>All invoices and financial records</li>
                <li>All clients and CRM data</li>
                <li>The entire agency database</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <div className="p-3 bg-muted rounded-md">
              <div className="text-sm space-y-1">
                <div>
                  <span className="font-medium">Agency Name:</span> {agency.name}
                </div>
                <div>
                  <span className="font-medium">Domain:</span> {agency.domain || 'Not set'}
                </div>
                <div>
                  <span className="font-medium">Users:</span> {agency.user_count}
                </div>
                <div>
                  <span className="font-medium">Projects:</span> {agency.project_count}
                </div>
                <div>
                  <span className="font-medium">Invoices:</span> {agency.invoice_count}
                </div>
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="confirm-delete"
              checked={isConfirmed}
              onCheckedChange={(checked) => setIsConfirmed(checked === true)}
              disabled={isDeleting}
            />
            <Label
              htmlFor="confirm-delete"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I understand this action cannot be undone and all data will be permanently deleted
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmed || isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Agency'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
