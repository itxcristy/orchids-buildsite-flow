import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { insertRecord, updateRecord, selectRecords } from '@/services/api/postgresql-service';
import { LeaveType } from '@/integrations/postgresql/types';

interface LeaveTypeFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  leaveType?: LeaveType | null;
  onLeaveTypeSaved: () => void;
}

const LeaveTypeFormDialog: React.FC<LeaveTypeFormDialogProps> = ({
  isOpen,
  onClose,
  leaveType,
  onLeaveTypeSaved,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    max_days_per_year: 0,
    is_paid: true,
    requires_approval: true,
    is_active: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form data when leaveType prop changes
  useEffect(() => {
    if (isOpen) {
      if (leaveType && leaveType.id) {
        // Editing existing leave type
        const leaveTypeAny = leaveType as any; // Type assertion for is_active which may exist in DB
        setFormData({
          name: leaveType.name || '',
          description: leaveType.description || '',
          max_days_per_year: leaveTypeAny.max_days_per_year || leaveTypeAny.max_days || 0,
          is_paid: leaveType.is_paid !== undefined ? leaveType.is_paid : true,
          requires_approval: leaveType.requires_approval !== undefined ? leaveType.requires_approval : true,
          is_active: leaveTypeAny.is_active !== undefined ? leaveTypeAny.is_active : true,
        });
      } else {
        // Creating new leave type
        setFormData({
          name: '',
          description: '',
          max_days_per_year: 0,
          is_paid: true,
          requires_approval: true,
          is_active: true,
        });
      }
      setErrors({});
    }
  }, [leaveType, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name || formData.name.trim().length === 0) {
      newErrors.name = 'Name is required';
    }

    if (formData.max_days_per_year < 0) {
      newErrors.max_days_per_year = 'Max days cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'You must be logged in to save leave types',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      // Get agency_id from user's profile or employee_details
      let agencyId = '';
      try {
        const profile = await selectRecords('profiles', {
          where: { user_id: user.id },
          limit: 1
        });
        if (profile.length > 0 && profile[0].agency_id) {
          agencyId = profile[0].agency_id;
        } else {
          const empDetail = await selectRecords('employee_details', {
            where: { user_id: user.id },
            limit: 1
          });
          if (empDetail.length > 0 && empDetail[0].agency_id) {
            agencyId = empDetail[0].agency_id;
          }
        }
      } catch (err) {
        console.error('Error fetching agency_id:', err);
      }

      if (leaveType && leaveType.id) {
        // Update existing leave type
        // Build data object explicitly to ensure correct column names
        const updateData: Record<string, any> = {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          max_days_per_year: formData.max_days_per_year,
          is_paid: formData.is_paid,
          requires_approval: formData.requires_approval,
          is_active: formData.is_active,
        };
        
        // Remove any max_days property if it exists (safety check)
        delete updateData.max_days;
        
        await updateRecord<LeaveType>(
          'leave_types',
          updateData,
          { id: leaveType.id },
          user.id
        );

        toast({
          title: 'Success',
          description: 'Leave type updated successfully',
        });
      } else {
        // Create new leave type
        // Build data object explicitly to ensure correct column names
        const insertData: Record<string, any> = {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          max_days_per_year: formData.max_days_per_year,
          is_paid: formData.is_paid,
          requires_approval: formData.requires_approval,
          is_active: formData.is_active,
          agency_id: agencyId || user.id, // Fallback to user.id if no agency_id found
        };
        
        // Remove any max_days property if it exists (safety check)
        delete insertData.max_days;
        
        await insertRecord<LeaveType>(
          'leave_types',
          insertData,
          user.id
        );

        toast({
          title: 'Success',
          description: 'Leave type created successfully',
        });
      }

      onLeaveTypeSaved();
      onClose();
    } catch (error: any) {
      console.error('Error saving leave type:', error);
      toast({
        title: 'Error',
        description: error.message || error.detail || 'Failed to save leave type',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {leaveType ? 'Edit Leave Type' : 'Create Leave Type'}
          </DialogTitle>
          <DialogDescription>
            {leaveType
              ? 'Update the leave type details below.'
              : 'Fill in the details to create a new leave type.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Annual Leave, Sick Leave"
              disabled={loading}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter description for this leave type..."
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_days_per_year">Max Days Per Year</Label>
            <Input
              id="max_days_per_year"
              type="number"
              min="0"
              value={formData.max_days_per_year}
              onChange={(e) => setFormData({ ...formData, max_days_per_year: parseInt(e.target.value) || 0 })}
              placeholder="0 for unlimited"
              disabled={loading}
            />
            {errors.max_days_per_year && (
              <p className="text-sm text-destructive">{errors.max_days_per_year}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Set to 0 for unlimited days
            </p>
          </div>

          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="is_paid">Paid Leave</Label>
              <p className="text-xs text-muted-foreground">
                Whether this leave type is paid or unpaid
              </p>
            </div>
            <Switch
              id="is_paid"
              checked={formData.is_paid}
              onCheckedChange={(checked) => setFormData({ ...formData, is_paid: checked })}
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="requires_approval">Requires Approval</Label>
              <p className="text-xs text-muted-foreground">
                Whether this leave type requires manager approval
              </p>
            </div>
            <Switch
              id="requires_approval"
              checked={formData.requires_approval}
              onCheckedChange={(checked) => setFormData({ ...formData, requires_approval: checked })}
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="is_active">Active</Label>
              <p className="text-xs text-muted-foreground">
                Whether this leave type is currently active
              </p>
            </div>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              disabled={loading}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : leaveType ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LeaveTypeFormDialog;

