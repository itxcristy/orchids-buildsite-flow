import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import * as reportsService from '@/services/reports';
import { toast } from 'sonner';
import { Download, Loader2, FileText, Users, AlertTriangle, BarChart3 } from 'lucide-react';

type ReportType = 'distribution' | 'user-permissions' | 'unused' | 'compliance';

export function Reports() {
  const [selectedReport, setSelectedReport] = useState<ReportType | ''>('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const handleGenerateReport = async () => {
    if (!selectedReport) return;

    setLoading(true);
    try {
      let data;
      switch (selectedReport) {
        case 'distribution':
          data = await reportsService.getPermissionDistributionReport();
          break;
        case 'user-permissions':
          data = await reportsService.getUserPermissionsReport();
          break;
        case 'unused':
          data = await reportsService.getUnusedPermissionsReport();
          break;
        case 'compliance':
          data = await reportsService.getComplianceReport();
          break;
      }
      setReportData(data);
      toast.success('Report generated successfully');
    } catch (error: any) {
      // If API is not available, show error gracefully
      console.warn('Reports API not available:', error);
      setReportData(null);
      // Don't show error toast for 404s - API might not be set up yet
      if (!error.message?.includes('404')) {
        toast.error(error.message || 'Failed to generate report');
      } else {
        toast.error('Reports API is not available. Please restart the server to register the routes.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!reportData) return;

    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(dataBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `permission_report_${selectedReport}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success('Report exported successfully');
  };

  const renderReportContent = () => {
    if (!reportData) return null;

    switch (selectedReport) {
      case 'distribution':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Total Permissions</TableHead>
                <TableHead>Granted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.isArray(reportData) && reportData.map((row: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell>{row.role}</TableCell>
                  <TableCell className="capitalize">{row.category}</TableCell>
                  <TableCell>{row.permission_count}</TableCell>
                  <TableCell>
                    <Badge variant={row.granted_count > 0 ? 'default' : 'secondary'}>
                      {row.granted_count}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'user-permissions':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Role Permissions</TableHead>
                <TableHead>Overrides</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.isArray(reportData) && reportData.map((row: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell>{row.full_name || 'Unknown'}</TableCell>
                  <TableCell>{row.email || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{row.role}</Badge>
                  </TableCell>
                  <TableCell>{row.role_permission_count || 0}</TableCell>
                  <TableCell>
                    <Badge variant={row.override_count > 0 ? 'default' : 'secondary'}>
                      {row.override_count || 0}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'unused':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Permission Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.isArray(reportData) && reportData.map((perm: any) => (
                <TableRow key={perm.id}>
                  <TableCell>{perm.name}</TableCell>
                  <TableCell className="capitalize">{perm.category}</TableCell>
                  <TableCell>{perm.description || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'compliance':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Users with Excessive Permissions</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Override Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(reportData.excessive_permissions) && reportData.excessive_permissions.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.full_name || 'Unknown'}</TableCell>
                      <TableCell>{user.email || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">{user.override_count}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Expired Permissions</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Permission</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Expires At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(reportData.expired_permissions) && reportData.expired_permissions.map((perm: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell>{perm.permission_name}</TableCell>
                      <TableCell>{perm.user_name || 'Unknown'}</TableCell>
                      <TableCell>
                        {new Date(perm.expires_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Permission Reports</CardTitle>
            <CardDescription>
              Generate comprehensive reports on permissions and compliance
            </CardDescription>
          </div>
          {reportData && (
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Select value={selectedReport} onValueChange={(value) => {
            setSelectedReport(value as ReportType);
            setReportData(null);
          }}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select report type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="distribution">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Permission Distribution
                </div>
              </SelectItem>
              <SelectItem value="user-permissions">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  User Permissions
                </div>
              </SelectItem>
              <SelectItem value="unused">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Unused Permissions
                </div>
              </SelectItem>
              <SelectItem value="compliance">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Compliance Report
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleGenerateReport} disabled={!selectedReport || loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Report'
            )}
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : reportData ? (
          <div className="border rounded-lg p-4 overflow-x-auto">
            {renderReportContent()}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Select a report type and click "Generate Report" to view the data
          </div>
        )}
      </CardContent>
    </Card>
  );
}
