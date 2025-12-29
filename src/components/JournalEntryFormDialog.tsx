import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { selectRecords, selectOne, executeTransaction, insertRecord } from '@/services/api/postgresql-service';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Trash2 } from 'lucide-react';

interface JournalEntryLine {
  id?: string;
  account_id: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
  line_number: number;
}

interface JournalEntry {
  id?: string;
  entry_number?: string;
  entry_date: string;
  description: string;
  reference?: string | null;
  status: 'draft' | 'posted' | 'reversed';
  lines: JournalEntryLine[];
}

interface JournalEntryFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  entry?: JournalEntry | null;
  onEntrySaved: () => void;
}

const JournalEntryFormDialog: React.FC<JournalEntryFormDialogProps> = ({ 
  isOpen, 
  onClose, 
  entry, 
  onEntrySaved 
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [formData, setFormData] = useState<JournalEntry>({
    entry_date: entry?.entry_date || new Date().toISOString().split('T')[0],
    description: entry?.description || '',
    reference: entry?.reference || '',
    status: entry?.status || 'draft',
    lines: entry?.lines || [
      { account_id: '', description: '', debit_amount: 0, credit_amount: 0, line_number: 1 },
      { account_id: '', description: '', debit_amount: 0, credit_amount: 0, line_number: 2 },
    ],
  });

  useEffect(() => {
    if (isOpen) {
      fetchAccounts();
      if (entry) {
        setFormData({
          entry_date: entry.entry_date,
          description: entry.description,
          reference: entry.reference || '',
          status: entry.status,
          lines: entry.lines || [],
        });
      } else {
        setFormData({
          entry_date: new Date().toISOString().split('T')[0],
          description: '',
          reference: '',
          status: 'draft',
          lines: [
            { account_id: '', description: '', debit_amount: 0, credit_amount: 0, line_number: 1 },
            { account_id: '', description: '', debit_amount: 0, credit_amount: 0, line_number: 2 },
          ],
        });
      }
    }
  }, [isOpen, entry]);

  const fetchAccounts = async () => {
    try {
      if (!user?.id) return;
      // Get agency_id from profile
      const profile = await selectOne('profiles', { user_id: user.id });
      if (!profile?.agency_id) return;

      let accountsData: any[] = [];
      try {
        // Prefer agency-scoped accounts when the column exists
        accountsData = await selectRecords('chart_of_accounts', {
          where: { is_active: true, agency_id: profile.agency_id },
          orderBy: 'account_code ASC',
        });
      } catch (err: any) {
        // Fallback if agency_id column does not exist in current schema
        if (err?.code === '42703' || String(err?.message || '').includes('agency_id')) {
          console.warn('chart_of_accounts has no agency_id column, falling back to global accounts');
          accountsData = await selectRecords('chart_of_accounts', {
            where: { is_active: true },
            orderBy: 'account_code ASC',
          });
        } else {
          throw err;
        }
      }

      setAccounts(accountsData || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const addLine = () => {
    setFormData(prev => ({
      ...prev,
      lines: [
        ...prev.lines,
        {
          account_id: '',
          description: '',
          debit_amount: 0,
          credit_amount: 0,
          line_number: prev.lines.length + 1,
        },
      ],
    }));
  };

  const removeLine = (index: number) => {
    if (formData.lines.length <= 2) {
      toast({
        title: 'Error',
        description: 'Journal entry must have at least 2 lines',
        variant: 'destructive',
      });
      return;
    }
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index).map((line, i) => ({ ...line, line_number: i + 1 })),
    }));
  };

  const updateLine = (index: number, field: keyof JournalEntryLine, value: any) => {
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.map((line, i) => 
        i === index ? { ...line, [field]: value } : line
      ),
    }));
  };

  const validateEntry = (): boolean => {
    // Validate required fields
    if (!formData.description.trim()) {
      toast({
        title: 'Error',
        description: 'Description is required',
        variant: 'destructive',
      });
      return false;
    }

    if (!formData.entry_date) {
      toast({
        title: 'Error',
        description: 'Entry date is required',
        variant: 'destructive',
      });
      return false;
    }

    // Check that all lines have accounts
    if (formData.lines.some(line => !line.account_id)) {
      toast({
        title: 'Error',
        description: 'All lines must have an account selected',
        variant: 'destructive',
      });
      return false;
    }

    // Check that each line has either debit or credit (not both, not neither)
    for (const line of formData.lines) {
      const hasDebit = (line.debit_amount || 0) > 0;
      const hasCredit = (line.credit_amount || 0) > 0;
      if (!hasDebit && !hasCredit) {
        toast({
          title: 'Error',
          description: `Line ${line.line_number} must have either a debit or credit amount`,
          variant: 'destructive',
        });
        return false;
      }
      if (hasDebit && hasCredit) {
        toast({
          title: 'Error',
          description: `Line ${line.line_number} cannot have both debit and credit amounts`,
          variant: 'destructive',
        });
        return false;
      }
    }

    // Check that total debits equal total credits
    const totalDebits = formData.lines.reduce((sum, line) => sum + (parseFloat(line.debit_amount?.toString() || '0') || 0), 0);
    const totalCredits = formData.lines.reduce((sum, line) => sum + (parseFloat(line.credit_amount?.toString() || '0') || 0), 0);
    
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      toast({
        title: 'Error',
        description: `Total debits (₹${totalDebits.toFixed(2)}) must equal total credits (₹${totalCredits.toFixed(2)})`,
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEntry()) {
      return;
    }

    setLoading(true);

    try {
      const totalDebits = formData.lines.reduce((sum, line) => sum + (line.debit_amount || 0), 0);
      const totalCredits = formData.lines.reduce((sum, line) => sum + (line.credit_amount || 0), 0);

      const entryData: any = {
        entry_date: formData.entry_date,
        description: formData.description.trim(),
        reference: formData.reference?.trim() || null,
        status: formData.status,
        total_debit: totalDebits,
        total_credit: totalCredits,
      };

      // Use transactions for updates to ensure data consistency
      if (entry?.id) {
        
        // Use transaction for atomic update
        await executeTransaction(async (client: any) => {
          // Update entry
          await client.query(
            `UPDATE journal_entries 
             SET entry_date = $1, description = $2, reference = $3, status = $4, 
                 total_debit = $5, total_credit = $6, updated_at = NOW()
             WHERE id = $7`,
            [
              entryData.entry_date,
              entryData.description,
              entryData.reference,
              entryData.status,
              entryData.total_debit,
              entryData.total_credit,
              entry.id
            ]
          );

          // Delete existing lines
          await client.query(
            'DELETE FROM journal_entry_lines WHERE journal_entry_id = $1',
            [entry.id]
          );

          // Insert new lines
          for (const line of formData.lines) {
            await client.query(
              `INSERT INTO journal_entry_lines 
               (journal_entry_id, account_id, description, debit_amount, credit_amount, line_number, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
              [
                entry.id,
                line.account_id,
                line.description.trim() || formData.description.trim(),
                line.debit_amount || 0,
                line.credit_amount || 0,
                line.line_number
              ]
            );
          }
        });
      } else {
        // Get agency_id from profile
        const profile = user?.id ? await selectOne('profiles', { user_id: user.id }) : null;
        if (!profile?.agency_id) {
          toast({
            title: 'Error',
            description: 'Unable to determine agency. Please ensure you are logged in.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        // Generate entry number
        const year = new Date().getFullYear();
        const timestamp = String(Date.now()).slice(-6);
        entryData.entry_number = `JE-${year}-${timestamp}`;

        // Insert new entry
        const newEntry = await insertRecord('journal_entries', {
          entry_number: entryData.entry_number,
          entry_date: entryData.entry_date,
          description: entryData.description,
          reference: entryData.reference,
          status: entryData.status,
          total_debit: entryData.total_debit,
          total_credit: entryData.total_credit,
          created_by: user?.id || null,
          agency_id: profile.agency_id,
        }, user?.id);

        const newEntryId = (newEntry as any).id;

        // Insert lines
        for (const line of formData.lines) {
          await insertRecord('journal_entry_lines', {
            journal_entry_id: newEntryId,
            account_id: line.account_id,
            description: line.description.trim() || formData.description.trim(),
            debit_amount: line.debit_amount || 0,
            credit_amount: line.credit_amount || 0,
            line_number: line.line_number,
          }, user?.id);
        }
      }

      toast({
        title: 'Success',
        description: entry?.id ? 'Journal entry updated successfully' : 'Journal entry created successfully',
      });

      onEntrySaved();
      onClose();
    } catch (error: any) {
      console.error('Error saving journal entry:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save journal entry',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const totalDebits = formData.lines.reduce((sum, line) => sum + (line.debit_amount || 0), 0);
  const totalCredits = formData.lines.reduce((sum, line) => sum + (line.credit_amount || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{entry?.id ? 'Edit Journal Entry' : 'Create New Journal Entry'}</DialogTitle>
          <DialogDescription>
            {entry?.id ? 'Update journal entry details below.' : 'Fill in the details to create a new journal entry. Debits must equal credits.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entry_date">Entry Date *</Label>
              <Input
                id="entry_date"
                type="date"
                value={formData.entry_date}
                onChange={(e) => setFormData(prev => ({ ...prev, entry_date: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="posted">Posted</SelectItem>
                  <SelectItem value="reversed">Reversed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference">Reference</Label>
              <Input
                id="reference"
                value={formData.reference || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                placeholder="Reference number"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              placeholder="Journal entry description"
              required
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Journal Entry Lines *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="h-4 w-4 mr-1" />
                Add Line
              </Button>
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground pb-2 border-b">
                <div className="col-span-3">Account</div>
                <div className="col-span-4">Description</div>
                <div className="col-span-2">Debit</div>
                <div className="col-span-2">Credit</div>
                <div className="col-span-1"></div>
              </div>

              {formData.lines.map((line, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-3">
                    <Select
                      value={line.account_id}
                      onValueChange={(value) => updateLine(index, 'account_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.account_code} - {acc.account_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-4">
                    <Input
                      value={line.description}
                      onChange={(e) => updateLine(index, 'description', e.target.value)}
                      placeholder="Line description"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={line.debit_amount || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        updateLine(index, 'debit_amount', val);
                        updateLine(index, 'credit_amount', 0);
                      }}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={line.credit_amount || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        updateLine(index, 'credit_amount', val);
                        updateLine(index, 'debit_amount', 0);
                      }}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="col-span-1">
                    {formData.lines.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLine(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              <div className="grid grid-cols-12 gap-2 pt-2 border-t font-semibold">
                <div className="col-span-7 text-right">Totals:</div>
                <div className={`col-span-2 ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{totalDebits.toFixed(2)}
                </div>
                <div className={`col-span-2 ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{totalCredits.toFixed(2)}
                </div>
                <div className="col-span-1"></div>
              </div>
              {!isBalanced && (
                <div className="text-sm text-red-600 text-center">
                  Difference: ₹{Math.abs(totalDebits - totalCredits).toFixed(2)}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !isBalanced} className="w-full sm:w-auto">
              {loading ? 'Saving...' : entry?.id ? 'Update Entry' : 'Create Entry'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default JournalEntryFormDialog;
