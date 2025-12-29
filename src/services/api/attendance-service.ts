// Attendance Service - Complete CRUD operations with database integration
import { 
  selectRecords, 
  selectOne, 
  insertRecord, 
  updateRecord, 
  deleteRecord,
  rawQuery,
  rawQueryOne
} from './postgresql-service';
import { generateUUID } from '@/lib/uuid';

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  total_hours: number | null;
  overtime_hours: number | null;
  location: string | null;
  status: 'present' | 'absent' | 'late' | 'half_day' | 'on_leave';
  notes: string | null;
  agency_id: string;
  created_at: string;
  updated_at?: string;
}

export interface AttendanceCreateInput {
  employee_id: string;
  date: string;
  check_in_time?: string;
  location?: string;
  status?: string;
  notes?: string;
  agency_id: string;
}

export interface AttendanceUpdateInput {
  check_out_time?: string;
  total_hours?: number;
  overtime_hours?: number;
  location?: string;
  status?: string;
  notes?: string;
}

export interface AttendanceSummary {
  total_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  half_days: number;
  on_leave_days: number;
  total_hours: number;
  overtime_hours: number;
  average_hours: number;
}

export interface AttendanceFilter {
  employee_id?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  agency_id?: string;
}

// Create a new attendance record (Clock In)
export async function createAttendance(input: AttendanceCreateInput): Promise<AttendanceRecord> {
  const now = new Date().toISOString();
  
  const data = {
    id: generateUUID(),
    employee_id: input.employee_id,
    date: input.date,
    check_in_time: input.check_in_time || now,
    check_out_time: null,
    total_hours: null,
    overtime_hours: null,
    location: input.location || null,
    status: input.status || 'present',
    notes: input.notes || null,
    agency_id: input.agency_id,
    created_at: now
  };

  return insertRecord<AttendanceRecord>('attendance', data);
}

// Update attendance record (Clock Out or Edit)
export async function updateAttendance(
  id: string, 
  input: AttendanceUpdateInput
): Promise<AttendanceRecord> {
  const data: Record<string, any> = {
    ...input,
    updated_at: new Date().toISOString()
  };

  return updateRecord<AttendanceRecord>('attendance', data, { id });
}

// Get attendance by ID
export async function getAttendanceById(id: string): Promise<AttendanceRecord | null> {
  return selectOne<AttendanceRecord>('attendance', { id });
}

// Get today's attendance for an employee
export async function getTodayAttendance(employeeId: string): Promise<AttendanceRecord | null> {
  const today = new Date().toISOString().split('T')[0];
  return selectOne<AttendanceRecord>('attendance', { 
    employee_id: employeeId, 
    date: today 
  });
}

// Get attendance records with filters
export async function getAttendanceRecords(
  filter: AttendanceFilter = {}
): Promise<AttendanceRecord[]> {
  const where: Record<string, any> = {};
  
  if (filter.employee_id) {
    where.employee_id = filter.employee_id;
  }
  
  if (filter.status) {
    where.status = filter.status;
  }
  
  if (filter.agency_id) {
    where.agency_id = filter.agency_id;
  }

  // Build filters for date range
  const filters = [];
  
  if (filter.start_date) {
    filters.push({
      column: 'date',
      operator: 'gte',
      value: filter.start_date
    });
  }
  
  if (filter.end_date) {
    filters.push({
      column: 'date',
      operator: 'lte',
      value: filter.end_date
    });
  }

  return selectRecords<AttendanceRecord>('attendance', {
    where: Object.keys(where).length > 0 ? where : undefined,
    filters: filters.length > 0 ? filters : undefined,
    orderBy: 'date DESC, check_in_time DESC'
  });
}

// Get attendance for a specific month
export async function getMonthlyAttendance(
  employeeId: string,
  year: number,
  month: number
): Promise<AttendanceRecord[]> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  return getAttendanceRecords({
    employee_id: employeeId,
    start_date: startDate,
    end_date: endDate
  });
}

// Get attendance summary for an employee
export async function getAttendanceSummary(
  employeeId: string,
  startDate: string,
  endDate: string
): Promise<AttendanceSummary> {
  const records = await getAttendanceRecords({
    employee_id: employeeId,
    start_date: startDate,
    end_date: endDate
  });

  const summary: AttendanceSummary = {
    total_days: records.length,
    present_days: 0,
    absent_days: 0,
    late_days: 0,
    half_days: 0,
    on_leave_days: 0,
    total_hours: 0,
    overtime_hours: 0,
    average_hours: 0
  };

  for (const record of records) {
    switch (record.status) {
      case 'present':
        summary.present_days++;
        break;
      case 'absent':
        summary.absent_days++;
        break;
      case 'late':
        summary.late_days++;
        summary.present_days++; // Late is still present
        break;
      case 'half_day':
        summary.half_days++;
        break;
      case 'on_leave':
        summary.on_leave_days++;
        break;
    }

    if (record.total_hours) {
      summary.total_hours += record.total_hours;
    }
    
    if (record.overtime_hours) {
      summary.overtime_hours += record.overtime_hours;
    }
  }

  // Calculate average hours
  const workingDays = summary.present_days + summary.late_days + summary.half_days;
  summary.average_hours = workingDays > 0 
    ? Math.round((summary.total_hours / workingDays) * 100) / 100 
    : 0;

  return summary;
}

