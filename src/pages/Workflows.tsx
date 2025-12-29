/**
 * Workflows Page
 * Complete workflow engine management interface
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Workflow,
  Plus,
  Search,
  Loader2,
  Edit,
  Trash2,
  Eye,
  GitBranch,
  Settings,
  CheckCircle2,
  XCircle,
  Filter,
  List,
} from 'lucide-react';
import {
  getWorkflows,
  getWorkflowById,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  getWorkflowSteps,
  createWorkflowStep,
  updateWorkflowStep,
  deleteWorkflowStep,
  type Workflow as WorkflowType,
  type WorkflowStep,
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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

export default function Workflows() {
  const { toast } = useToast();
  const [workflows, setWorkflows] = useState<WorkflowType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isStepsDialogOpen, setIsStepsDialogOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowType | null>(null);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<WorkflowType>>({
    name: '',
    description: '',
    workflow_type: 'approval',
    entity_type: '',
    trigger_event: '',
    is_active: true,
    configuration: {},
  });

  useEffect(() => {
    loadData();
  }, [filterType, filterEntity, filterActive]);

  const loadData = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (filterType !== 'all') filters.workflow_type = filterType;
      if (filterEntity !== 'all') filters.entity_type = filterEntity;
      if (filterActive !== 'all') filters.is_active = filterActive === 'active';
      if (searchTerm) filters.search = searchTerm;

      const data = await getWorkflows(filters);
      setWorkflows(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load workflows',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadWorkflowSteps = async (workflowId: string) => {
    try {
      const steps = await getWorkflowSteps(workflowId);
      setWorkflowSteps(steps);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load workflow steps',
        variant: 'destructive',
      });
    }
  };

  const handleCreate = () => {
    setFormData({
      name: '',
      description: '',
      workflow_type: 'approval',
      entity_type: '',
      trigger_event: '',
      is_active: true,
      configuration: {},
    });
    setSelectedWorkflow(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (workflow: WorkflowType) => {
    setFormData({
      ...workflow,
    });
    setSelectedWorkflow(workflow);
    setIsDialogOpen(true);
  };

  const handleView = async (workflow: WorkflowType) => {
    setSelectedWorkflow(workflow);
    await loadWorkflowSteps(workflow.id);
    setIsViewDialogOpen(true);
  };

  const handleViewSteps = async (workflow: WorkflowType) => {
    setSelectedWorkflow(workflow);
    await loadWorkflowSteps(workflow.id);
    setIsStepsDialogOpen(true);
  };

  const handleDelete = async (workflow: WorkflowType) => {
    if (workflow.is_system) {
      toast({
        title: 'Error',
        description: 'Cannot delete system workflow',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete workflow "${workflow.name}"?`)) {
      return;
    }

    try {
      await deleteWorkflow(workflow.id);
      toast({
        title: 'Success',
        description: 'Workflow deleted successfully',
      });
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete workflow',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.entity_type) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      if (selectedWorkflow) {
        await updateWorkflow(selectedWorkflow.id, formData);
        toast({
          title: 'Success',
          description: 'Workflow updated successfully',
        });
      } else {
        await createWorkflow(formData);
        toast({
          title: 'Success',
          description: 'Workflow created successfully',
        });
      }
      setIsDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save workflow',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
    total: workflows.length,
    active: workflows.filter((w) => w.is_active).length,
    inactive: workflows.filter((w) => !w.is_active).length,
    approval: workflows.filter((w) => w.workflow_type === 'approval').length,
    automation: workflows.filter((w) => w.workflow_type === 'automation').length,
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflow Engine</h1>
          <p className="text-muted-foreground">Manage workflows and automation rules</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Workflow
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workflows</CardTitle>
            <Workflow className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.inactive}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approval</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.approval}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Automation</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.automation}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search workflows..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadData()}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="approval">Approval</SelectItem>
                  <SelectItem value="notification">Notification</SelectItem>
                  <SelectItem value="automation">Automation</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
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
              <Select value={filterActive} onValueChange={setFilterActive}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflows Table */}
      <Card>
        <CardHeader>
          <CardTitle>Workflows</CardTitle>
          <CardDescription>Manage all workflow definitions</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : workflows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No workflows found. Create your first workflow to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Entity Type</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Steps</TableHead>
                  <TableHead>Instances</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflows.map((workflow) => (
                  <TableRow key={workflow.id}>
                    <TableCell className="font-medium">{workflow.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{workflow.workflow_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {workflow.entity_type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {workflow.trigger_event ? (
                        <span className="text-sm">{workflow.trigger_event}</span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{workflow.step_count || 0}</TableCell>
                    <TableCell>{workflow.instance_count || 0}</TableCell>
                    <TableCell>
                      <Badge variant={workflow.is_active ? 'default' : 'secondary'}>
                        {workflow.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>v{workflow.version}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(workflow)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewSteps(workflow)}
                        >
                          <List className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(workflow)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!workflow.is_system && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(workflow)}
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedWorkflow ? 'Edit Workflow' : 'Create Workflow'}
            </DialogTitle>
            <DialogDescription>
              {selectedWorkflow
                ? 'Update workflow definition'
                : 'Create a new workflow definition'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Workflow name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workflow_type">Workflow Type *</Label>
                  <Select
                    value={formData.workflow_type || 'approval'}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, workflow_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approval">Approval</SelectItem>
                      <SelectItem value="notification">Notification</SelectItem>
                      <SelectItem value="automation">Automation</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="entity_type">Entity Type *</Label>
                  <Select
                    value={formData.entity_type || ''}
                    onValueChange={(value) => setFormData({ ...formData, entity_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select entity type" />
                    </SelectTrigger>
                    <SelectContent>
                      {entityTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.replace('_', ' ').toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trigger_event">Trigger Event</Label>
                  <Input
                    id="trigger_event"
                    value={formData.trigger_event || ''}
                    onChange={(e) => setFormData({ ...formData, trigger_event: e.target.value })}
                    placeholder="e.g., created, updated, status_changed"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Workflow description..."
                  rows={3}
                />
              </div>
              <div className="space-y-2 flex items-center gap-4 pt-2">
                <Label htmlFor="is_active">Active</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {selectedWorkflow ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Workflow Details</DialogTitle>
            <DialogDescription>View workflow information and steps</DialogDescription>
          </DialogHeader>
          {selectedWorkflow && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="steps">Steps ({workflowSteps.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Name</Label>
                    <div className="mt-1 font-medium">{selectedWorkflow.name}</div>
                  </div>
                  <div>
                    <Label>Type</Label>
                    <div className="mt-1">
                      <Badge variant="outline">{selectedWorkflow.workflow_type}</Badge>
                    </div>
                  </div>
                  <div>
                    <Label>Entity Type</Label>
                    <div className="mt-1">
                      <Badge variant="secondary">
                        {selectedWorkflow.entity_type.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label>Trigger Event</Label>
                    <div className="mt-1">
                      {selectedWorkflow.trigger_event || '-'}
                    </div>
                  </div>
                  {selectedWorkflow.description && (
                    <div className="md:col-span-2">
                      <Label>Description</Label>
                      <div className="mt-1">{selectedWorkflow.description}</div>
                    </div>
                  )}
                  <div>
                    <Label>Status</Label>
                    <div className="mt-1">
                      <Badge variant={selectedWorkflow.is_active ? 'default' : 'secondary'}>
                        {selectedWorkflow.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label>Version</Label>
                    <div className="mt-1">v{selectedWorkflow.version}</div>
                  </div>
                  <div>
                    <Label>Steps</Label>
                    <div className="mt-1">{selectedWorkflow.step_count || 0}</div>
                  </div>
                  <div>
                    <Label>Instances</Label>
                    <div className="mt-1">{selectedWorkflow.instance_count || 0}</div>
                  </div>
                  <div>
                    <Label>Created</Label>
                    <div className="mt-1">
                      {new Date(selectedWorkflow.created_at).toLocaleString()}
                    </div>
                  </div>
                  {selectedWorkflow.created_by_email && (
                    <div>
                      <Label>Created By</Label>
                      <div className="mt-1">{selectedWorkflow.created_by_email}</div>
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="steps" className="space-y-4">
                {workflowSteps.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No steps defined for this workflow
                  </div>
                ) : (
                  <div className="space-y-2">
                    {workflowSteps.map((step, idx) => (
                      <Card key={step.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">Step {step.step_number}</Badge>
                                <span className="font-medium">{step.step_name}</span>
                                <Badge variant="secondary">{step.step_type}</Badge>
                              </div>
                              {step.approver_type && (
                                <div className="text-sm text-muted-foreground">
                                  Approver: {step.approver_type}
                                  {step.approver_email && ` (${step.approver_email})`}
                                  {step.approver_role && ` - Role: ${step.approver_role}`}
                                </div>
                              )}
                              {step.notes && (
                                <div className="text-sm text-muted-foreground mt-1">
                                  {step.notes}
                                </div>
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
            {selectedWorkflow && (
              <Button
                onClick={() => {
                  setIsViewDialogOpen(false);
                  handleEdit(selectedWorkflow);
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Steps Management Dialog */}
      <Dialog open={isStepsDialogOpen} onOpenChange={setIsStepsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Workflow Steps</DialogTitle>
            <DialogDescription>
              Manage steps for {selectedWorkflow?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedWorkflow && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    // TODO: Open step creation dialog
                    toast({
                      title: 'Info',
                      description: 'Step management will be available in the workflow builder',
                    });
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Step
                </Button>
              </div>
              {workflowSteps.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No steps defined. Add steps to build your workflow.
                </div>
              ) : (
                <div className="space-y-2">
                  {workflowSteps.map((step) => (
                    <Card key={step.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">Step {step.step_number}</Badge>
                              <span className="font-medium">{step.step_name}</span>
                              <Badge variant="secondary">{step.step_type}</Badge>
                              {step.is_parallel && (
                                <Badge variant="outline">Parallel</Badge>
                              )}
                              {step.is_required && (
                                <Badge variant="default">Required</Badge>
                              )}
                            </div>
                            {step.approver_type && (
                              <div className="text-sm text-muted-foreground mb-1">
                                Approver: {step.approver_type}
                                {step.approver_email && ` (${step.approver_email})`}
                                {step.approver_role && ` - Role: ${step.approver_role}`}
                              </div>
                            )}
                            {step.timeout_hours && (
                              <div className="text-sm text-muted-foreground mb-1">
                                Timeout: {step.timeout_hours} hours
                                {step.escalation_enabled && step.escalation_after_hours && (
                                  <span> | Escalation after {step.escalation_after_hours} hours</span>
                                )}
                              </div>
                            )}
                            {step.notes && (
                              <div className="text-sm text-muted-foreground mt-1">
                                {step.notes}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // TODO: Edit step
                                toast({
                                  title: 'Info',
                                  description: 'Step editing will be available in the workflow builder',
                                });
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                if (!confirm(`Delete step "${step.step_name}"?`)) return;
                                try {
                                  await deleteWorkflowStep(selectedWorkflow.id, step.id);
                                  toast({
                                    title: 'Success',
                                    description: 'Step deleted successfully',
                                  });
                                  await loadWorkflowSteps(selectedWorkflow.id);
                                } catch (error: any) {
                                  toast({
                                    title: 'Error',
                                    description: error.message || 'Failed to delete step',
                                    variant: 'destructive',
                                  });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStepsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

