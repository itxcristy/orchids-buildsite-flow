import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Search, Filter, Mail, Phone, Loader2, Edit, Trash2, Eye, Users, UserCheck, UserX, Briefcase } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { selectRecords, updateRecord } from '@/services/api/postgresql-service';
import type { AppRole } from "@/utils/roleUtils";

interface Employee {
  id: string;
  user_id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
  is_active: boolean;
  hire_date?: string;
  employment_type?: string;
  work_location?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  avatar_url?: string;
}

const Employees = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, userRole } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Employee>>({});

  const canManageEmployees =
    !!userRole &&
    (['super_admin', 'ceo', 'admin', 'hr', 'department_head', 'team_lead'] as AppRole[]).includes(
      userRole as AppRole
    );

  const fetchDepartments = async () => {
    try {
      const deptData = await selectRecords('departments', {
        select: 'id, name',
        filters: [
          { column: 'is_active', operator: 'eq', value: true }
        ],
        orderBy: 'name ASC'
      });
      setDepartments(deptData);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      
      // Fetch employee details
      const employeeData = await selectRecords('employee_details', {
        orderBy: 'created_at DESC'
      });

      // Fetch profiles for department, position, and avatar
      const profileData = await selectRecords('profiles', {
        select: 'user_id, full_name, phone, department, position, hire_date, avatar_url'
      });

      // Fetch users for email
      const userIds = employeeData.map((emp: any) => emp.user_id).filter(Boolean);
      let usersData: any[] = [];
      if (userIds.length > 0) {
        usersData = await selectRecords('users', {
          select: 'id, email',
          filters: [
            { column: 'id', operator: 'in', value: userIds }
          ]
        });
      }

      // Create maps for quick lookup
      const profileMap = new Map(profileData.map((p: any) => [p.user_id, p]));
      const userMap = new Map(usersData.map((u: any) => [u.id, u]));

      // Transform the data to match our interface
      const transformedEmployees: Employee[] = employeeData.map((emp: any) => {
        const profile = profileMap.get(emp.user_id);
        const user = userMap.get(emp.user_id);
        
        return {
          id: emp.id,
          user_id: emp.user_id,
          employee_id: emp.employee_id,
          first_name: emp.first_name,
          last_name: emp.last_name,
          email: user?.email || undefined,
          phone: profile?.phone || emp.phone || undefined,
          department: profile?.department || undefined,
          position: profile?.position || undefined,
          is_active: emp.is_active !== false,
          hire_date: profile?.hire_date || emp.hire_date || undefined,
          employment_type: emp.employment_type || 'full_time',
          work_location: emp.work_location || undefined,
          emergency_contact_name: emp.emergency_contact_name || undefined,
          emergency_contact_phone: emp.emergency_contact_phone || undefined,
          avatar_url: profile?.avatar_url || undefined,
        };
      });

      setEmployees(transformedEmployees);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch employees. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchEmployees();
  }, []);

  const filteredEmployees = employees.filter(employee => 
    `${employee.first_name} ${employee.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: employees.length,
    active: employees.filter(e => e.is_active).length,
    inactive: employees.filter(e => !e.is_active).length,
    fullTime: employees.filter(e => e.employment_type === 'full_time').length,
  };

  const handleViewEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowViewDialog(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    if (!canManageEmployees) {
      toast({
        title: "Permission denied",
        description: "You are not allowed to edit employees.",
        variant: "destructive",
      });
      return;
    }
    setSelectedEmployee(employee);
    setEditForm({
      first_name: employee.first_name,
      last_name: employee.last_name,
      phone: employee.phone,
      department: employee.department,
      position: employee.position,
      employment_type: employee.employment_type,
      work_location: employee.work_location,
      is_active: employee.is_active,
    });
    setShowEditDialog(true);
  };

  const handleDeleteEmployee = (employee: Employee) => {
    if (!canManageEmployees) {
      toast({
        title: "Permission denied",
        description: "You are not allowed to delete or deactivate employees.",
        variant: "destructive",
      });
      return;
    }
    setSelectedEmployee(employee);
    setShowDeleteDialog(true);
  };

  const handleSaveEmployee = async () => {
    if (!selectedEmployee || !user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to update employees",
        variant: "destructive",
      });
      return;
    }
    
    setSaving(true);
    try {
      // Update employee_details
      await updateRecord('employee_details', {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        work_location: editForm.work_location,
        employment_type: editForm.employment_type,
        is_active: editForm.is_active,
      }, { id: selectedEmployee.id }, user.id);

      // Update profile if it exists
      try {
        await updateRecord('profiles', {
          phone: editForm.phone,
          department: editForm.department,
          position: editForm.position,
        }, { user_id: selectedEmployee.user_id }, user.id);
      } catch (profileError) {
        // Profile might not exist, that's okay
        console.warn('Could not update profile:', profileError);
      }

      toast({
        title: "Success",
        description: "Employee updated successfully",
      });

      setShowEditDialog(false);
      fetchEmployees();
    } catch (error: any) {
      console.error('Error updating employee:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update employee",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'default' : 'destructive';
  };

  const getEmploymentTypeLabel = (type?: string) => {
    switch (type) {
      case 'full_time':
      case 'full-time':
        return 'Full Time';
      case 'part_time':
      case 'part-time':
        return 'Part Time';
      case 'contract': return 'Contract';
      case 'intern': return 'Intern';
      default: return type || 'Full Time';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Employees</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage employee information and records</p>
        </div>
        {canManageEmployees && (
          <Button onClick={() => navigate('/create-employee')} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600 flex-shrink-0" />
              <div className="ml-4 min-w-0">
                <p className="text-sm text-muted-foreground truncate">Total Employees</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-green-600 flex-shrink-0" />
              <div className="ml-4 min-w-0">
                <p className="text-sm text-muted-foreground truncate">Active</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <UserX className="h-8 w-8 text-red-600 flex-shrink-0" />
              <div className="ml-4 min-w-0">
                <p className="text-sm text-muted-foreground truncate">Inactive</p>
                <p className="text-2xl font-bold">{stats.inactive}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Briefcase className="h-8 w-8 text-purple-600 flex-shrink-0" />
              <div className="ml-4 min-w-0">
                <p className="text-sm text-muted-foreground truncate">Full Time</p>
                <p className="text-2xl font-bold">{stats.fullTime}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search employees..." 
                className="pl-10 w-full" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" className="w-full sm:w-auto">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2 text-muted-foreground">Loading employees...</span>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No employees found matching your search.' : 'No employees found.'}
              </p>
              {!searchTerm && (
                <Button className="mt-4" onClick={() => navigate('/create-employee')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Employee
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredEmployees.map((employee) => (
            <Card key={employee.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  {/* Left Section: Avatar and Employee Info */}
                  <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                    <Avatar className="h-12 w-12 sm:h-14 sm:w-14 border-2 border-primary/20 flex-shrink-0">
                      <AvatarImage 
                        src={employee.avatar_url && employee.avatar_url.startsWith('data:') 
                          ? employee.avatar_url 
                          : employee.avatar_url || undefined} 
                        alt={`${employee.first_name} ${employee.last_name}`} 
                      />
                      <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                        {employee.first_name.charAt(0)}{employee.last_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-semibold truncate">
                        {employee.first_name} {employee.last_name}
                      </h3>
                      <p className="text-sm sm:text-base text-muted-foreground truncate">
                        {employee.position || 'No position assigned'}
                      </p>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1 text-xs sm:text-sm text-muted-foreground">
                        {employee.email && (
                          <div className="flex items-center gap-1 truncate">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{employee.email}</span>
                          </div>
                        )}
                        {employee.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 flex-shrink-0" />
                            <span>{employee.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Section: Badges, Info, and Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    {/* Badges and Employee Info */}
                    <div className="flex flex-col sm:items-end gap-2">
                      <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end">
                        <Badge variant="outline" className="text-xs whitespace-nowrap">
                          {employee.department || 'No department'}
                        </Badge>
                        <Badge variant="secondary" className="text-xs whitespace-nowrap">
                          {getEmploymentTypeLabel(employee.employment_type)}
                        </Badge>
                        <Badge variant={getStatusColor(employee.is_active)} className="text-xs whitespace-nowrap">
                          {employee.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          ID: <span className="font-mono">{employee.employee_id}</span>
                        </p>
                        {employee.hire_date && (
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Joined: {new Date(employee.hire_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 justify-start sm:justify-end">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleViewEmployee(employee)}
                        className="flex-shrink-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEditEmployee(employee)}
                        className="flex-shrink-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDeleteEmployee(employee)}
                        className="flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View Employee Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
            <DialogDescription>Complete information about this employee</DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16 border-2 border-primary/20">
                  <AvatarImage 
                    src={selectedEmployee.avatar_url && selectedEmployee.avatar_url.startsWith('data:') 
                      ? selectedEmployee.avatar_url 
                      : selectedEmployee.avatar_url || undefined} 
                    alt={`${selectedEmployee.first_name} ${selectedEmployee.last_name}`} 
                  />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                    {selectedEmployee.first_name.charAt(0)}{selectedEmployee.last_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">
                    {selectedEmployee.first_name} {selectedEmployee.last_name}
                  </h3>
                  <p className="text-muted-foreground">{selectedEmployee.position || 'No position'}</p>
                  <Badge variant={getStatusColor(selectedEmployee.is_active)} className="mt-1">
                    {selectedEmployee.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Employee ID</p>
                  <p className="font-medium">{selectedEmployee.employee_id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedEmployee.email || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedEmployee.phone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p className="font-medium">{selectedEmployee.department || 'Not assigned'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Employment Type</p>
                  <p className="font-medium">{getEmploymentTypeLabel(selectedEmployee.employment_type)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Work Location</p>
                  <p className="font-medium">{selectedEmployee.work_location || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hire Date</p>
                  <p className="font-medium">
                    {selectedEmployee.hire_date 
                      ? new Date(selectedEmployee.hire_date).toLocaleDateString()
                      : 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Emergency Contact</p>
                  <p className="font-medium">
                    {selectedEmployee.emergency_contact_name || 'Not provided'}
                    {selectedEmployee.emergency_contact_phone && ` (${selectedEmployee.emergency_contact_phone})`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>Update employee information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={editForm.first_name || ''}
                  onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={editForm.last_name || ''}
                  onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={editForm.phone || ''}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  value={editForm.position || ''}
                  onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select
                  value={editForm.department || ''}
                  onValueChange={(value) => setEditForm({ ...editForm, department: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.length > 0 ? (
                      departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.name}>
                          {dept.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-dept" disabled>No departments available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="employment_type">Employment Type</Label>
                <Select
                  value={editForm.employment_type || 'full_time'}
                  onValueChange={(value) => setEditForm({ ...editForm, employment_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full Time</SelectItem>
                    <SelectItem value="part_time">Part Time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="intern">Intern</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="work_location">Work Location</Label>
              <Input
                id="work_location"
                value={editForm.work_location || ''}
                onChange={(e) => setEditForm({ ...editForm, work_location: e.target.value })}
                placeholder="e.g., New York, NY"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="is_active">Status</Label>
              <Select
                value={editForm.is_active ? 'active' : 'inactive'}
                onValueChange={(value) => setEditForm({ ...editForm, is_active: value === 'active' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEmployee} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onDeleted={() => {
          setShowDeleteDialog(false);
          fetchEmployees();
        }}
        itemType="Employee"
        itemName={selectedEmployee ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}` : ''}
        itemId={selectedEmployee?.id || ''}
        tableName="employee_details"
      />
    </div>
  );
};

export default Employees;
