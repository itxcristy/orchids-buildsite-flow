import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Download, Loader2, Search, Building2, Calendar, RefreshCw } from 'lucide-react';
import { DeleteAgencyDialog } from './DeleteAgencyDialog';
import {
  exportAgencyBackup,
  deleteAgency,
  fetchAgencyDetails,
  type AgencyDetails,
} from '@/services/system-agencies';
import { getApiEndpoint } from '@/config/services';
import type { AgencySummary as AgencyData } from '@/types/system';

interface AgencySettingsProps {
  agencies: AgencyData[];
  onRefresh: () => void;
}

export function AgencySettings({ agencies, onRefresh }: AgencySettingsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgency, setSelectedAgency] = useState<AgencyDetails | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [isRepairing, setIsRepairing] = useState(false);
  const { toast } = useToast();

  const filteredAgencies = agencies.filter((agency) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      agency.name.toLowerCase().includes(searchLower) ||
      agency.domain?.toLowerCase().includes(searchLower) ||
      agency.id.toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleExportBackup = async (agencyId: string, agencyName: string) => {
    setIsExporting(agencyId);
    try {
      await exportAgencyBackup(agencyId);
      toast({
        title: 'Backup Exported',
        description: `Backup for "${agencyName}" has been downloaded successfully.`,
      });
    } catch (error: any) {
      let errorMessage = error.message || 'Failed to export agency backup';
      
      // Provide more helpful error messages
      if (errorMessage.includes('NO_DATABASE') || errorMessage.includes('database not found')) {
        errorMessage = `Agency "${agencyName}" does not have a database assigned. Cannot export backup.`;
      } else if (errorMessage.includes('DATABASE_NOT_EXISTS') || errorMessage.includes('does not exist')) {
        errorMessage = `Database for agency "${agencyName}" does not exist. It may have been deleted.`;
      } else if (errorMessage.includes('Cannot connect')) {
        errorMessage = `Cannot connect to database for agency "${agencyName}". The database may be inaccessible.`;
      }
      
      toast({
        title: 'Export Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsExporting(null);
    }
  };

  const handleDeleteClick = async (agency: AgencyData) => {
    try {
      // First, fetch full agency details
      const details = await fetchAgencyDetails(agency.id);
      setSelectedAgency(details);
      setIsDeleteDialogOpen(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load agency details',
        variant: 'destructive',
      });
    }
  };

  const handleRepairDatabaseNames = async () => {
    setIsRepairing(true);
    try {
      const endpoint = getApiEndpoint('/system/agencies/repair-database-names');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const token = window.localStorage.getItem('auth_token') || '';
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to repair database names';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error?.message || errorData.message || errorMessage;
        } catch {
          // If parsing fails, use default message
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      toast({
        title: 'Repair Complete',
        description: `Successfully repaired ${data.data.successful} of ${data.data.total} agencies.`,
      });
      
      // Refresh the list
      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Repair Failed',
        description: error.message || 'Failed to repair database names',
        variant: 'destructive',
      });
    } finally {
      setIsRepairing(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedAgency) return;

    try {
      // First export backup
      await exportAgencyBackup(selectedAgency.id, selectedAgency.name);
      
      // Small delay to ensure download starts
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      // Then delete
      await deleteAgency(selectedAgency.id);
      
      toast({
        title: 'Agency Deleted',
        description: `Agency "${selectedAgency.name}" has been permanently deleted.`,
      });
      
      // Refresh the list
      onRefresh();
    } catch (error: any) {
      throw error; // Let the dialog handle the error
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Agency Management</CardTitle>
              <CardDescription>
                Manage agencies and delete them permanently. Backups are automatically created before deletion.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRepairDatabaseNames}
              disabled={isRepairing}
            >
              {isRepairing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Repairing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Repair DB Names
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search agencies by name, domain, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Agencies Table */}
            {filteredAgencies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {agencies.length === 0 ? 'No agencies found' : 'No agencies match your search'}
              </div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agency</TableHead>
                      <TableHead>Domain</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAgencies.map((agency) => (
                      <TableRow key={agency.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{agency.name}</div>
                              <div className="text-sm text-muted-foreground">
                                ID: {agency.id.slice(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{agency.domain || 'Not set'}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {agency.subscription_plan}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {agency.user_count} / {agency.max_users || '∞'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDate(agency.created_at)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={agency.is_active ? 'default' : 'secondary'}
                          >
                            {agency.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleExportBackup(agency.id, agency.name)
                              }
                              disabled={isExporting === agency.id}
                            >
                              {isExporting === agency.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteClick(agency)}
                              disabled={isExporting !== null}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <DeleteAgencyDialog
        agency={selectedAgency}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
