import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { insertRecord, updateRecord, selectRecords, selectOne } from '@/services/api/postgresql-service';
import { useAuth } from '@/hooks/useAuth';
import { getAgencyId } from '@/utils/agencyUtils';

interface ChartOfAccount {
  id?: string;
  account_code: string;
  account_name: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parent_account_id?: string | null;
  is_active?: boolean;
  description?: string | null;
}

interface ChartOfAccountFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  account?: ChartOfAccount | null;
  onAccountSaved: () => void;
}

const ChartOfAccountFormDialog: React.FC<ChartOfAccountFormDialogProps> = ({ 
  isOpen, 
  onClose, 
  account, 
  onAccountSaved 
}) => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [parentAccounts, setParentAccounts] = useState<any[]>([]);
  const [formData, setFormData] = useState<ChartOfAccount>({
    account_code: account?.account_code || '',
    account_name: account?.account_name || '',
    account_type: account?.account_type || 'asset',
    parent_account_id: account?.parent_account_id || null,
    is_active: account?.is_active !== undefined ? account.is_active : true,
    description: account?.description || '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchParentAccounts();
      if (account) {
        setFormData({
          account_code: account.account_code,
          account_name: account.account_name,
          account_type: account.account_type,
          parent_account_id: account.parent_account_id || null,
          is_active: account.is_active !== undefined ? account.is_active : true,
          description: account.description || '',
        });
      } else {
        setFormData({
          account_code: '',
          account_name: '',
          account_type: 'asset',
          parent_account_id: null,
          is_active: true,
          description: '',
        });
      }
    }
  }, [isOpen, account]);

  const fetchParentAccounts = async () => {
    try {
      if (!user?.id) return;
      
      // Get agency_id using utility function (handles multi-database architecture)
      const userProfile = profile || await selectOne('profiles', { user_id: user.id });
      const agencyId = await getAgencyId(userProfile, user.id);
      
      let where: Record<string, any> = { is_active: true };
      if (agencyId) {
        where.agency_id = agencyId;
      }
      
      const accounts = await selectRecords('chart_of_accounts', {
        where,
        orderBy: 'account_code ASC',
      });
      setParentAccounts(accounts || []);
    } catch (error: any) {
      // Fallback if agency_id column doesn't exist
      if (error?.code === '42703' || String(error?.message || '').includes('agency_id')) {
        const accounts = await selectRecords('chart_of_accounts', {
          where: { is_active: true },
          orderBy: 'account_code ASC',
        });
        setParentAccounts(accounts || []);
      } else {
        console.error('Error fetching parent accounts:', error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.account_code.trim()) {
        toast({
          title: 'Error',
          description: 'Account code is required',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      if (!formData.account_name.trim()) {
        toast({
          title: 'Error',
          description: 'Account name is required',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Get agency_id using utility function (handles multi-database architecture)
      const userProfile = profile || (user?.id ? await selectOne('profiles', { user_id: user.id }) : null);
      const agencyId = await getAgencyId(userProfile, user?.id);
      
      // Check if we have agency context (either agency_id or agency_database)
      const agencyDatabase = localStorage.getItem('agency_database');
      const hasAgencyContext = agencyId || agencyDatabase;
      
      if (!hasAgencyContext && !account?.id) {
        toast({
          title: 'Error',
          description: 'Unable to determine agency. Please ensure you are logged in.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Validate account code is unique within agency (if creating new or changing code)
      if (!account?.id || formData.account_code !== account.account_code) {
        let where: Record<string, any> = { account_code: formData.account_code.trim() };
        if (agencyId) {
          where.agency_id = agencyId;
        }
        
        const existing = await selectOne('chart_of_accounts', where);
        if (existing && existing.id !== account?.id) {
          toast({
            title: 'Error',
            description: 'Account code already exists. Please use a unique code.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
      }

      const cleanedData: any = {
        account_code: formData.account_code.trim(),
        account_name: formData.account_name.trim(),
        account_type: formData.account_type,
        is_active: formData.is_active !== undefined ? formData.is_active : true,
        description: formData.description?.trim() || null,
      };

      // Handle parent_account_id (matches database column name)
      cleanedData.parent_account_id = formData.parent_account_id || null;
      
      // Add agency_id when creating new account (use getAgencyId result)
      if (!account?.id && agencyId) {
        cleanedData.agency_id = agencyId;
      }

      if (account?.id) {
        await updateRecord('chart_of_accounts', cleanedData, { id: account.id }, user?.id);
        toast({
          title: 'Success',
          description: 'Account updated successfully',
        });
      } else {
        await insertRecord('chart_of_accounts', cleanedData, user?.id);
        toast({
          title: 'Success',
          description: 'Account created successfully',
        });
      }

      onAccountSaved();
      onClose();
    } catch (error: any) {
      console.error('Error saving account:', error);
      // Check for unique constraint violation
      if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
        toast({
          title: 'Error',
          description: 'Account code already exists. Please use a unique code.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: error.message || 'Failed to save account',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{account?.id ? 'Edit Account' : 'Create New Account'}</DialogTitle>
          <DialogDescription>
            {account?.id ? 'Update account details below.' : 'Fill in the details to create a new chart of accounts entry.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="account_code">Account Code *</Label>
              <Input
                id="account_code"
                value={formData.account_code}
                onChange={(e) => setFormData(prev => ({ ...prev, account_code: e.target.value }))}
                placeholder="e.g., 1000, 2000"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account_type">Account Type *</Label>
              <Select 
                value={formData.account_type} 
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, account_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asset">Asset</SelectItem>
                  <SelectItem value="liability">Liability</SelectItem>
                  <SelectItem value="equity">Equity</SelectItem>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_name">Account Name *</Label>
            <Input
              id="account_name"
              value={formData.account_name}
              onChange={(e) => setFormData(prev => ({ ...prev, account_name: e.target.value }))}
              placeholder="e.g., Cash, Accounts Receivable"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="parent_account_id">Parent Account</Label>
            <Select
              value={formData.parent_account_id || '__none__'}
              onValueChange={(value) => setFormData(prev => ({ ...prev, parent_account_id: value === '__none__' ? null : value }))}                                                           
            >
              <SelectTrigger>
                <SelectValue placeholder="Select parent account (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {parentAccounts
                  .filter(acc => !account?.id || acc.id !== account.id)
                  .map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.account_code} - {acc.account_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              placeholder="Account description"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="rounded"
            />
            <Label htmlFor="is_active" className="cursor-pointer">
              Account is active
            </Label>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? 'Saving...' : account?.id ? 'Update Account' : 'Create Account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ChartOfAccountFormDialog;

