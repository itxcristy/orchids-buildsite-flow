import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { ArrowLeft, CalendarIcon, Save, User, Mail, Phone, Building, MapPin, Upload, FileText, X, Eye } from "lucide-react";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { db } from '@/lib/database';
import { useToast } from "@/hooks/use-toast";
import { generateUUID, isValidUUID } from '@/lib/uuid';
import { useAuth } from "@/hooks/useAuth";
import { insertRecord, updateRecord, selectOne, selectRecords, deleteRecord } from '@/services/api/postgresql-service';
import { getAgencyId } from '@/utils/agencyUtils';
import bcrypt from '@/lib/bcrypt';
import { logError } from '@/utils/consoleLogger';

const formSchema = z.object({
  // Personal Information
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  dateOfBirth: z.date({
    required_error: "Date of birth is required",
  }),
  panCardNumber: z.string().min(10, "PAN card number must be 10 characters").max(10, "PAN card number must be 10 characters").regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN card format (e.g., ABCDE1234F)"),
  nationality: z.string().min(2, "Nationality is required"),
  maritalStatus: z.enum(["single", "married", "divorced", "widowed"]),
  
  // Employment Details
  employeeId: z.string().optional(), // Auto-generated, optional in form
  position: z.string().min(2, "Position is required"),
  department: z.string().min(1, "Department is required"),
  role: z.string().min(1, "Role is required"), // Dynamic based on database
  hireDate: z.date({
    required_error: "Hire date is required",
  }),
  salary: z.string().min(1, "Salary is required"),
  employmentType: z.string().min(1, "Employment type is required"), // Dynamic based on database
  workLocation: z.string().min(2, "Work location is required"),
  supervisor: z.string().optional().refine(
    (val) => {
      if (!val || !val.trim()) return true; // Empty is allowed
      // UUID v4 format validation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(val.trim());
    },
    { message: "Supervisor must be a valid UUID format" }
  ),
  
  // Emergency Contact
  emergencyContactName: z.string().min(2, "Emergency contact name is required"),
  emergencyContactPhone: z.string().min(10, "Emergency contact phone is required"),
  emergencyContactRelationship: z.string().min(2, "Relationship is required"),
  
  // Additional Info
  notes: z.string().optional(),
});

// File upload interface
interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  category: string;
  file: File;
}

interface Department {
  id: string;
  name: string;
}

