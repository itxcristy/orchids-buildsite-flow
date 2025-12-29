/**
 * Workflow Instances Page
 * Complete workflow instance tracking interface
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  GitBranch,
  Search,
  Loader2,
  Eye,
  XCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  Filter,
  Calendar,
  User,
} from 'lucide-react';
import {
  getWorkflowInstances,
  getWorkflowInstanceById,
  getWorkflowApprovals,
  cancelWorkflowInstance,
  getWorkflows,
  type WorkflowInstance,
  type WorkflowApproval,
  type Workflow,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function WorkflowInstances() {
  const { toast } = useToast();
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWorkflow, setFilterWorkflow] = useState<string>('all');
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<WorkflowInstance | null>(null);
  const [approvals, setApprovals] = useState<WorkflowApproval[]>([]);
  const [loadingApprovals, setLoadingApprovals] = useState(false);

  useEffect(() => {
    loadWorkflows();
    loadData();
  }, [filterWorkflow, filterEntity, filterStatus, dateFrom, dateTo]);

  const loadWorkflows = async () => {
    try {
      const data = await getWorkflows({ is_active: true });
      setWorkflows(data);
    } catch (error: any) {
      console.error('Failed to load workflows:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (filterWorkflow !== 'all') filters.workflow_id = filterWorkflow;
      if (filterEntity !== 'all') filters.entity_type = filterEntity;
      if (filterStatus !== 'all') filters.status = filterStatus;
      if (dateFrom) filters.date_from = dateFrom;
      if (dateTo) filters.date_to = dateTo;
      if (searchTerm) {
        // Search will be handled client-side for now
      }

      const data = await getWorkflowInstances(filters);
      setInstances(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load workflow instances',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (instance: WorkflowInstance) => {
    setSelectedInstance(instance);
    setIsViewDialogOpen(true);
    await loadApprovals(instance.id);
  };

  const loadApprovals = async (instanceId: string) => {
    try {
      setLoadingApprovals(true);
      const data = await getWorkflowApprovals(instanceId);
      setApprovals(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load approvals',
        variant: 'destructive',
      });
    } finally {
      setLoadingApprovals(false);
    }
  };

  const handleCancel = async (instance: WorkflowInstance) => {
    if (!confirm(`Are you sure you want to cancel this workflow instance?`)) {
      return;
    }

    const reason = prompt('Please provide a reason for cancellation (optional):');

    try {
      await cancelWorkflowInstance(instance.id, reason || undefined);
      toast({
        title: 'Success',
        description: 'Workflow instance cancelled successfully',
      });
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel workflow instance',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'outline',
      in_progress: 'default',
      approved: 'default',
      rejected: 'destructive',
      cancelled: 'secondary',
      completed: 'default',
    };
    const icons: Record<string, any> = {
      pending: Clock,
      in_progress: AlertCircle,
      approved: CheckCircle2,
      rejected: XCircle,
      cancelled: XCircle,
      completed: CheckCircle2,
    };
    const Icon = icons[status] || Clock;
    return (
      <Badge variant={variants[status] || 'outline'}>
        <Icon className="mr-1 h-3 w-3" />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const filteredInstances = instances.filter((instance) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      instance.workflow_name?.toLowerCase().includes(search) ||
      instance.entity_type.toLowerCase().includes(search) ||
      instance.entity_id.toLowerCase().includes(search) ||
      instance.started_by_email?.toLowerCase().includes(search)
    );
  });

  const entityTypes = [
    'purchase_order',
    'leave_request',
    'expense',
    'invoice',
    'requisition',
    'asset',
    'project',
    'task',
    'custom',
  ];

  const stats = {
    total: instances.length,
    pending: instances.filter((i) => i.status === 'pending').length,
    inProgress: instances.filter((i) => i.status === 'in_progress').length,
    approved: instances.filter((i) => i.status === 'approved').length,
    rejected: instances.filter((i) => i.status === 'rejected').length,
    completed: instances.filter((i) => i.status === 'completed').length,
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflow Instances</h1>
          <p className="text-muted-foreground">Track and manage active workflow instances</p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Instances</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-6">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search instances..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Workflow</Label>
              <Select value={filterWorkflow} onValueChange={setFilterWorkflow}>
                <SelectTrigger>
                  <SelectValue placeholder="All Workflows" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Workflows</SelectItem>
                  {workflows.map((workflow) => (
                    <SelectItem key={workflow.id} value={workflow.id}>
                      {workflow.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Entity Type</Label>
              <Select value={filterEntity} onValueChange={setFilterEntity}>
                <SelectTrigger>
                  <SelectValue placeholder="All Entities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {entityTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace('_', ' ').toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Date To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instances Table */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow Instances</CardTitle>
          <CardDescription>Track all workflow execution instances</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredInstances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No workflow instances found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current Step</TableHead>
                  <TableHead>Started By</TableHead>
                  <TableHead>Started At</TableHead>
                  <TableHead>Completed At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInstances.map((instance) => (
                  <TableRow key={instance.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{instance.workflow_name || 'Unknown'}</div>
                        {instance.workflow_type && (
                          <div className="text-sm text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {instance.workflow_type}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-mono text-sm">{instance.entity_id}</div>
                        <div className="text-sm text-muted-foreground">
                          {instance.entity_type.replace('_', ' ')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(instance.status)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">Step {instance.current_step_number}</Badge>
                    </TableCell>
                    <TableCell>
                      {instance.started_by_email ? (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span className="text-sm">{instance.started_by_email}</span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(instance.started_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {instance.completed_at
                        ? new Date(instance.completed_at).toLocaleString()
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(instance)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {['pending', 'in_progress'].includes(instance.status) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancel(instance)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Workflow Instance Details</DialogTitle>
            <DialogDescription>View instance information and approval history</DialogDescription>
          </DialogHeader>
          {selectedInstance && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="approvals">
                  Approvals ({approvals.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Workflow</Label>
                    <div className="mt-1 font-medium">{selectedInstance.workflow_name || 'Unknown'}</div>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedInstance.status)}</div>
                  </div>
                  <div>
                    <Label>Entity Type</Label>
                    <div className="mt-1">
                      <Badge variant="secondary">
                        {selectedInstance.entity_type.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label>Entity ID</Label>
                    <div className="mt-1 font-mono text-sm">{selectedInstance.entity_id}</div>
                  </div>
                  <div>
                    <Label>Current Step</Label>
                    <div className="mt-1">
                      <Badge variant="secondary">Step {selectedInstance.current_step_number}</Badge>
                    </div>
                  </div>
                  <div>
                    <Label>Started By</Label>
                    <div className="mt-1">
                      {selectedInstance.started_by_email || '-'}
                    </div>
                  </div>
                  <div>
                    <Label>Started At</Label>
                    <div className="mt-1">
                      {new Date(selectedInstance.started_at).toLocaleString()}
                    </div>
                  </div>
                  {selectedInstance.completed_at && (
                    <div>
                      <Label>Completed At</Label>
                      <div className="mt-1">
                        {new Date(selectedInstance.completed_at).toLocaleString()}
                      </div>
                    </div>
                  )}
                  {selectedInstance.completed_by_email && (
                    <div>
                      <Label>Completed By</Label>
                      <div className="mt-1">
                        {selectedInstance.completed_by_email}
                      </div>
                    </div>
                  )}
                  {selectedInstance.rejection_reason && (
                    <div className="md:col-span-2">
                      <Label>Rejection Reason</Label>
                      <div className="mt-1 p-2 bg-destructive/10 rounded-md text-sm">
                        {selectedInstance.rejection_reason}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="approvals" className="space-y-4">
                {loadingApprovals ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : approvals.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No approvals found for this instance
                  </div>
                ) : (
                  <div className="space-y-2">
                    {approvals.map((approval) => (
                      <Card key={approval.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">Step {approval.step_number}</Badge>
                                <span className="font-medium">{approval.step_name || 'Step'}</span>
                                <Badge variant="secondary">{approval.step_type}</Badge>
                                {getStatusBadge(approval.status)}
                              </div>
                              <div className="text-sm text-muted-foreground mb-1">
                                Approver: {approval.approver_email || approval.approver_id}
                              </div>
                              {approval.action_taken_at && (
                                <div className="text-sm text-muted-foreground mb-1">
                                  Action taken: {new Date(approval.action_taken_at).toLocaleString()}
                                </div>
                              )}
                              {approval.comments && (
                                <div className="text-sm mt-2 p-2 bg-muted rounded-md">
                                  {approval.comments}
                                </div>
                              )}
                              {approval.delegated_to_email && (
                                <div className="text-sm text-muted-foreground mt-1">
                                  Delegated to: {approval.delegated_to_email}
                                </div>
                              )}
                              {approval.is_timeout && (
                                <Badge variant="destructive" className="mt-2">
                                  Timeout
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            {selectedInstance &&
              ['pending', 'in_progress'].includes(selectedInstance.status) && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    setIsViewDialogOpen(false);
                    handleCancel(selectedInstance);
                  }}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel Instance
                </Button>
              )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

