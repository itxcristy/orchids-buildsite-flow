import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { insertRecord, updateRecord, selectRecords } from '@/services/api/postgresql-service';
import { useAuth } from '@/hooks/useAuth';
import { getEmployeesForAssignmentAuto } from '@/services/api/employee-selector-service';

interface Payroll {
  id?: string;
  employee_id: string;
  payroll_period_id: string;
  base_salary: number;
  overtime_pay?: number;
  bonuses?: number;
  deductions?: number;
  gross_pay: number;
  tax_deductions?: number;
  net_pay: number;
  hours_worked?: number;
  overtime_hours?: number;
  status: 'draft' | 'approved' | 'paid';
  notes?: string | null;
}

interface PayrollFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  payroll?: Payroll | null;
  onPayrollSaved: () => void;
  payrollPeriodId?: string;
}

const PayrollFormDialog: React.FC<PayrollFormDialogProps> = ({ 
  isOpen, 
  onClose, 
  payroll, 
  onPayrollSaved,
  payrollPeriodId 
}) => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [payrollPeriods, setPayrollPeriods] = useState<any[]>([]);
  const [formData, setFormData] = useState<Payroll>({
    employee_id: payroll?.employee_id || '',
    payroll_period_id: payroll?.payroll_period_id || payrollPeriodId || '',
    base_salary: payroll?.base_salary || 0,
    overtime_pay: payroll?.overtime_pay || 0,
    bonuses: payroll?.bonuses || 0,
    deductions: payroll?.deductions || 0,
    gross_pay: payroll?.gross_pay || 0,
    tax_deductions: payroll?.tax_deductions || 0,
    net_pay: payroll?.net_pay || 0,
    hours_worked: payroll?.hours_worked || 0,
    overtime_hours: payroll?.overtime_hours || 0,
    status: payroll?.status || 'draft',
    notes: payroll?.notes || '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchEmployees();
      fetchPayrollPeriods();
      if (payroll) {
        setFormData({
          employee_id: payroll.employee_id,
          payroll_period_id: payroll.payroll_period_id,
          base_salary: payroll.base_salary,
          overtime_pay: payroll.overtime_pay || 0,
          bonuses: payroll.bonuses || 0,
          deductions: payroll.deductions || 0,
          gross_pay: payroll.gross_pay,
          tax_deductions: payroll.tax_deductions || 0,
          net_pay: payroll.net_pay,
          hours_worked: payroll.hours_worked || 0,
          overtime_hours: payroll.overtime_hours || 0,
          status: payroll.status,
          notes: payroll.notes || '',
        });
      } else {
        setFormData({
          employee_id: '',
          payroll_period_id: payrollPeriodId || '',
          base_salary: 0,
          overtime_pay: 0,
          bonuses: 0,
          deductions: 0,
          gross_pay: 0,
          tax_deductions: 0,
          net_pay: 0,
          hours_worked: 0,
          overtime_hours: 0,
          status: 'draft',
          notes: '',
        });
      }
    }
  }, [isOpen, payroll, payrollPeriodId]);

  const fetchEmployees = async () => {
    try {
      // Use standardized employee fetching service
      const employeesData = await getEmployeesForAssignmentAuto(profile, user?.id);
      
      // Payroll uses employee_id (from employee_details.id), so we need to fetch employee_details
      // to get the employee_id (which is employee_details.id) for each user_id
      const userIds = employeesData.map(emp => emp.user_id);
      if (userIds.length > 0) {
        const employeeDetails = await selectRecords('employee_details', {
          filters: [
            { column: 'user_id', operator: 'in', value: userIds },
            { column: 'is_active', operator: 'eq', value: true }
          ]
        });
        
        const employeeDetailsMap = new Map(employeeDetails.map((ed: any) => [ed.user_id, ed]));
        
        // Combine employee data with employee_details
        // IMPORTANT: employee_id in payroll table is employee_details.id, not user_id
        const employeesWithDetails = employeesData
          .filter(emp => employeeDetailsMap.has(emp.user_id))
          .map(emp => {
            const ed = employeeDetailsMap.get(emp.user_id);
            return {
              ...(ed || {}),
              user_id: emp.user_id,
              id: ed?.id, // This is the employee_details.id used in payroll table
              employee_id: ed?.id, // This is what goes into payroll.employee_id
              display_name: emp.full_name,
              employee_code: ed?.employee_id || ed?.id?.substring(0, 8)
            };
          });
        
        setEmployees(employeesWithDetails);
      } else {
        setEmployees([]);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
    }
  };

  const fetchPayrollPeriods = async () => {
    try {
      const periods = await selectRecords('payroll_periods', {
        orderBy: 'start_date DESC',
      });
      setPayrollPeriods(periods || []);
    } catch (error) {
      console.error('Error fetching payroll periods:', error);
    }
  };

  const calculateTotals = () => {
    const baseSalary = parseFloat(String(formData.base_salary || 0));
    const overtimePay = parseFloat(String(formData.overtime_pay || 0));
    const bonuses = parseFloat(String(formData.bonuses || 0)); // This maps to allowances in DB
    const deductions = parseFloat(String(formData.deductions || 0));
    const taxDeductions = parseFloat(String(formData.tax_deductions || 0)); // This maps to tax_amount in DB
    
    const grossPay = baseSalary + overtimePay + bonuses;
    const netPay = grossPay - deductions - taxDeductions;
    
    return { grossPay, netPay };
  };

  // Auto-fill employee salary details when employee is selected
  const handleEmployeeChange = async (employeeId: string) => {
    handleFieldChange('employee_id', employeeId);
    
    if (!employeeId) return;
    
    try {
      // Find the employee_details record
      const employeeDetail = employees.find(emp => emp.id === employeeId);
      if (!employeeDetail) return;
      
      // Fetch employee_salary_details to auto-fill base salary
      const salaryDetails = await selectRecords('employee_salary_details', {
        where: { employee_id: employeeId },
        orderBy: 'effective_date DESC',
        limit: 1
      });
      
      if (salaryDetails && salaryDetails.length > 0) {
        const latestSalary = salaryDetails[0];
        const baseSalary = parseFloat(String(latestSalary.base_salary || latestSalary.salary || 0));
        handleFieldChange('base_salary', baseSalary);
      }
      
      // Auto-calculate hours from attendance if payroll period is selected
      if (formData.payroll_period_id) {
        await calculateHoursFromAttendance(employeeId, formData.payroll_period_id);
      }
    } catch (error) {
      console.error('Error fetching employee salary details:', error);
    }
  };

  // Auto-calculate hours from attendance when period is selected
  const handlePeriodChange = async (periodId: string) => {
    handleFieldChange('payroll_period_id', periodId);
    
    if (!periodId || !formData.employee_id) return;
    
    await calculateHoursFromAttendance(formData.employee_id, periodId);
  };

  // Calculate hours worked and overtime from attendance records
  const calculateHoursFromAttendance = async (employeeId: string, periodId: string) => {
    try {
      // Get payroll period dates
      const period = payrollPeriods.find(p => p.id === periodId);
      if (!period) return;
      
      // Get employee_details to find user_id (attendance uses user_id as employee_id)
      const employeeDetail = employees.find(emp => emp.id === employeeId);
      if (!employeeDetail || !employeeDetail.user_id) return;
      
      // Fetch attendance records for the period
      // Note: attendance.employee_id is actually user_id
      // Format dates properly (YYYY-MM-DD)
      const startDate = period.start_date.split('T')[0];
      const endDate = period.end_date.split('T')[0];
      
      const attendanceRecords = await selectRecords('attendance', {
        filters: [
          { column: 'employee_id', operator: 'eq', value: employeeDetail.user_id },
          { column: 'date', operator: 'gte', value: startDate },
          { column: 'date', operator: 'lte', value: endDate }
        ]
      });
      
      // Calculate total hours and overtime
      let totalHours = 0;
      let totalOvertime = 0;
      
      attendanceRecords.forEach((record: any) => {
        const hours = parseFloat(String(record.hours_worked || record.total_hours || 0));
        totalHours += hours;
        
        // Calculate overtime (anything over 8 hours per day)
        const overtime = hours > 8 ? hours - 8 : 0;
        totalOvertime += overtime;
      });
      
      handleFieldChange('hours_worked', Math.round(totalHours * 10) / 10);
      handleFieldChange('overtime_hours', Math.round(totalOvertime * 10) / 10);
      
      // Auto-calculate overtime pay if hourly rate is available
      // Use current formData state
      setFormData(prev => {
        const currentBaseSalary = prev.base_salary || 0;
        if (totalOvertime > 0 && currentBaseSalary > 0) {
          // Assume monthly salary, calculate hourly rate (monthly / 160 hours)
          const hourlyRate = currentBaseSalary / 160;
          const overtimePay = totalOvertime * hourlyRate * 1.5; // 1.5x for overtime
          return {
            ...prev,
            overtime_pay: Math.round(overtimePay * 100) / 100
          };
        }
        return prev;
      });
    } catch (error) {
      console.error('Error calculating hours from attendance:', error);
    }
  };

  const handleFieldChange = (field: keyof Payroll, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      const { grossPay, netPay } = calculateTotals();
      return {
        ...updated,
        gross_pay: grossPay,
        net_pay: netPay,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { grossPay, netPay } = calculateTotals();
      
      // Map frontend field names to database field names
      const cleanedData: any = {
        employee_id: formData.employee_id, // This is employee_details.id
        payroll_period_id: formData.payroll_period_id,
        base_salary: parseFloat(String(formData.base_salary || 0)),
        overtime_pay: parseFloat(String(formData.overtime_pay || 0)) || 0,
        allowances: parseFloat(String(formData.bonuses || 0)) || 0, // bonuses maps to allowances
        deductions: parseFloat(String(formData.deductions || 0)) || 0,
        gross_salary: grossPay, // gross_pay maps to gross_salary
        tax_amount: parseFloat(String(formData.tax_deductions || 0)) || 0, // tax_deductions maps to tax_amount
        net_salary: netPay, // net_pay maps to net_salary
        overtime_hours: parseFloat(String(formData.overtime_hours || 0)) || 0,
        status: formData.status,
        notes: formData.notes?.trim() || null,
      };
      
      // Add hours_worked if the column exists (it might not be in all databases)
      // We'll try to add it, but if it fails, we'll continue without it
      if (formData.hours_worked && formData.hours_worked > 0) {
        cleanedData.hours_worked = parseFloat(String(formData.hours_worked || 0));
      }

      if (payroll?.id) {
        await updateRecord('payroll', cleanedData, { id: payroll.id }, user?.id);
        toast({
          title: 'Success',
          description: 'Payroll record updated successfully',
        });
      } else {
        await insertRecord('payroll', cleanedData, user?.id);
        toast({
          title: 'Success',
          description: 'Payroll record created successfully',
        });
      }

      onPayrollSaved();
      onClose();
    } catch (error: any) {
      console.error('Error saving payroll:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save payroll record',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const { grossPay, netPay } = calculateTotals();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{payroll?.id ? 'Edit Payroll Record' : 'Create New Payroll Record'}</DialogTitle>
          <DialogDescription>
            {payroll?.id ? 'Update payroll record details below.' : 'Fill in the details to create a new payroll record.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employee_id">Employee *</Label>
              <Select 
                value={formData.employee_id} 
                onValueChange={handleEmployeeChange}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.display_name} {emp.employee_code ? `(${emp.employee_code})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payroll_period_id">Payroll Period *</Label>
              <Select 
                value={formData.payroll_period_id} 
                onValueChange={handlePeriodChange}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payroll period" />
                </SelectTrigger>
                <SelectContent>
                  {payrollPeriods.map((period) => (
                    <SelectItem key={period.id} value={period.id}>
                      {period.name} ({new Date(period.start_date).toLocaleDateString()} - {new Date(period.end_date).toLocaleDateString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="base_salary">Base Salary (₹) *</Label>
              <Input
                id="base_salary"
                type="number"
                step="0.01"
                value={formData.base_salary}
                onChange={(e) => handleFieldChange('base_salary', parseFloat(e.target.value) || 0)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value: any) => handleFieldChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="overtime_pay">Overtime Pay (₹)</Label>
              <Input
                id="overtime_pay"
                type="number"
                step="0.01"
                value={formData.overtime_pay || 0}
                onChange={(e) => handleFieldChange('overtime_pay', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bonuses">Bonuses (₹)</Label>
              <Input
                id="bonuses"
                type="number"
                step="0.01"
                value={formData.bonuses || 0}
                onChange={(e) => handleFieldChange('bonuses', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deductions">Deductions (₹)</Label>
              <Input
                id="deductions"
                type="number"
                step="0.01"
                value={formData.deductions || 0}
                onChange={(e) => handleFieldChange('deductions', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tax_deductions">Tax Deductions (₹)</Label>
              <Input
                id="tax_deductions"
                type="number"
                step="0.01"
                value={formData.tax_deductions || 0}
                onChange={(e) => handleFieldChange('tax_deductions', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours_worked">Hours Worked</Label>
              <Input
                id="hours_worked"
                type="number"
                step="0.1"
                value={formData.hours_worked || 0}
                onChange={(e) => handleFieldChange('hours_worked', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="overtime_hours">Overtime Hours</Label>
              <Input
                id="overtime_hours"
                type="number"
                step="0.1"
                value={formData.overtime_hours || 0}
                onChange={(e) => handleFieldChange('overtime_hours', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <Label className="text-muted-foreground">Gross Pay</Label>
              <p className="text-2xl font-bold">₹{grossPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Net Pay</Label>
              <p className="text-2xl font-bold text-green-600">₹{netPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              rows={3}
              placeholder="Additional notes about this payroll record"
            />
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? 'Saving...' : payroll?.id ? 'Update Payroll' : 'Create Payroll'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PayrollFormDialog;

