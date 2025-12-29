// PostgreSQL Database Types

export interface User {
  id: string;
  email: string;
  password_hash: string;
  email_confirmed: boolean;
  email_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  last_sign_in_at: string | null;
  is_active: boolean;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  department: string | null;
  position: string | null;
  hire_date: string | null;
  avatar_url: string | null;
  is_active: boolean;
  agency_id: string;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'hr' | 'finance_manager' | 'employee' | 'super_admin';
  assigned_at: string;
  assigned_by: string | null;
  agency_id: string;
}

export interface EmployeeDetails {
  id: string;
  user_id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  social_security_number: string | null; // encrypted
  nationality: string | null;
  marital_status: string | null;
  address: string | null;
  employment_type: string;
  work_location: string | null;
  supervisor_id: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  skills: any; // JSONB
  is_active: boolean;
  agency_id: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeeSalaryDetails {
  id: string;
  employee_id: string;
  salary: number;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface EmployeeFiles {
  id: string;
  employee_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  category: string;
  uploaded_by: string;
  created_at: string;
}

export interface Agency {
  id: string;
  name: string;
  domain: string;
  is_active: boolean;
  subscription_plan: string;
  max_users: number;
  created_at: string;
  updated_at: string;
}

export interface AgencySettings {
  id: string;
  agency_name: string;
  logo_url: string | null;
  agency_id: string;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  description: string | null;
  manager_id: string | null;
  parent_department_id: string | null;
  budget: number | null;
  is_active: boolean;
  agency_id: string;
  created_at: string;
  updated_at: string;
}

export interface TeamAssignment {
  id: string;
  user_id: string;
  department_id: string;
  position_title: string;
  role_in_department: string;
  reporting_to: string | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  agency_id: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  client_number: string;
  name: string;
  company_name: string | null;
  industry: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  website: string | null;
  contact_person: string | null;
  contact_position: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: string;
  billing_address: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_postal_code: string | null;
  billing_country: string | null;
  tax_id: string | null;
  payment_terms: string | null;
  notes: string | null;
  created_by: string;
  agency_id: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  client_id: string;
  assigned_team: any; // JSONB
  progress: number;
  created_by: string;
  agency_id: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  assignee_id: string | null;
  created_by: string;
  status: string;
  priority: string;
  due_date: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  completed_at: string | null;
  agency_id: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  title: string;
  description: string | null;
  status: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_rate: number;
  discount: number;
  total_amount: number;
  notes: string | null;
  created_by: string;
  agency_id: string;
  created_at: string;
  updated_at: string;
}

export interface Quotation {
  id: string;
  quote_number: string;
  client_id: string;
  template_id: string | null;
  title: string;
  description: string | null;
  status: string;
  valid_until: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  terms_conditions: string | null;
  notes: string | null;
  created_by: string;
  agency_id: string;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  job_number: string;
  client_id: string;
  category_id: string;
  title: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  budget: number | null;
  profit_margin: number | null;
  assigned_to: string | null;
  created_by: string;
  agency_id: string;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  lead_number: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  lead_source_id: string;
  status: string;
  priority: string;
  estimated_value: number | null;
  probability: number;
  expected_close_date: string | null;
  assigned_to: string | null;
  notes: string | null;
  created_by: string;
  agency_id: string;
  created_at: string;
  updated_at: string;
}

export interface ReimbursementRequest {
  id: string;
  employee_id: string;
  category_id: string;
  amount: number;
  currency: string;
  expense_date: string;
  description: string;
  business_purpose: string;
  status: string;
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  payment_date: string | null;
  agency_id: string;
  created_at: string;
  updated_at: string;
}

export interface ReimbursementAttachment {
  id: string;
  reimbursement_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
}

export interface Attendance {
  id: string;
  employee_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  break_start_time: string | null;
  break_end_time: string | null;
  total_hours: number | null;
  overtime_hours: number | null;
  status: string;
  notes: string | null;
  location: string | null;
  ip_address: string | null;
  agency_id: string;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  agency_id: string;
  created_at: string;
  updated_at: string;
}

export interface Payroll {
  id: string;
  employee_id: string;
  payroll_period_id: string;
  base_salary: number;
  overtime_pay: number;
  bonuses: number;
  deductions: number;
  gross_pay: number;
  tax_deductions: number;
  net_pay: number;
  hours_worked: number;
  overtime_hours: number;
  status: string;
  notes: string | null;
  created_by: string;
  agency_id: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  table_name: string;
  action: string;
  user_id: string;
  record_id: string;
  old_values: any; // JSONB
  new_values: any; // JSONB
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface FileStorage {
  id: string;
  bucket_name: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface LeaveType {
  id: string;
  name: string;
  description: string | null;
  max_days: number;
  is_paid: boolean;
  requires_approval: boolean;
  agency_id: string;
  created_at: string;
}

export interface LeaveBalance {
  id: string;
  employee_id: string;
  leave_type_id: string;
  year: number;
  total_days: number;
  used_days: number;
  pending_days: number;
  agency_id: string;
  created_at: string;
}

export interface PayrollPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  agency_id: string;
  created_at: string;
}

export interface JobCategory {
  id: string;
  name: string;
  description: string | null;
  billable_rate: number;
  agency_id: string;
  created_at: string;
}

export interface LeadSource {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  agency_id: string;
  created_at: string;
}

export interface ReimbursementCategory {
  id: string;
  name: string;
  description: string | null;
  max_amount: number;
  requires_receipt: boolean;
  agency_id: string;
  created_at: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  is_company_holiday: boolean;
  is_national_holiday: boolean;
  description?: string | null;
  agency_id: string;
  created_at: string;
  updated_at?: string;
}

export interface CompanyEvent {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  location: string | null;
  event_type: string;
  all_day: boolean;
  created_by: string;
  agency_id: string;
  created_at: string;
  updated_at?: string;
  color?: string;
  is_recurring?: boolean;
  recurrence_pattern?: any;
  attendees?: any;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface GstSetting {
  id: string;
  agency_id: string;
  gstin: string;
  legal_name: string;
  trade_name: string | null;
  address: string | null;
  state_code: string;
  state_name: string;
  is_active: boolean;
  created_at: string;
}

export interface HsnSacCode {
  id: string;
  code: string;
  description: string;
  type: 'HSN' | 'SAC';
  gst_rate: number;
  agency_id: string;
  created_at: string;
}

export interface ChartOfAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parent_id: string | null;
  is_active: boolean;
  agency_id: string;
  created_at: string;
}
