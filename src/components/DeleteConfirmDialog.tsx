import React from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { deleteRecord, updateRecord } from '@/services/api/postgresql-service';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
  itemType: string;
  itemName: string;
  itemId: string;
  tableName: string;
  softDelete?: boolean; // If true, sets is_active to false instead of hard delete
  userId?: string; // Current user ID for audit logging
}

const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  isOpen,
  onClose,
  onDeleted,
  itemType,
  itemName,
  itemId,
  tableName,
  softDelete = false,
  userId,
}) => {
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      // Always use soft delete for users table to avoid foreign key constraint issues with audit_logs
      const shouldSoftDelete = softDelete || tableName === 'users';
      
      if (shouldSoftDelete) {
        // Use soft delete (set is_active to false)
        // Pass userId for proper audit logging
        await updateRecord(tableName, { is_active: false }, { id: itemId }, userId);
        toast({
          title: 'Success',
          description: `${itemType} deactivated successfully`,
        });
      } else {
        // Use hard delete for other tables
        await deleteRecord(tableName, { id: itemId });
        toast({
          title: 'Success',
          description: `${itemType} deleted successfully`,
        });
      }

      onDeleted();
      onClose();
    } catch (error: any) {
      console.error(`Error deleting ${itemType}:`, error);
      toast({
        title: 'Error',
        description: error.message || error.detail || `Failed to delete ${itemType.toLowerCase()}`,
        variant: 'destructive',
      });
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {itemType}</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{itemName}"? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteConfirmDialog;