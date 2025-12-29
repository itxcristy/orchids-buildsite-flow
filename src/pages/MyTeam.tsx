import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users2, Mail, Phone, MapPin, Calendar, Crown, Star, Shield, Loader2, UserPlus, Edit, Eye } from 'lucide-react';
import { getRoleDisplayName, ROLE_CATEGORIES } from '@/utils/roleUtils';
import { useEffect, useState } from 'react';
import { db } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';

interface TeamMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  department: string | null;
  position: string | null;
  hire_date: string | null;
  avatar_url: string | null;
  is_active: boolean;
  role: string;
  location?: string;
}

const getRoleIcon = (role: string) => {
  if (ROLE_CATEGORIES.executive.includes(role as any)) return Crown;
  if (ROLE_CATEGORIES.management.includes(role as any)) return Shield;
  return Star;
};

const getRoleBadgeVariant = (role: string) => {
  if (ROLE_CATEGORIES.executive.includes(role as any)) return 'default';
  if (ROLE_CATEGORIES.management.includes(role as any)) return 'secondary';
  return 'outline';
};

export default function MyTeam() {
  const { userRole, user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [showMemberDialog, setShowMemberDialog] = useState(false);
  
  useEffect(() => {
    fetchTeamMembers();
  }, [userRole, profile]);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      
      // Fetch profiles
      const { data: profilesData, error: profilesError } = await db
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .order('full_name');

      if (profilesError) throw profilesError;

      // Fetch user roles
      const { data: rolesData, error: rolesError } = await db
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Create role map
      const roleMap = new Map<string, string>();
      rolesData?.forEach((r: any) => {
        roleMap.set(r.user_id, r.role);
      });

      // Fetch employee details for location info
      const { data: employeeData } = await db
        .from('employee_details')
        .select('user_id, work_location');

      const locationMap = new Map<string, string>();
      employeeData?.forEach((e: any) => {
        if (e.work_location) {
          locationMap.set(e.user_id, e.work_location);
        }
      });

      // Transform profiles to team members
      let members: TeamMember[] = (profilesData || []).map((p: any) => ({
        id: p.id,
        user_id: p.user_id,
        full_name: p.full_name || 'Unknown User',
        email: `${(p.full_name || 'user').toLowerCase().replace(/\s+/g, '.')}@company.com`,
        phone: p.phone,
        department: p.department,
        position: p.position,
        hire_date: p.hire_date,
        avatar_url: p.avatar_url,
        is_active: p.is_active,
        role: roleMap.get(p.user_id) || 'employee',
        location: locationMap.get(p.user_id) || null,
      }));

      // Filter based on user role hierarchy
      if (userRole && !ROLE_CATEGORIES.executive.includes(userRole as any) && 
          !ROLE_CATEGORIES.management.includes(userRole as any)) {
        // Regular employees only see their department
        if (profile?.department) {
          members = members.filter(m => 
            m.department === profile.department || m.user_id === user?.id
          );
        } else {
          // If no department, show limited team
          members = members.slice(0, 5);
        }
      }

      setTeamMembers(members);
    } catch (error) {
      console.error('Error fetching team:', error);
      toast({
        title: 'Error',
        description: 'Failed to load team members',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getScopeDescription = (role: string) => {
    if (ROLE_CATEGORIES.executive.includes(role as any)) {
      return 'Organization-wide team overview';
    } else if (ROLE_CATEGORIES.management.includes(role as any)) {
      return 'Your direct reports and managed teams';
    } else {
      return 'Your project collaborators and teammates';
    }
  };

  const viewMemberProfile = (member: TeamMember) => {
    setSelectedMember(member);
    setShowMemberDialog(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2 text-muted-foreground">Loading team members...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users2 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Team</h1>
            <p className="text-muted-foreground">
              {getScopeDescription(userRole || 'employee')}
            </p>
          </div>
        </div>
        {(userRole === 'super_admin' || userRole === 'admin' || userRole === 'hr') && (
          <Button onClick={() => navigate('/create-employee')}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Team Member
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{teamMembers.length}</div>
            <p className="text-sm text-muted-foreground">Total Members</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {teamMembers.filter(m => ROLE_CATEGORIES.management.includes(m.role as any)).length}
            </div>
            <p className="text-sm text-muted-foreground">Managers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {new Set(teamMembers.map(m => m.department).filter(Boolean)).size}
            </div>
            <p className="text-sm text-muted-foreground">Departments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {teamMembers.filter(m => m.is_active).length}
            </div>
            <p className="text-sm text-muted-foreground">Active</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {teamMembers.map((member) => {
          const RoleIcon = getRoleIcon(member.role);
          
          return (
            <Card key={member.id} className="hover:shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-start space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {getInitials(member.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg leading-6 truncate">
                      {member.full_name}
                    </CardTitle>
                    <div className="flex items-center space-x-2 mt-1">
                      <RoleIcon className="h-4 w-4 text-muted-foreground" />
                      <Badge variant={getRoleBadgeVariant(member.role)} className="text-xs">
                        {getRoleDisplayName(member.role as any)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{member.email}</span>
                  </div>
                  
                  {member.phone && (
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{member.phone}</span>
                    </div>
                  )}
                  
                  {member.location && (
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{member.location}</span>
                    </div>
                  )}
                  
                  {member.hire_date && (
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Joined {new Date(member.hire_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {member.department || 'No Department'}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => viewMemberProfile(member)}>
                      <Eye className="h-4 w-4 mr-1" />
                      View Profile
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {teamMembers.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users2 className="h-12 w-12 text-muted-foreground mb-4" />
            <CardTitle className="text-xl mb-2">No team members found</CardTitle>
            <CardDescription>
              Your team information will appear here once team members are assigned.
            </CardDescription>
          </CardContent>
        </Card>
      )}

      {/* Member Detail Dialog */}
      <Dialog open={showMemberDialog} onOpenChange={setShowMemberDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Team Member Profile</DialogTitle>
            <DialogDescription>
              Detailed information about the team member
            </DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedMember.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xl">
                    {getInitials(selectedMember.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">{selectedMember.full_name}</h3>
                  <p className="text-muted-foreground">{selectedMember.position || 'No position'}</p>
                  <Badge variant={getRoleBadgeVariant(selectedMember.role)} className="mt-1">
                    {getRoleDisplayName(selectedMember.role as any)}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedMember.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedMember.phone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p className="font-medium">{selectedMember.department || 'Not assigned'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{selectedMember.location || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hire Date</p>
                  <p className="font-medium">
                    {selectedMember.hire_date 
                      ? new Date(selectedMember.hire_date).toLocaleDateString()
                      : 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={selectedMember.is_active ? 'default' : 'destructive'}>
                    {selectedMember.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
