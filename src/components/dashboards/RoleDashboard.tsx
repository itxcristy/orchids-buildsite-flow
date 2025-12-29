import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { 
  LogOut, User, Building, Users, Users2, Calculator, DollarSign, Calendar, Clock, 
  CalendarDays, Shield, Bell,
  Briefcase, FileText, Settings, BookOpen, BarChart3, ChartLine,
  CreditCard, Receipt, ClipboardList, FolderKanban, Building2,
  UserCog, Settings2, Monitor, UserPlus, FileCheck
} from 'lucide-react';
import ClockInOut from '@/components/ClockInOut';
import { AgencyCalendar } from '@/components/AgencyCalendar';
import { QuickActionsPanel } from '@/components/QuickActionsPanel';
import { PageContainer, StatsGrid, ContentGrid } from '@/components/layout';
import { getPagesForRole, type PageConfig } from '@/utils/rolePages';
import { getRoleDisplayName, type AppRole } from '@/utils/roleUtils';
import { db } from '@/lib/database';

// Icon mapping for dynamic icon rendering
const iconMap: Record<string, any> = {
  Monitor, BarChart3, Users, Users2, User, Building, Building2, Calculator,
  DollarSign, Calendar, Clock, CalendarDays, Shield: Monitor,
  Bell, Briefcase, FileText, Settings, BookOpen, ChartLine,
  CreditCard, Receipt, ClipboardList, FolderKanban, UserCog, Settings2,
  UserPlus, FileCheck
};

interface RoleDashboardProps {
  role: AppRole;
}

