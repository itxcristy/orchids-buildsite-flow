import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { db } from '@/lib/database';
import { ArrowLeft, User, Shield, Key, Mail, Phone, Building } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { logError } from '@/utils/consoleLogger';
import { upsertRecord } from '@/services/api/postgresql-service';

interface Employee {
  id: string;
  user_id: string | null;
  full_name: string | null;
  phone: string | null;
  department: string | null;
  position: string | null;
  is_active: boolean;
  existingRoles?: UserRole[];
}

interface UserRole {
  role: string;
}

const AssignUserRoles = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [emailDomain, setEmailDomain] = useState<string>("@company.com");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchEmployees();
    fetchAgencySettings();
  }, []);

  const fetchAgencySettings = async () => {
    try {
      const { data: agencyData, error } = await db
        .from('agency_settings')
        .select('domain')
        .limit(1)
        .single();

      if (error && (error as any).code !== 'PGRST116') {
        logError('Error fetching agency settings:', error);
        return;
      }

      if (agencyData?.domain) {
        setEmailDomain(`@${agencyData.domain}`);
      }
    } catch (error) {
      console.error('Error fetching agency settings:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data: profilesData, error } = await db
        .from('profiles')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      // Fetch existing user roles for employees who already have user accounts
      const employeesWithUserIds = profilesData.filter(emp => emp.user_id);
      let existingRoles: { [key: string]: UserRole[] } = {};
      
      if (employeesWithUserIds.length > 0) {
        const { data: rolesData, error: rolesError } = await db
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', employeesWithUserIds.map(emp => emp.user_id));

        if (rolesError) throw rolesError;

        // Group roles by user_id
        rolesData?.forEach(role => {
          if (!existingRoles[role.user_id]) {
            existingRoles[role.user_id] = [];
          }
          existingRoles[role.user_id].push({ role: role.role });
        });
      }

      setEmployees(profilesData.map(emp => ({
        ...emp,
        existingRoles: emp.user_id ? existingRoles[emp.user_id] || [] : []
      })));
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast({
        title: "Error",
        description: "Failed to fetch employees",
        variant: "destructive",
      });
    }
  };

  const handleEmployeeSelection = (employeeId: string, checked: boolean) => {
    if (checked) {
      setSelectedEmployees([...selectedEmployees, employeeId]);
    } else {
      setSelectedEmployees(selectedEmployees.filter(id => id !== employeeId));
    }
  };

  const generateCredentials = () => {
    // Generate a random 8-character password
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleAssignRoles = async () => {
    if (selectedEmployees.length === 0) {
      toast({
        title: "Warning",
        description: "Please select at least one employee",
        variant: "destructive",
      });
      return;
    }

    if (!selectedRole) {
      toast({
        title: "Warning", 
        description: "Please select a role to assign",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);

    try {
      const selectedEmployeeData = employees.filter(emp => 
        selectedEmployees.includes(emp.id)
      );

      const results = [];

      for (const employee of selectedEmployeeData) {
        let userId = employee.user_id;
        let generatedCredentials = null;

        // If employee doesn't have a user account, create one
        if (!userId) {
          const email = employee.full_name 
            ? `${employee.full_name.toLowerCase().replace(/\s+/g, '.')}${emailDomain}`
            : `employee.${employee.id.substring(0, 8)}${emailDomain}`;
          
          const password = generateCredentials();

          // Call edge function to create user
          const { data: createUserData, error: createUserError } = await db.functions.invoke('create-user-account', {
            body: {
              email,
              password,
              full_name: employee.full_name,
              profile_id: employee.id
            }
          });

          if (createUserError) {
            console.error('Error creating user:', createUserError);
            results.push({
              employee: employee.full_name,
              success: false,
              error: createUserError.message
            });
            continue;
          }

          userId = createUserData.user.id;
          generatedCredentials = { email, password };

          // Update profile with user_id
          await db
            .from('profiles')
            .update({ user_id: userId })
            .eq('id', employee.id);
        }

        // Assign role using upsertRecord
        try {
          await upsertRecord('user_roles', {
            user_id: userId,
            role: selectedRole as "admin" | "hr" | "finance_manager" | "employee",
          }, 'user_id');
          results.push({
            employee: employee.full_name,
            success: true,
            credentials: generatedCredentials
          });
        } catch (roleError: any) {
          logError('Error assigning role:', roleError);
          results.push({
            employee: employee.full_name,
            success: false,
            error: roleError.message
          });
        }
      }

      // Show results
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      if (successCount > 0) {
        const credentialsGenerated = results.filter(r => r.success && r.credentials);
        
        if (credentialsGenerated.length > 0) {
          // Show generated credentials
          const credentialsList = credentialsGenerated.map(r => 
            `${r.employee}: ${r.credentials.email} / ${r.credentials.password}`
          ).join('\n');

          toast({
            title: "Success!",
            description: `Assigned roles and generated credentials for ${successCount} employees. Save these credentials:\n\n${credentialsList}`,
          });
        } else {
          toast({
            title: "Success!",
            description: `Successfully assigned roles to ${successCount} employees`,
          });
        }
      }

      if (failureCount > 0) {
        toast({
          title: "Partial Success",
          description: `${failureCount} assignments failed. Check console for details.`,
          variant: "destructive",
        });
      }

      // Refresh data
      await fetchEmployees();
      setSelectedEmployees([]);
      setSelectedRole("");

    } catch (error) {
      console.error('Error in role assignment:', error);
      toast({
        title: "Error",
        description: "Failed to assign roles",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'hr': return 'default';
      case 'finance_manager': return 'secondary';
      case 'employee': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/users')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Users
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Assign User Roles</h1>
          <p className="text-muted-foreground">Create login accounts and assign roles to employees</p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Role Assignment Settings
            </CardTitle>
            <CardDescription>
              Configure role assignment and email settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role to Assign</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                    <SelectItem value="finance_manager">Finance Manager</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emailDomain">Email Domain (Auto-loaded from Agency Settings)</Label>
                <Input
                  id="emailDomain"
                  value={emailDomain}
                  onChange={(e) => setEmailDomain(e.target.value)}
                  placeholder="@company.com"
                  className="bg-muted/50"
                />
                <p className="text-xs text-muted-foreground">
                  Domain automatically loaded from agency settings. You can override if needed.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleAssignRoles}
                disabled={selectedEmployees.length === 0 || !selectedRole || generating}
              >
                <Key className="mr-2 h-4 w-4" />
                {generating ? "Processing..." : `Assign Role to ${selectedEmployees.length} Employee${selectedEmployees.length !== 1 ? 's' : ''}`}
              </Button>
              {selectedEmployees.length > 0 && (
                <Badge variant="outline">
                  {selectedEmployees.length} selected
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Employees List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Active Employees
            </CardTitle>
            <CardDescription>
              Select employees to assign roles. Employees without login accounts will have credentials generated.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {employees.map((employee) => (
                <div 
                  key={employee.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50"
                >
                  <div className="flex items-center space-x-4">
                    <Checkbox
                      checked={selectedEmployees.includes(employee.id)}
                      onCheckedChange={(checked) => 
                        handleEmployeeSelection(employee.id, checked as boolean)
                      }
                    />
                    <div className="flex-1">
                      <h3 className="font-medium">{employee.full_name || 'Unnamed Employee'}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        {employee.department && (
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            {employee.department}
                          </div>
                        )}
                        {employee.position && (
                          <span>{employee.position}</span>
                        )}
                        {employee.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {employee.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {employee.user_id ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-green-600">
                          Has Login
                        </Badge>
                        {employee.existingRoles?.map((role, index) => (
                          <Badge key={index} variant={getRoleColor(role.role)}>
                            {role.role.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <Badge variant="secondary">
                        <Key className="mr-1 h-3 w-3" />
                        Needs Login
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {employees.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No active employees found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AssignUserRoles;