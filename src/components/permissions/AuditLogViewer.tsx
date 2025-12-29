import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import * as auditService from '@/services/audit';
import { toast } from 'sonner';
import { Download, Search, Loader2, Calendar } from 'lucide-react';

export function AuditLogViewer() {
  const [logs, setLogs] = useState<auditService.AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    table_name: '',
    action: '',
    user_id: '',
    start_date: '',
    end_date: '',
    search: '',
  });

  useEffect(() => {
    fetchLogs();
  }, [page, filters]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const result = await auditService.getAuditLogs({
        page,
        limit: 50,
        ...filters,
      });
      setLogs(result.data);
      if (result.pagination) {
        setTotalPages(result.pagination.totalPages);
      }
    } catch (error: any) {
      // If API is not available, show empty state gracefully
      console.warn('Audit logs API not available:', error);
      setLogs([]);
      setTotalPages(1);
      // Don't show error toast for 404s - API might not be set up yet
      if (!error.message?.includes('404')) {
        toast.error(error.message || 'Failed to load audit logs');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'json' | 'csv' = 'json') => {
    try {
      const result = await auditService.exportAuditLogs({
        format,
        start_date: filters.start_date || undefined,
        end_date: filters.end_date || undefined,
      });

      if (format === 'csv' && result instanceof Blob) {
        const url = window.URL.createObjectURL(result);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit_logs_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else if (Array.isArray(result)) {
        const dataStr = JSON.stringify(result, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(dataBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit_logs_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }

      toast.success('Audit logs exported successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to export audit logs');
    }
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action.toUpperCase()) {
      case 'INSERT':
        return 'default';
      case 'UPDATE':
        return 'secondary';
      case 'DELETE':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Audit Log</CardTitle>
            <CardDescription>
              View all permission changes and system activities
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport('json')}>
              <Download className="mr-2 h-4 w-4" />
              Export JSON
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Input
              placeholder="Search..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
          <div>
            <Select
              value={filters.table_name || 'all'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, table_name: value === 'all' ? '' : value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Table" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tables</SelectItem>
                <SelectItem value="role_permissions">Role Permissions</SelectItem>
                <SelectItem value="user_permissions">User Permissions</SelectItem>
                <SelectItem value="permissions">Permissions</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select
              value={filters.action || 'all'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, action: value === 'all' ? '' : value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="INSERT">Insert</SelectItem>
                <SelectItem value="UPDATE">Update</SelectItem>
                <SelectItem value="DELETE">Delete</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Input
              type="date"
              placeholder="Start Date"
              value={filters.start_date}
              onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
            />
          </div>
          <div>
            <Input
              type="date"
              placeholder="End Date"
              value={filters.end_date}
              onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Changes</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.table_name}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionBadgeVariant(log.action)}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.user_id || 'System'}</TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">
                          {log.old_values && log.new_values ? (
                            <span className="text-sm text-muted-foreground">
                              Updated
                            </span>
                          ) : log.new_values ? (
                            <span className="text-sm text-green-600">Created</span>
                          ) : (
                            <span className="text-sm text-red-600">Deleted</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.ip_address || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {logs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No audit logs found matching your filters.
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
