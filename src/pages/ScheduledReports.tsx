/**
 * Scheduled Reports Page
 * Manage scheduled report generation and delivery
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Calendar,
  Clock,
  Mail,
  Plus,
  Loader2,
  Edit,
  Trash2,
  Play,
  Pause,
  FileText,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
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

interface ScheduledReport {
  id: string;
  name: string;
  description?: string;
  report_type: 'inventory' | 'procurement' | 'assets' | 'financial' | 'custom';
  schedule_type: 'daily' | 'weekly' | 'monthly' | 'custom';
  schedule_config: string; // Cron expression or schedule config
  recipients: string[]; // Email addresses
  format: 'pdf' | 'excel' | 'csv';
  is_active: boolean;
  last_run_at?: string;
  next_run_at?: string;
  created_at: string;
  updated_at: string;
}

export default function ScheduledReports() {
  const { toast } = useToast();
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ScheduledReport | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<Partial<ScheduledReport>>({
    name: '',
    description: '',
    report_type: 'inventory',
    schedule_type: 'daily',
    schedule_config: '',
    recipients: [],
    format: 'pdf',
    is_active: true,
  });

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const { ReportService } = await import('@/services/api/reports');
      const data = await ReportService.getScheduledReports();
      // Ensure data is always an array
      setReports(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load scheduled reports',
        variant: 'destructive',
      });
      // Set empty array on error to prevent filter errors
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedReport(null);
    setFormData({
      name: '',
      description: '',
      report_type: 'inventory',
      schedule_type: 'daily',
      schedule_config: '',
      recipients: [],
      format: 'pdf',
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (report: ScheduledReport) => {
    setSelectedReport(report);
    setFormData({
      name: report.name,
      description: report.description,
      report_type: report.report_type,
      schedule_type: report.schedule_type,
      schedule_config: report.schedule_config,
      recipients: report.recipients,
      format: report.format,
      is_active: report.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.schedule_config) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const { ReportService } = await import('@/services/api/reports');
      if (selectedReport) {
        await ReportService.updateScheduledReport(selectedReport.id, formData);
      } else {
        await ReportService.createScheduledReport(formData);
      }
      toast({
        title: 'Success',
        description: selectedReport ? 'Report updated successfully' : 'Report created successfully',
      });
      setIsDialogOpen(false);
      loadReports();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save report',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (report: ScheduledReport) => {
    if (!confirm(`Are you sure you want to delete "${report.name}"?`)) return;

    try {
      const { ReportService } = await import('@/services/api/reports');
      await ReportService.deleteScheduledReport(report.id);
      toast({
        title: 'Success',
        description: 'Report deleted successfully',
      });
      loadReports();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete report',
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (report: ScheduledReport) => {
    try {
      const { ReportService } = await import('@/services/api/reports');
      await ReportService.updateScheduledReport(report.id, { is_active: !report.is_active });
      toast({
        title: 'Success',
        description: report.is_active ? 'Report paused' : 'Report activated',
      });
      loadReports();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update report',
        variant: 'destructive',
      });
    }
  };

  const getScheduleDescription = (report: ScheduledReport) => {
    switch (report.schedule_type) {
      case 'daily':
        return 'Daily';
      case 'weekly':
        return 'Weekly';
      case 'monthly':
        return 'Monthly';
      case 'custom':
        return report.schedule_config || 'Custom';
      default:
        return '-';
    }
  };

  const filteredReports = (Array.isArray(reports) ? reports : []).filter((report) =>
    report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.report_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Scheduled Reports</h1>
          <p className="text-muted-foreground">Manage automated report generation and delivery</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Schedule Report
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Scheduled Reports</CardTitle>
              <CardDescription>Reports that are automatically generated and delivered</CardDescription>
            </div>
            <div className="w-64">
              <Input
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No reports found' : 'No scheduled reports yet. Create one to get started.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Report Type</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead>Next Run</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">{report.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{report.report_type}</Badge>
                    </TableCell>
                    <TableCell>{getScheduleDescription(report)}</TableCell>
                    <TableCell>{report.format.toUpperCase()}</TableCell>
                    <TableCell>{report.recipients.length} recipient(s)</TableCell>
                    <TableCell>
                      {report.is_active ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="w-3 h-3 mr-1" />
                          Paused
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {report.last_run_at
                        ? new Date(report.last_run_at).toLocaleString()
                        : 'Never'}
                    </TableCell>
                    <TableCell>
                      {report.next_run_at
                        ? new Date(report.next_run_at).toLocaleString()
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(report)}
                        >
                          {report.is_active ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(report)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(report)}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedReport ? 'Edit Scheduled Report' : 'Schedule New Report'}
            </DialogTitle>
            <DialogDescription>
              Configure report generation schedule and delivery settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Report Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Daily Inventory Summary"
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
                <Label>Report Type *</Label>
                <Select
                  value={formData.report_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, report_type: value as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inventory">Inventory</SelectItem>
                    <SelectItem value="procurement">Procurement</SelectItem>
                    <SelectItem value="assets">Assets</SelectItem>
                    <SelectItem value="financial">Financial</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Format *</Label>
                <Select
                  value={formData.format}
                  onValueChange={(value) =>
                    setFormData({ ...formData, format: value as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Schedule Type *</Label>
                <Select
                  value={formData.schedule_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, schedule_type: value as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="custom">Custom (Cron)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Schedule Config *</Label>
                <Input
                  value={formData.schedule_config}
                  onChange={(e) => setFormData({ ...formData, schedule_config: e.target.value })}
                  placeholder={formData.schedule_type === 'custom' ? '0 9 * * *' : 'Schedule config'}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.schedule_type === 'custom'
                    ? 'Cron expression (e.g., 0 9 * * * for daily at 9 AM)'
                    : 'Schedule configuration'}
                </p>
              </div>
            </div>
            <div>
              <Label>Recipients (Email addresses, comma-separated)</Label>
              <Input
                value={formData.recipients?.join(', ') || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    recipients: e.target.value.split(',').map((email) => email.trim()).filter(Boolean),
                  })
                }
                placeholder="email1@example.com, email2@example.com"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Active</Label>
                <p className="text-sm text-muted-foreground">
                  Enable or disable this scheduled report
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {selectedReport ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

