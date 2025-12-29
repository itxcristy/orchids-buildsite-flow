import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MoreHorizontal, Users, Building2, Calendar, DollarSign, Eye, Settings, Activity, FileText, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AgencySummary as AgencyData } from '@/types/system';
import {
  fetchAgencyDetails,
  updateAgency,
  fetchAgencyUsers,
  fetchAgencyUsage,
  type AgencyDetails,
  type AgencyUser,
  type AgencyUsage,
} from '@/services/system-agencies';

interface AgencyManagementProps {
  agencies: AgencyData[];
  onRefresh: () => void;
}

export const AgencyManagement = ({ agencies, onRefresh }: AgencyManagementProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<string>('all');
  const [selectedAgency, setSelectedAgency] = useState<AgencyDetails | null>(null);
  const [agencyUsers, setAgencyUsers] = useState<AgencyUser[]>([]);
  const [agencyUsage, setAgencyUsage] = useState<AgencyUsage | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isUsersDialogOpen, setIsUsersDialogOpen] = useState(false);
  const [isUsageDialogOpen, setIsUsageDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const { toast } = useToast();

  const [editForm, setEditForm] = useState<Partial<AgencyDetails>>({});

  const filteredAgencies = agencies.filter(agency => {
    const matchesSearch = agency.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agency.domain.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = selectedPlan === 'all' || agency.subscription_plan === selectedPlan;
    return matchesSearch && matchesPlan;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'basic': return 'bg-blue-100 text-blue-800';
      case 'pro': return 'bg-green-100 text-green-800';
      case 'enterprise': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewDetails = async (agencyId: string) => {
    try {
      setIsLoadingDetails(true);
      const details = await fetchAgencyDetails(agencyId);
      setSelectedAgency(details);
      setEditForm(details);
      setIsDetailsDialogOpen(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load agency details',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleManageUsers = async (agencyId: string) => {
    try {
      setIsLoadingDetails(true);
      const users = await fetchAgencyUsers(agencyId);
      const details = await fetchAgencyDetails(agencyId);
      setAgencyUsers(users);
      setSelectedAgency(details);
      setIsUsersDialogOpen(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load agency users',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleViewUsage = async (agencyId: string) => {
    try {
      setIsLoadingDetails(true);
      const usage = await fetchAgencyUsage(agencyId);
      const details = await fetchAgencyDetails(agencyId);
      setAgencyUsage(usage);
      setSelectedAgency(details);
      setIsUsageDialogOpen(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load agency usage',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleToggleActive = async (agencyId: string, currentStatus: boolean) => {
    if (!confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this agency?`)) {
      return;
    }

    try {
      setIsUpdating(true);
      await updateAgency(agencyId, { is_active: !currentStatus });
      toast({
        title: 'Success',
        description: `Agency ${currentStatus ? 'deactivated' : 'activated'} successfully`,
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update agency status',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditAgency = async () => {
    if (!selectedAgency) return;

    try {
      setIsUpdating(true);
      await updateAgency(selectedAgency.id, editForm);
      toast({
        title: 'Success',
        description: 'Agency updated successfully',
      });
      setIsEditDialogOpen(false);
      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update agency',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const openEditDialog = (agency: AgencyDetails) => {
    setSelectedAgency(agency);
    setEditForm(agency);
    setIsEditDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Agency Management</CardTitle>
            <Button onClick={onRefresh} variant="outline" size="sm">
              Refresh
            </Button>
          </div>
          
          {/* Search and Filter Controls */}
          <div className="flex items-center gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search agencies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Plan: {selectedPlan === 'all' ? 'All' : selectedPlan}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSelectedPlan('all')}>
                  All Plans
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedPlan('basic')}>
                  Basic
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedPlan('pro')}>
                  Pro
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedPlan('enterprise')}>
                  Enterprise
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agency</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Projects</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAgencies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {agencies.length === 0 ? 'No agencies found' : 'No agencies match your search criteria'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAgencies.map((agency) => (
                  <TableRow key={agency.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{agency.name}</div>
                          <div className="text-sm text-muted-foreground">ID: {agency.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{agency.domain || 'Not set'}</div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`capitalize ${getPlanColor(agency.subscription_plan)}`}>
                        {agency.subscription_plan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{agency.user_count}/{agency.max_users || '∞'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{agency.project_count}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{formatDate(agency.created_at)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={agency.is_active ? "default" : "secondary"}>
                        {agency.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(agency.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleManageUsers(agency.id)}>
                            <Users className="mr-2 h-4 w-4" />
                            Manage Users
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewUsage(agency.id)}>
                            <Activity className="mr-2 h-4 w-4" />
                            View Usage
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={async () => {
                            try {
                              const details = await fetchAgencyDetails(agency.id);
                              openEditDialog(details);
                            } catch (error: any) {
                              toast({
                                title: 'Error',
                                description: error.message || 'Failed to load agency details',
                                variant: 'destructive',
                              });
                            }
                          }}>
                            <Settings className="mr-2 h-4 w-4" />
                            Edit Agency
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className={agency.is_active ? "text-destructive" : "text-green-600"}
                            onClick={() => handleToggleActive(agency.id, agency.is_active)}
                            disabled={isUpdating}
                          >
                            {isUpdating ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : agency.is_active ? (
                              <XCircle className="mr-2 h-4 w-4" />
                            ) : (
                              <CheckCircle className="mr-2 h-4 w-4" />
                            )}
                            {agency.is_active ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Agency Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Agency Details</DialogTitle>
            <DialogDescription>
              Complete information about this agency
            </DialogDescription>
          </DialogHeader>
          {isLoadingDetails ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : selectedAgency ? (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Agency Name</Label>
                  <p className="font-medium">{selectedAgency.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Domain</Label>
                  <p className="font-medium">{selectedAgency.domain || 'Not set'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Subscription Plan</Label>
                  <Badge className={`capitalize ${getPlanColor(selectedAgency.subscription_plan)}`}>
                    {selectedAgency.subscription_plan}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div>
                    <Badge variant={selectedAgency.is_active ? "default" : "secondary"}>
                      {selectedAgency.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Users</Label>
                  <p className="font-medium">{selectedAgency.user_count} / {selectedAgency.max_users || '∞'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Projects</Label>
                  <p className="font-medium">{selectedAgency.project_count}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Invoices</Label>
                  <p className="font-medium">{selectedAgency.invoice_count}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Created</Label>
                  <p className="font-medium">{formatDate(selectedAgency.created_at)}</p>
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              Close
            </Button>
            {selectedAgency && (
              <Button onClick={() => {
                setIsDetailsDialogOpen(false);
                openEditDialog(selectedAgency);
              }}>
                <Settings className="mr-2 h-4 w-4" />
                Edit Agency
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Users Dialog */}
      <Dialog open={isUsersDialogOpen} onOpenChange={setIsUsersDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Manage Users - {selectedAgency?.name}</DialogTitle>
            <DialogDescription>
              View and manage all users for this agency
            </DialogDescription>
          </DialogHeader>
          {isLoadingDetails ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="py-4">
              {agencyUsers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agencyUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.full_name || 'N/A'}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.is_active ? "default" : "secondary"}>
                            {user.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(user.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No users found for this agency</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUsersDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Usage Dialog */}
      <Dialog open={isUsageDialogOpen} onOpenChange={setIsUsageDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Usage Statistics - {selectedAgency?.name}</DialogTitle>
            <DialogDescription>
              Platform usage metrics for this agency
            </DialogDescription>
          </DialogHeader>
          {isLoadingDetails ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : agencyUsage ? (
            <div className="py-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Users</p>
                        <p className="text-2xl font-bold">{agencyUsage.users}</p>
                      </div>
                      <Users className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Projects</p>
                        <p className="text-2xl font-bold">{agencyUsage.projects}</p>
                      </div>
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Invoices</p>
                        <p className="text-2xl font-bold">{agencyUsage.invoices}</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Clients</p>
                        <p className="text-2xl font-bold">{agencyUsage.clients}</p>
                      </div>
                      <Building2 className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="col-span-2">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Tasks</p>
                        <p className="text-2xl font-bold">{agencyUsage.tasks}</p>
                      </div>
                      <Activity className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUsageDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Agency Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Agency</DialogTitle>
            <DialogDescription>
              Update agency information and settings
            </DialogDescription>
          </DialogHeader>
          {selectedAgency && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Agency Name</Label>
                <Input
                  id="edit-name"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-domain">Domain</Label>
                <Input
                  id="edit-domain"
                  value={editForm.domain || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, domain: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-plan">Subscription Plan</Label>
                  <Select
                    value={editForm.subscription_plan}
                    onValueChange={(value) => setEditForm(prev => ({ ...prev, subscription_plan: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-max-users">Max Users</Label>
                  <Input
                    id="edit-max-users"
                    type="number"
                    value={editForm.max_users || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, max_users: parseInt(e.target.value) || undefined }))}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-active"
                  checked={editForm.is_active || false}
                  onChange={(e) => setEditForm(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="edit-active">Agency is active</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditAgency} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
