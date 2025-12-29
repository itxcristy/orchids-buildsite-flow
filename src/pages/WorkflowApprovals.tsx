/**
 * Workflow Approvals Page
 * Unified approval queue for all pending workflow approvals
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  CheckCircle2,
  XCircle,
  Search,
  Loader2,
  Eye,
  Clock,
  AlertCircle,
  Filter,
  Calendar,
  User,
  GitBranch,
  FileText,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';
import {
  getAllPendingApprovals,
  updateWorkflowApproval,
  getWorkflowInstanceById,
  type WorkflowApproval,
  type WorkflowInstance,
} from '@/services/api/workflow-service';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export default function WorkflowApprovals() {
  const { toast } = useToast();
  const [approvals, setApprovals] = useState<WorkflowApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWorkflow, setFilterWorkflow] = useState<string>('all');
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<WorkflowApproval | null>(null);
  const [selectedInstance, setSelectedInstance] = useState<WorkflowInstance | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadData();
    }, 30000);
    return () => clearInterval(interval);
  }, [filterWorkflow, filterEntity]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getAllPendingApprovals();
      let filteredData = data;

      if (searchTerm) {
        filteredData = data.filter(
          (approval) =>
            approval.workflow_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            approval.step_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            approval.entity_type?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      setApprovals(filteredData);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load approvals',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (approval: WorkflowApproval) => {
    try {
      const instance = await getWorkflowInstanceById(approval.instance_id);
      setSelectedInstance(instance);
      setSelectedApproval(approval);
      setIsViewDialogOpen(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load instance details',
        variant: 'destructive',
      });
    }
  };

  const handleApprove = (approval: WorkflowApproval) => {
    setSelectedApproval(approval);
    setActionType('approve');
    setComments('');
    setIsActionDialogOpen(true);
  };

  const handleReject = (approval: WorkflowApproval) => {
    setSelectedApproval(approval);
    setActionType('reject');
    setComments('');
    setIsActionDialogOpen(true);
  };

  const handleSubmitAction = async () => {
    if (!selectedApproval || !actionType) return;

    try {
      setIsSubmitting(true);
      await updateWorkflowApproval(selectedApproval.id, {
        status: actionType === 'approve' ? 'approved' : 'rejected',
        comments: comments || undefined,
      });
      toast({
        title: 'Success',
        description: `Approval ${actionType === 'approve' ? 'approved' : 'rejected'} successfully`,
      });
      setIsActionDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${actionType} approval`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive',
      skipped: 'outline',
      delegated: 'secondary',
    };
    const icons: Record<string, any> = {
      pending: Clock,
      approved: CheckCircle2,
      rejected: XCircle,
      skipped: AlertCircle,
      delegated: User,
    };
    const Icon = icons[status] || Clock;

    return (
      <Badge variant={variants[status] || 'secondary'}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const getEntityTypeBadge = (entityType: string) => {
    const colors: Record<string, string> = {
      purchase_order: 'bg-blue-100 text-blue-800',
      purchase_requisition: 'bg-green-100 text-green-800',
      invoice: 'bg-purple-100 text-purple-800',
      expense: 'bg-yellow-100 text-yellow-800',
      asset_disposal: 'bg-red-100 text-red-800',
    };
    return (
      <Badge className={colors[entityType] || 'bg-gray-100 text-gray-800'}>
        {entityType?.replace('_', ' ') || '-'}
      </Badge>
    );
  };

  // Statistics
  const stats = {
    total: approvals.length,
    urgent: approvals.filter((a) => {
      if (!a.timeout_at) return false;
      const timeout = new Date(a.timeout_at);
      const now = new Date();
      const hoursUntilTimeout = (timeout.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursUntilTimeout <= 24 && hoursUntilTimeout > 0;
    }).length,
    overdue: approvals.filter((a) => {
      if (!a.timeout_at) return false;
      return new Date(a.timeout_at) < new Date();
    }).length,
  };

  // Filter by workflow and entity type
  const uniqueWorkflows = Array.from(new Set(approvals.map((a) => a.workflow_name).filter(Boolean)));
  const uniqueEntityTypes = Array.from(new Set(approvals.map((a) => a.entity_type).filter(Boolean)));

  let filteredApprovals = approvals;
  if (filterWorkflow !== 'all') {
    filteredApprovals = filteredApprovals.filter((a) => a.workflow_name === filterWorkflow);
  }
  if (filterEntity !== 'all') {
    filteredApprovals = filteredApprovals.filter((a) => a.entity_type === filterEntity);
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Approval Queue</h1>
          <p className="text-muted-foreground">Review and approve pending workflow requests</p>
        </div>
        <Button variant="outline" onClick={loadData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Requires your action</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.urgent}</div>
            <p className="text-xs text-muted-foreground">Due within 24 hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground">Past due date</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workflows</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueWorkflows.length}</div>
            <p className="text-xs text-muted-foreground">Active workflows</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>Review and take action on pending approvals</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search approvals..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    loadData();
                  }}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={filterWorkflow} onValueChange={setFilterWorkflow}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Workflows" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workflows</SelectItem>
                {uniqueWorkflows.map((workflow) => (
                  <SelectItem key={workflow} value={workflow}>
                    {workflow}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterEntity} onValueChange={setFilterEntity}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {uniqueEntityTypes.map((entity) => (
                  <SelectItem key={entity} value={entity}>
                    {entity?.replace('_', ' ') || '-'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredApprovals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pending approvals found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Step</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Started By</TableHead>
                  <TableHead>Started At</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApprovals.map((approval) => {
                  const isUrgent = approval.timeout_at && new Date(approval.timeout_at) > new Date() && 
                    (new Date(approval.timeout_at).getTime() - new Date().getTime()) / (1000 * 60 * 60) <= 24;
                  const isOverdue = approval.timeout_at && new Date(approval.timeout_at) < new Date();

                  return (
                    <TableRow key={approval.id} className={isOverdue ? 'bg-red-50' : isUrgent ? 'bg-yellow-50' : ''}>
                      <TableCell className="font-medium">{approval.workflow_name || '-'}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{approval.step_name || '-'}</div>
                          <div className="text-sm text-muted-foreground">
                            Step {approval.step_number}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getEntityTypeBadge(approval.entity_type || '')}</TableCell>
                      <TableCell>{approval.started_by_email || '-'}</TableCell>
                      <TableCell>
                        {approval.started_at
                          ? new Date(approval.started_at).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {approval.timeout_at ? (
                          <div>
                            <div className={isOverdue ? 'text-red-600 font-medium' : isUrgent ? 'text-yellow-600 font-medium' : ''}>
                              {new Date(approval.timeout_at).toLocaleDateString()}
                            </div>
                            {isOverdue && (
                              <div className="text-xs text-red-600">Overdue</div>
                            )}
                            {isUrgent && !isOverdue && (
                              <div className="text-xs text-yellow-600">Urgent</div>
                            )}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(approval.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(approval)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApprove(approval)}
                            className="text-green-600"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReject(approval)}
                            className="text-red-600"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve'
                ? 'Approve this workflow step'
                : 'Reject this workflow step'}
            </DialogDescription>
          </DialogHeader>
          {selectedApproval && (
            <div className="space-y-4">
              <div>
                <Label>Workflow</Label>
                <p className="font-medium">{selectedApproval.workflow_name}</p>
              </div>
              <div>
                <Label>Step</Label>
                <p className="font-medium">{selectedApproval.step_name}</p>
              </div>
              <div>
                <Label>Comments {actionType === 'reject' && '(Required)'}</Label>
                <Textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder={actionType === 'approve' ? 'Optional comments...' : 'Please provide a reason for rejection...'}
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitAction}
              disabled={isSubmitting || (actionType === 'reject' && !comments.trim())}
              variant={actionType === 'reject' ? 'destructive' : 'default'}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {actionType === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Approval Details</DialogTitle>
            <DialogDescription>View workflow instance and approval information</DialogDescription>
          </DialogHeader>
          {selectedInstance && selectedApproval && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Workflow</Label>
                <p className="font-medium">{selectedApproval.workflow_name || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Step</Label>
                <p className="font-medium">{selectedApproval.step_name || '-'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Entity Type</Label>
                  <p>{selectedApproval.entity_type || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedApproval.status)}</div>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Started By</Label>
                <p>{selectedApproval.started_by_email || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Started At</Label>
                <p>
                  {selectedApproval.started_at
                    ? new Date(selectedApproval.started_at).toLocaleString()
                    : '-'}
                </p>
              </div>
              {selectedApproval.timeout_at && (
                <div>
                  <Label className="text-muted-foreground">Due Date</Label>
                  <p>
                    {new Date(selectedApproval.timeout_at).toLocaleString()}
                  </p>
                </div>
              )}
              {selectedInstance.metadata && (
                <div>
                  <Label className="text-muted-foreground">Metadata</Label>
                  <pre className="mt-2 p-3 bg-muted rounded-md text-sm overflow-auto">
                    {JSON.stringify(selectedInstance.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            {selectedApproval && (
              <>
                <Button
                  onClick={() => {
                    setIsViewDialogOpen(false);
                    handleApprove(selectedApproval);
                  }}
                  className="text-green-600"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => {
                    setIsViewDialogOpen(false);
                    handleReject(selectedApproval);
                  }}
                  variant="destructive"
                >
                  <X className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

