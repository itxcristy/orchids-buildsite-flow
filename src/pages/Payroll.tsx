import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Download, Calculator, Users, Calendar, Loader2, Plus, Edit, Trash2, Search, Building2, CheckSquare, Square } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { selectRecords, deleteRecord, selectOne, updateRecord } from '@/services/api/postgresql-service';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { db } from '@/lib/database';
import PayrollFormDialog from "@/components/PayrollFormDialog";
import PayrollPeriodFormDialog from "@/components/PayrollPeriodFormDialog";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";

interface PayrollRecord {
  id: string;
  employee: string;
  position: string;
  baseSalary: number;
  overtime: number;
  deductions: number;
  netPay: number;
  status: string;
  payPeriod: string;
  employee_id?: string;
}

interface PayrollSummary {
  totalEmployees: number;
  totalPayroll: number;
  averageSalary: number;
  pendingPayroll: number;
}

const Payroll = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  
  // Get department filter from URL
  const urlDepartmentId = searchParams.get('department');
  const urlDepartmentName = searchParams.get('name');
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [payrollSummary, setPayrollSummary] = useState<PayrollSummary>({
    totalEmployees: 0,
    totalPayroll: 0,
    averageSalary: 0,
    pendingPayroll: 0
  });
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [payrollPeriods, setPayrollPeriods] = useState<any[]>([]);
  const [payrollFormOpen, setPayrollFormOpen] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<any>(null);
  const [periodFormOpen, setPeriodFormOpen] = useState(false);
  const [selectedPeriodObj, setSelectedPeriodObj] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: string; item: any } | null>(null);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  useEffect(() => {
    fetchPayrollData();
    fetchPayrollPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      fetchPayrollData();
    }
  }, [selectedPeriod, urlDepartmentId]);

  const fetchPayrollPeriods = async () => {
    try {
      const periods = await selectRecords('payroll_periods', {
        orderBy: 'end_date DESC',
      });
      setPayrollPeriods(periods || []);
      if (periods && periods.length > 0 && !selectedPeriod) {
        setSelectedPeriod(periods[0].id);
      }
    } catch (error) {
      console.error('Error fetching payroll periods:', error);
    }
  };

  const fetchPayrollData = async () => {
    try {
      setLoading(true);
      
      // If filtering by department, get user IDs in that department
      let departmentUserIds: string[] = [];
      if (urlDepartmentId) {
        const { data: assignments } = await db
          .from('team_assignments')
          .select('user_id')
          .eq('department_id', urlDepartmentId)
          .eq('is_active', true);
        
        if (assignments) {
          departmentUserIds = assignments.map((ta: any) => ta.user_id).filter(Boolean);
        }
      }
      
      // Get selected or most recent pay period
      let periodId = selectedPeriod;
      if (!periodId && payrollPeriods.length > 0) {
        periodId = payrollPeriods[0].id;
        setSelectedPeriod(periodId);
      }

      // Fetch payroll records for selected period
      let payrollData: any[] = [];
      if (periodId) {
        payrollData = await selectRecords('payroll', {
          where: { payroll_period_id: periodId },
          orderBy: 'created_at DESC',
        });
      }

      // Filter by department if specified
      // Note: payroll.employee_id is employee_details.id, not user_id
      // So we need to map employee_details.id to user_id first
      if (urlDepartmentId && departmentUserIds.length > 0) {
        // Get employee_details for the payroll records to find their user_ids
        const payrollEmployeeIds = payrollData.map(p => p.employee_id).filter(Boolean);
        if (payrollEmployeeIds.length > 0) {
          const payrollEmployees = await selectRecords('employee_details', {
            filters: [
              { column: 'id', operator: 'in', value: payrollEmployeeIds }
            ]
          });
          
          const employeeIdToUserId = new Map(payrollEmployees.map((e: any) => [e.id, e.user_id]));
          
          // Filter payroll records where employee's user_id is in department
          payrollData = payrollData.filter((p: any) => {
            const userId = employeeIdToUserId.get(p.employee_id);
            return userId && departmentUserIds.includes(userId);
          });
        } else {
          payrollData = [];
        }
      }

      // Fetch employee details and profiles for names
      // IMPORTANT: payroll.employee_id is employee_details.id, not user_id
      const employeeDetailIds = payrollData.map(p => p.employee_id).filter(Boolean);
      let employees: any[] = [];
      let profiles: any[] = [];

      if (employeeDetailIds.length > 0) {
        // Fetch employee_details using their id (not user_id)
        employees = await selectRecords('employee_details', {
          filters: [
            { column: 'id', operator: 'in', value: employeeDetailIds }
          ]
        });

        const userIds = employees.map((e: any) => e.user_id).filter(Boolean);
        if (userIds.length > 0) {
          profiles = await selectRecords('profiles', {
            filters: [
              { column: 'user_id', operator: 'in', value: userIds }
            ]
          });
        }
      }

      const profileMap = new Map(profiles.map((p: any) => [p.user_id, p.full_name]));
      // Map by employee_details.id for payroll lookup
      const employeeMap = new Map(employees.map((e: any) => [e.id, e]));

      // Get current period info
      const currentPeriod = payrollPeriods.find(p => p.id === periodId) || payrollPeriods[0];

      // Transform payroll data - map database field names to frontend field names
      const transformedRecords: PayrollRecord[] = payrollData.map((record: any) => {
        const employee = employeeMap.get(record.employee_id); // employee_id is employee_details.id
        const fullName = employee?.user_id 
          ? (profileMap.get(employee.user_id) || `${employee.first_name} ${employee.last_name}`.trim())
          : 'Unknown Employee';
        const position = employee?.emp_position || employee?.employment_type || 'N/A';

        // Map database fields to frontend fields
        const baseSalary = Number(record.base_salary || 0);
        const overtime = Number(record.overtime_pay || 0);
        const deductions = Number(record.deductions || 0);
        // Database uses net_salary, but frontend expects net_pay
        const netPay = Number(record.net_salary || record.net_pay || 0);

        const periodName = currentPeriod 
          ? `${new Date(currentPeriod.start_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
          : 'Current Period';

        return {
          id: record.id,
          employee: fullName,
          position,
          baseSalary,
          overtime,
          deductions,
          netPay,
          status: record.status || 'draft',
          payPeriod: periodName,
          employee_id: record.employee_id // This is employee_details.id
        };
      });

      setPayrollRecords(transformedRecords);

      // Calculate summary
      const totalPayroll = transformedRecords.reduce((sum, r) => sum + r.netPay, 0);
      const averageSalary = transformedRecords.length > 0 
        ? totalPayroll / transformedRecords.length 
        : 0;
      const pendingPayroll = transformedRecords.filter(r => r.status === 'draft').length;

      // Get total active employees
      const activeEmployees = await selectRecords('employee_details', {
        where: { is_active: true },
      });

      setPayrollSummary({
        totalEmployees: activeEmployees?.length || 0,
        totalPayroll,
        averageSalary: Math.round(averageSalary),
        pendingPayroll
      });

    } catch (error: any) {
      console.error('Error fetching payroll data:', error);
      toast({
        title: "Error",
        description: "Failed to load payroll data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2 text-muted-foreground">Loading payroll data...</span>
        </div>
      </div>
    );
  }


  const handleNewPayroll = () => {
    setSelectedPayroll(null);
    setPayrollFormOpen(true);
  };

  const handleEditPayroll = async (payroll: any) => {
    try {
      // Fetch full payroll record from database
      const fullRecord = await selectOne('payroll', { id: payroll.id });
      if (fullRecord) {
        // Map database field names to frontend field names
        setSelectedPayroll({
          id: fullRecord.id,
          employee_id: fullRecord.employee_id, // This is employee_details.id
          payroll_period_id: fullRecord.payroll_period_id,
          base_salary: parseFloat(String(fullRecord.base_salary || 0)),
          overtime_pay: parseFloat(String(fullRecord.overtime_pay || 0)),
          bonuses: parseFloat(String(fullRecord.allowances || 0)), // allowances maps to bonuses in UI
          deductions: parseFloat(String(fullRecord.deductions || 0)),
          gross_pay: parseFloat(String(fullRecord.gross_salary || fullRecord.gross_pay || 0)), // gross_salary maps to gross_pay
          tax_deductions: parseFloat(String(fullRecord.tax_amount || fullRecord.tax_deductions || 0)), // tax_amount maps to tax_deductions
          net_pay: parseFloat(String(fullRecord.net_salary || fullRecord.net_pay || 0)), // net_salary maps to net_pay
          hours_worked: parseFloat(String(fullRecord.hours_worked || 0)),
          overtime_hours: parseFloat(String(fullRecord.overtime_hours || 0)),
          status: fullRecord.status,
          notes: fullRecord.notes || '',
        });
      }
      setPayrollFormOpen(true);
    } catch (error) {
      console.error('Error fetching payroll record:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payroll record details',
        variant: 'destructive',
      });
    }
  };

  const handleDeletePayroll = (payroll: any) => {
    setItemToDelete({ type: 'payroll', item: payroll });
    setDeleteDialogOpen(true);
  };

  const handleNewPeriod = () => {
    setSelectedPeriodObj(null);
    setPeriodFormOpen(true);
  };

  const handleEditPeriod = (period: any) => {
    setSelectedPeriodObj(period);
    setPeriodFormOpen(true);
  };

  const handleDeletePeriod = (period: any) => {
    setItemToDelete({ type: 'period', item: period });
    setDeleteDialogOpen(true);
  };

  const handlePayrollSaved = () => {
    fetchPayrollData();
  };

  const handlePeriodSaved = () => {
    fetchPayrollPeriods();
    fetchPayrollData();
  };

  const handleDeleted = async () => {
    if (!itemToDelete) return;

    try {
      if (itemToDelete.type === 'payroll') {
        await deleteRecord('payroll', { id: itemToDelete.item.id });
        toast({
          title: 'Success',
          description: 'Payroll record deleted successfully',
        });
        fetchPayrollData();
      } else if (itemToDelete.type === 'period') {
        await deleteRecord('payroll_periods', { id: itemToDelete.item.id });
        toast({
          title: 'Success',
          description: 'Payroll period deleted successfully',
        });
        fetchPayrollPeriods();
        if (selectedPeriod === itemToDelete.item.id) {
          setSelectedPeriod('');
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete item',
        variant: 'destructive',
      });
    }

    setItemToDelete(null);
    setDeleteDialogOpen(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'approved': return 'default';
      case 'draft': return 'secondary';
      case 'processing': return 'secondary';
      default: return 'secondary';
    }
  };

  const handleExportReport = async () => {
    try {
      if (filteredRecords.length === 0) {
        toast({
          title: 'No Data',
          description: 'No payroll records to export',
          variant: 'destructive',
        });
        return;
      }

      // Prepare CSV data
      const headers = ['Employee', 'Position', 'Base Salary', 'Overtime', 'Deductions', 'Net Pay', 'Status', 'Period'];
      const rows = filteredRecords.map(record => [
        record.employee,
        record.position,
        record.baseSalary.toFixed(2),
        record.overtime.toFixed(2),
        record.deductions.toFixed(2),
        record.netPay.toFixed(2),
        record.status,
        record.payPeriod
      ]);

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `payroll-report-${selectedPeriod || 'all'}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Success',
        description: 'Payroll report exported successfully',
      });
    } catch (error: any) {
      console.error('Error exporting report:', error);
      toast({
        title: 'Error',
        description: 'Failed to export payroll report',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadPaySlip = async (record: PayrollRecord) => {
    try {
      // Fetch full payroll record
      const fullRecord = await selectOne('payroll', { id: record.id });
      
      if (!fullRecord) {
        toast({
          title: 'Error',
          description: 'Payroll record not found',
          variant: 'destructive',
        });
        return;
      }

      // Fetch employee details
      const employee = await selectOne('employee_details', { id: record.employee_id });
      if (!employee) {
        toast({
          title: 'Error',
          description: 'Employee details not found',
          variant: 'destructive',
        });
        return;
      }

      // Fetch profile for full name
      const profile = await selectOne('profiles', { user_id: employee.user_id });
      const employeeName = profile?.full_name || `${employee.first_name} ${employee.last_name}`.trim();

      // Fetch payroll period
      const period = await selectOne('payroll_periods', { id: fullRecord.payroll_period_id });

      // Generate pay slip HTML
      const paySlipHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Pay Slip - ${employeeName}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .details { margin-bottom: 20px; }
    .details table { width: 100%; border-collapse: collapse; }
    .details td { padding: 8px; border-bottom: 1px solid #ddd; }
    .details td:first-child { font-weight: bold; width: 40%; }
    .summary { margin-top: 30px; }
    .summary table { width: 100%; border-collapse: collapse; }
    .summary td { padding: 10px; border: 1px solid #ddd; }
    .summary td:first-child { font-weight: bold; }
    .total { font-size: 18px; font-weight: bold; color: #059669; }
  </style>
</head>
<body>
  <div class="header">
    <h1>PAY SLIP</h1>
    <p>${period?.name || 'Payroll Period'}</p>
  </div>
  
  <div class="details">
    <table>
      <tr><td>Employee Name:</td><td>${employeeName}</td></tr>
      <tr><td>Employee ID:</td><td>${employee.employee_id || record.employee_id.substring(0, 8)}</td></tr>
      <tr><td>Position:</td><td>${record.position}</td></tr>
      <tr><td>Period:</td><td>${period ? `${new Date(period.start_date).toLocaleDateString()} - ${new Date(period.end_date).toLocaleDateString()}` : 'N/A'}</td></tr>
      <tr><td>Status:</td><td>${record.status.toUpperCase()}</td></tr>
    </table>
  </div>
  
  <div class="summary">
    <h2>Earnings & Deductions</h2>
    <table>
      <tr>
        <td>Base Salary</td>
        <td style="text-align: right;">₹${record.baseSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr>
        <td>Overtime Pay</td>
        <td style="text-align: right;">₹${record.overtime.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr>
        <td>Deductions</td>
        <td style="text-align: right; color: #dc2626;">-₹${record.deductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr class="total">
        <td>Net Pay</td>
        <td style="text-align: right;">₹${record.netPay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
    </table>
  </div>
  
  <div style="margin-top: 40px; text-align: center; color: #666; font-size: 12px;">
    <p>This is a computer-generated pay slip.</p>
    <p>Generated on: ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
      `;

      // Create and download file
      const blob = new Blob([paySlipHTML], { type: 'text/html;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `payslip-${employeeName.replace(/\s+/g, '-')}-${period?.name?.replace(/\s+/g, '-') || 'period'}.html`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Success',
        description: 'Pay slip downloaded successfully',
      });
    } catch (error: any) {
      console.error('Error generating pay slip:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate pay slip',
        variant: 'destructive',
      });
    }
  };

  const handleBulkApprove = async () => {
    if (selectedRecords.size === 0) {
      toast({
        title: 'No Selection',
        description: 'Please select at least one payroll record',
        variant: 'destructive',
      });
      return;
    }

    setBulkActionLoading(true);
    try {
      
      const updates = Array.from(selectedRecords).map(id => 
        updateRecord('payroll', { status: 'approved' }, { id }, user?.id)
      );

      await Promise.all(updates);
      
      toast({
        title: 'Success',
        description: `${selectedRecords.size} payroll record(s) approved successfully`,
      });
      
      setSelectedRecords(new Set());
      fetchPayrollData();
    } catch (error: any) {
      console.error('Error approving payroll records:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve payroll records',
        variant: 'destructive',
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkMarkPaid = async () => {
    if (selectedRecords.size === 0) {
      toast({
        title: 'No Selection',
        description: 'Please select at least one payroll record',
        variant: 'destructive',
      });
      return;
    }

    setBulkActionLoading(true);
    try {
      
      const updates = Array.from(selectedRecords).map(id => 
        updateRecord('payroll', { 
          status: 'paid',
          paid_at: new Date().toISOString()
        }, { id }, user?.id)
      );

      await Promise.all(updates);
      
      toast({
        title: 'Success',
        description: `${selectedRecords.size} payroll record(s) marked as paid`,
      });
      
      setSelectedRecords(new Set());
      fetchPayrollData();
    } catch (error: any) {
      console.error('Error marking payroll records as paid:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark payroll records as paid',
        variant: 'destructive',
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleSelectRecord = (id: string) => {
    setSelectedRecords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedRecords.size === filteredRecords.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(filteredRecords.map(r => r.id)));
    }
  };

  const filteredRecords = payrollRecords.filter(record =>
    record.employee.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">Payroll</h1>
            {urlDepartmentName && (
              <Badge variant="secondary" className="text-sm">
                <Building2 className="h-3 w-3 mr-1" />
                {decodeURIComponent(urlDepartmentName)}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {urlDepartmentName 
              ? `Payroll for ${decodeURIComponent(urlDepartmentName)} department`
              : "Manage employee compensation and payroll processing"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleNewPeriod}>
            <Plus className="mr-2 h-4 w-4" />
            New Period
          </Button>
          <Button variant="outline" onClick={handleNewPayroll}>
            <Plus className="mr-2 h-4 w-4" />
            New Payroll
          </Button>
          <Button variant="outline" onClick={handleExportReport}>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Employees</p>
                <p className="text-2xl font-bold">{payrollSummary.totalEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Payroll</p>
                <p className="text-2xl font-bold">₹{payrollSummary.totalPayroll.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Calculator className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Average Salary</p>
                <p className="text-2xl font-bold">₹{payrollSummary.averageSalary.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{payrollSummary.pendingPayroll}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="payroll" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payroll">Payroll Records</TabsTrigger>
          <TabsTrigger value="periods">Payroll Periods</TabsTrigger>
        </TabsList>

        <TabsContent value="payroll" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Payroll Records</CardTitle>
                  <CardDescription>
                    {selectedPeriod && payrollPeriods.find(p => p.id === selectedPeriod) 
                      ? `Payroll for ${payrollPeriods.find(p => p.id === selectedPeriod)?.name}`
                      : 'Select a payroll period'}
                    {selectedRecords.size > 0 && (
                      <span className="ml-2 text-primary font-medium">
                        ({selectedRecords.size} selected)
                      </span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {selectedRecords.size > 0 && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={handleBulkApprove}
                        disabled={bulkActionLoading}
                      >
                        Approve Selected
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={handleBulkMarkPaid}
                        disabled={bulkActionLoading}
                      >
                        Mark Paid
                      </Button>
                    </>
                  )}
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      {payrollPeriods.map((period) => (
                        <SelectItem key={period.id} value={period.id}>
                          {period.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search employees..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                    <p className="text-muted-foreground mt-2">Loading payroll data...</p>
                  </div>
                ) : filteredRecords.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      {searchTerm ? 'No payroll records found matching your search.' : 'No payroll records found for the selected period.'}
                    </p>
                    {!searchTerm && (
                      <Button className="mt-4" onClick={handleNewPayroll}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create First Payroll Record
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    {filteredRecords.length > 0 && (
                      <div className="mb-4 flex items-center gap-2 pb-2 border-b">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleSelectAll}
                          className="h-8"
                        >
                          {selectedRecords.size === filteredRecords.length ? (
                            <CheckSquare className="h-4 w-4 mr-2" />
                          ) : (
                            <Square className="h-4 w-4 mr-2" />
                          )}
                          Select All
                        </Button>
                      </div>
                    )}
                    {filteredRecords.map((record) => (
                      <div key={record.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3 flex-1">
                            <Checkbox
                              checked={selectedRecords.has(record.id)}
                              onCheckedChange={() => handleSelectRecord(record.id)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <h3 className="font-semibold">{record.employee}</h3>
                              <p className="text-sm text-muted-foreground">{record.position}</p>
                              <p className="text-xs text-muted-foreground">{record.payPeriod}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={getStatusColor(record.status)}>
                              {record.status}
                            </Badge>
                            <Button size="sm" variant="outline" onClick={() => handleEditPayroll(record)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDeletePayroll(record)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Base Salary</p>
                            <p className="font-medium">₹{record.baseSalary.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Overtime</p>
                            <p className="font-medium text-green-600">+₹{record.overtime}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Deductions</p>
                            <p className="font-medium text-red-600">-₹{record.deductions}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Net Pay</p>
                            <p className="font-bold text-lg">₹{record.netPay.toLocaleString()}</p>
                          </div>
                          <div className="flex justify-end">
                            <Button size="sm" variant="outline" onClick={() => handleDownloadPaySlip(record)}>
                              <Download className="mr-1 h-3 w-3" />
                              Pay Slip
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="periods" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Payroll Periods</CardTitle>
                  <CardDescription>Manage payroll periods for organizing payroll records</CardDescription>
                </div>
                <Button onClick={handleNewPeriod}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Period
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {payrollPeriods.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No payroll periods found. Create your first period to get started.</p>
                  </div>
                ) : (
                  payrollPeriods.map((period) => (
                    <div key={period.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{period.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(period.start_date).toLocaleDateString()} - {new Date(period.end_date).toLocaleDateString()}
                          </p>
                          {period.pay_date && (
                            <p className="text-xs text-muted-foreground">
                              Pay Date: {new Date(period.pay_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            period.status === 'paid' ? 'default' : 
                            period.status === 'approved' ? 'default' : 
                            period.status === 'processing' ? 'secondary' : 
                            'outline'
                          }>
                            {period.status}
                          </Badge>
                          <Button size="sm" variant="outline" onClick={() => handleEditPeriod(period)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDeletePeriod(period)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PayrollFormDialog
        isOpen={payrollFormOpen}
        onClose={() => setPayrollFormOpen(false)}
        payroll={selectedPayroll}
        onPayrollSaved={handlePayrollSaved}
        payrollPeriodId={selectedPeriod}
      />

      <PayrollPeriodFormDialog
        isOpen={periodFormOpen}
        onClose={() => setPeriodFormOpen(false)}
        period={selectedPeriodObj}
        onPeriodSaved={handlePeriodSaved}
      />

      <DeleteConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setItemToDelete(null);
        }}
        onDeleted={handleDeleted}
        itemType={itemToDelete?.type === 'payroll' ? 'Payroll Record' : 'Payroll Period'}
        itemName={itemToDelete?.item?.employee || itemToDelete?.item?.name || ''}
        itemId={itemToDelete?.item?.id || ''}
        tableName={itemToDelete?.type === 'payroll' ? 'payroll' : 'payroll_periods'}
      />
    </div>
  );
};

export default Payroll;