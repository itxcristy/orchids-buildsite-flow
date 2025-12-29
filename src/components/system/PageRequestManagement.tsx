/**
 * Page Request Management Component
 * Super admin interface for managing agency page requests
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, XCircle, Clock, Search, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getApiBaseUrl } from '@/config/api';
import { useAuth } from '@/hooks/useAuth';

interface PageRequest {
  id: string;
  agency_id: string;
  agency_name: string;
  page_id: string;
  path: string;
  title: string;
  description: string;
  base_cost: number;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  requested_by_email: string;
  reviewed_by_email?: string;
  reviewed_at?: string;
  created_at: string;
}

export default function PageRequestManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [requests, setRequests] = useState<PageRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<PageRequest | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [costOverride, setCostOverride] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const getAuthToken = () => {
    // Try both token keys for compatibility
    return localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
  };

  const fetchRequests = async () => {
    if (!user) return;
    
    const token = getAuthToken();
    if (!token) {
      console.warn('[PageRequestManagement] No authentication token found');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }

      const response = await fetch(
        `${getApiBaseUrl()}/api/system/page-catalog/page-requests?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 401) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Authentication failed. Please log in again.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Failed to fetch requests: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setRequests(data.data || []);
      } else {
        throw new Error(data.error?.message || 'Failed to fetch page requests');
      }
    } catch (error: any) {
      console.error('Error fetching requests:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch page requests',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filterStatus]);

  const handleApprove = async () => {
    if (!selectedRequest) return;

    const token = getAuthToken();
    if (!token) {
      toast({
        title: 'Error',
        description: 'Authentication token not found',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/system/page-catalog/page-requests/${selectedRequest.id}/approve`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            cost_override: costOverride ? parseFloat(costOverride) : null
          })
        }
      );

      if (response.status === 401) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Authentication failed. Please log in again.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Failed to approve request');
      }

      toast({
        title: 'Success',
        description: 'Page request approved successfully'
      });
      setIsDialogOpen(false);
      setSelectedRequest(null);
      setCostOverride('');
      await fetchRequests();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve request',
        variant: 'destructive'
      });
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    const token = getAuthToken();
    if (!token) {
      toast({
        title: 'Error',
        description: 'Authentication token not found',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/system/page-catalog/page-requests/${selectedRequest.id}/reject`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            reason: rejectionReason
          })
        }
      );

      if (response.status === 401) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Authentication failed. Please log in again.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Failed to reject request');
      }

      toast({
        title: 'Success',
        description: 'Page request rejected'
      });
      setIsDialogOpen(false);
      setSelectedRequest(null);
      setRejectionReason('');
      await fetchRequests();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject request',
        variant: 'destructive'
      });
    }
  };

  const openActionDialog = (request: PageRequest, actionType: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setAction(actionType);
    setCostOverride('');
    setRejectionReason('');
    setIsDialogOpen(true);
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = !searchQuery ||
      request.agency_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.path.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Page Request Management</h2>
          <p className="text-muted-foreground mt-1">
            Review and manage page requests from agencies
          </p>
        </div>
        <Button onClick={fetchRequests} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Page Requests ({filteredRequests.length})</CardTitle>
          <CardDescription>
            Review and approve or reject page access requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No requests found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agency</TableHead>
                  <TableHead>Page</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.agency_name}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{request.title}</div>
                        <div className="text-sm text-muted-foreground font-mono">
                          {request.path}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        ${request.base_cost.toFixed(2)}/mo
                      </div>
                    </TableCell>
                    <TableCell>{request.requested_by_email}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {request.reason || <span className="text-muted-foreground">No reason provided</span>}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      {new Date(request.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {request.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openActionDialog(request, 'approve')}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openActionDialog(request, 'reject')}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === 'approve' ? 'Approve Page Request' : 'Reject Page Request'}
            </DialogTitle>
            <DialogDescription>
              {action === 'approve'
                ? `Approve access to "${selectedRequest?.title}" for ${selectedRequest?.agency_name}?`
                : `Reject the request for "${selectedRequest?.title}" from ${selectedRequest?.agency_name}?`}
            </DialogDescription>
          </DialogHeader>

          {action === 'approve' ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Custom Pricing (Optional)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={costOverride}
                  onChange={(e) => setCostOverride(e.target.value)}
                  placeholder={`Default: $${selectedRequest?.base_cost.toFixed(2)}/mo`}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty to use default page cost
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Rejection Reason (Optional)
                </label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this request is being rejected..."
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={action === 'approve' ? handleApprove : handleReject}
              variant={action === 'approve' ? 'default' : 'destructive'}
            >
              {action === 'approve' ? 'Approve' : 'Reject'} Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

