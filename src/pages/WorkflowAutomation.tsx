/**
 * Workflow Automation Page
 * Manage automation rules for business processes
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Zap,
  Plus,
  Search,
  Loader2,
  Edit,
  Trash2,
  Eye,
  Play,
  Pause,
  Settings,
  CheckCircle2,
  XCircle,
  Filter,
} from 'lucide-react';
import {
  getAutomationRules,
  getAutomationRuleById,
  createAutomationRule,
  updateAutomationRule,
  deleteAutomationRule,
  type AutomationRule,
} from '@/services/api/workflow-service-automation';
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
import { Switch } from '@/components/ui/switch';

export default function WorkflowAutomation() {
  const { toast } = useToast();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRuleType, setFilterRuleType] = useState<string>('all');
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<Partial<AutomationRule>>({
    name: '',
    description: '',
    rule_type: 'trigger',
    entity_type: '',
    trigger_event: '',
    trigger_condition: {},
    action_type: '',
    action_config: {},
    is_active: true,
    priority: 0,
  });

  useEffect(() => {
    loadData();
  }, [filterRuleType, filterEntity, filterActive]);

  const loadData = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (filterRuleType !== 'all') filters.rule_type = filterRuleType;
      if (filterEntity !== 'all') filters.entity_type = filterEntity;
      if (filterActive !== 'all') filters.is_active = filterActive === 'active';
      if (searchTerm) filters.search = searchTerm;

      const data = await getAutomationRules(filters);
      setRules(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load automation rules',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedRule(null);
    setFormData({
      name: '',
      description: '',
      rule_type: 'trigger',
      entity_type: '',
      trigger_event: '',
      trigger_condition: {},
      action_type: '',
      action_config: {},
      is_active: true,
      priority: 0,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (rule: AutomationRule) => {
    setSelectedRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description,
      rule_type: rule.rule_type,
      entity_type: rule.entity_type,
      trigger_event: rule.trigger_event,
      trigger_condition: rule.trigger_condition,
      action_type: rule.action_type,
      action_config: rule.action_config,
      is_active: rule.is_active,
      priority: rule.priority,
    });
    setIsDialogOpen(true);
  };

  const handleView = async (rule: AutomationRule) => {
    try {
      const fullRule = await getAutomationRuleById(rule.id);
      setSelectedRule(fullRule);
      setIsViewDialogOpen(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load rule details',
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.entity_type || !formData.trigger_event || !formData.action_type) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      if (selectedRule) {
        await updateAutomationRule(selectedRule.id, formData);
        toast({
          title: 'Success',
          description: 'Automation rule updated successfully',
        });
      } else {
        await createAutomationRule(formData);
        toast({
          title: 'Success',
          description: 'Automation rule created successfully',
        });
      }
      setIsDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save automation rule',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (rule: AutomationRule) => {
    if (!confirm(`Are you sure you want to delete "${rule.name}"?`)) return;

    try {
      await deleteAutomationRule(rule.id);
      toast({
        title: 'Success',
        description: 'Automation rule deleted successfully',
      });
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete automation rule',
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (rule: AutomationRule) => {
    try {
      await updateAutomationRule(rule.id, { is_active: !rule.is_active });
      toast({
        title: 'Success',
        description: rule.is_active ? 'Rule deactivated' : 'Rule activated',
      });
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update rule',
        variant: 'destructive',
      });
    }
  };

  const getRuleTypeBadge = (type: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      trigger: 'default',
      condition: 'secondary',
      action: 'outline',
      schedule: 'destructive',
    };
    return <Badge variant={variants[type] || 'secondary'}>{type}</Badge>;
  };

  // Statistics
  const stats = {
    total: rules.length,
    active: rules.filter((r) => r.is_active).length,
    trigger: rules.filter((r) => r.rule_type === 'trigger').length,
    executed: rules.reduce((sum, r) => sum + (r.execution_count || 0), 0),
  };

  // Filter data
  const uniqueRuleTypes = Array.from(new Set(rules.map((r) => r.rule_type)));
  const uniqueEntityTypes = Array.from(new Set(rules.map((r) => r.entity_type)));

  let filteredRules = rules;
  if (searchTerm) {
    filteredRules = filteredRules.filter(
      (rule) =>
        rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rule.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflow Automation</h1>
          <p className="text-muted-foreground">Manage automation rules for business processes</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Create Rule
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{stats.active} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">{stats.total - stats.active} inactive</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trigger Rules</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.trigger}</div>
            <p className="text-xs text-muted-foreground">Automated triggers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.executed}</div>
            <p className="text-xs text-muted-foreground">Times executed</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Automation Rules</CardTitle>
              <CardDescription>Configure automated business process rules</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search rules..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={filterRuleType} onValueChange={setFilterRuleType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueRuleTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterEntity} onValueChange={setFilterEntity}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {uniqueEntityTypes.map((entity) => (
                  <SelectItem key={entity} value={entity}>
                    {entity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterActive} onValueChange={setFilterActive}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No rules found' : 'No automation rules yet. Create one to get started.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Trigger Event</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Executions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell>{getRuleTypeBadge(rule.rule_type)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{rule.entity_type}</Badge>
                    </TableCell>
                    <TableCell>{rule.trigger_event}</TableCell>
                    <TableCell>{rule.action_type}</TableCell>
                    <TableCell>{rule.priority}</TableCell>
                    <TableCell>{rule.execution_count || 0}</TableCell>
                    <TableCell>
                      {rule.is_active ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="w-3 h-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(rule)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(rule)}
                        >
                          {rule.is_active ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(rule)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(rule)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
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
              {selectedRule ? 'Edit Automation Rule' : 'Create Automation Rule'}
            </DialogTitle>
            <DialogDescription>
              Configure automation rule for business processes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rule Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Auto-approve low value POs"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Rule Type *</Label>
                <Select
                  value={formData.rule_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, rule_type: value as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trigger">Trigger</SelectItem>
                    <SelectItem value="condition">Condition</SelectItem>
                    <SelectItem value="action">Action</SelectItem>
                    <SelectItem value="schedule">Schedule</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Entity Type *</Label>
                <Input
                  value={formData.entity_type}
                  onChange={(e) => setFormData({ ...formData, entity_type: e.target.value })}
                  placeholder="e.g., purchase_order"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Trigger Event *</Label>
                <Input
                  value={formData.trigger_event}
                  onChange={(e) => setFormData({ ...formData, trigger_event: e.target.value })}
                  placeholder="e.g., created, updated, approved"
                />
              </div>
              <div>
                <Label>Action Type *</Label>
                <Input
                  value={formData.action_type}
                  onChange={(e) => setFormData({ ...formData, action_type: e.target.value })}
                  placeholder="e.g., notify, email, webhook"
                />
              </div>
            </div>
            <div>
              <Label>Trigger Condition (JSON)</Label>
              <Textarea
                value={JSON.stringify(formData.trigger_condition || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    setFormData({ ...formData, trigger_condition: parsed });
                  } catch {
                    // Invalid JSON, keep as is
                  }
                }}
                placeholder='{"amount": {"$lt": 10000}}'
                rows={4}
              />
            </div>
            <div>
              <Label>Action Config (JSON)</Label>
              <Textarea
                value={JSON.stringify(formData.action_config || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    setFormData({ ...formData, action_config: parsed });
                  } catch {
                    // Invalid JSON, keep as is
                  }
                }}
                placeholder='{"email": "admin@example.com", "template": "approval"}'
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Priority</Label>
                <Input
                  type="number"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Higher priority rules execute first
                </p>
              </div>
              <div className="flex items-center justify-between pt-6">
                <div className="space-y-0.5">
                  <Label>Active</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable or disable this rule
                  </p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {selectedRule ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Automation Rule Details</DialogTitle>
            <DialogDescription>View complete automation rule information</DialogDescription>
          </DialogHeader>
          {selectedRule && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Name</Label>
                <p className="font-medium">{selectedRule.name}</p>
              </div>
              {selectedRule.description && (
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p>{selectedRule.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Rule Type</Label>
                  <div className="mt-1">{getRuleTypeBadge(selectedRule.rule_type)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Entity Type</Label>
                  <p>{selectedRule.entity_type}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Trigger Event</Label>
                  <p>{selectedRule.trigger_event}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Action Type</Label>
                  <p>{selectedRule.action_type}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Trigger Condition</Label>
                <pre className="mt-2 p-3 bg-muted rounded-md text-sm overflow-auto">
                  {JSON.stringify(selectedRule.trigger_condition, null, 2)}
                </pre>
              </div>
              <div>
                <Label className="text-muted-foreground">Action Config</Label>
                <pre className="mt-2 p-3 bg-muted rounded-md text-sm overflow-auto">
                  {JSON.stringify(selectedRule.action_config, null, 2)}
                </pre>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-muted-foreground">Priority</Label>
                  <p>{selectedRule.priority}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Executions</Label>
                  <p>{selectedRule.execution_count || 0}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    {selectedRule.is_active ? (
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                </div>
              </div>
              {selectedRule.last_executed_at && (
                <div>
                  <Label className="text-muted-foreground">Last Executed</Label>
                  <p>{new Date(selectedRule.last_executed_at).toLocaleString()}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            {selectedRule && (
              <Button onClick={() => {
                setIsViewDialogOpen(false);
                handleEdit(selectedRule);
              }}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