// Delete attendance record
export async function deleteAttendance(id: string): Promise<number> {
  return deleteRecord('attendance', { id });
}

// Clock in helper
export async function clockIn(
  employeeId: string,
  agencyId: string,
  location?: string
): Promise<AttendanceRecord> {
  const today = new Date().toISOString().split('T')[0];
  
  // Check if already clocked in today
  const existing = await getTodayAttendance(employeeId);
  if (existing && existing.check_in_time) {
    throw new Error('Already clocked in today');
  }

  // Determine if late (after 9:30 AM)
  const now = new Date();
  const lateThreshold = new Date();
  lateThreshold.setHours(9, 30, 0, 0);
  
  const isLate = now > lateThreshold;

  return createAttendance({
    employee_id: employeeId,
    date: today,
    check_in_time: now.toISOString(),
    location,
    status: isLate ? 'late' : 'present',
    agency_id: agencyId
  });
}

// Clock out helper
export async function clockOut(
  employeeId: string,
  location?: string
): Promise<AttendanceRecord> {
  const today = await getTodayAttendance(employeeId);
  
  if (!today) {
    throw new Error('No clock-in record found for today');
  }
  
  if (!today.check_in_time) {
    throw new Error('Not clocked in today');
  }
  
  if (today.check_out_time) {
    throw new Error('Already clocked out today');
  }

  const now = new Date();
  const checkIn = new Date(today.check_in_time);
  
  // Calculate hours worked
  const diffMs = now.getTime() - checkIn.getTime();
  const totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
  
  // Calculate overtime (anything over 9 hours)
  const overtimeHours = totalHours > 9 ? Math.round((totalHours - 9) * 100) / 100 : 0;
  
  // Determine if half day (less than 4 hours)
  const isHalfDay = totalHours < 4;
  
  // Update location to include both in and out
  const locationString = today.location && location
    ? `In: ${today.location} | Out: ${location}`
    : location || today.location;

  return updateAttendance(today.id, {
    check_out_time: now.toISOString(),
    total_hours: totalHours,
    overtime_hours: overtimeHours,
    location: locationString,
    status: isHalfDay ? 'half_day' : today.status
  });
}

// Get team attendance for a date (for managers/HR)
export async function getTeamAttendance(
  agencyId: string,
  date?: string
): Promise<AttendanceRecord[]> {
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  return getAttendanceRecords({
    agency_id: agencyId,
    start_date: targetDate,
    end_date: targetDate
  });
}

// Get attendance report for a department
export async function getDepartmentAttendance(
  agencyId: string,
  departmentId: string,
  startDate: string,
  endDate: string
): Promise<any[]> {
  // This would require joining with profiles/departments table
  // For now, return all attendance for the agency
  return getAttendanceRecords({
    agency_id: agencyId,
    start_date: startDate,
    end_date: endDate
  });
}

// Mark absent for employees who didn't clock in
export async function markAbsentees(
  agencyId: string,
  date: string,
  employeeIds: string[]
): Promise<AttendanceRecord[]> {
  const results: AttendanceRecord[] = [];
  const now = new Date().toISOString();

  for (const employeeId of employeeIds) {
    // Check if attendance exists for this date
    const existing = await selectOne<AttendanceRecord>('attendance', {
      employee_id: employeeId,
      date: date
    });

    if (!existing) {
      // Create absent record
      const absent = await insertRecord<AttendanceRecord>('attendance', {
        id: generateUUID(),
        employee_id: employeeId,
        date: date,
        check_in_time: null,
        check_out_time: null,
        total_hours: 0,
        overtime_hours: 0,
        location: null,
        status: 'absent',
        notes: 'Marked absent - no clock in',
        agency_id: agencyId,
        created_at: now
      });
      results.push(absent);
    }
  }

  return results;
}

// Export attendance to CSV format
export function exportAttendanceToCSV(records: AttendanceRecord[]): string {
  const headers = [
    'Date',
    'Employee ID',
    'Check In',
    'Check Out',
    'Total Hours',
    'Overtime',
    'Status',
    'Location',
    'Notes'
  ];

  const rows = records.map(r => [
    r.date,
    r.employee_id,
    r.check_in_time || '-',
    r.check_out_time || '-',
    r.total_hours?.toFixed(2) || '0.00',
    r.overtime_hours?.toFixed(2) || '0.00',
    r.status,
    r.location || '-',
    r.notes || '-'
  ]);

  return [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
}

