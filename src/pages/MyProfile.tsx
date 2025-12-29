import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Save, Edit, Upload, User, Mail, Phone, MapPin, Calendar, Briefcase, Loader2, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { selectOne, updateRecord, insertRecord, rawQuery, upsertRecord } from '@/services/api/postgresql-service';
import { getAgencyId } from '@/utils/agencyUtils';
import type { AppRole } from '@/utils/roleUtils';
import { logError } from '@/utils/consoleLogger';

interface UserProfile {
  id: string;
  user_id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  department?: string;
  position?: string;
  address?: string;
  hire_date?: string;
  work_location?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  notes?: string;
  skills: string[];
  full_name?: string;
   avatar_url?: string;
  salary?: number; // This will only be visible to authorized users
  social_security_number?: string; // This will be masked for non-authorized users
}

interface AuditLogEntry {
  id: string;
  table_name: string;
  action: string;
  user_id: string | null;
  record_id: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  created_at: string;
  actor_email?: string | null;
  actor_name?: string | null;
}

const MyProfile = () => {
  const { user, userRole, profile: authProfile } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  const [history, setHistory] = useState<AuditLogEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const isRegularUser = !userRole || ['employee', 'contractor', 'intern'].includes(userRole as AppRole);
  const canEditStructural = !!userRole && !isRegularUser;

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      // Fetch employee details, profile, and salary information directly from PostgreSQL
      const [profileData, employeeData, salaryData] = await Promise.all([
        selectOne<any>('profiles', { user_id: user.id }),
        selectOne<any>('employee_details', { user_id: user.id }),
        selectOne<any>('employee_salary_details', { employee_id: user.id }),
      ]);
      
      // If we have profile data OR employee data, show the profile
      if (profileData || employeeData) {
        // Extract name from profile or employee_details
        let firstName = '';
        let lastName = '';
        let fullName = '';
        
        if (employeeData) {
          firstName = employeeData.first_name || '';
          lastName = employeeData.last_name || '';
          fullName = `${firstName} ${lastName}`.trim();
        } else if (profileData?.full_name) {
          fullName = profileData.full_name;
          const nameParts = fullName.split(' ');
          firstName = nameParts[0] || '';
          lastName = nameParts.slice(1).join(' ') || '';
        } else if (user?.email) {
          // Fallback to email username
          firstName = user.email.split('@')[0] || 'User';
          lastName = '';
          fullName = firstName;
        }

        // Generate employee_id if not present
        let employeeId = employeeData?.employee_id;
        if (!employeeId && user?.id) {
          // Generate a simple ID from user ID
          employeeId = `EMP-${user.id.substring(0, 8).toUpperCase()}`;
        }

        const transformedProfile: UserProfile = {
          id: employeeData?.id || profileData?.id || user.id,
          user_id: user.id,
          employee_id: employeeId || 'N/A',
          first_name: firstName,
          last_name: lastName,
          phone: profileData?.phone || '',
          department: profileData?.department || '',
          position: profileData?.position || '',
          address: employeeData?.address || '',
          hire_date: profileData?.hire_date || employeeData?.created_at || profileData?.created_at || new Date().toISOString(),
          work_location: employeeData?.work_location || '',
          emergency_contact_name: employeeData?.emergency_contact_name || '',
          emergency_contact_phone: employeeData?.emergency_contact_phone || '',
          emergency_contact_relationship: employeeData?.emergency_contact_relationship || '',
          notes: employeeData?.notes || '',
          skills: Array.isArray(employeeData?.skills) 
            ? employeeData.skills.map(skill => String(skill)) 
            : [],
          full_name: fullName || user.email || 'User',
          avatar_url: profileData?.avatar_url || '',
          salary: salaryData?.salary ?? salaryData?.base_salary ?? undefined,
          social_security_number: '***-**-****' // SSN is encrypted and masked for regular users
        };
        
        setProfile(transformedProfile);
        setFormData(transformedProfile);
      } else {
        // If no profile or employee data exists, create a minimal profile from user data
        const emailUsername = user.email?.split('@')[0] || 'User';
        const minimalProfile: UserProfile = {
          id: user.id,
          user_id: user.id,
          employee_id: `EMP-${user.id.substring(0, 8).toUpperCase()}`,
          first_name: emailUsername,
          last_name: '',
          phone: '',
          department: '',
          position: '',
          address: '',
          hire_date: new Date().toISOString(),
          work_location: '',
          emergency_contact_name: '',
          emergency_contact_phone: '',
          emergency_contact_relationship: '',
          notes: '',
          skills: [],
          full_name: user.email || 'User',
          avatar_url: '',
          salary: undefined,
          social_security_number: '***-**-****'
        };
        setProfile(minimalProfile);
        setFormData(minimalProfile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to fetch profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (!user) return;
    try {
      setHistoryLoading(true);
      const logs = await rawQuery<AuditLogEntry>(
        `
        SELECT al.*, u.email AS actor_email, p.full_name AS actor_name
        FROM public.audit_logs al
        LEFT JOIN public.users u ON u.id = al.user_id
        LEFT JOIN public.profiles p ON p.user_id = al.user_id
        WHERE al.record_id = $1
          AND al.table_name IN ('users','profiles','employee_details')
        ORDER BY al.created_at DESC
        LIMIT 50
        `,
        [user.id]
      );
      setHistory(logs);
    } catch (error) {
      console.error('Error fetching profile history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !profile) return;

    try {
      const fullName = `${formData.first_name || ''} ${formData.last_name || ''}`.trim() || user.email || 'User';
      const agencyId = await getAgencyId(authProfile, user.id);
      
      // Upsert profile (profiles table should always exist)
      try {
        await upsertRecord('profiles', {
          user_id: user.id,
          full_name: fullName,
          phone: formData.phone || null,
          department: canEditStructural ? (formData.department || null) : profile.department || null,
          position: canEditStructural ? (formData.position || null) : profile.position || null,
          is_active: true,
          agency_id: agencyId,
          updated_at: new Date().toISOString()
        }, 'user_id');
      } catch (profileError) {
        logError('Profile upsert error:', profileError);
        // Fallback: try another upsert with safe fields only
        try {
          await upsertRecord('profiles', {
            user_id: user.id,
            full_name: fullName,
            phone: formData.phone || null,
            department: canEditStructural ? (formData.department || null) : profile.department || null,
            position: canEditStructural ? (formData.position || null) : profile.position || null,
            is_active: true,
            agency_id: agencyId,
            updated_at: new Date().toISOString()
          }, 'user_id');
        } catch (updateError) {
          console.error('Profile update also failed:', updateError);
        }
      }

      // Try to upsert employee_details (optional - may not exist for all users)
      const employeeId = formData.employee_id || profile.employee_id || `EMP-${user.id.substring(0, 8).toUpperCase()}`;
      
      try {
        // Check if employee_details exists for this user
        const existingEmployee = await selectOne('employee_details', { user_id: user.id });
        
        const employeeData = {
          user_id: user.id,
          employee_id: employeeId,
          first_name: formData.first_name || '',
          last_name: formData.last_name || '',
          address: formData.address || null,
          work_location: formData.work_location || null,
          emergency_contact_name: formData.emergency_contact_name || null,
          emergency_contact_phone: formData.emergency_contact_phone || null,
          emergency_contact_relationship: formData.emergency_contact_relationship || null,
          notes: formData.notes || null,
          skills: formData.skills || [],
          is_active: true,
          agency_id: agencyId,
          updated_at: new Date().toISOString()
        };

        if (existingEmployee) {
          // Update existing record
          await updateRecord('employee_details', employeeData, { user_id: user.id });
        } else {
          // Insert new record
          await insertRecord('employee_details', employeeData);
        }
      } catch (employeeError) {
        console.warn('Employee details upsert failed (may require additional fields):', employeeError);
        // This is okay - employee_details is optional and may have required fields we don't have
      }

      // Update local state
      setProfile({ 
        ...profile, 
        ...formData,
        full_name: fullName,
        employee_id: employeeId
      });
      setIsEditing(false);
      
      // Refresh profile data
      await fetchProfile();
      await fetchHistory();
      
      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchProfile();
    fetchHistory();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2 text-muted-foreground">Loading profile...</span>
      </div>
    );
  }

  // Profile should always be set now (either from database or minimal from user)
  if (!profile) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2 text-muted-foreground">Loading profile...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="text-muted-foreground">Manage your personal information and preferences</p>
        </div>
        <Button onClick={() => setIsEditing(!isEditing)}>
          <Edit className="mr-2 h-4 w-4" />
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>Your basic profile information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input 
                    id="firstName" 
                    value={isEditing ? formData.first_name || '' : profile.first_name || ''}
                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                    disabled={!isEditing}
                    placeholder="Enter first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input 
                    id="lastName" 
                    value={isEditing ? formData.last_name || '' : profile.last_name || ''}
                    onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                    disabled={!isEditing}
                    placeholder="Enter last name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input 
                    id="department" 
                    value={isEditing ? formData.department || '' : profile.department || ''}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    disabled={!isEditing || !canEditStructural}
                    placeholder={canEditStructural ? "Enter department" : "Managed by HR/Admin"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Input 
                    id="position" 
                    value={isEditing ? formData.position || '' : profile.position || ''}
                    onChange={(e) => setFormData({...formData, position: e.target.value})}
                    disabled={!isEditing || !canEditStructural}
                    placeholder={canEditStructural ? "Enter position" : "Managed by HR/Admin"}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={user?.email || ''}
                  disabled 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input 
                  id="phone" 
                  value={isEditing ? formData.phone || '' : profile.phone || ''}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea 
                  id="address" 
                  value={isEditing ? formData.address || '' : profile.address || ''}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  disabled={!isEditing}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea 
                  id="notes" 
                  value={isEditing ? formData.notes || '' : profile.notes || ''}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  disabled={!isEditing}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Skills & Expertise</CardTitle>
              <CardDescription>Your professional skills and areas of expertise</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill, index) => (
                  <Badge key={index} variant="secondary">
                    {skill}
                  </Badge>
                ))}
                {profile.skills.length === 0 && (
                  <p className="text-muted-foreground text-sm">No skills added yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Emergency Contact</CardTitle>
              <CardDescription>Emergency contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergencyName">Contact Name</Label>
                  <Input 
                    id="emergencyName" 
                    value={isEditing ? formData.emergency_contact_name || '' : profile.emergency_contact_name || ''}
                    onChange={(e) => setFormData({...formData, emergency_contact_name: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyRelationship">Relationship</Label>
                  <Input 
                    id="emergencyRelationship" 
                    value={isEditing ? formData.emergency_contact_relationship || '' : profile.emergency_contact_relationship || ''}
                    onChange={(e) => setFormData({...formData, emergency_contact_relationship: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyPhone">Phone Number</Label>
                <Input 
                  id="emergencyPhone" 
                  value={isEditing ? formData.emergency_contact_phone || '' : profile.emergency_contact_phone || ''}
                  onChange={(e) => setFormData({...formData, emergency_contact_phone: e.target.value})}
                  disabled={!isEditing}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center mb-6 flex flex-col items-center">
                <Avatar className="h-24 w-24 border-2 border-primary/20 mb-4">
                  <AvatarImage
                    src={
                      profile.avatar_url && profile.avatar_url.startsWith('data:')
                        ? profile.avatar_url
                        : profile.avatar_url || undefined
                    }
                    alt={profile.full_name || `${profile.first_name} ${profile.last_name}` || user?.email || 'User'}
                  />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                    {(profile.first_name || profile.full_name || user?.email || 'U')
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-semibold">
                  {profile.full_name || `${profile.first_name} ${profile.last_name}`.trim() || user?.email || 'User'}
                </h2>
                <p className="text-muted-foreground">
                  {profile.position || profile.department || 'No position assigned'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    // Direct users to the Settings page where avatar upload is implemented
                    window.location.href = '/settings';
                  }}
                >
                  <Upload className="mr-1 h-3 w-3" />
                  Update Photo in Settings
                </Button>
              </div>
              <Separator />
              <div className="space-y-4 mt-6">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{user?.email}</span>
                </div>
                {profile.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{profile.phone}</span>
                  </div>
                )}
                {profile.work_location && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{profile.work_location}</span>
                  </div>
                )}
                {profile.department && (
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{profile.department}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Employment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Employee ID</p>
                <p className="font-medium">{profile.employee_id}</p>
              </div>
              {profile.hire_date && (
                <div>
                  <p className="text-sm text-muted-foreground">Joined</p>
                  <p className="font-medium">{new Date(profile.hire_date).toLocaleDateString()}</p>
                </div>
              )}
              {profile.department && (
                <div>
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p className="font-medium">{profile.department}</p>
                </div>
              )}
              {profile.position && (
                <div>
                  <p className="text-sm text-muted-foreground">Position</p>
                  <p className="font-medium">{profile.position}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                Change History
              </CardTitle>
              <CardDescription>
                Recent updates to your profile. This history is read-only.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {historyLoading && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading history...
                </div>
              )}
              {!historyLoading && history.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No recent changes recorded for this profile.
                </p>
              )}
              {!historyLoading && history.length > 0 && (
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {history.map((entry) => {
                    const actor =
                      entry.actor_name ||
                      entry.actor_email ||
                      'System';
                    const when = new Date(entry.created_at).toLocaleString();
                    const changedFields: string[] = [];
                    if (entry.old_values && entry.new_values) {
                      for (const key of Object.keys(entry.new_values)) {
                        const oldVal = (entry.old_values as any)[key];
                        const newVal = (entry.new_values as any)[key];
                        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                          changedFields.push(
                            `${key}: ${oldVal ?? '—'} → ${newVal ?? '—'}`
                          );
                        }
                      }
                    }
                    return (
                      <div
                        key={entry.id}
                        className="border rounded-md p-2 text-xs space-y-1"
                      >
                        <div className="flex justify-between">
                          <span className="font-medium">{actor}</span>
                          <span className="text-muted-foreground">
                            {when}
                          </span>
                        </div>
                        <div className="text-muted-foreground">
                          <span className="uppercase text-[10px] tracking-wide mr-2">
                            {entry.table_name}
                          </span>
                          <span className="uppercase text-[10px] tracking-wide">
                            {entry.action}
                          </span>
                        </div>
                        {changedFields.length > 0 && (
                          <ul className="list-disc list-inside space-y-0.5 mt-1">
                            {changedFields.map((c) => (
                              <li key={c}>{c}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {isEditing && (
        <div className="flex justify-end gap-4 mt-6">
          <Button variant="outline" onClick={() => {
            setIsEditing(false);
            setFormData(profile);
          }}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
};

export default MyProfile;