const CreateEmployee = () => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [generatedEmployeeId, setGeneratedEmployeeId] = useState<string>('');
  const [dateOfBirthOpen, setDateOfBirthOpen] = useState(false);
  const [hireDateOpen, setHireDateOpen] = useState(false);
  const [dateOfBirthInput, setDateOfBirthInput] = useState<string>('');
  const [hireDateInput, setHireDateInput] = useState<string>('');
  
  // State for database-fetched options
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<string[]>([]);
  const [positions, setPositions] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      panCardNumber: "",
      nationality: "",
      maritalStatus: "single",
      employeeId: "", // Will be auto-generated
      position: "",
      department: "",
      role: "employee",
      salary: "",
      employmentType: "full-time",
      workLocation: "",
      supervisor: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      emergencyContactRelationship: "",
      notes: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      // Get current logged-in user ID for audit logs
      const currentUserId = user?.id;
      if (!currentUserId) {
        throw new Error('You must be logged in to create an employee');
      }

      // Generate a new user ID for the employee
      const userId = generateUUID();
      const tempPassword = 'TempPass' + Math.random().toString(36).substring(2, 10) + '!';
      
      // Hash the password properly
      const passwordHash = await bcrypt.hash(tempPassword, 10);
      
      // Get agency_id from profile or fetch from database
      const agencyId = await getAgencyId(profile, user?.id);
      if (!agencyId) {
        throw new Error('Agency ID not found. Please ensure you are logged in to an agency account.');
      }

      // Check if user with this email already exists
      const existingUser = await selectOne('users', { email: values.email.toLowerCase().trim() });
      if (existingUser) {
        // Check if this is an orphaned user (user exists but no employee_details)
        // This can happen if a previous creation attempt failed
        const existingEmployeeDetails = await selectOne('employee_details', { user_id: existingUser.id });
        if (!existingEmployeeDetails) {
          // Orphaned user - delete it and continue with creation
          logWarn('Found orphaned user, cleaning up and retrying...');
          try {
            // Delete related records first (user_roles, profiles)
            await deleteRecord('user_roles', { user_id: existingUser.id }).catch(() => {});
            await deleteRecord('profiles', { user_id: existingUser.id }).catch(() => {});
            await deleteRecord('users', { id: existingUser.id });
            toast({
              title: "Cleaned up incomplete record",
              description: "Found an incomplete employee record. Cleaning up and retrying...",
              variant: "default",
            });
          } catch (cleanupError) {
            logError('Failed to cleanup orphaned user:', cleanupError);
            throw new Error(`A user with email "${values.email}" exists but is incomplete. Please contact support or use a different email.`);
          }
        } else {
          // User exists with complete employee details - this is a real duplicate
          throw new Error(`A user with email "${values.email}" already exists. Please use a different email address.`);
        }
      }

      // Generate unique employee ID automatically
      let employeeId = values.employeeId?.trim() || '';
      
      // If no employee ID provided, generate one automatically
      if (!employeeId) {
        // Get the latest employee ID to generate next sequential ID (filter by agency)
        const latestEmployees = await selectRecords('employee_details', {
          select: 'employee_id',
          where: { agency_id: agencyId },
          orderBy: 'created_at DESC',
          limit: 1
        });
        
        if (latestEmployees.length > 0 && latestEmployees[0].employee_id) {
          // Extract number from existing ID (e.g., EMP-001 -> 1)
          const match = latestEmployees[0].employee_id.match(/(\d+)$/);
          if (match) {
            const nextNum = parseInt(match[1]) + 1;
            employeeId = `EMP-${String(nextNum).padStart(4, '0')}`;
          } else {
            // If format doesn't match, start from 1
            employeeId = 'EMP-0001';
          }
        } else {
          // First employee
          employeeId = 'EMP-0001';
        }
      }
      
      // Check if generated employee_id already exists (in case of manual entry)
      const existingEmployee = await selectOne('employee_details', { employee_id: employeeId });
      if (existingEmployee) {
        // If exists, try to generate a new one by appending timestamp
        const timestamp = Date.now().toString().slice(-4);
        employeeId = `EMP-${timestamp}`;
        
        // Double-check this one doesn't exist either
        const checkAgain = await selectOne('employee_details', { employee_id: employeeId });
        if (checkAgain) {
          // Last resort: use UUID short version
          employeeId = `EMP-${generateUUID().substring(0, 8).toUpperCase()}`;
        }
      }

      // Create user record with current user context for audit logs
      // Normalize email to lowercase
      await insertRecord('users', {
          id: userId,
          email: values.email.toLowerCase().trim(),
        password_hash: passwordHash,
          is_active: true,
          email_confirmed: true,
      }, currentUserId);

      // If a department was selected, resolve its name and ensure we have a valid department_id
      let selectedDepartmentId: string | null = null;
      let selectedDepartmentName: string | null = null;
      if (values.department && values.department.trim() && values.department !== '__no_departments__') {
        // values.department contains the department ID from the dropdown
        const departmentRecord = await selectOne<Department>('departments', { id: values.department });
        if (departmentRecord) {
          selectedDepartmentId = departmentRecord.id;
          selectedDepartmentName = departmentRecord.name;
        }
      }

      // Profile is automatically created by database trigger, so update it instead of inserting
      // Check if profile exists (it should, due to trigger)
      const existingProfile = await selectOne('profiles', { user_id: userId });
      
      const profileData = {
          agency_id: agencyId,
          full_name: `${values.firstName} ${values.lastName}`,
          phone: values.phone,
          // Store the human-readable department name on the profile
          department: selectedDepartmentName,
          position: values.position,
          hire_date: values.hireDate.toISOString().split('T')[0],
          is_active: true,
      };

      if (existingProfile) {
          // Update existing profile created by trigger
          await updateRecord('profiles', profileData, { user_id: userId }, currentUserId);
      } else {
          // Fallback: if trigger didn't create profile, insert it manually
          await insertRecord('profiles', {
              id: generateUUID(),
              user_id: userId,
              ...profileData,
          }, currentUserId, agencyId);
      }

      // Create employee details entry (this triggers audit log)
      const employeeDetailsId = generateUUID();
      
      // Validate supervisor_id - must be a valid UUID or null
      let supervisorId: string | null = null;
      if (values.supervisor && values.supervisor.trim()) {
        if (isValidUUID(values.supervisor.trim())) {
          supervisorId = values.supervisor.trim();
        } else {
          // If supervisor is provided but not a valid UUID, log warning and set to null
          logWarn('Invalid supervisor UUID provided:', values.supervisor);
          // Could optionally show a toast warning here
        }
      }
      
      await insertRecord('employee_details', {
          id: employeeDetailsId,
          user_id: userId,
          employee_id: employeeId, // Use auto-generated ID
          created_by: currentUserId, // Track who created this employee
          first_name: values.firstName,
          last_name: values.lastName,
          date_of_birth: values.dateOfBirth.toISOString().split('T')[0],
          social_security_number: values.panCardNumber,
          nationality: values.nationality,
          marital_status: values.maritalStatus,
          address: values.address,
          employment_type: values.employmentType, // Keep as 'full-time', 'part-time', etc.
          work_location: values.workLocation,
          supervisor_id: supervisorId,
          emergency_contact_name: values.emergencyContactName,
          emergency_contact_phone: values.emergencyContactPhone,
          emergency_contact_relationship: values.emergencyContactRelationship,
          notes: values.notes,
          agency_id: agencyId,
          is_active: true,
      }, currentUserId);

      // Create employee salary details entry (salary is in separate table)
      const salaryValue = parseFloat(values.salary) || 0;
      await insertRecord('employee_salary_details', {
          id: generateUUID(),
          employee_id: employeeDetailsId, // Reference to employee_details.id
          base_salary: salaryValue, // Required NOT NULL field
          salary: salaryValue, // Alias field for frontend compatibility
          currency: 'USD',
          salary_frequency: 'monthly',
          pay_frequency: 'monthly', // Also set pay_frequency for compatibility
          effective_date: values.hireDate.toISOString().split('T')[0],
          agency_id: agencyId,
      }, currentUserId);

      // Validate and set user role
      // Valid enum values for app_role
      const validRoles = [
        'super_admin', 'ceo', 'cto', 'cfo', 'coo', 'admin', 
        'operations_manager', 'department_head', 'team_lead', 
        'project_manager', 'hr', 'finance_manager', 'sales_manager',
        'marketing_manager', 'quality_assurance', 'it_support', 
        'legal_counsel', 'business_analyst', 'customer_success',
        'employee', 'contractor', 'intern'
      ];
      
      // Normalize role value (handle underscores vs hyphens)
      const normalizedRole = values.role?.replace(/-/g, '_').toLowerCase();
      const finalRole = validRoles.includes(normalizedRole) ? normalizedRole : 'employee';
      
      if (normalizedRole !== finalRole) {
        logWarn(`[CreateEmployee] Invalid role "${values.role}" normalized to "${finalRole}"`);
        toast({
          title: "Role adjusted",
          description: `Role "${values.role}" is not valid. Using "${finalRole}" instead.`,
          variant: "default",
        });
      }
      
      await insertRecord('user_roles', {
          id: generateUUID(),
          user_id: userId,
          role: finalRole,
          agency_id: agencyId,
      }, currentUserId, agencyId);

      // Create team assignment linking the user to the selected department (if any)
      if (selectedDepartmentId) {
        await insertRecord('team_assignments', {
          id: generateUUID(),
          user_id: userId,
          department_id: selectedDepartmentId,
          position_title: values.position,
          role_in_department: values.role,
          start_date: values.hireDate.toISOString().split('T')[0],
          is_active: true,
          agency_id: agencyId,
          assigned_by: currentUserId,
        }, currentUserId, agencyId);
      }

      toast({
        title: "Success",
        description: `Employee created successfully! Temporary password: ${tempPassword}`,
      });

      // Reset form
      form.reset();
      setUploadedFiles([]);
      setProfileImage(null);
      setProfileImagePreview(null);
      
    } catch (error) {
      logError("Error creating employee:", error);
      
      // Handle specific database errors
      let errorMessage = "Error creating employee. Please try again.";
      
      if (error instanceof Error) {
        const errorStr = error.message || error.toString();
        
        // Check for duplicate email constraint
        if (errorStr.includes('duplicate key value violates unique constraint "users_email_key"') ||
            errorStr.includes('already exists') ||
            errorStr.includes('23505')) {
          errorMessage = `A user with email "${values.email}" already exists. Please use a different email address.`;
        } 
        // Check for invalid enum value
        else if (errorStr.includes('invalid input value for enum app_role') ||
                 errorStr.includes('22P02')) {
          errorMessage = `Invalid role selected: "${values.role}". Please select a valid role from the dropdown.`;
        }
        // Check for duplicate employee_id constraint
        else if (errorStr.includes('duplicate key value violates unique constraint') && 
                 errorStr.includes('employee_id')) {
          errorMessage = `Employee ID "${values.employeeId}" already exists. Please use a different employee ID.`;
        }
        // Use the error message if it's already user-friendly
        else if (error.message && !error.message.includes('Database API error')) {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, category: string) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const newFile: UploadedFile = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        category,
        file
      };
      setUploadedFiles(prev => [...prev, newFile]);
    });
  };

  const handleProfileImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setProfileImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setProfileImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const removeProfileImage = () => {
    setProfileImage(null);
    setProfileImagePreview(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Helper function to format date input with auto-formatting (DD/MM/YYYY - Indian Standard)
  const formatDateInput = (value: string): string => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Limit to 8 digits (DDMMYYYY)
    const limitedDigits = digits.slice(0, 8);
    
    // Format with slashes
    if (limitedDigits.length <= 2) {
      return limitedDigits;
    } else if (limitedDigits.length <= 4) {
      return `${limitedDigits.slice(0, 2)}/${limitedDigits.slice(2)}`;
    } else {
      return `${limitedDigits.slice(0, 2)}/${limitedDigits.slice(2, 4)}/${limitedDigits.slice(4)}`;
    }
  };

  // Helper function to parse DD/MM/YYYY format (Indian Standard)
  const parseIndianDate = (dateStr: string): Date | null => {
    if (!dateStr.trim()) return null;
    
    // Remove slashes and get only digits
    const digits = dateStr.replace(/\D/g, '');
    
    // Need at least 6 digits (DDMMYY) or 8 digits (DDMMYYYY)
    if (digits.length < 6) return null;
    
    // Extract day, month, year
    const day = parseInt(digits.slice(0, 2));
    const month = parseInt(digits.slice(2, 4));
    let year = parseInt(digits.slice(4));
    
    // Handle 2-digit year (assume 2000s if < 50, 1900s if >= 50)
    if (year < 100) {
      year = year < 50 ? 2000 + year : 1900 + year;
    }
    
    // Validate day, month, year
    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) {
      return null;
    }
    
    // Create date object (month is 0-indexed in JavaScript Date)
    const date = new Date(year, month - 1, day);
    
    // Validate the date (check if it's a valid date)
    if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
      return null;
    }
    
    return date;
  };

  // Fetch departments from database
  // Note: In isolated database architecture, all records in this DB belong to the agency
  // No need to filter by agency_id - just get all active departments
  const fetchDepartments = async () => {
    try {
      const deptData = await selectRecords('departments', {
        select: 'id, name',
        filters: [
          { column: 'is_active', operator: 'eq', value: true }
        ],
        orderBy: 'name ASC'
      });
      
      setDepartments(deptData || []);
    } catch (error) {
      logError('Error fetching departments:', error);
      toast({
        title: "Warning",
        description: "Failed to load departments. Please refresh the page.",
        variant: "destructive",
      });
    }
  };

  // Fetch distinct roles from user_roles table
  const fetchRoles = async () => {
    try {
      const agencyId = await getAgencyId(profile, user?.id);
      if (!agencyId) {
        logWarn('No agency_id available for fetching roles');
        return;
      }

      // Valid enum values for app_role (must match database enum)
      const validRoles = [
        'super_admin', 'ceo', 'cto', 'cfo', 'coo', 'admin', 
        'operations_manager', 'department_head', 'team_lead', 
        'project_manager', 'hr', 'finance_manager', 'sales_manager',
        'marketing_manager', 'quality_assurance', 'it_support', 
        'legal_counsel', 'business_analyst', 'customer_success',
        'employee', 'contractor', 'intern'
      ];

      // Fetch distinct roles from user_roles filtered by agency
      const rolesData = await selectRecords('user_roles', {
        select: 'role',
        filters: [
          { column: 'agency_id', operator: 'eq', value: agencyId }
        ]
      });

      // Get unique roles and filter to only valid enum values
      const uniqueRoles = Array.from(new Set((rolesData || []).map((r: any) => r.role).filter(Boolean)));
      const validUniqueRoles = uniqueRoles.filter((role: string) => validRoles.includes(role.toLowerCase()));
      
      // If no valid roles found, use default valid roles
      if (validUniqueRoles.length === 0) {
        setRoles(['employee', 'hr', 'finance_manager', 'admin', 'super_admin']);
      } else {
        // Always include common roles even if not in database yet
        const defaultRoles = ['employee', 'hr', 'admin'];
        const combinedRoles = Array.from(new Set([...defaultRoles, ...validUniqueRoles]));
        setRoles(combinedRoles.sort());
      }
    } catch (error) {
      logError('Error fetching roles:', error);
      // Fallback to default valid roles
      setRoles(['employee', 'hr', 'finance_manager', 'admin', 'super_admin']);
    }
  };

  // Fetch distinct employment types from employee_details
  const fetchEmploymentTypes = async () => {
    try {
      const agencyId = await getAgencyId(profile, user?.id);
      if (!agencyId) {
        logWarn('No agency_id available for fetching employment types');
        return;
      }

      // Fetch distinct employment types from employee_details
      const empData = await selectRecords('employee_details', {
        select: 'employment_type',
        filters: [
          { column: 'agency_id', operator: 'eq', value: agencyId }
        ]
      });

      // Get unique employment types
      const uniqueTypes = Array.from(new Set((empData || []).map((e: any) => e.employment_type).filter(Boolean)));
      
      // If no types found or empty, use default types
      if (uniqueTypes.length === 0) {
        setEmploymentTypes(['full-time', 'part-time', 'contract', 'intern']);
      } else {
        // Normalize the values (handle both 'full-time' and 'full_time')
        const normalizedTypes = uniqueTypes.map((t: string) => {
          if (t === 'full_time') return 'full-time';
          if (t === 'part_time') return 'part-time';
          return t;
        });
        setEmploymentTypes(Array.from(new Set(normalizedTypes)).sort());
      }
    } catch (error) {
      logError('Error fetching employment types:', error);
      // Fallback to default types
      setEmploymentTypes(['full-time', 'part-time', 'contract', 'intern']);
    }
  };

  // Fetch distinct positions from profiles
  const fetchPositions = async () => {
    try {
      const agencyId = await getAgencyId(profile, user?.id);
      if (!agencyId) {
        logWarn('No agency_id available for fetching positions');
        return;
      }

      // Fetch distinct positions from profiles
      const profilesData = await selectRecords('profiles', {
        select: 'position',
        filters: [
          { column: 'agency_id', operator: 'eq', value: agencyId },
          { column: 'position', operator: 'is not', value: null }
        ]
      });

      // Get unique positions
      const uniquePositions = Array.from(new Set((profilesData || []).map((p: any) => p.position).filter(Boolean)));
      setPositions(uniquePositions.sort());
    } catch (error) {
      logError('Error fetching positions:', error);
      // Positions can be empty - it's optional to have existing positions
      setPositions([]);
    }
  };

  // Load all options on component mount
  useEffect(() => {
    const loadAllOptions = async () => {
      setLoadingOptions(true);
      try {
        await Promise.all([
          fetchDepartments(),
          fetchRoles(),
          fetchEmploymentTypes(),
          fetchPositions()
        ]);
      } catch (error) {
        logError('Error loading options:', error);
      } finally {
        setLoadingOptions(false);
      }
    };

    loadAllOptions();
  }, [profile, user]);

  // Generate employee ID on component mount
  useEffect(() => {
    const generateInitialEmployeeId = async () => {
      try {
        const latestEmployees = await selectRecords('employee_details', {
          select: 'employee_id',
          orderBy: 'created_at DESC',
          limit: 1
        });
        
        if (latestEmployees.length > 0 && latestEmployees[0].employee_id) {
          const match = latestEmployees[0].employee_id.match(/(\d+)$/);
          if (match) {
            const nextNum = parseInt(match[1]) + 1;
            const newId = `EMP-${String(nextNum).padStart(4, '0')}`;
            setGeneratedEmployeeId(newId);
            form.setValue('employeeId', newId);
          } else {
            setGeneratedEmployeeId('EMP-0001');
            form.setValue('employeeId', 'EMP-0001');
          }
        } else {
          setGeneratedEmployeeId('EMP-0001');
          form.setValue('employeeId', 'EMP-0001');
        }
      } catch (error) {
        logError('Error generating employee ID:', error);
        // Fallback to default
        setGeneratedEmployeeId('EMP-0001');
        form.setValue('employeeId', 'EMP-0001');
      }
    };
    
    generateInitialEmployeeId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0 mb-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl lg:text-3xl font-bold break-words">Create New Employee</h1>
          <p className="text-sm lg:text-base text-muted-foreground">Add a new employee to the system</p>
        </div>
        <Button asChild variant="outline" size="sm" className="w-full lg:w-auto h-10">
          <Link to="/users">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Link>
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Profile Image Upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Profile Photo
                  </CardTitle>
                  <CardDescription>Upload employee profile picture</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-6">
                    <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center overflow-hidden">
                      {profileImagePreview ? (
                        <img 
                          src={profileImagePreview} 
                          alt="Profile preview" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex flex-col space-y-2">
                      <Label htmlFor="profile-image" className="cursor-pointer">
                        <div className="flex items-center space-x-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors">
                          <Upload className="h-4 w-4" />
                          <span className="text-sm">Upload Photo</span>
                        </div>
                      </Label>
                      <Input
                        id="profile-image"
                        type="file"
                        accept="image/*"
                        onChange={handleProfileImageUpload}
                        className="hidden"
                      />
                      {profileImage && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={removeProfileImage}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>Basic employee details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="john.doe@company.com" className="pl-10" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="+1 (555) 123-4567" className="pl-10" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Date of Birth</FormLabel>
                          <Popover open={dateOfBirthOpen} onOpenChange={setDateOfBirthOpen}>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    placeholder="DD/MM/YYYY (e.g., 09/05/2007)"
                                    value={dateOfBirthInput || (field.value ? format(field.value, "dd/MM/yyyy") : "")}
                                    onChange={(e) => {
                                      const inputValue = e.target.value;
                                      
                                      // Format the input with auto-slash insertion
                                      const formatted = formatDateInput(inputValue);
                                      
                                      // Update local state for display
                                      setDateOfBirthInput(formatted);
                                      
                                      // Try to parse the date (DD/MM/YYYY format - Indian Standard)
                                      const parsedDate = parseIndianDate(formatted);
                                      
                                      if (parsedDate && !isNaN(parsedDate.getTime())) {
                                        const today = new Date();
                                        today.setHours(23, 59, 59, 999);
                                        const minDate = new Date("1900-01-01");
                                        
                                        if (parsedDate <= today && parsedDate >= minDate) {
                                          field.onChange(parsedDate);
                                        }
                                      } else if (formatted.length === 0) {
                                        field.onChange(undefined);
                                      }
                                    }}
                                    onBlur={() => {
                                      // Clear local input when field loses focus if date is valid
                                      if (field.value) {
                                        setDateOfBirthInput('');
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      // Allow backspace, delete, arrow keys, tab
                                      if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                                        return;
                                      }
                                      // Only allow digits
                                      if (!/^\d$/.test(e.key)) {
                                        e.preventDefault();
                                      }
                                    }}
                                    maxLength={10}
                                    className="pr-10"
                                  />
                                  <PopoverTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        setDateOfBirthOpen(true);
                                      }}
                                    >
                                      <CalendarIcon className="h-4 w-4 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                </div>
                              </FormControl>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={(date) => {
                                    field.onChange(date);
                                    setDateOfBirthInput(''); // Clear local input, will show formatted date from field.value
                                    setDateOfBirthOpen(false);
                                  }}
                                  disabled={(date) =>
                                    date > new Date() || date < new Date("1900-01-01")
                                  }
                                  initialFocus
                                  className={cn("p-3 pointer-events-auto")}
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                            <p className="text-xs text-muted-foreground">Enter date as DD/MM/YYYY (e.g., 09/05/2007) or click calendar icon</p>
                          </FormItem>
                        )}
                    />
                    <FormField
                      control={form.control}
                      name="nationality"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Nationality</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select nationality" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="z-50 bg-popover">
                              <SelectItem value="Indian">Indian</SelectItem>
                              <SelectItem value="American">American</SelectItem>
                              <SelectItem value="British">British</SelectItem>
                              <SelectItem value="Canadian">Canadian</SelectItem>
                              <SelectItem value="Australian">Australian</SelectItem>
                              <SelectItem value="German">German</SelectItem>
                              <SelectItem value="French">French</SelectItem>
                              <SelectItem value="Japanese">Japanese</SelectItem>
                              <SelectItem value="Chinese">Chinese</SelectItem>
                              <SelectItem value="Brazilian">Brazilian</SelectItem>
                              <SelectItem value="Mexican">Mexican</SelectItem>
                              <SelectItem value="South African">South African</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="panCardNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PAN Card Number</FormLabel>
                          <FormControl>
                            <Input placeholder="ABCDE1234F" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="maritalStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marital Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="single">Single</SelectItem>
                              <SelectItem value="married">Married</SelectItem>
                              <SelectItem value="divorced">Divorced</SelectItem>
                              <SelectItem value="widowed">Widowed</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Textarea 
                              placeholder="123 Main St, City, State, ZIP" 
                              className="pl-10"
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Employment Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Employment Details
                  </CardTitle>
                  <CardDescription>Job role and organizational information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Created By Field - Read Only */}
                  <div className="p-3 bg-muted/50 rounded-lg border border-dashed">
                    <Label className="text-sm font-medium text-muted-foreground">Created By</Label>
                    <p className="text-sm font-semibold mt-1">
                      {profile?.full_name || user?.email || 'Current User'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      This employee record will be associated with your account
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="employeeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employee ID {generatedEmployeeId && <span className="text-muted-foreground text-xs">(Auto-generated: {generatedEmployeeId})</span>}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                placeholder={generatedEmployeeId || "EMP-0001"} 
                                {...field}
                                readOnly
                                className="bg-muted cursor-not-allowed"
                                title="Employee ID is automatically generated"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-1 top-1 h-7 px-2 text-xs"
                                onClick={async () => {
                                  try {
                                    const latestEmployees = await selectRecords('employee_details', {
                                      select: 'employee_id',
                                      orderBy: 'created_at DESC',
                                      limit: 1
                                    });
                                    
                                    let newId = 'EMP-0001';
                                    if (latestEmployees.length > 0 && latestEmployees[0].employee_id) {
                                      const match = latestEmployees[0].employee_id.match(/(\d+)$/);
                                      if (match) {
                                        const nextNum = parseInt(match[1]) + 1;
                                        newId = `EMP-${String(nextNum).padStart(4, '0')}`;
                                      }
                                    }
                                    setGeneratedEmployeeId(newId);
                                    form.setValue('employeeId', newId);
                                    toast({
                                      title: "Employee ID Regenerated",
                                      description: `New ID: ${newId}`,
                                    });
                                  } catch (error) {
                                    logError('Error regenerating ID:', error);
                                  }
                                }}
                              >
                                Regenerate
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-muted-foreground">Employee ID is automatically generated. Click "Regenerate" to get a new one.</p>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="position"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Position</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                placeholder="Software Developer" 
                                list="position-options"
                                {...field}
                              />
                              {positions.length > 0 && (
                                <datalist id="position-options">
                                  {positions.map((position) => (
                                    <option key={position} value={position} />
                                  ))}
                                </datalist>
                              )}
                            </div>
                          </FormControl>
                          {positions.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Start typing to see suggestions or enter a custom position
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loadingOptions}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={loadingOptions ? "Loading departments..." : "Select department"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {departments.length > 0 ? (
                                departments.map((dept) => (
                                  <SelectItem key={dept.id} value={dept.id}>
                                    {dept.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="__no_departments__" disabled>
                                  {loadingOptions ? "Loading..." : "No departments available"}
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>System Role</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loadingOptions}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={loadingOptions ? "Loading roles..." : "Select role"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {roles.length > 0 ? (
                                roles.map((role) => (
                                  <SelectItem key={role} value={role}>
                                    {role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="__no_roles__" disabled>
                                  {loadingOptions ? "Loading..." : "No roles available"}
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="salary"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Annual Salary</FormLabel>
                          <FormControl>
                            <Input placeholder="65000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="employmentType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employment Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loadingOptions}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={loadingOptions ? "Loading types..." : "Select type"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {employmentTypes.length > 0 ? (
                                employmentTypes.map((type) => (
                                  <SelectItem key={type} value={type}>
                                    {type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('-')}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="__no_employment_types__" disabled>
                                  {loadingOptions ? "Loading..." : "No employment types available"}
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="workLocation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Work Location</FormLabel>
                          <FormControl>
                            <Input placeholder="New York Office" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="supervisor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Supervisor ID (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter supervisor UUID (or leave empty)" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="hireDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Hire Date</FormLabel>
                        <Popover open={hireDateOpen} onOpenChange={setHireDateOpen}>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  placeholder="DD/MM/YYYY (e.g., 09/05/2007)"
                                  value={hireDateInput || (field.value ? format(field.value, "dd/MM/yyyy") : "")}
                                  onChange={(e) => {
                                    const inputValue = e.target.value;
                                    
                                    // Format the input with auto-slash insertion
                                    const formatted = formatDateInput(inputValue);
                                    
                                    // Update local state for display
                                    setHireDateInput(formatted);
                                    
                                    // Try to parse the date (DD/MM/YYYY format - Indian Standard)
                                    const parsedDate = parseIndianDate(formatted);
                                    
                                    if (parsedDate && !isNaN(parsedDate.getTime())) {
                                      const today = new Date();
                                      today.setHours(23, 59, 59, 999);
                                      const minDate = new Date("1900-01-01");
                                      
                                      if (parsedDate <= today && parsedDate >= minDate) {
                                        field.onChange(parsedDate);
                                      }
                                    } else if (formatted.length === 0) {
                                      field.onChange(undefined);
                                    }
                                  }}
                                  onBlur={() => {
                                    // Clear local input when field loses focus if date is valid
                                    if (field.value) {
                                      setHireDateInput('');
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    // Allow backspace, delete, arrow keys, tab
                                    if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                                      return;
                                    }
                                    // Only allow digits
                                    if (!/^\d$/.test(e.key)) {
                                      e.preventDefault();
                                    }
                                  }}
                                  maxLength={10}
                                  className="pr-10"
                                />
                                <PopoverTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setDateOfBirthOpen(true);
                                    }}
                                  >
                                    <CalendarIcon className="h-4 w-4 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                              </div>
                            </FormControl>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={(date) => {
                                  field.onChange(date);
                                  setHireDateInput(''); // Clear local input, will show formatted date from field.value
                                  setHireDateOpen(false);
                                }}
                                disabled={(date) =>
                                  date > new Date() || date < new Date("1900-01-01")
                                }
                                initialFocus
                                className={cn("p-3 pointer-events-auto")}
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                          <p className="text-xs text-muted-foreground">Enter date as DD/MM/YYYY (e.g., 09/05/2007) or click calendar icon</p>
                        </FormItem>
                      )}
                  />
                </CardContent>
              </Card>

              {/* Emergency Contact */}
              <Card>
                <CardHeader>
                  <CardTitle>Emergency Contact</CardTitle>
                  <CardDescription>Emergency contact information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="emergencyContactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Jane Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="emergencyContactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="+1 (555) 987-6543" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="emergencyContactRelationship"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Relationship</FormLabel>
                          <FormControl>
                            <Input placeholder="Spouse" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Document Upload Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Documents Upload
                  </CardTitle>
                  <CardDescription>Upload employee documents and files</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* ID Documents */}
                    <div className="space-y-2">
                      <Label>ID Documents</Label>
                      <Label htmlFor="id-docs" className="cursor-pointer">
                        <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors">
                          <div className="text-center">
                            <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm text-gray-600">Upload ID</p>
                          </div>
                        </div>
                      </Label>
                      <Input
                        id="id-docs"
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileUpload(e, 'id')}
                        className="hidden"
                      />
                    </div>

                    {/* Contracts */}
                    <div className="space-y-2">
                      <Label>Contracts</Label>
                      <Label htmlFor="contracts" className="cursor-pointer">
                        <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors">
                          <div className="text-center">
                            <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm text-gray-600">Upload Contracts</p>
                          </div>
                        </div>
                      </Label>
                      <Input
                        id="contracts"
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => handleFileUpload(e, 'contract')}
                        className="hidden"
                      />
                    </div>

                    {/* Certifications */}
                    <div className="space-y-2">
                      <Label>Certifications</Label>
                      <Label htmlFor="certifications" className="cursor-pointer">
                        <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors">
                          <div className="text-center">
                            <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm text-gray-600">Upload Certificates</p>
                          </div>
                        </div>
                      </Label>
                      <Input
                        id="certifications"
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileUpload(e, 'certification')}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {/* Uploaded Files List */}
                  {uploadedFiles.length > 0 && (
                    <div className="mt-6">
                      <Label className="text-sm font-medium">Uploaded Files</Label>
                      <div className="mt-2 space-y-2">
                        {uploadedFiles.map((file) => (
                          <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <FileText className="h-4 w-4 text-blue-500" />
                              <div>
                                <p className="text-sm font-medium">{file.name}</p>
                                <div className="flex items-center space-x-2 text-xs text-gray-500">
                                  <Badge variant="outline" className="text-xs">
                                    {file.category}
                                  </Badge>
                                  <span>{formatFileSize(file.size)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  // Preview functionality could be added here
                                }}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeFile(file.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Additional Notes</CardTitle>
                  <CardDescription>Any additional information about the employee</CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea 
                            placeholder="Add any additional notes or comments about the employee..."
                            className="min-h-[200px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating Employee...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Create Employee
                      </>
                    )}
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/users">Cancel</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default CreateEmployee;