import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { generateUUID } from '@/lib/uuid';
import { Loader2, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import bcrypt from '@/lib/bcrypt';
import { selectRecords, insertRecord, updateRecord, selectOne } from '@/services/api/postgresql-service';
import { getAgencyId } from '@/utils/agencyUtils';
import { getDepartmentsForSelectionAuto } from '@/services/api/department-selector-service';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  position?: string;
  department?: string;
  phone?: string;
  hire_date?: string;
}

interface UserFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User | null;
  onUserSaved: () => void;
}

interface CreatedUserCredentials {
  email: string;
  temporaryPassword: string;
  userRole: string;
}

// Generate a secure temporary password
const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const UserFormDialog = ({ isOpen, onClose, user, onUserSaved }: UserFormDialogProps) => {
  const { toast } = useToast();
  const { user: currentUser, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [createdUser, setCreatedUser] = useState<CreatedUserCredentials | null>(null);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    position: '',
    department: '',
    phone: '',
    hire_date: '',
    is_active: true
  });

  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    // Fetch departments when dialog opens
    const fetchDepartments = async () => {
      try {
        if (!currentUser?.id) {
          setDepartments([]);
          return;
        }
        
        // Use standardized department fetching service
        const departmentsData = await getDepartmentsForSelectionAuto(profile, currentUser.id);
        
        // Transform to component format (using name as value since profiles.department is a string)
        setDepartments(departmentsData.map(d => ({
          id: d.id,
          name: d.name
        })));
      } catch (error: any) {
        console.error('Error fetching departments:', error);
        setDepartments([]);
      }
    };
    
    fetchDepartments();
    
    if (user) {
      // Fetch current user status from database
      const fetchUserStatus = async () => {
        try {
          const userData = await selectRecords('users', {
            filters: [{ column: 'id', operator: 'eq', value: user.id }],
            limit: 1
          });
          const profileData = await selectRecords('profiles', {
            filters: [{ column: 'user_id', operator: 'eq', value: user.id }],
            limit: 1
          });
          
          const userIsActive = userData?.[0]?.is_active ?? true;
          const profileIsActive = profileData?.[0]?.is_active ?? true;
          const isActive = userIsActive && profileIsActive;
          
          setFormData({
            name: user.name || '',
            email: user.email || '',
            role: user.role || '',
            position: user.position || '',
            department: user.department || '',
            phone: user.phone || '',
            hire_date: user.hire_date || '',
            is_active: isActive
          });
        } catch (error) {
          console.error('Error fetching user status:', error);
          setFormData({
            name: user.name || '',
            email: user.email || '',
            role: user.role || '',
            position: user.position || '',
            department: user.department || '',
            phone: user.phone || '',
            hire_date: user.hire_date || '',
            is_active: true
          });
        }
      };
      
      fetchUserStatus();
    } else {
      setFormData({
        name: '',
        email: '',
        role: '',
        position: '',
        department: '',
        phone: '',
        hire_date: '',
        is_active: true
      });
    }
    setPasswordData({
      newPassword: '',
      confirmPassword: ''
    });
    setCreatedUser(null);
    setShowCredentials(false);
  }, [user, isOpen]);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast({
        title: "Copied!",
        description: `${field} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (user) {
        // Validate password if provided
        if (passwordData.newPassword) {
          if (passwordData.newPassword.length < 8) {
            throw new Error('Password must be at least 8 characters long');
          }
          if (passwordData.newPassword !== passwordData.confirmPassword) {
            throw new Error('Passwords do not match');
          }
        }

        // Update user profile using PostgreSQL service
        await updateRecord('profiles', {
          full_name: formData.name,
          phone: formData.phone || null,
          department: formData.department || null,
          position: formData.position || null,
          hire_date: formData.hire_date || null,
          is_active: formData.is_active
        }, { user_id: user.id }, currentUser?.id);
        
        // Update user is_active status
        await updateRecord('users', {
          is_active: formData.is_active
        }, { id: user.id }, currentUser?.id);

        // Update password if provided
        if (passwordData.newPassword) {
          const passwordHash = await bcrypt.hash(passwordData.newPassword, 10);
          await updateRecord('users', { password_hash: passwordHash }, { id: user.id }, currentUser?.id);
        }

        // Update user role - get the first role for this user and update it
        // If multiple roles exist, we update the first one
        const existingRoles = await selectRecords('user_roles', {
          select: 'id',
          filters: [{ column: 'user_id', operator: 'eq', value: user.id }],
          limit: 1
        });

        if (existingRoles && existingRoles.length > 0) {
          // Update existing role
          await updateRecord(
            'user_roles',
            { role: formData.role as any },
            { id: existingRoles[0].id },
            currentUser?.id
          );
        } else {
          // Insert new role if it doesn't exist
          const agencyId = await getAgencyId(profile, currentUser?.id);
          if (!agencyId) {
            throw new Error('Agency ID is required to assign a role');
          }
          await insertRecord('user_roles', {
            id: generateUUID(),
            user_id: user.id,
            role: formData.role as any,
            agency_id: agencyId
          }, currentUser?.id);
        }

        toast({
          title: "Success",
          description: passwordData.newPassword 
            ? "User updated successfully. Password has been changed."
            : "User updated successfully",
        });

        onUserSaved();
        onClose();
      } else {
        // Create new user
        const newUserId = generateUUID();
        const temporaryPassword = generatePassword();
        
        // Hash the password using bcrypt
        const passwordHash = await bcrypt.hash(temporaryPassword, 10);
        
        // Create user record
        await insertRecord('users', {
          id: newUserId,
          email: formData.email,
          password_hash: passwordHash,
          is_active: true,
          email_confirmed: true
        }, currentUser?.id);

        // Check if profile was created by trigger, otherwise create it
        const existingProfile = await selectOne('profiles', { user_id: newUserId });
        
        const agencyId = await getAgencyId(profile, currentUser?.id);
        if (!agencyId) {
          throw new Error('Agency ID is required to create a user');
        }

        const profileData = {
          full_name: formData.name,
          phone: formData.phone || null,
          department: formData.department || null,
          position: formData.position || null,
          hire_date: formData.hire_date || null,
          is_active: true,
          agency_id: agencyId
        };

        if (existingProfile) {
          // Update existing profile created by trigger
          await updateRecord('profiles', profileData, { user_id: newUserId }, currentUser?.id);
        } else {
          // Fallback: if trigger didn't create profile, insert it manually
          await insertRecord('profiles', {
            id: generateUUID(),
            user_id: newUserId,
            ...profileData,
          }, currentUser?.id);
        }

        // Assign role
        await insertRecord('user_roles', {
          id: generateUUID(),
          user_id: newUserId,
          role: formData.role || 'employee',
          agency_id: agencyId
        }, currentUser?.id);

        // Create minimal employee_details record so the user appears in unified employee views
        const nameParts = (formData.name || '').trim().split(/\s+/);
        const firstName = nameParts[0] || formData.name || 'User';
        const lastName = nameParts.slice(1).join(' ') || '';
        const employeeId = `EMP-${newUserId.substring(0, 8).toUpperCase()}`;

        await insertRecord('employee_details', {
          id: generateUUID(),
          user_id: newUserId,
          employee_id: employeeId,
          first_name: firstName,
          last_name: lastName,
          address: null,
          employment_type: 'full-time',
          work_location: null,
          emergency_contact_name: null,
          emergency_contact_phone: null,
          emergency_contact_relationship: null,
          skills: [],
          notes: null,
          is_active: true,
          agency_id: agencyId
        }, currentUser?.id);

        // Store the created user credentials to display
        setCreatedUser({
          email: formData.email,
          temporaryPassword: temporaryPassword,
          userRole: formData.role || 'employee'
        });

        setShowCredentials(true);

        toast({
          title: "Success",
          description: "User created successfully! Credentials are displayed below.",
        });

        onUserSaved();
      }
    } catch (error: any) {
      console.error('Error saving user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save user",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCreatedUser(null);
    setShowCredentials(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{user ? 'Edit User' : 'Create New User'}</DialogTitle>
          <DialogDescription>
            {user 
              ? 'Update user information and role assignment.'
              : 'Create a new user account. Login credentials will be auto-generated.'
            }
          </DialogDescription>
        </DialogHeader>

        {showCredentials && createdUser && (
          <Alert className="mb-4 border-green-200 bg-green-50">
            <AlertDescription>
              <div className="space-y-3">
                <p className="font-semibold text-green-800">
                  User created successfully! Here are the login credentials:
                </p>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-white rounded border">
                    <div>
                      <p className="text-sm font-medium">Email:</p>
                      <p className="text-sm">{createdUser.email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(createdUser.email, 'Email')}
                    >
                      {copiedField === 'Email' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-white rounded border">
                    <div className="flex-1">
                      <p className="text-sm font-medium">Temporary Password:</p>
                      <p className="text-sm font-mono">
                        {showPassword ? createdUser.temporaryPassword : '••••••••••••'}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(createdUser.temporaryPassword, 'Password')}
                      >
                        {copiedField === 'Password' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-white rounded border">
                    <div>
                      <p className="text-sm font-medium">Role:</p>
                      <p className="text-sm capitalize">{createdUser.userRole.replace('_', ' ')}</p>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-green-700">
                  ⚠️ <strong>Important:</strong> Save these credentials now - they won't be shown again!
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required={!user}
                disabled={loading || !!user}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
                disabled={loading}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="hr">Human Resources</SelectItem>
                  <SelectItem value="finance_manager">Finance Manager</SelectItem>
                  <SelectItem value="project_manager">Project Manager</SelectItem>
                  <SelectItem value="team_lead">Team Lead</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="contractor">Contractor</SelectItem>
                  <SelectItem value="intern">Intern</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                disabled={loading}
                placeholder="e.g., Senior Developer"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select
                value={formData.department}
                onValueChange={(value) => setFormData({ ...formData, department: value === '__none__' ? '' : value })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.name}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={loading}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hire_date">Hire Date</Label>
              <Input
                id="hire_date"
                type="date"
                value={formData.hire_date}
                onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                disabled={loading}
              />
            </div>
            {user && (
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.is_active ? 'active' : 'inactive'}
                  onValueChange={(value) => setFormData({ ...formData, is_active: value === 'active' })}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Trash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {user && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label className="text-base font-semibold">Change Password (Optional)</Label>
                <p className="text-sm text-muted-foreground">
                  Leave blank to keep current password. Admin can reset user password.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      disabled={loading}
                      placeholder="Min 8 characters"
                      minLength={8}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      disabled={loading}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      disabled={loading}
                      placeholder="Confirm new password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={loading}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              {showCredentials ? 'Close' : 'Cancel'}
            </Button>
            {!showCredentials && (
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {user ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  user ? 'Update User' : 'Create User'
                )}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UserFormDialog;