export function RoleDashboard({ role }: RoleDashboardProps) {
  const { user, profile, userRole, signOut } = useAuth();
  const [dashboardStats, setDashboardStats] = useState({
    activeProjects: 0,
    teamMembers: 0,
    monthlyRevenue: 0,
    pendingPayments: 0,
    pendingLeaveRequests: 0,
    pendingReimbursements: 0
  });
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const pages = getPagesForRole(role);

  // Fetch real dashboard data from database
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch projects count
        const { data: projects } = await db
          .from('projects')
          .select('*')
          .eq('status', 'in_progress');

        // Fetch team members count
        const { data: members } = await db
          .from('profiles')
          .select('*')
          .eq('is_active', true);

        // Fetch invoices for revenue calculation
        const { data: invoices } = await db
          .from('invoices')
          .select('*')
          .eq('status', 'paid');

        // Fetch pending payments
        const { data: pendingInvoices } = await db
          .from('invoices')
          .select('*')
          .eq('status', 'sent');

        // Fetch pending leave requests (for HR/Admin)
        const { data: leaveRequests } = await db
          .from('leave_requests')
          .select('*')
          .eq('status', 'pending');

        // Fetch pending reimbursements (for Finance/Admin)
        const { data: reimbursements } = await db
          .from('reimbursement_requests')
          .select('*')
          .eq('status', 'pending');

        // Fetch recent projects
        const { data: recentProjectsData } = await db
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(4);

        // Calculate totals
        const totalRevenue = (invoices || []).reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
        const totalPending = (pendingInvoices || []).reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

        setDashboardStats({
          activeProjects: (projects || []).length,
          teamMembers: (members || []).length,
          monthlyRevenue: totalRevenue,
          pendingPayments: (pendingInvoices || []).length,
          pendingLeaveRequests: (leaveRequests || []).length,
          pendingReimbursements: (reimbursements || []).length
        });

        setRecentProjects(recentProjectsData || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin': return <Shield className="h-5 w-5 text-purple-500" />;
      case 'ceo': return <Building className="h-5 w-5 text-blue-500" />;
      case 'cto': return <Monitor className="h-5 w-5 text-blue-500" />;
      case 'cfo': return <Calculator className="h-5 w-5 text-yellow-500" />;
      case 'coo': return <Building className="h-5 w-5 text-green-500" />;
      case 'admin': return <Building className="h-5 w-5 text-blue-500" />;
      case 'hr': return <Users className="h-5 w-5 text-green-500" />;
      case 'finance_manager': return <Calculator className="h-5 w-5 text-yellow-500" />;
      case 'employee': return <User className="h-5 w-5 text-gray-500" />;
      default: return <User className="h-5 w-5" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ceo': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cto': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'cfo': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'coo': return 'bg-green-100 text-green-800 border-green-200';
      case 'admin': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'hr': return 'bg-green-100 text-green-800 border-green-200';
      case 'finance_manager': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDashboardMessage = (role: string) => {
    const messages: Record<string, string> = {
      'super_admin': "Full system access. Manage all aspects of the platform including users, agencies, and system settings.",
      'ceo': "Strategic oversight dashboard. Monitor company performance, financial health, and key business metrics.",
      'cto': "Technology leadership dashboard. Track projects, team performance, and technical initiatives.",
      'cfo': "Financial oversight dashboard. Monitor revenue, expenses, payroll, and financial compliance.",
      'coo': "Operations management dashboard. Track attendance, projects, and operational efficiency.",
      'admin': "Administrative access to user management, projects, finance, and HR operations.",
      'hr': "Manage employee profiles, attendance, payroll processing, and HR operations.",
      'finance_manager': "Handle financial operations including payments, invoices, receipts, and financial reporting.",
      'employee': "View your projects, mark attendance, submit leave requests, and view your payroll information.",
      'project_manager': "Manage projects, tasks, timelines, and team resources effectively.",
      'sales_manager': "Track sales performance, manage client relationships, and monitor team productivity.",
      'marketing_manager': "Oversee marketing campaigns, track analytics, and manage client engagement.",
    };
    return messages[role] || "Welcome to the BuildFlow Management System.";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };


  // Determine which stats to show based on role
  const showFinancialStats = ['super_admin', 'ceo', 'cfo', 'finance_manager', 'admin'].includes(role);
  const showHRStats = ['super_admin', 'admin', 'hr', 'coo'].includes(role);
  const showProjectStats = !['employee', 'contractor', 'intern'].includes(role) || role === 'project_manager';

  return (
    <PageContainer>
      {/* User Welcome Header */}
      <div className="bg-primary/5 border rounded-lg p-6 mb-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* User Info */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary/20">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                {getInitials(profile?.full_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold">
                  Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}!
                </h2>
                {getRoleIcon(role)}
              </div>
              <p className="text-muted-foreground max-w-xl">
                {getDashboardMessage(role)}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className={getRoleBadgeColor(role)}>
                  {getRoleDisplayName(role)}
                </Badge>
                {profile?.department && (
                  <Badge variant="secondary">{profile.department}</Badge>
                )}
              </div>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/my-profile">
                <User className="h-4 w-4 mr-2" />
                My Profile
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/notifications">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
                {dashboardStats.pendingLeaveRequests > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs flex items-center justify-center">
                    {dashboardStats.pendingLeaveRequests}
                  </Badge>
                )}
              </Link>
            </Button>
            <Button variant="destructive" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Time Clock Section - Show for all users */}
      <div className="mb-6">
        <ClockInOut compact={true} />
      </div>

      {/* Quick Actions for Admin and HR */}
      {(role === 'admin' || role === 'hr' || role === 'super_admin') && (
        <div className="mb-6">
          <QuickActionsPanel />
        </div>
      )}

      {/* Quick Stats Cards */}
      <StatsGrid cols={4}>
        {showProjectStats && (
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <Building className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{dashboardStats.activeProjects}</div>
                  <p className="text-xs text-muted-foreground">Currently in progress</p>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {(showHRStats || role === 'department_head') && (
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{dashboardStats.teamMembers}</div>
                  <p className="text-xs text-muted-foreground">Active employees</p>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {showFinancialStats && (
          <>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{formatCurrency(dashboardStats.monthlyRevenue)}</div>
                    <p className="text-xs text-muted-foreground">From paid invoices</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
                <Calculator className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{dashboardStats.pendingPayments}</div>
                    <p className="text-xs text-muted-foreground">Awaiting payment</p>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {showHRStats && (
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Leave Requests</CardTitle>
              <CalendarDays className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{dashboardStats.pendingLeaveRequests}</div>
                  <p className="text-xs text-muted-foreground">Requires attention</p>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </StatsGrid>

      {/* Quick Links Section - Removed page cards, pages are now in sidebar */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks for your role</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {pages.filter(p => p.exists).slice(0, 8).map((page) => {
                const IconComponent = iconMap[page.icon] || User;
                return (
                  <Button key={page.path} asChild variant="outline" className="h-20 flex flex-col space-y-2">
                    <Link to={page.path}>
                      <IconComponent className="h-6 w-6" />
                      <span className="text-sm">{page.title}</span>
                    </Link>
                  </Button>
                );
              })}
            </div>
            <div className="mt-4 text-sm text-muted-foreground text-center">
              <p>All pages are available in the sidebar menu</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Widget - Show for roles that need it */}
      {(role === 'admin' || role === 'hr' || role === 'super_admin') && (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Calendar</CardTitle>
              <CardDescription>Upcoming events and holidays</CardDescription>
            </CardHeader>
            <CardContent>
              <AgencyCalendar compact />
            </CardContent>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
