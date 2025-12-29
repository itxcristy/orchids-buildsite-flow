/**
 * Custom Reports Page
 * Build and generate custom reports from various modules
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  FileText,
  Download,
  Loader2,
  Search,
  Filter,
  Settings,
  RefreshCw,
  CheckSquare,
  Square,
} from 'lucide-react';
import { ReportService } from '@/services/api/reports';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

type ModuleType = 'inventory' | 'procurement' | 'assets' | 'financial';

interface ColumnOption {
  value: string;
  label: string;
}

const MODULE_COLUMNS: Record<ModuleType, ColumnOption[]> = {
  inventory: [
    { value: 'p.sku', label: 'SKU' },
    { value: 'p.name', label: 'Product Name' },
    { value: 'i.quantity', label: 'Quantity' },
    { value: 'i.available_quantity', label: 'Available Quantity' },
    { value: 'i.average_cost', label: 'Average Cost' },
    { value: 'i.last_cost', label: 'Last Cost' },
    { value: 'w.name', label: 'Warehouse Name' },
    { value: 'w.code', label: 'Warehouse Code' },
    { value: 'i.reorder_point', label: 'Reorder Point' },
  ],
  procurement: [
    { value: 'po.po_number', label: 'PO Number' },
    { value: 'po.status', label: 'Status' },
    { value: 'po.total_amount', label: 'Total Amount' },
    { value: 's.name', label: 'Supplier Name' },
    { value: 's.code', label: 'Supplier Code' },
    { value: 'po.created_at', label: 'Created Date' },
    { value: 'po.expected_delivery_date', label: 'Expected Delivery' },
  ],
  assets: [
    { value: 'a.asset_number', label: 'Asset Number' },
    { value: 'a.name', label: 'Asset Name' },
    { value: 'a.status', label: 'Status' },
    { value: 'a.purchase_cost', label: 'Purchase Cost' },
    { value: 'a.current_value', label: 'Current Value' },
    { value: 'ac.name', label: 'Category' },
    { value: 'al.name', label: 'Location' },
    { value: 'a.purchase_date', label: 'Purchase Date' },
  ],
  financial: [
    { value: 'i.invoice_number', label: 'Invoice Number' },
    { value: 'i.total_amount', label: 'Total Amount' },
    { value: 'i.status', label: 'Status' },
    { value: 'i.issue_date', label: 'Issue Date' },
    { value: 'i.due_date', label: 'Due Date' },
    { value: 'c.name', label: 'Client Name' },
    { value: 'i.tax_amount', label: 'Tax Amount' },
  ],
};

export default function CustomReports() {
  const { toast } = useToast();
  const [selectedModule, setSelectedModule] = useState<ModuleType>('inventory');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [orderBy, setOrderBy] = useState('');

  const handleColumnToggle = (columnValue: string) => {
    setSelectedColumns((prev) =>
      prev.includes(columnValue)
        ? prev.filter((c) => c !== columnValue)
        : [...prev, columnValue]
    );
  };

  const handleSelectAll = () => {
    const allColumns = MODULE_COLUMNS[selectedModule].map((c) => c.value);
    if (selectedColumns.length === allColumns.length) {
      setSelectedColumns([]);
    } else {
      setSelectedColumns(allColumns);
    }
  };

  const handleGenerateReport = async () => {
    if (selectedColumns.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one column',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const reportFilters: Record<string, any> = { ...filters };
      if (dateFrom) reportFilters.date_from = dateFrom;
      if (dateTo) reportFilters.date_to = dateTo;

      const data = await ReportService.generateCustomReport(selectedModule, {
        columns: selectedColumns,
        filters: reportFilters,
        orderBy: orderBy || undefined,
      });

      setReportData(data);
      toast({
        title: 'Success',
        description: `Report generated with ${data.length} records`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate report',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (reportData.length === 0) {
      toast({
        title: 'Error',
        description: 'No data to export',
        variant: 'destructive',
      });
      return;
    }

    // Convert to CSV
    const headers = selectedColumns.map((col) => {
      const column = MODULE_COLUMNS[selectedModule].find((c) => c.value === col);
      return column?.label || col;
    });

    const csvRows = [
      headers.join(','),
      ...reportData.map((row) =>
        selectedColumns.map((col) => {
          const value = row[col.split('.')[1] || col] || '';
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      ),
    ];

    const csv = csvRows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedModule}_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Success',
      description: 'Report exported successfully',
    });
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') {
      if (value.toString().includes('.')) {
        return value.toFixed(2);
      }
      return value.toString();
    }
    if (value instanceof Date) {
      return new Date(value).toLocaleDateString();
    }
    return String(value);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Custom Reports</h1>
          <p className="text-muted-foreground">Build and generate custom reports from various modules</p>
        </div>
        {reportData.length > 0 && (
          <Button onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle>Report Configuration</CardTitle>
            <CardDescription>Select module, columns, and filters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Module</Label>
              <Select value={selectedModule} onValueChange={(value) => {
                setSelectedModule(value as ModuleType);
                setSelectedColumns([]);
                setFilters({});
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inventory">Inventory</SelectItem>
                  <SelectItem value="procurement">Procurement</SelectItem>
                  <SelectItem value="assets">Assets</SelectItem>
                  <SelectItem value="financial">Financial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Columns</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedColumns.length === MODULE_COLUMNS[selectedModule].length
                    ? 'Deselect All'
                    : 'Select All'}
                </Button>
              </div>
              <div className="border rounded-md p-3 max-h-64 overflow-y-auto space-y-2">
                {MODULE_COLUMNS[selectedModule].map((column) => (
                  <div key={column.value} className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedColumns.includes(column.value)}
                      onCheckedChange={() => handleColumnToggle(column.value)}
                    />
                    <Label className="font-normal cursor-pointer flex-1">
                      {column.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Date Range</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <Label className="text-xs">From</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">To</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label>Order By (optional)</Label>
              <Input
                placeholder="e.g., created_at DESC"
                value={orderBy}
                onChange={(e) => setOrderBy(e.target.value)}
              />
            </div>

            <Button
              onClick={handleGenerateReport}
              disabled={loading || selectedColumns.length === 0}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results Card */}
        <Card>
          <CardHeader>
            <CardTitle>Report Results</CardTitle>
            <CardDescription>
              {reportData.length > 0
                ? `${reportData.length} records found`
                : 'Generate a report to see results'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reportData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No report data yet</p>
                <p className="text-sm">Configure and generate a report to see results</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {selectedColumns.map((col) => {
                        const column = MODULE_COLUMNS[selectedModule].find((c) => c.value === col);
                        return (
                          <TableHead key={col}>
                            {column?.label || col.split('.')[1] || col}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.slice(0, 100).map((row, index) => (
                      <TableRow key={index}>
                        {selectedColumns.map((col) => {
                          const fieldName = col.split('.')[1] || col;
                          return (
                            <TableCell key={col}>
                              {formatValue(row[fieldName])}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {reportData.length > 100 && (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    Showing first 100 of {reportData.length} records
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

