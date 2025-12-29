import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { selectRecords, selectOne, insertRecord } from '@/services/api/postgresql-service';
import { useAuth } from '@/hooks/useAuth';
import { getAgencyId } from '@/utils/agencyUtils';
import { Plus, Trash2, ArrowLeft, Loader2 } from 'lucide-react';
import { logError } from '@/utils/consoleLogger';

interface JournalEntryLine {
  id?: string;
  account_id: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
  line_number: number;
}

const CreateJournalEntry = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    description: '',
    reference: '',
    status: 'draft' as 'draft' | 'posted' | 'reversed',
    lines: [
      { account_id: '', description: '', debit_amount: 0, credit_amount: 0, line_number: 1 },
      { account_id: '', description: '', debit_amount: 0, credit_amount: 0, line_number: 2 },
    ] as JournalEntryLine[],
  });

  const fetchAccounts = useCallback(async () => {
    try {
      setAccountsLoading(true);
      if (!user?.id) {
        setAccountsLoading(false);
        return;
      }
      
      const userProfile = await selectOne('profiles', { user_id: user.id });
      const agencyId = await getAgencyId(userProfile, user.id);
      
      if (!agencyId) {
        toast({
          title: 'Error',
          description: 'Unable to determine agency. Please ensure you are logged in and have an agency assigned.',
          variant: 'destructive',
        });
        setAccountsLoading(false);
        return;
      }
      
      let accountsData: any[] = [];
      
      // Strategy 1: Try with both filters
      try {
        accountsData = await selectRecords('chart_of_accounts', {
          where: { agency_id: agencyId, is_active: true },
          orderBy: 'account_code ASC',
        });
      } catch (err1: any) {
        // Strategy 2: Try with only agency_id (ignore is_active)
            try {
              accountsData = await selectRecords('chart_of_accounts', {
                where: { agency_id: agencyId },
                orderBy: 'account_code ASC',
              });
              // Filter is_active in memory
              accountsData = (accountsData || []).filter((acc: any) => acc.is_active !== false);
            } catch (err2: any) {
              // Strategy 3: Try without agency_id (fallback for schema without agency_id)
              if (err2?.code === '42703' || String(err2?.message || '').includes('agency_id') || String(err2?.message || '').includes('column')) {
                try {
                  accountsData = await selectRecords('chart_of_accounts', {
                    where: { is_active: true },
                    orderBy: 'account_code ASC',
                  });
                } catch (err3: any) {
                  logError('All attempts failed while fetching accounts. Last error:', err3);
                  throw err3;
                }
              } else {
                throw err2;
              }
            }
      }
      
      const finalAccounts = Array.isArray(accountsData) ? accountsData : [];
      
      // Force React to recognize the state change by creating a new array reference
      const accountsToSet = finalAccounts.length > 0 ? [...finalAccounts] : [];
      setAccounts(accountsToSet);
      
      if (finalAccounts.length === 0) {
        toast({
          title: 'No Accounts Found',
          description: 'No chart of accounts found for your agency. Please create accounts first in Financial Management.',
          variant: 'default',
        });
      }
    } catch (error: any) {
      logError('Error fetching accounts:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load accounts. Please try again.',
        variant: 'destructive',
      });
      setAccounts([]);
    } finally {
      setAccountsLoading(false);
    }
  }, [user?.id, toast]);

  useEffect(() => {
    if (user?.id) {
      fetchAccounts();
    }
  }, [user?.id, fetchAccounts]);

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

    // Check if at least one line has an account and amount
    const hasValidData = formData.lines.some(line => {
      const hasAccount = !!line.account_id;
      const debitAmount = typeof line.debit_amount === 'number' ? line.debit_amount : (parseFloat(String(line.debit_amount || 0)) || 0);
      const creditAmount = typeof line.credit_amount === 'number' ? line.credit_amount : (parseFloat(String(line.credit_amount || 0)) || 0);
      return hasAccount && (debitAmount > 0 || creditAmount > 0);
    });

    if (!hasValidData) {
      toast({
        title: 'Error',
        description: 'Please enter at least one line with an account and amount',
        variant: 'destructive',
      });
      return false;
    }

    if (formData.lines.some(line => !line.account_id)) {
      toast({
        title: 'Error',
        description: 'All lines must have an account selected',
        variant: 'destructive',
      });
      return false;
    }

    for (const line of formData.lines) {
      // Ensure amounts are numbers
      const debitAmount = typeof line.debit_amount === 'number' ? line.debit_amount : (parseFloat(String(line.debit_amount || 0)) || 0);
      const creditAmount = typeof line.credit_amount === 'number' ? line.credit_amount : (parseFloat(String(line.credit_amount || 0)) || 0);
      
      // Skip validation for lines without accounts (they'll be caught above)
      if (!line.account_id) {
        continue;
      }
      
      const hasDebit = debitAmount > 0;
      const hasCredit = creditAmount > 0;
      
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

    // Calculate totals with proper number handling
    const totalDebits = formData.lines.reduce((sum, line) => {
      const amount = typeof line.debit_amount === 'number' ? line.debit_amount : (parseFloat(String(line.debit_amount || 0)) || 0);
      return sum + amount;
    }, 0);
    const totalCredits = formData.lines.reduce((sum, line) => {
      const amount = typeof line.credit_amount === 'number' ? line.credit_amount : (parseFloat(String(line.credit_amount || 0)) || 0);
      return sum + amount;
    }, 0);
    
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
      // Calculate totals with proper number handling
      const totalDebits = formData.lines.reduce((sum, line) => {
        const amount = typeof line.debit_amount === 'number' ? line.debit_amount : (parseFloat(String(line.debit_amount || 0)) || 0);
        return sum + amount;
      }, 0);
      const totalCredits = formData.lines.reduce((sum, line) => {
        const amount = typeof line.credit_amount === 'number' ? line.credit_amount : (parseFloat(String(line.credit_amount || 0)) || 0);
        return sum + amount;
      }, 0);

      const userProfile = user?.id ? await selectOne('profiles', { user_id: user.id }) : null;
      const agencyId = await getAgencyId(userProfile, user?.id);
      
      if (!agencyId) {
        toast({
          title: 'Error',
          description: 'Unable to determine agency. Please ensure you are logged in and have an agency assigned.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const year = new Date().getFullYear();
      const timestamp = String(Date.now()).slice(-6);
      const entryNumber = `JE-${year}-${timestamp}`;

      const newEntry = await insertRecord('journal_entries', {
        entry_number: entryNumber,
        entry_date: formData.entry_date,
        description: formData.description.trim(),
        reference: formData.reference?.trim() || null,
        status: formData.status,
        total_debit: totalDebits,
        total_credit: totalCredits,
        created_by: user?.id || null,
        agency_id: agencyId,
      }, user?.id, agencyId);

      for (const line of formData.lines) {
        // Ensure amounts are proper numbers (not strings or NaN)
        const debitAmount = typeof line.debit_amount === 'number' && !isNaN(line.debit_amount) 
          ? Math.max(0, Math.round(line.debit_amount * 100) / 100) 
          : 0;
        const creditAmount = typeof line.credit_amount === 'number' && !isNaN(line.credit_amount) 
          ? Math.max(0, Math.round(line.credit_amount * 100) / 100) 
          : 0;
        
        // journal_entry_lines doesn't have agency_id column - isolation is through parent journal_entries
        await insertRecord('journal_entry_lines', {
          journal_entry_id: newEntry.id,
          account_id: line.account_id,
          description: line.description.trim() || formData.description.trim(),
          debit_amount: debitAmount,
          credit_amount: creditAmount,
          line_number: line.line_number,
        }, user?.id);
      }

      toast({
        title: 'Success',
        description: 'Journal entry created successfully',
      });

      // Navigate back to the page we came from, or default to ledger
      const fromPage = (location.state as any)?.from || 'ledger';
      if (fromPage === 'financial-management') {
        navigate('/financial-management');
      } else {
        navigate('/ledger');
      }
    } catch (error: any) {
      logError('Error saving journal entry:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save journal entry',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals for display with proper number handling
  const totalDebits = formData.lines.reduce((sum, line) => {
    const amount = typeof line.debit_amount === 'number' ? line.debit_amount : (parseFloat(String(line.debit_amount || 0)) || 0);
    return sum + amount;
  }, 0);
  const totalCredits = formData.lines.reduce((sum, line) => {
    const amount = typeof line.credit_amount === 'number' ? line.credit_amount : (parseFloat(String(line.credit_amount || 0)) || 0);
    return sum + amount;
  }, 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  if (accountsLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2 text-muted-foreground">Loading accounts...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/ledger')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Ledger
        </Button>
        <h1 className="text-3xl font-bold">Create Journal Entry</h1>
        <p className="text-muted-foreground mt-1">
          Fill in the details to create a new journal entry. Debits must equal credits.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Journal Entry Details</CardTitle>
          <CardDescription>Enter the transaction information below</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
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
                  value={formData.reference}
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
                rows={3}
                placeholder="Journal entry description"
                required
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Label className="text-lg">Journal Entry Lines *</Label>
                  {accountsLoading && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading accounts...
                    </span>
                  )}
                  {!accountsLoading && accounts.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({accounts.length} account{accounts.length !== 1 ? 's' : ''} available)
                    </span>
                  )}
                  {!accountsLoading && accounts.length === 0 && (
                    <span className="text-xs text-amber-600">
                      No accounts found - create accounts in Financial Management
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={fetchAccounts}
                    disabled={accountsLoading}
                    title="Refresh accounts"
                  >
                    <Loader2 className={`h-4 w-4 ${accountsLoading ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={addLine}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Line
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground pb-2 border-b">
                  <div className="col-span-3">Account</div>
                  <div className="col-span-4">Description</div>
                  <div className="col-span-2">Debit</div>
                  <div className="col-span-2">Credit</div>
                  <div className="col-span-1"></div>
                </div>

                {formData.lines.map((line, index) => {
                  return (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-3">
                        <Select
                          value={line.account_id || undefined}
                          onValueChange={(value) => {
                            updateLine(index, 'account_id', value);
                          }}
                          disabled={accountsLoading || (accounts.length === 0 && !accountsLoading)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={accountsLoading ? "Loading accounts..." : accounts.length === 0 ? "No accounts available" : "Select account"} />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px] overflow-y-auto">
                            {(() => {
                              if (accountsLoading) {
                                return (
                                  <div className="px-2 py-1.5 text-sm text-muted-foreground flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Loading accounts...
                                  </div>
                                );
                              }
                              
                              if (!Array.isArray(accounts) || accounts.length === 0) {
                                return (
                                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                    No accounts available. Please create accounts first in Financial Management.
                                  </div>
                                );
                              }
                              
                              const validAccounts = accounts.filter((acc) => {
                                return acc && acc.id;
                              });
                              
                              if (validAccounts.length === 0) {
                                return (
                                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                    No valid accounts found
                                  </div>
                                );
                              }
                              
                              return validAccounts.map((acc) => {
                                const accountId = String(acc.id);
                                const displayText = acc.account_code && acc.account_name 
                                  ? `${acc.account_code} - ${acc.account_name}`
                                  : acc.account_name || acc.account_code || 'Unnamed Account';
                                
                                return (
                                  <SelectItem 
                                    key={accountId} 
                                    value={accountId}
                                    className="cursor-pointer"
                                  >
                                    {displayText}
                                  </SelectItem>
                                );
                              });
                            })()}
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
                        min="0"
                        value={line.debit_amount > 0 ? line.debit_amount : ''}
                        onChange={(e) => {
                          const inputValue = e.target.value.trim();
                          
                          // Handle empty input
                          if (inputValue === '' || inputValue === '.') {
                            updateLine(index, 'debit_amount', 0);
                            updateLine(index, 'credit_amount', 0);
                            return;
                          }
                          
                          // Parse the number
                          const numValue = parseFloat(inputValue);
                          
                          // Only update if it's a valid non-negative number
                          if (!isNaN(numValue) && numValue >= 0) {
                            // Round to 2 decimal places to match database precision
                            const roundedValue = Math.round(numValue * 100) / 100;
                            updateLine(index, 'debit_amount', roundedValue);
                            updateLine(index, 'credit_amount', 0);
                          }
                        }}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.credit_amount > 0 ? line.credit_amount : ''}
                        onChange={(e) => {
                          const inputValue = e.target.value.trim();
                          
                          // Handle empty input
                          if (inputValue === '' || inputValue === '.') {
                            updateLine(index, 'credit_amount', 0);
                            updateLine(index, 'debit_amount', 0);
                            return;
                          }
                          
                          // Parse the number
                          const numValue = parseFloat(inputValue);
                          
                          // Only update if it's a valid non-negative number
                          if (!isNaN(numValue) && numValue >= 0) {
                            // Round to 2 decimal places to match database precision
                            const roundedValue = Math.round(numValue * 100) / 100;
                            updateLine(index, 'credit_amount', roundedValue);
                            updateLine(index, 'debit_amount', 0);
                          }
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
                  );
                })}

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

            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  // Navigate back to the page we came from, or default to ledger
                  const fromPage = (location.state as any)?.from || 'ledger';
                  if (fromPage === 'financial-management') {
                    navigate('/financial-management');
                  } else {
                    navigate('/ledger');
                  }
                }}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full sm:w-auto"
                title={!isBalanced ? `Debits (₹${totalDebits.toFixed(2)}) must equal Credits (₹${totalCredits.toFixed(2)})` : ''}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Create Entry'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateJournalEntry;



