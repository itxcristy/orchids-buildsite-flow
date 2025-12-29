/**
 * Integrations Page
 * Complete integration hub management interface
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Plug,
  Plus,
  Search,
  Loader2,
  Edit,
  Trash2,
  Eye,
  Key,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Play,
  RefreshCw,
  Copy,
  Shield,
  Clock,
  Activity,
} from 'lucide-react';
import {
  getIntegrations,
  getIntegrationById,
  createIntegration,
  updateIntegration,
  deleteIntegration,
  getIntegrationLogs,
  getIntegrationStats,
  testIntegration,
  syncIntegration,
  getApiKeys,
  createApiKey,
  revokeApiKey,
  getApiKeyUsage,
  type Integration as IntegrationType,
  type IntegrationLog,
  type ApiKey,
  type IntegrationStats,
} from '@/services/api/integration-service';
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

export default function Integrations() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('integrations');
  const [integrations, setIntegrations] = useState<IntegrationType[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [stats, setStats] = useState<IntegrationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterLogType, setFilterLogType] = useState<string>('all');
  const [filterLogStatus, setFilterLogStatus] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
  const [isViewApiKeyDialogOpen, setIsViewApiKeyDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationType | null>(null);
  const [selectedApiKey, setSelectedApiKey] = useState<ApiKey | null>(null);
  const [newApiKey, setNewApiKey] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<IntegrationType>>({
    name: '',
    integration_type: 'api',
    provider: '',
    description: '',
    status: 'inactive',
    webhook_url: '',
    api_endpoint: '',
    authentication_type: 'api_key',
    sync_enabled: false,
    sync_frequency: 'manual',
    configuration: {},
  });

  const [apiKeyFormData, setApiKeyFormData] = useState({
    name: '',
    permissions: {},
    rateLimitPerMinute: 60,
    rateLimitPerHour: 1000,
    rateLimitPerDay: 10000,
    expiresAt: '',
    prefix: 'sk_live',
  });

  useEffect(() => {
    loadData();
  }, [activeTab, filterType, filterStatus, filterLogType, filterLogStatus]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'integrations') {
        const filters: any = {};
        if (filterType !== 'all') filters.integration_type = filterType;
        if (filterStatus !== 'all') filters.status = filterStatus;
        if (searchTerm) filters.search = searchTerm;

        const [integrationsData, statsData] = await Promise.all([
          getIntegrations(filters),
          getIntegrationStats(),
        ]);
        setIntegrations(integrationsData);
        setStats(statsData);
      } else if (activeTab === 'api-keys') {
        const keysData = await getApiKeys();
        setApiKeys(keysData);
      } else if (activeTab === 'logs') {
        const filters: any = {};
        if (filterLogType !== 'all') filters.log_type = filterLogType;
        if (filterLogStatus !== 'all') filters.status = filterLogStatus;
        filters.limit = 100;

        const logsData = await getIntegrationLogs(undefined, filters);
        setLogs(logsData);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      name: '',
      integration_type: 'api',
      provider: '',
      description: '',
      status: 'inactive',
      webhook_url: '',
      api_endpoint: '',
      authentication_type: 'api_key',
      sync_enabled: false,
      sync_frequency: 'manual',
      configuration: {},
    });
    setSelectedIntegration(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (integration: IntegrationType) => {
    setFormData({
      ...integration,
    });
    setSelectedIntegration(integration);
    setIsDialogOpen(true);
  };

  const handleView = async (integration: IntegrationType) => {
    try {
      const fullIntegration = await getIntegrationById(integration.id);
      setSelectedIntegration(fullIntegration);
      setIsViewDialogOpen(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load integration details',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      if (selectedIntegration) {
        await updateIntegration(selectedIntegration.id, formData);
        toast({
          title: 'Success',
          description: 'Integration updated successfully',
        });
      } else {
        await createIntegration(formData);
        toast({
          title: 'Success',
          description: 'Integration created successfully',
        });
      }
      setIsDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save integration',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (integration: IntegrationType) => {
    if (!confirm(`Are you sure you want to delete "${integration.name}"?`)) {
      return;
    }

    try {
      await deleteIntegration(integration.id);
      toast({
        title: 'Success',
        description: 'Integration deleted successfully',
      });
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete integration',
        variant: 'destructive',
      });
    }
  };

  const handleTest = async (integration: IntegrationType) => {
    try {
      setIsTesting(true);
      const result = await testIntegration(integration.id);
      toast({
        title: 'Test Result',
        description: result.message || 'Connection test completed',
        variant: result.status === 'success' ? 'default' : 'destructive',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to test integration',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSync = async (integration: IntegrationType) => {
    try {
      setIsSyncing(true);
      await syncIntegration(integration.id);
      toast({
        title: 'Success',
        description: 'Sync triggered successfully',
      });
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to sync integration',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateApiKey = () => {
    setApiKeyFormData({
      name: '',
      permissions: {},
      rateLimitPerMinute: 60,
      rateLimitPerHour: 1000,
      rateLimitPerDay: 10000,
      expiresAt: '',
      prefix: 'sk_live',
    });
    setNewApiKey('');
    setSelectedApiKey(null);
    setIsApiKeyDialogOpen(true);
  };

  const handleSubmitApiKey = async () => {
    try {
      setIsSubmitting(true);
      const result = await createApiKey(apiKeyFormData);
      setNewApiKey(result.key || '');
      setSelectedApiKey(result as ApiKey);
      toast({
        title: 'Success',
        description: 'API key created successfully. Copy it now - it will not be shown again.',
      });
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create API key',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeApiKey = async (key: ApiKey) => {
    if (!confirm(`Are you sure you want to revoke "${key.name}"?`)) {
      return;
    }

    try {
      await revokeApiKey(key.id);
      toast({
        title: 'Success',
        description: 'API key revoked successfully',
      });
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to revoke API key',
        variant: 'destructive',
      });
    }
  };

  const handleCopyApiKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({
      title: 'Copied',
      description: 'API key copied to clipboard',
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      inactive: 'secondary',
      error: 'destructive',
      testing: 'outline',
    };
    const icons: Record<string, any> = {
      active: CheckCircle2,
      inactive: Clock,
      error: XCircle,
      testing: AlertCircle,
    };
    const Icon = icons[status] || AlertCircle;

    return (
      <Badge variant={variants[status] || 'secondary'}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const getLogStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      success: 'default',
      pending: 'secondary',
      error: 'destructive',
      warning: 'outline',
    };
    const icons: Record<string, any> = {
      success: CheckCircle2,
      pending: Clock,
      error: XCircle,
      warning: AlertCircle,
    };
    const Icon = icons[status] || AlertCircle;

    return (
      <Badge variant={variants[status] || 'secondary'}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Integration Hub</h1>
          <p className="text-muted-foreground">Manage integrations, API keys, and monitor activity</p>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && activeTab === 'integrations' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Plug className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.integrations.total_integrations || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.integrations.active_integrations || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactive</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.integrations.inactive_integrations || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Errors</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.integrations.error_integrations || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sync Enabled</CardTitle>
              <RefreshCw className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.integrations.sync_enabled_count || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="integrations">
            <Plug className="w-4 h-4 mr-2" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="api-keys">
            <Key className="w-4 h-4 mr-2" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="logs">
            <FileText className="w-4 h-4 mr-2" />
            Logs
          </TabsTrigger>
        </TabsList>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Integrations</CardTitle>
                  <CardDescription>Manage your external integrations</CardDescription>
                </div>
                <Button onClick={handleCreate}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Integration
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search integrations..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        loadData();
                      }}
                      className="pl-8"
                    />
                  </div>
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="api">API</SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
                    <SelectItem value="zapier">Zapier</SelectItem>
                    <SelectItem value="make">Make</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="testing">Testing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : integrations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No integrations found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sync</TableHead>
                      <TableHead>Last Sync</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {integrations.map((integration) => (
                      <TableRow key={integration.id}>
                        <TableCell className="font-medium">{integration.name}</TableCell>
                        <TableCell>{integration.integration_type}</TableCell>
                        <TableCell>{integration.provider || '-'}</TableCell>
                        <TableCell>{getStatusBadge(integration.status)}</TableCell>
                        <TableCell>
                          {integration.sync_enabled ? (
                            <Badge variant="outline">Enabled</Badge>
                          ) : (
                            <Badge variant="secondary">Disabled</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {integration.last_sync_at
                            ? new Date(integration.last_sync_at).toLocaleString()
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleView(integration)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTest(integration)}
                              disabled={isTesting}
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                            {integration.sync_enabled && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSync(integration)}
                                disabled={isSyncing}
                              >
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(integration)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {!integration.is_system && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(integration)}
                              >
                                <Trash2 className="w-4 h-4" />
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
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>API Keys</CardTitle>
                  <CardDescription>Manage API keys for external access</CardDescription>
                </div>
                <Button onClick={handleCreateApiKey}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create API Key
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No API keys found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Prefix</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Rate Limits</TableHead>
                      <TableHead>Last Used</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map((key) => (
                      <TableRow key={key.id}>
                        <TableCell className="font-medium">{key.name}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {key.prefix}...
                          </code>
                        </TableCell>
                        <TableCell>
                          {key.isActive ? (
                            <Badge variant="default">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Revoked</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {key.rateLimitPerMinute || 60}/min, {key.rateLimitPerHour || 1000}/hr
                        </TableCell>
                        <TableCell>
                          {key.lastUsedAt
                            ? new Date(key.lastUsedAt).toLocaleString()
                            : 'Never'}
                        </TableCell>
                        <TableCell>
                          {key.expiresAt ? new Date(key.expiresAt).toLocaleDateString() : 'Never'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedApiKey(key);
                                setIsViewApiKeyDialogOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {key.isActive && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRevokeApiKey(key)}
                              >
                                <Shield className="w-4 h-4" />
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
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Integration Logs</CardTitle>
                  <CardDescription>Monitor integration activity and errors</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <Select value={filterLogType} onValueChange={setFilterLogType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Log Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="sync">Sync</SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
                    <SelectItem value="api_call">API Call</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterLogStatus} onValueChange={setFilterLogStatus}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No logs found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Integration</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Records</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {new Date(log.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-medium">
                          {log.integration_name || '-'}
                        </TableCell>
                        <TableCell>{log.log_type}</TableCell>
                        <TableCell>{getLogStatusBadge(log.status)}</TableCell>
                        <TableCell>
                          {log.direction ? (
                            <Badge variant="outline">{log.direction}</Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {log.execution_time_ms
                            ? `${log.execution_time_ms}ms`
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {log.records_processed
                            ? `${log.records_success || 0}/${log.records_processed}`
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Integration Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedIntegration ? 'Edit Integration' : 'Create Integration'}
            </DialogTitle>
            <DialogDescription>
              {selectedIntegration
                ? 'Update integration settings'
                : 'Create a new integration connection'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Integration name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Integration Type *</Label>
                <Select
                  value={formData.integration_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, integration_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="api">API</SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
                    <SelectItem value="zapier">Zapier</SelectItem>
                    <SelectItem value="make">Make</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Provider</Label>
                <Input
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  placeholder="e.g., Google, Microsoft"
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Integration description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="testing">Testing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Authentication Type</Label>
                <Select
                  value={formData.authentication_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, authentication_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="api_key">API Key</SelectItem>
                    <SelectItem value="oauth">OAuth</SelectItem>
                    <SelectItem value="basic">Basic Auth</SelectItem>
                    <SelectItem value="bearer">Bearer Token</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Webhook URL</Label>
              <Input
                value={formData.webhook_url}
                onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>API Endpoint</Label>
              <Input
                value={formData.api_endpoint}
                onChange={(e) => setFormData({ ...formData, api_endpoint: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.sync_enabled}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, sync_enabled: checked })
                }
              />
              <Label>Enable Sync</Label>
            </div>
            {formData.sync_enabled && (
              <div>
                <Label>Sync Frequency</Label>
                <Select
                  value={formData.sync_frequency}
                  onValueChange={(value) =>
                    setFormData({ ...formData, sync_frequency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="real_time">Real-time</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {selectedIntegration ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Integration Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Integration Details</DialogTitle>
            <DialogDescription>View integration information</DialogDescription>
          </DialogHeader>
          {selectedIntegration && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Name</Label>
                <p className="font-medium">{selectedIntegration.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <p>{selectedIntegration.integration_type}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Provider</Label>
                  <p>{selectedIntegration.provider || '-'}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <div className="mt-1">{getStatusBadge(selectedIntegration.status)}</div>
              </div>
              {selectedIntegration.description && (
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p>{selectedIntegration.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Last Sync</Label>
                  <p>
                    {selectedIntegration.last_sync_at
                      ? new Date(selectedIntegration.last_sync_at).toLocaleString()
                      : 'Never'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Sync Status</Label>
                  <p>{selectedIntegration.last_sync_status || '-'}</p>
                </div>
              </div>
              {selectedIntegration.error_count !== undefined && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Success Count</Label>
                    <p>{selectedIntegration.success_count || 0}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Error Count</Label>
                    <p>{selectedIntegration.error_count || 0}</p>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create API Key Dialog */}
      <Dialog open={isApiKeyDialogOpen} onOpenChange={setIsApiKeyDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Create a new API key for external access. Store it securely - it will only be shown once.
            </DialogDescription>
          </DialogHeader>
          {newApiKey ? (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <Label className="text-muted-foreground">Your API Key</Label>
                <div className="flex items-center gap-2 mt-2">
                  <code className="flex-1 text-sm font-mono bg-background p-2 rounded">
                    {newApiKey}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyApiKey(newApiKey)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  ⚠️ Copy this key now. It will not be shown again.
                </p>
              </div>
              <DialogFooter>
                <Button onClick={() => {
                  setIsApiKeyDialogOpen(false);
                  setNewApiKey('');
                }}>
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div>
                  <Label>Name *</Label>
                  <Input
                    value={apiKeyFormData.name}
                    onChange={(e) =>
                      setApiKeyFormData({ ...apiKeyFormData, name: e.target.value })
                    }
                    placeholder="API key name"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Rate Limit (per minute)</Label>
                    <Input
                      type="number"
                      value={apiKeyFormData.rateLimitPerMinute}
                      onChange={(e) =>
                        setApiKeyFormData({
                          ...apiKeyFormData,
                          rateLimitPerMinute: parseInt(e.target.value) || 60,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Rate Limit (per hour)</Label>
                    <Input
                      type="number"
                      value={apiKeyFormData.rateLimitPerHour}
                      onChange={(e) =>
                        setApiKeyFormData({
                          ...apiKeyFormData,
                          rateLimitPerHour: parseInt(e.target.value) || 1000,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Rate Limit (per day)</Label>
                    <Input
                      type="number"
                      value={apiKeyFormData.rateLimitPerDay}
                      onChange={(e) =>
                        setApiKeyFormData({
                          ...apiKeyFormData,
                          rateLimitPerDay: parseInt(e.target.value) || 10000,
                        })
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label>Expires At (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={apiKeyFormData.expiresAt}
                    onChange={(e) =>
                      setApiKeyFormData({ ...apiKeyFormData, expiresAt: e.target.value })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsApiKeyDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitApiKey} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* View API Key Dialog */}
      <Dialog open={isViewApiKeyDialogOpen} onOpenChange={setIsViewApiKeyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Details</DialogTitle>
            <DialogDescription>View API key information</DialogDescription>
          </DialogHeader>
          {selectedApiKey && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Name</Label>
                <p className="font-medium">{selectedApiKey.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Prefix</Label>
                <code className="text-sm font-mono bg-muted p-2 rounded block">
                  {selectedApiKey.prefix}...
                </code>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    {selectedApiKey.isActive ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Revoked</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Last Used</Label>
                  <p>
                    {selectedApiKey.lastUsedAt
                      ? new Date(selectedApiKey.lastUsedAt).toLocaleString()
                      : 'Never'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-muted-foreground">Rate Limit (min)</Label>
                  <p>{selectedApiKey.rateLimitPerMinute || 60}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Rate Limit (hour)</Label>
                  <p>{selectedApiKey.rateLimitPerHour || 1000}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Rate Limit (day)</Label>
                  <p>{selectedApiKey.rateLimitPerDay || 10000}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewApiKeyDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

