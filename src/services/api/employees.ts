import { BaseApiService, type ApiResponse, type ApiOptions } from './base';

interface Employee {
  id: string;
  user_id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  employment_type: string;
  is_active: boolean;
  full_name?: string;
  phone?: string;
  department?: string;
  emp_position?: string;
  hire_date?: string;
}

interface LeaveBalance {
  leave_type_name: string;
  allocated_days: number;
  used_days: number;
  pending_days: number;
  remaining_days: number;
}

export class EmployeeService extends BaseApiService {
  static async getEmployees(options: ApiOptions = {}): Promise<ApiResponse<Employee[]>> {
    return this.rpc<Employee[]>('list_employees_secure', {}, options);
  }

  static async getEmployeeDetails(
    userId: string, 
    options: ApiOptions = {}
  ): Promise<ApiResponse<Employee>> {
    return this.rpc<Employee>('get_employee_full_details', {
      target_user_id: userId
    }, options);
  }

  static async getLeaveBalance(
    employeeId?: string,
    year?: number,
    options: ApiOptions = {}
  ): Promise<ApiResponse<LeaveBalance[]>> {
    return this.rpc<LeaveBalance[]>('get_leave_balance_summary', {
      p_employee_id: employeeId,
      p_year: year
    }, options);
  }

  static async createEmployee(
    data: {
      email: string;
      firstName: string;
      lastName: string;
      phone?: string;
      department?: string;
      position?: string;
      hireDate?: string;
      employmentType?: string;
    },
    options: ApiOptions = {}
  ): Promise<ApiResponse<any>> {
    // Note: This would typically involve multiple steps:
    // 1. Create user account in auth
    // 2. Create profile record
    // 3. Create employee details record
    // For now, we'll just return a placeholder
    
    return this.execute(async () => {
      // This would be implemented based on your specific requirements
      throw new Error('Employee creation not yet implemented in service layer');
    }, options);
  }

  static async updateEmployee(
    userId: string,
    data: Partial<Employee>,
    options: ApiOptions = {}
  ): Promise<ApiResponse<Employee>> {
    return this.update<Employee>('employee_details', data, { user_id: userId }, options);
  }

  static async deleteEmployee(
    userId: string,
    options: ApiOptions = {}
  ): Promise<ApiResponse<any>> {
    return this.update('employee_details', { is_active: false }, { user_id: userId }, options);
  }
}