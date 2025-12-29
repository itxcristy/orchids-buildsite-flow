/**
 * Report Exports Page
 * Manage and download exported reports
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Download,
  FileText,
  FileSpreadsheet,
  File,
  Search,
  Loader2,
  Calendar,
  Filter,
  RefreshCw,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
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

interface ReportExport {
  id: string;
  name: string;
  report_type: string;
  format: 'pdf' | 'excel' | 'csv' | 'json';
  file_path?: string;
  file_name?: string;
  file_size?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  generated_by?: string;
  generated_at: string;
  expires_at?: string;
  download_count: number;
  parameters?: Record<string, any>;
}

export default function ReportExports() {
  const { toast } = useToast();
  const [exports, setExports] = useState<ReportExport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterFormat, setFilterFormat] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedExport, setSelectedExport] = useState<ReportExport | null>(null);

  useEffect(() => {
    loadExports();
  }, [filterType, filterFormat, filterStatus, dateFrom, dateTo]);

  const loadExports = async () => {
    try {
      setLoading(true);
      const { ReportService } = await import('@/services/api/reports');
      const data = await ReportService.getReportExports({
        status: filterStatus !== 'all' ? filterStatus : undefined,
        format: filterFormat !== 'all' ? filterFormat : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        search: searchTerm || undefined,
      });
      setExports(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load exports',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (exportItem: ReportExport) => {
    if (!exportItem.file_path) {
      toast({
        title: 'Error',
        description: 'File not available for download',
        variant: 'destructive',
      });
      return;
    }

    try {
      // TODO: Download file
      // await downloadReportExport(exportItem.id);
      toast({
        title: 'Success',
        description: 'Report download started',
      });
      loadExports();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to download report',
        variant: 'destructive',
      });
    }
  };

  const handleView = (exportItem: ReportExport) => {
    setSelectedExport(exportItem);
    setIsViewDialogOpen(true);
  };

  const handleDelete = async (exportItem: ReportExport) => {
    if (!confirm(`Are you sure you want to delete "${exportItem.name}"?`)) return;

    try {
      const { ReportService } = await import('@/services/api/reports');
      await ReportService.deleteReportExport(exportItem.id);
      toast({
        title: 'Success',
        description: 'Export deleted successfully',
      });
      loadExports();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete export',
        variant: 'destructive',
      });
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf':
        return <FileText className="w-4 h-4" />;
      case 'excel':
        return <FileSpreadsheet className="w-4 h-4" />;
      case 'csv':
        return <FileSpreadsheet className="w-4 h-4" />;
      case 'json':
        return <File className="w-4 h-4" />;
      default:
        return <File className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      processing: 'outline',
      completed: 'default',
      failed: 'destructive',
    };
    const icons: Record<string, any> = {
      pending: Clock,
      processing: Loader2,
      completed: CheckCircle2,
      failed: XCircle,
    };
    const Icon = icons[status] || Clock;

    return (
      <Badge variant={variants[status] || 'secondary'}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  // Statistics
  const stats = {
    total: exports.length,
    completed: exports.filter((e) => e.status === 'completed').length,
    pending: exports.filter((e) => e.status === 'pending' || e.status === 'processing').length,
    totalSize: exports.reduce((sum, e) => sum + (e.file_size || 0), 0),
  };

  // Filter data
  const uniqueTypes = Array.from(new Set(exports.map((e) => e.report_type)));
  const uniqueFormats = Array.from(new Set(exports.map((e) => e.format)));

  let filteredExports = exports;
  if (searchTerm) {
    filteredExports = filteredExports.filter(
      (e) =>
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.report_type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Report Exports</h1>
          <p className="text-muted-foreground">Manage and download exported reports</p>
        </div>
        <Button variant="outline" onClick={loadExports}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Exports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{stats.completed} completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Size</CardTitle>
            <File className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</div>
            <p className="text-xs text-muted-foreground">All exports</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Downloads</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {exports.reduce((sum, e) => sum + (e.download_count || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total downloads</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Exported Reports</CardTitle>
              <CardDescription>View and download previously generated reports</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search exports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterFormat} onValueChange={setFilterFormat}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Formats" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Formats</SelectItem>
                {uniqueFormats.map((format) => (
                  <SelectItem key={format} value={format}>
                    {format.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 mb-4">
            <div className="flex-1">
              <Label className="text-xs">From Date</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label className="text-xs">To Date</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredExports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No exports found' : 'No exported reports yet'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead>Downloads</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExports.map((exportItem) => (
                  <TableRow key={exportItem.id}>
                    <TableCell className="font-medium">{exportItem.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{exportItem.report_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getFormatIcon(exportItem.format)}
                        <span className="uppercase">{exportItem.format}</span>
                      </div>
                    </TableCell>
                    <TableCell>{formatFileSize(exportItem.file_size)}</TableCell>
                    <TableCell>{getStatusBadge(exportItem.status)}</TableCell>
                    <TableCell>
                      {new Date(exportItem.generated_at).toLocaleString()}
                    </TableCell>
                    <TableCell>{exportItem.download_count || 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(exportItem)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {exportItem.status === 'completed' && exportItem.file_path && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(exportItem)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(exportItem)}
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

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Export Details</DialogTitle>
            <DialogDescription>View export information and parameters</DialogDescription>
          </DialogHeader>
          {selectedExport && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Name</Label>
                <p className="font-medium">{selectedExport.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Report Type</Label>
                  <p>{selectedExport.report_type}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Format</Label>
                  <p className="uppercase">{selectedExport.format}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedExport.status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">File Size</Label>
                  <p>{formatFileSize(selectedExport.file_size)}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Generated At</Label>
                <p>{new Date(selectedExport.generated_at).toLocaleString()}</p>
              </div>
              {selectedExport.expires_at && (
                <div>
                  <Label className="text-muted-foreground">Expires At</Label>
                  <p>{new Date(selectedExport.expires_at).toLocaleString()}</p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">Download Count</Label>
                <p>{selectedExport.download_count || 0}</p>
              </div>
              {selectedExport.parameters && Object.keys(selectedExport.parameters).length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Parameters</Label>
                  <pre className="mt-2 p-3 bg-muted rounded-md text-sm overflow-auto">
                    {JSON.stringify(selectedExport.parameters, null, 2)}
                  </pre>
                </div>
              )}
              {selectedExport.file_name && (
                <div>
                  <Label className="text-muted-foreground">File Name</Label>
                  <p className="font-mono text-sm">{selectedExport.file_name}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            {selectedExport?.status === 'completed' && selectedExport?.file_path && (
              <Button onClick={() => {
                setIsViewDialogOpen(false);
                handleDownload(selectedExport);
              }}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

