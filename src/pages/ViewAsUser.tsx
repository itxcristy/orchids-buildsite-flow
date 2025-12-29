import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Eye, Loader2, UserCheck, FileText, Shield, ArrowRight } from 'lucide-react';
import { db } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';
import { useViewAsUser } from '@/contexts/ViewAsUserContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getPagesForRole } from '@/utils/rolePages';
import { AppRole } from '@/utils/roleUtils';
import { canAccessRouteSync } from '@/utils/routePermissions';

interface User {
  id: string;
  name: string;
  email: string;
  role: AppRole | string;
  status: string;
  userId: string;
  position?: string;
  department?: string;
  phone?: string;
  avatar_url?: string;
}

const ViewAsUser = () => {
  const { toast } = useToast();
  const { user, userRole, loading: authLoading } = useAuth();
  const { setViewingAs } = useViewAsUser();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userStats, setUserStats] = useState<{
    totalPages: number;
    accessiblePages: number;
    categories: Record<string, number>;
  } | null>(null);

  // Check if current user is admin or super_admin
  const isAuthorized = userRole ? (userRole === 'admin' || userRole === 'super_admin') : false;

  useEffect(() => {
    // Wait for userRole to be loaded
    if (!userRole) {
      return;
    }

    if (!isAuthorized) {
      toast({
        title: 'Access Denied',
        description: 'Only administrators can view as other users.',
        variant: 'destructive',
      });
      navigate('/dashboard');
      return;
    }
    fetchUsers();
  }, [userRole, isAuthorized, navigate, toast]);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Fetch profiles
      const { data: profilesData, error: profilesError } = await db
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch user roles
      const { data: rolesData, error: rolesError } = await db
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Fetch users for email
      const { data: usersData, error: usersError } = await db
        .from('users')
        .select('id, email');

      if (usersError) throw usersError;

      // Create maps for easy lookup
      const roleMap = new Map<string, string>();
      rolesData?.forEach((r: any) => {
        roleMap.set(r.user_id, r.role);
      });

      const emailMap = new Map<string, string>();
      usersData?.forEach((u: any) => {
        emailMap.set(u.id, u.email);
      });

      // Transform data
      const formattedUsers: User[] = (profilesData || []).map((profile: any) => ({
        id: profile.user_id,
        name: profile.full_name || 'Unknown User',
        email: emailMap.get(profile.user_id) || `${(profile.full_name || 'user').toLowerCase().replace(/\s+/g, '.')}@company.com`,
        role: roleMap.get(profile.user_id) || 'employee',
        status: profile.is_active ? 'active' : 'inactive',
        userId: profile.user_id,
        position: profile.position,
        department: profile.department,
        phone: profile.phone,
        avatar_url: profile.avatar_url,
      }));

      setUsers(formattedUsers);
    } catch (err: any) {
      console.error('Fetch users error:', err);
      toast({
        title: 'Error',
        description: 'Failed to fetch users. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    calculateUserStats(user);
  };

  const calculateUserStats = (user: User) => {
    const role = user.role as AppRole;
    const rolePages = getPagesForRole(role);
    
    // Filter accessible pages based on role permissions
    const accessiblePages = rolePages.filter((page) => {
      if (!page.exists) return false;
      return canAccessRouteSync(role, page.path);
    });

    // Count pages by category
    const categories: Record<string, number> = {};
    accessiblePages.forEach((page) => {
      const category = page.category || 'other';
      categories[category] = (categories[category] || 0) + 1;
    });

    setUserStats({
      totalPages: rolePages.length,
      accessiblePages: accessiblePages.length,
      categories,
    });
  };

  const handleViewAs = () => {
    if (!selectedUser) return;

    setViewingAs({
      id: selectedUser.id,
      name: selectedUser.name,
      email: selectedUser.email,
      role: selectedUser.role as AppRole,
      avatar_url: selectedUser.avatar_url,
    });

    toast({
      title: 'Viewing as User',
      description: `You are now viewing as ${selectedUser.name}. Navigate to see their dashboard.`,
    });

    navigate('/dashboard');
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin':
      case 'admin':
        return 'default';
      case 'hr':
      case 'finance_manager':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // Show loading while auth is loading or userRole is not yet available
  if (authLoading || !userRole) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2 text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2 text-muted-foreground">Loading users...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-2xl lg:text-3xl font-bold">View As User</h1>
        <p className="text-sm lg:text-base text-muted-foreground">
          Select a user to view their dashboard and see what pages they have access to
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Selection */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select User</CardTitle>
              <CardDescription>Choose a user to view as</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name, email, role, or department..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No users found matching your search.
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <Card
                      key={user.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedUser?.id === user.id
                          ? 'ring-2 ring-primary'
                          : ''
                      }`}
                      onClick={() => handleSelectUser(user)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={user.avatar_url} alt={user.name} />
                              <AvatarFallback>
                                {user.name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .toUpperCase()
                                  .slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-medium">{user.name}</h3>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize">
                              {user.role.replace('_', ' ')}
                            </Badge>
                            <Badge variant={user.status === 'active' ? 'default' : 'destructive'}>
                              {user.status}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Stats & Actions */}
        <div className="space-y-4">
          {selectedUser ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>User Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={selectedUser.avatar_url} alt={selectedUser.name} />
                      <AvatarFallback>
                        {selectedUser.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-lg">{selectedUser.name}</h3>
                      <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Role:</span>
                      <Badge variant={getRoleBadgeVariant(selectedUser.role)} className="capitalize">
                        {selectedUser.role.replace('_', ' ')}
                      </Badge>
                    </div>
                    {selectedUser.department && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Department:</span>
                        <span className="text-sm font-medium">{selectedUser.department}</span>
                      </div>
                    )}
                    {selectedUser.position && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Position:</span>
                        <span className="text-sm font-medium">{selectedUser.position}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <Badge variant={selectedUser.status === 'active' ? 'default' : 'destructive'}>
                        {selectedUser.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {userStats && (
                <Card>
                  <CardHeader>
                    <CardTitle>Access Statistics</CardTitle>
                    <CardDescription>Pages available to this user</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Total Pages</span>
                        </div>
                        <p className="text-2xl font-bold">{userStats.totalPages}</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Accessible</span>
                        </div>
                        <p className="text-2xl font-bold text-primary">{userStats.accessiblePages}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">By Category:</h4>
                      <div className="space-y-1">
                        {Object.entries(userStats.categories).map(([category, count]) => (
                          <div key={category} className="flex justify-between text-sm">
                            <span className="text-muted-foreground capitalize">{category}:</span>
                            <span className="font-medium">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button
                onClick={handleViewAs}
                className="w-full"
                size="lg"
                disabled={selectedUser.status !== 'active'}
              >
                <Eye className="h-4 w-4 mr-2" />
                View As {selectedUser.name.split(' ')[0]}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>

              {selectedUser.status !== 'active' && (
                <p className="text-sm text-muted-foreground text-center">
                  Cannot view as inactive users
                </p>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <UserCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  Select a user from the list to see their information and access statistics
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewAsUser;

