import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { UserPlus, Clock, CheckCircle, XCircle, AlertTriangle, Search, RefreshCw, Trash2, Eye, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { AppRole, ROLE_DISPLAY_NAMES, getAssignableRoles } from '@/utils/roleUtils';
import { selectRecords, insertRecord, updateRecord, deleteRecord } from '@/services/api/postgresql-service';
import { generateUUID } from '@/lib/uuid';

interface RoleChangeRequest {
  id: string;
  user_id: string;
  previous_role: AppRole | null;
  requested_role: AppRole;
  reason: string | null;
  requested_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  created_at: string;
  updated_at: string;
  profile?: {
    full_name: string;
    email: string;
  };
  requested_by_profile?: {
    full_name: string;
    email: string;
  };
}

export function RoleChangeRequests() {
  const { userRole, user } = useAuth();
  const [requests, setRequests] = useState<RoleChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newRequest, setNewRequest] = useState({
    user_id: '',
    requested_role: '' as AppRole,
    reason: ''
  });
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'expired'>('all');
  const [selectedRequest, setSelectedRequest] = useState<RoleChangeRequest | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [actionRequestId, setActionRequestId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'delete' | null>(null);
  const [processing, setProcessing] = useState(false);
  const [creating, setCreating] = useState(false);

  const canManageRoleChanges = userRole && ['super_admin', 'ceo'].includes(userRole);
  const canCreateRequests = userRole && ['admin', 'hr', 'department_head'].includes(userRole);

  const fetchRequests = async () => {
    try {
      // Fetch role change requests
      const requests = await selectRecords<RoleChangeRequest>('role_change_requests', {
        orderBy: 'created_at DESC'
      });

      if (!requests || requests.length === 0) {
        setRequests([]);
        setLoading(false);
        return;
      }

      // Collect all user IDs
      const userIds = new Set<string>();
      requests.forEach(req => {
        if (req.user_id) userIds.add(req.user_id);
        if (req.requested_by) userIds.add(req.requested_by);
        if (req.reviewed_by) userIds.add(req.reviewed_by);
      });

      // Fetch profiles
      const profileMap = new Map<string, { full_name: string; email: string }>();
      if (userIds.size > 0) {
        const userIdArray = Array.from(userIds);
        const profiles = await selectRecords<{ user_id: string; full_name: string }>('profiles', {
          filters: [{ column: 'user_id', operator: 'in', value: userIdArray }]
        });

        // Fetch emails from users table
        const users = await selectRecords<{ id: string; email: string }>('users', {
          filters: [{ column: 'id', operator: 'in', value: userIdArray }]
        });

        // Build profile map
        profiles.forEach(profile => {
          const user = users.find(u => u.id === profile.user_id);
          profileMap.set(profile.user_id, {
            full_name: profile.full_name || 'Unknown',
            email: user?.email || ''
          });
        });
      }

      // Enrich requests with profile data
      const enrichedRequests = requests.map(req => ({
        ...req,
        profile: profileMap.get(req.user_id),
        requested_by_profile: req.requested_by ? profileMap.get(req.requested_by) : undefined
      }));

      setRequests(enrichedRequests);
    } catch (error: any) {
      console.error('Error fetching role change requests:', error);
      const errorMessage = error?.message || String(error);
      if (errorMessage.includes('does not exist') || errorMessage.includes('42P01') || 
          errorMessage.includes('relation')) {
        console.warn('role_change_requests table does not exist yet');
        setRequests([]);
      } else {
        toast.error('Failed to load role change requests');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const profiles = await selectRecords<{ user_id: string; full_name: string }>('profiles', {
        where: { is_active: true },
        orderBy: 'full_name ASC'
      });
      
      if (!profiles || profiles.length === 0) {
        setEmployees([]);
        return;
      }

      // Fetch emails from users table
      const userIds = profiles.map(p => p.user_id).filter(Boolean);
      let emailMap = new Map<string, string>();
      if (userIds.length > 0) {
        const users = await selectRecords<{ id: string; email: string }>('users', {
          filters: [{ column: 'id', operator: 'in', value: userIds }]
        });
        
        users.forEach(user => {
          emailMap.set(user.id, user.email);
        });
      }
      
      setEmployees(profiles.map(profile => ({
        ...profile,
        email: emailMap.get(profile.user_id) || ''
      })));
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    }
  };

  useEffect(() => {
    fetchRequests();
    if (canCreateRequests) {
      fetchEmployees();
    }
  }, [canCreateRequests]);

  const handleCreateRequest = async () => {
    if (!user || !newRequest.user_id || !newRequest.requested_role) {
      toast.error('Please fill in all required fields');
      return;
    }

    setCreating(true);
    try {
      // Fetch existing role from user_roles table
      const existingRoles = await selectRecords<{ role: AppRole }>('user_roles', {
        where: { user_id: newRequest.user_id }
      });

      const previousRole = existingRoles && existingRoles.length > 0 
        ? existingRoles[0].role 
        : null;

      // Check if user already has the requested role
      if (previousRole === newRequest.requested_role) {
        toast.error('User already has this role');
        setCreating(false);
        return;
      }

      await insertRecord('role_change_requests', {
        id: generateUUID(),
        user_id: newRequest.user_id,
        requested_role: newRequest.requested_role,
        previous_role: previousRole,
        reason: newRequest.reason || null,
        requested_by: user.id,
        status: 'pending'
      }, user.id);

      toast.success('Role change request created successfully');
      setShowCreateDialog(false);
      setNewRequest({ user_id: '', requested_role: '' as AppRole, reason: '' });
      await fetchRequests();
    } catch (error: any) {
      console.error('Error creating role change request:', error);
      toast.error(error?.message || 'Failed to create role change request');
    } finally {
      setCreating(false);
    }
  };

  const handleApproveRequest = async (requestId: string, action: 'approved' | 'rejected') => {
    if (!user) return;

    setProcessing(true);
    try {
      const request = requests.find(r => r.id === requestId);
      if (!request) {
        toast.error('Request not found');
        setProcessing(false);
        return;
      }

      // Update request status
      await updateRecord('role_change_requests', {
        status: action,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      }, { id: requestId }, user.id);

      // If approved, update the user's role in user_roles table
      if (action === 'approved') {
        // Check if user already has a role
        const existingRoles = await selectRecords<{ id: string; role: AppRole }>('user_roles', {
          where: { user_id: request.user_id }
        });

        if (existingRoles && existingRoles.length > 0) {
          // Update existing role
          await updateRecord('user_roles', 
            { role: request.requested_role },
            { id: existingRoles[0].id },
            user.id
          );
        } else {
          // Create new role assignment
          await insertRecord('user_roles', {
            id: generateUUID(),
            user_id: request.user_id,
            role: request.requested_role,
            assigned_by: user.id
          }, user.id);
        }
      }

      toast.success(`Request ${action} successfully`);
      setShowApproveConfirm(false);
      setShowRejectConfirm(false);
      setActionRequestId(null);
      setActionType(null);
      await fetchRequests();
    } catch (error: any) {
      console.error(`Error ${action} request:`, error);
      toast.error(error?.message || `Failed to ${action} request`);
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!user) return;

    setProcessing(true);
    try {
      await deleteRecord('role_change_requests', { id: requestId });
      toast.success('Request deleted successfully');
      setShowDeleteConfirm(false);
      setActionRequestId(null);
      setActionType(null);
      await fetchRequests();
    } catch (error: any) {
      console.error('Error deleting request:', error);
      toast.error(error?.message || 'Failed to delete request');
    } finally {
      setProcessing(false);
    }
  };

  const handleRequestAction = (requestId: string, type: 'approve' | 'reject' | 'delete') => {
    setActionRequestId(requestId);
    setActionType(type);
    if (type === 'approve') {
      setShowApproveConfirm(true);
    } else if (type === 'reject') {
      setShowRejectConfirm(true);
    } else {
      setShowDeleteConfirm(true);
    }
  };

  const canCancelRequest = (request: RoleChangeRequest) => {
    return request.status === 'pending' && 
           request.requested_by === user?.id && 
           !canManageRoleChanges;
  };

  const getFilteredRequests = () => {
    let filtered = requests;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(req => req.status === statusFilter);
    }

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(req =>
        req.profile?.full_name.toLowerCase().includes(searchLower) ||
        req.profile?.email.toLowerCase().includes(searchLower) ||
        req.requested_by_profile?.full_name.toLowerCase().includes(searchLower) ||
        ROLE_DISPLAY_NAMES[req.requested_role]?.toLowerCase().includes(searchLower) ||
        (req.previous_role && ROLE_DISPLAY_NAMES[req.previous_role]?.toLowerCase().includes(searchLower)) ||
        req.reason?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  };

  const filteredRequests = getFilteredRequests();

  const stats = {
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
    expired: requests.filter(r => r.status === 'expired').length,
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'expired':
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'approved' ? 'default' : status === 'rejected' ? 'destructive' : 'secondary';
    return <Badge variant={variant}>{status.toUpperCase()}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Role Change Requests</h1>
          <p className="text-muted-foreground">Manage user role change requests and approvals</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRequests}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {canCreateRequests && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Create Request
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, role, or reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Status Tabs */}
      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
        <TabsList>
          <TabsTrigger value="all">
            All ({stats.all})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({stats.pending})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({stats.approved})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({stats.rejected})
          </TabsTrigger>
          {stats.expired > 0 && (
            <TabsTrigger value="expired">
              Expired ({stats.expired})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value={statusFilter} className="mt-4">
          <div className="grid gap-4">
            {filteredRequests.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">
                    {searchTerm ? 'No requests match your search' : 'No role change requests'}
                  </p>
                  <p className="text-muted-foreground">
                    {searchTerm 
                      ? 'Try adjusting your search terms'
                      : statusFilter !== 'all' 
                        ? `No ${statusFilter} requests found`
                        : 'All requests will appear here when created'}
                  </p>
                  {searchTerm && (
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setSearchTerm('')}
                    >
                      Clear Search
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              filteredRequests.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(request.status)}
                    <CardTitle className="text-lg">
                      {request.profile?.full_name || 'Unknown User'}
                    </CardTitle>
                    {getStatusBadge(request.status)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(request.created_at).toLocaleDateString()}
                  </div>
                </div>
                <CardDescription>
                  Requested by: {request.requested_by_profile?.full_name || 'Unknown'}
                  {request.reviewed_by && request.reviewed_at && (
                    <> • Reviewed on {new Date(request.reviewed_at).toLocaleDateString()}</>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium">Current Role</h4>
                    <Badge variant="outline">
                      {request.previous_role 
                        ? (ROLE_DISPLAY_NAMES[request.previous_role] || request.previous_role)
                        : 'No role assigned'}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-medium">Requested Role</h4>
                    <Badge variant="default">
                      {ROLE_DISPLAY_NAMES[request.requested_role] || request.requested_role}
                    </Badge>
                  </div>
                </div>
                
                {request.reason && (
                  <div>
                    <h4 className="font-medium mb-2">Reason</h4>
                    <p className="text-sm text-muted-foreground">{request.reason}</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowDetailsDialog(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                    {canCancelRequest(request) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRequestAction(request.id, 'delete')}
                        disabled={processing}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Cancel Request
                      </Button>
                    )}
                  </div>
                  {canManageRoleChanges && request.status === 'pending' && (
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => handleRequestAction(request.id, 'approve')}
                        disabled={processing}
                      >
                        {processing && actionRequestId === request.id && actionType === 'approve' ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-1" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRequestAction(request.id, 'reject')}
                        disabled={processing}
                      >
                        {processing && actionRequestId === request.id && actionType === 'reject' ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-1" />
                        )}
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Role Change Request</DialogTitle>
            <DialogDescription>
              Request a role change for an employee. This will require approval from authorized personnel.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Employee</label>
              <Select
                value={newRequest.user_id}
                onValueChange={(value) => setNewRequest(prev => ({ ...prev, user_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.user_id} value={employee.user_id}>
                      {employee.full_name} ({employee.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Requested Role</label>
              <Select
                value={newRequest.requested_role}
                onValueChange={(value) => setNewRequest(prev => ({ ...prev, requested_role: value as AppRole }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {userRole && getAssignableRoles(userRole).map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_DISPLAY_NAMES[role] || role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Reason</label>
              <Textarea
                value={newRequest.reason}
                onChange={(e) => setNewRequest(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Explain why this role change is needed..."
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCreateDialog(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateRequest} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
            <DialogDescription>
              Complete information about this role change request
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">User</label>
                  <p className="text-sm font-medium">{selectedRequest.profile?.full_name || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">{selectedRequest.profile?.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusIcon(selectedRequest.status)}
                    {getStatusBadge(selectedRequest.status)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Current Role</label>
                  <Badge variant="outline" className="mt-1">
                    {selectedRequest.previous_role 
                      ? (ROLE_DISPLAY_NAMES[selectedRequest.previous_role] || selectedRequest.previous_role)
                      : 'No role assigned'}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Requested Role</label>
                  <Badge variant="default" className="mt-1">
                    {ROLE_DISPLAY_NAMES[selectedRequest.requested_role] || selectedRequest.requested_role}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Requested By</label>
                  <p className="text-sm">{selectedRequest.requested_by_profile?.full_name || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">{selectedRequest.requested_by_profile?.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created At</label>
                  <p className="text-sm">{new Date(selectedRequest.created_at).toLocaleString()}</p>
                </div>
                {selectedRequest.reviewed_by && selectedRequest.reviewed_at && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Reviewed By</label>
                      <p className="text-sm">{selectedRequest.reviewed_by_profile?.full_name || 'Unknown'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Reviewed At</label>
                      <p className="text-sm">{new Date(selectedRequest.reviewed_at).toLocaleString()}</p>
                    </div>
                  </>
                )}
              </div>
              {selectedRequest.reason && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Reason</label>
                  <p className="text-sm mt-1 p-3 bg-muted rounded-md">{selectedRequest.reason}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={showApproveConfirm} onOpenChange={setShowApproveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Role Change Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this role change request? The user's role will be updated immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => actionRequestId && handleApproveRequest(actionRequestId, 'approved')}
              disabled={processing}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                'Approve'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={showRejectConfirm} onOpenChange={setShowRejectConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Role Change Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this role change request? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => actionRequestId && handleApproveRequest(actionRequestId, 'rejected')}
              disabled={processing}
              className="bg-destructive hover:bg-destructive/90"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Reject'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Role Change Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this role change request? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => actionRequestId && handleDeleteRequest(actionRequestId)}
              disabled={processing}
              className="bg-destructive hover:bg-destructive/90"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Request'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}