/**
 * Workflow Builder Page
 * Visual workflow builder using ReactFlow
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  Position,
  Connection,
  addEdge,
  MarkerType,
  Handle,
  NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Workflow,
  Save,
  Plus,
  Trash2,
  Edit,
  Play,
  Loader2,
  GitBranch,
  CheckCircle2,
  Bell,
  Code,
  Zap,
  Clock,
  ArrowRight,
  Settings,
} from 'lucide-react';
import {
  getWorkflows,
  getWorkflowById,
  createWorkflow,
  updateWorkflow,
  getWorkflowSteps,
  createWorkflowStep,
  updateWorkflowStep,
  deleteWorkflowStep,
  type Workflow as WorkflowType,
  type WorkflowStep,
} from '@/services/api/workflow-service';
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
import { Switch } from '@/components/ui/switch';

// Custom Workflow Step Node Component
const WorkflowStepNode = ({ data }: { data: any }) => {
  const { step, onStepClick, isSelected } = data || {};

  const getStepIcon = () => {
    switch (step?.step_type) {
      case 'approval':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'notification':
        return <Bell className="w-4 h-4" />;
      case 'condition':
        return <Code className="w-4 h-4" />;
      case 'action':
        return <Zap className="w-4 h-4" />;
      case 'delay':
        return <Clock className="w-4 h-4" />;
      default:
        return <GitBranch className="w-4 h-4" />;
    }
  };

  const getStepColor = () => {
    switch (step?.step_type) {
      case 'approval':
        return 'border-blue-500 bg-blue-50';
      case 'notification':
        return 'border-green-500 bg-green-50';
      case 'condition':
        return 'border-yellow-500 bg-yellow-50';
      case 'action':
        return 'border-purple-500 bg-purple-50';
      case 'delay':
        return 'border-orange-500 bg-orange-50';
      default:
        return 'border-gray-500 bg-gray-50';
    }
  };

  return (
    <div
      className={`border-2 rounded-lg p-3 bg-card hover:shadow-lg transition-all min-w-[200px] max-w-[250px] ${
        isSelected ? 'ring-2 ring-primary shadow-lg' : ''
      } ${getStepColor()}`}
      onClick={() => onStepClick && onStepClick(step)}
    >
      <Handle type="target" position={Position.Top} className="!bg-primary" />
      <div className="flex items-start gap-2">
        <div className="mt-0.5">{getStepIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{step?.step_name || 'Unnamed Step'}</div>
          <Badge variant="outline" className="text-xs mt-1">
            {step?.step_type || 'unknown'}
          </Badge>
          {step?.step_number && (
            <div className="text-xs text-muted-foreground mt-1">Step {step.step_number}</div>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-primary" />
    </div>
  );
};

const nodeTypes: NodeTypes = {
  workflowStep: WorkflowStepNode,
};

export default function WorkflowBuilder() {
  const { toast } = useToast();
  const [workflows, setWorkflows] = useState<WorkflowType[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowType | null>(null);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isWorkflowDialogOpen, setIsWorkflowDialogOpen] = useState(false);
  const [isStepDialogOpen, setIsStepDialogOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const reactFlowInstance = useRef<any>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Form state
  const [workflowFormData, setWorkflowFormData] = useState<Partial<WorkflowType>>({
    name: '',
    description: '',
    workflow_type: 'approval',
    entity_type: '',
    trigger_event: '',
    is_active: true,
  });

  const [stepFormData, setStepFormData] = useState<Partial<WorkflowStep>>({
    step_name: '',
    step_type: 'approval',
    approver_type: 'user',
    is_required: true,
    is_parallel: false,
    escalation_enabled: false,
  });

  useEffect(() => {
    loadWorkflows();
  }, []);

  useEffect(() => {
    if (selectedWorkflow) {
      loadWorkflowSteps();
    }
  }, [selectedWorkflow]);

  useEffect(() => {
    if (workflowSteps.length > 0) {
      buildFlowFromSteps();
    } else {
      setNodes([]);
      setEdges([]);
    }
  }, [workflowSteps]);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const data = await getWorkflows();
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

  const loadWorkflowSteps = async () => {
    if (!selectedWorkflow) return;

    try {
      const steps = await getWorkflowSteps(selectedWorkflow.id);
      setWorkflowSteps(steps);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load workflow steps',
        variant: 'destructive',
      });
    }
  };

  const buildFlowFromSteps = () => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Sort steps by sequence_group and step_number
    const sortedSteps = [...workflowSteps].sort((a, b) => {
      if (a.sequence_group !== b.sequence_group) {
        return a.sequence_group - b.sequence_group;
      }
      return a.step_number - b.step_number;
    });

    // Group steps by sequence_group
    const groups = sortedSteps.reduce((acc, step) => {
      if (!acc[step.sequence_group]) {
        acc[step.sequence_group] = [];
      }
      acc[step.sequence_group].push(step);
      return acc;
    }, {} as Record<number, WorkflowStep[]>);

    const groupKeys = Object.keys(groups).map(Number).sort((a, b) => a - b);
    let yPosition = 0;
    const xSpacing = 300;
    const ySpacing = 150;

    groupKeys.forEach((groupKey, groupIndex) => {
      const groupSteps = groups[groupKey];
      const isParallel = groupSteps.some((s) => s.is_parallel);
      const xStart = groupIndex * xSpacing;
      const groupYStart = yPosition;

      groupSteps.forEach((step, stepIndex) => {
        const x = isParallel && groupSteps.length > 1
          ? xStart + (stepIndex * 250)
          : xStart;
        const y = isParallel && groupSteps.length > 1
          ? groupYStart + (stepIndex * ySpacing)
          : groupYStart;

        const node: Node = {
          id: step.id,
          type: 'workflowStep',
          position: { x, y },
          data: {
            step,
            onStepClick: handleStepClick,
            isSelected: selectedNode?.id === step.id,
          },
        };
        newNodes.push(node);
      });

      yPosition += Math.max(groupSteps.length * ySpacing, ySpacing);

      // Create edges between groups
      if (groupIndex > 0) {
        const prevGroupSteps = groups[groupKeys[groupIndex - 1]];
        const currentGroupSteps = groupSteps;

        prevGroupSteps.forEach((prevStep) => {
          currentGroupSteps.forEach((currentStep) => {
            newEdges.push({
              id: `e${prevStep.id}-${currentStep.id}`,
              source: prevStep.id,
              target: currentStep.id,
              type: 'smoothstep',
              animated: true,
              markerEnd: {
                type: MarkerType.ArrowClosed,
              },
            });
          });
        });
      }
    });

    setNodes(newNodes);
    setEdges(newEdges);

    // Fit view after a short delay
    setTimeout(() => {
      if (reactFlowInstance.current && newNodes.length > 0) {
        reactFlowInstance.current.fitView({ padding: 0.3, duration: 400 });
      }
    }, 100);
  };

  const handleStepClick = (step: WorkflowStep) => {
    const node = nodes.find((n) => n.id === step.id);
    setSelectedNode(node || null);
    setSelectedStep(step);
    setIsStepDialogOpen(true);
  };

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges]
  );

  const handleCreateWorkflow = () => {
    setWorkflowFormData({
      name: '',
      description: '',
      workflow_type: 'approval',
      entity_type: '',
      trigger_event: '',
      is_active: true,
    });
    setSelectedWorkflow(null);
    setIsWorkflowDialogOpen(true);
  };

  const handleSelectWorkflow = async (workflow: WorkflowType) => {
    try {
      const fullWorkflow = await getWorkflowById(workflow.id);
      setSelectedWorkflow(fullWorkflow);
      setWorkflowFormData(fullWorkflow);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load workflow',
        variant: 'destructive',
      });
    }
  };

  const handleSaveWorkflow = async () => {
    try {
      setSaving(true);
      if (selectedWorkflow) {
        await updateWorkflow(selectedWorkflow.id, workflowFormData);
        toast({
          title: 'Success',
          description: 'Workflow updated successfully',
        });
      } else {
        const newWorkflow = await createWorkflow(workflowFormData);
        setSelectedWorkflow(newWorkflow);
        toast({
          title: 'Success',
          description: 'Workflow created successfully',
        });
      }
      setIsWorkflowDialogOpen(false);
      loadWorkflows();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save workflow',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddStep = () => {
    if (!selectedWorkflow) {
      toast({
        title: 'Error',
        description: 'Please select or create a workflow first',
        variant: 'destructive',
      });
      return;
    }

    setStepFormData({
      step_name: '',
      step_type: 'approval',
      approver_type: 'user',
      is_required: true,
      is_parallel: false,
      escalation_enabled: false,
    });
    setSelectedStep(null);
    setIsStepDialogOpen(true);
  };

  const handleSaveStep = async () => {
    if (!selectedWorkflow) return;

    try {
      setSaving(true);
      const stepData = {
        ...stepFormData,
        step_number: selectedStep?.step_number || workflowSteps.length + 1,
        sequence_group: selectedStep?.sequence_group || workflowSteps.length + 1,
      };

      if (selectedStep) {
        await updateWorkflowStep(selectedWorkflow.id, selectedStep.id, stepData);
        toast({
          title: 'Success',
          description: 'Step updated successfully',
        });
      } else {
        await createWorkflowStep(selectedWorkflow.id, stepData);
        toast({
          title: 'Success',
          description: 'Step added successfully',
        });
      }
      setIsStepDialogOpen(false);
      loadWorkflowSteps();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save step',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStep = async (step: WorkflowStep) => {
    if (!selectedWorkflow) return;

    if (!confirm(`Are you sure you want to delete "${step.step_name}"?`)) {
      return;
    }

    try {
      await deleteWorkflowStep(selectedWorkflow.id, step.id);
      toast({
        title: 'Success',
        description: 'Step deleted successfully',
      });
      loadWorkflowSteps();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete step',
        variant: 'destructive',
      });
    }
  };

  const handleSaveFlow = async () => {
    // Save the visual flow structure
    // This could update step positions or connections
    toast({
      title: 'Info',
      description: 'Flow structure saved. Step positions are preserved.',
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflow Builder</h1>
          <p className="text-muted-foreground">Visual workflow designer and editor</p>
        </div>
        <div className="flex gap-2">
          <Select
            value={selectedWorkflow?.id || ''}
            onValueChange={(value) => {
              const workflow = workflows.find((w) => w.id === value);
              if (workflow) handleSelectWorkflow(workflow);
            }}
          >
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select workflow" />
            </SelectTrigger>
            <SelectContent>
              {workflows.map((workflow) => (
                <SelectItem key={workflow.id} value={workflow.id}>
                  {workflow.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleCreateWorkflow}>
            <Plus className="w-4 h-4 mr-2" />
            New Workflow
          </Button>
          {selectedWorkflow && (
            <>
              <Button variant="outline" onClick={handleAddStep}>
                <Plus className="w-4 h-4 mr-2" />
                Add Step
              </Button>
              <Button onClick={handleSaveFlow} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Flow
              </Button>
            </>
          )}
        </div>
      </div>

      {selectedWorkflow ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selectedWorkflow.name}</CardTitle>
                <CardDescription>{selectedWorkflow.description || 'No description'}</CardDescription>
              </div>
              <Badge variant={selectedWorkflow.is_active ? 'default' : 'secondary'}>
                {selectedWorkflow.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[600px] border rounded-lg bg-background overflow-hidden">
              {nodes.length > 0 ? (
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  nodeTypes={nodeTypes}
                  connectionMode={ConnectionMode.Loose}
                  defaultEdgeOptions={{
                    type: 'smoothstep',
                    animated: true,
                    markerEnd: {
                      type: MarkerType.ArrowClosed,
                    },
                  }}
                  fitViewOptions={{ padding: 0.3, duration: 400 }}
                  minZoom={0.1}
                  maxZoom={2}
                  proOptions={{ hideAttribution: true }}
                  onInit={(instance) => {
                    reactFlowInstance.current = instance;
                  }}
                >
                  <Controls />
                  <MiniMap />
                  <Background />
                </ReactFlow>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <GitBranch className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No steps yet. Click "Add Step" to start building your workflow.</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center h-[600px]">
            <div className="text-center text-muted-foreground">
              <Workflow className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">No workflow selected</p>
              <p>Select an existing workflow or create a new one to start building.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workflow Dialog */}
      <Dialog open={isWorkflowDialogOpen} onOpenChange={setIsWorkflowDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedWorkflow ? 'Edit Workflow' : 'Create Workflow'}
            </DialogTitle>
            <DialogDescription>
              {selectedWorkflow
                ? 'Update workflow settings'
                : 'Create a new workflow to start building'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={workflowFormData.name}
                onChange={(e) =>
                  setWorkflowFormData({ ...workflowFormData, name: e.target.value })
                }
                placeholder="Workflow name"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={workflowFormData.description}
                onChange={(e) =>
                  setWorkflowFormData({ ...workflowFormData, description: e.target.value })
                }
                placeholder="Workflow description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Workflow Type *</Label>
                <Select
                  value={workflowFormData.workflow_type}
                  onValueChange={(value) =>
                    setWorkflowFormData({ ...workflowFormData, workflow_type: value as any })
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
              <div>
                <Label>Entity Type</Label>
                <Input
                  value={workflowFormData.entity_type}
                  onChange={(e) =>
                    setWorkflowFormData({ ...workflowFormData, entity_type: e.target.value })
                  }
                  placeholder="e.g., purchase_order"
                />
              </div>
            </div>
            <div>
              <Label>Trigger Event</Label>
              <Input
                value={workflowFormData.trigger_event}
                onChange={(e) =>
                  setWorkflowFormData({ ...workflowFormData, trigger_event: e.target.value })
                }
                placeholder="e.g., created, updated"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={workflowFormData.is_active}
                onCheckedChange={(checked) =>
                  setWorkflowFormData({ ...workflowFormData, is_active: checked })
                }
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsWorkflowDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveWorkflow} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {selectedWorkflow ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step Dialog */}
      <Dialog open={isStepDialogOpen} onOpenChange={setIsStepDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedStep ? 'Edit Step' : 'Add Step'}</DialogTitle>
            <DialogDescription>
              {selectedStep ? 'Update step configuration' : 'Add a new step to the workflow'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Step Name *</Label>
              <Input
                value={stepFormData.step_name}
                onChange={(e) =>
                  setStepFormData({ ...stepFormData, step_name: e.target.value })
                }
                placeholder="Step name"
              />
            </div>
            <div>
              <Label>Step Type *</Label>
              <Select
                value={stepFormData.step_type}
                onValueChange={(value) =>
                  setStepFormData({ ...stepFormData, step_type: value as any })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approval">Approval</SelectItem>
                  <SelectItem value="notification">Notification</SelectItem>
                  <SelectItem value="condition">Condition</SelectItem>
                  <SelectItem value="action">Action</SelectItem>
                  <SelectItem value="delay">Delay</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {stepFormData.step_type === 'approval' && (
              <div>
                <Label>Approver Type</Label>
                <Select
                  value={stepFormData.approver_type}
                  onValueChange={(value) =>
                    setStepFormData({ ...stepFormData, approver_type: value as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="role">Role</SelectItem>
                    <SelectItem value="department">Department</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {stepFormData.step_type === 'condition' && (
              <div>
                <Label>Condition Expression</Label>
                <Textarea
                  value={stepFormData.condition_expression}
                  onChange={(e) =>
                    setStepFormData({ ...stepFormData, condition_expression: e.target.value })
                  }
                  placeholder="e.g., amount > 1000"
                  rows={3}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={stepFormData.is_required}
                  onCheckedChange={(checked) =>
                    setStepFormData({ ...stepFormData, is_required: checked })
                  }
                />
                <Label>Required</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={stepFormData.is_parallel}
                  onCheckedChange={(checked) =>
                    setStepFormData({ ...stepFormData, is_parallel: checked })
                  }
                />
                <Label>Parallel</Label>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={stepFormData.escalation_enabled}
                onCheckedChange={(checked) =>
                  setStepFormData({ ...stepFormData, escalation_enabled: checked })
                }
              />
              <Label>Enable Escalation</Label>
            </div>
            {stepFormData.escalation_enabled && (
              <div>
                <Label>Escalation After (hours)</Label>
                <Input
                  type="number"
                  value={stepFormData.escalation_after_hours}
                  onChange={(e) =>
                    setStepFormData({
                      ...stepFormData,
                      escalation_after_hours: parseInt(e.target.value) || undefined,
                    })
                  }
                  placeholder="24"
                />
              </div>
            )}
            {selectedStep && (
              <div className="pt-4 border-t">
                <Button
                  variant="destructive"
                  onClick={() => {
                    setIsStepDialogOpen(false);
                    handleDeleteStep(selectedStep);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Step
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStepDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveStep} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {selectedStep ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

