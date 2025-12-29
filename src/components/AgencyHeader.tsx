import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Search,
  User,
  Settings,
  LogOut,
  HelpCircle,
  Clock,
  Wifi,
  WifiOff,
  Calendar,
  FileText,
  Users,
  Briefcase,
  DollarSign,
  BarChart3,
  Shield,
  Home,
} from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';
import { useAgencySettings } from '@/hooks/useAgencySettings';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuShortcut,
} from '@/components/ui/dropdown-menu';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

// Route mapping for breadcrumbs
const routeMap: Record<string, { label: string; path: string }[]> = {
  '/dashboard': [{ label: 'Dashboard', path: '/dashboard' }],
  '/super-admin': [{ label: 'Super Admin', path: '/super-admin' }],
  '/employees': [{ label: 'Employees', path: '/employees' }],
  '/projects': [{ label: 'Projects', path: '/projects' }],
  '/attendance': [{ label: 'Attendance', path: '/attendance' }],
  '/payroll': [{ label: 'Payroll', path: '/payroll' }],
  '/settings': [{ label: 'Settings', path: '/settings' }],
  '/clients': [{ label: 'Clients', path: '/clients' }],
  '/crm': [{ label: 'CRM', path: '/crm' }],
  '/financial-management': [{ label: 'Financial Management', path: '/financial-management' }],
  '/reports': [{ label: 'Reports', path: '/reports' }],
  '/analytics': [{ label: 'Analytics', path: '/analytics' }],
  '/department-management': [{ label: 'Department Management', path: '/department-management' }],
  '/my-profile': [{ label: 'My Profile', path: '/my-profile' }],
  '/notifications': [{ label: 'Notifications', path: '/notifications' }],
  '/system-dashboard': [{ label: 'System Dashboard', path: '/system-dashboard' }],
};

// Search items for command palette
const searchItems = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: Home, shortcut: '⌘D' },
  { id: 'employees', label: 'Employees', path: '/employees', icon: Users, shortcut: '⌘E' },
  { id: 'projects', label: 'Projects', path: '/projects', icon: Briefcase, shortcut: '⌘P' },
  { id: 'attendance', label: 'Attendance', path: '/attendance', icon: Calendar, shortcut: '⌘A' },
  { id: 'payroll', label: 'Payroll', path: '/payroll', icon: DollarSign, shortcut: '⌘Y' },
  { id: 'clients', label: 'Clients', path: '/clients', icon: Users, shortcut: '⌘C' },
  { id: 'crm', label: 'CRM', path: '/crm', icon: Briefcase, shortcut: '⌘R' },
  { id: 'financial', label: 'Financial Management', path: '/financial-management', icon: DollarSign, shortcut: '⌘F' },
  { id: 'reports', label: 'Reports', path: '/reports', icon: FileText, shortcut: '⌘T' },
  { id: 'analytics', label: 'Analytics', path: '/analytics', icon: BarChart3, shortcut: '⌘N' },
  { id: 'settings', label: 'Settings', path: '/settings', icon: Settings, shortcut: '⌘S' },
  { id: 'profile', label: 'My Profile', path: '/my-profile', icon: User, shortcut: '⌘M' },
];

export const AgencyHeader = () => {
  const { settings: agencySettings, loading: agencyLoading } = useAgencySettings();
  const { user, profile, userRole, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Debug: Log image URLs when they change (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      if (agencySettings?.logo_url) {
        console.log('[AgencyHeader] Logo URL:', agencySettings.logo_url.substring(0, 100), 'Type:', typeof agencySettings.logo_url);
      }
      if (profile?.avatar_url) {
        console.log('[AgencyHeader] Avatar URL:', profile.avatar_url.substring(0, 100), 'Type:', typeof profile.avatar_url);
      }
    }
  }, [agencySettings?.logo_url, profile?.avatar_url]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [searchOpen, setSearchOpen] = useState(false);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Keyboard shortcut for search (Cmd/Ctrl + K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getBreadcrumbs = () => {
    const path = location.pathname;
    const crumbs: { label: string; path: string }[] = [];

    // Check if we have a mapped route
    if (routeMap[path]) {
      // If we're on dashboard, don't add duplicate Home entry
      if (path === '/dashboard') {
        return routeMap[path];
      }
      // For other routes, add Home as first crumb
      return [{ label: 'Home', path: '/dashboard' }, ...routeMap[path]];
    }

    // Otherwise, parse the path
    // Add Home as first crumb only if not already on dashboard
    if (path !== '/dashboard') {
      crumbs.push({ label: 'Home', path: '/dashboard' });
    }
    
    const segments = path.split('/').filter(Boolean);
    let currentPath = '';
    segments.forEach((segment) => {
      currentPath += `/${segment}`;
      // Skip if this would create a duplicate dashboard entry
      if (currentPath !== '/dashboard' || crumbs.length === 0) {
        const label = segment
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        crumbs.push({ label, path: currentPath });
      }
    });

    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();
  const userDisplayName = profile?.full_name || user?.email || 'User';
  const userInitials = userDisplayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'admin':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'hr':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'finance_manager':
      case 'cfo':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const getRoleLabel = (role: string | null) => {
    if (!role) return 'User';
    return role
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Get current page title for display
  const currentPageTitle = breadcrumbs[breadcrumbs.length - 1]?.label || 'Dashboard';
  
  // Get page icon based on route
  const getPageIcon = (path: string) => {
    const iconMap: Record<string, any> = {
      '/dashboard': Home,
      '/employees': Users,
      '/projects': Briefcase,
      '/attendance': Calendar,
      '/payroll': DollarSign,
      '/clients': Users,
      '/crm': Briefcase,
      '/financial-management': DollarSign,
      '/reports': FileText,
      '/analytics': BarChart3,
      '/settings': Settings,
      '/my-profile': User,
      '/system-dashboard': Shield,
    };
    return iconMap[path] || FileText;
  };

  const CurrentPageIcon = getPageIcon(location.pathname);

  // Mobile Layout: Clean, app-like header with clear hierarchy
  if (isMobile) {
    return (
      <TooltipProvider>
        <div className="flex flex-col w-full gap-2 min-w-0">
          {/* Top Row: Page Title + User Menu */}
          <div className="flex items-center justify-between gap-2 w-full min-w-0">
            {/* Page Title Section - Prominent on Mobile */}
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <CurrentPageIcon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <h1 className="text-base font-bold text-foreground truncate leading-tight">
                  {currentPageTitle}
                </h1>
                {/* Show breadcrumb on mobile if there's a parent */}
                {breadcrumbs.length > 1 && (
                  <Breadcrumb className="block">
                    <BreadcrumbList className="text-[10px]">
                      {breadcrumbs.slice(0, -1).slice(-1).map((crumb, index) => (
                        <BreadcrumbItem key={`${crumb.path}-${index}`} className="max-w-[120px] truncate">
                          <BreadcrumbLink asChild>
                            <Link
                              to={crumb.path}
                              className="text-muted-foreground hover:text-foreground truncate transition-colors"
                            >
                              {crumb.label}
                            </Link>
                          </BreadcrumbLink>
                        </BreadcrumbItem>
                      ))}
                    </BreadcrumbList>
                  </Breadcrumb>
                )}
              </div>
            </div>

            {/* User Menu - Right Side */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 flex-shrink-0">
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={
                        profile?.avatar_url && 
                        typeof profile.avatar_url === 'string' && 
                        profile.avatar_url.trim() !== ''
                          ? profile.avatar_url
                          : undefined
                      }
                      alt={userDisplayName}
                    />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={
                            profile?.avatar_url && 
                            typeof profile.avatar_url === 'string' && 
                            profile.avatar_url.trim() !== ''
                              ? profile.avatar_url
                              : undefined
                          }
                          alt={userDisplayName}
                        />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col flex-1 min-w-0">
                        <p className="text-sm font-medium leading-none truncate">
                          {userDisplayName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {user?.email}
                        </p>
                        {userRole && (
                          <Badge
                            variant="outline"
                            className={cn(
                              'mt-1.5 w-fit text-[10px] px-1.5 py-0',
                              getRoleBadgeColor(userRole)
                            )}
                          >
                            {getRoleLabel(userRole)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link to="/my-profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>My Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  {userRole && (userRole === 'admin' || userRole === 'super_admin') && (
                    <DropdownMenuItem asChild>
                      <Link to="/system-dashboard" className="cursor-pointer">
                        <Shield className="mr-2 h-4 w-4" />
                        <span>System Dashboard</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => {
                    window.open('https://docs.buildflow.com', '_blank');
                  }}
                >
                  <HelpCircle className="mr-2 h-4 w-4" />
                  <span>Help & Support</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Bottom Row: Essential Actions Only */}
          <div className="flex items-center justify-between gap-2 w-full">
            {/* Search Button - Full Width on Mobile */}
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9 justify-start text-muted-foreground"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-4 w-4 mr-2" />
              <span className="text-sm">Search...</span>
              <kbd className="ml-auto pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>

            {/* Notifications */}
            <div className="flex-shrink-0">
              <NotificationCenter />
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // Desktop Layout: Full-featured header
  return (
    <TooltipProvider>
      <div className="flex flex-row items-center justify-between w-full gap-3 lg:gap-4 min-w-0">
        {/* Left Section: Enhanced Breadcrumbs with Page Context */}
        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0 overflow-hidden">
          {/* Current Page Icon & Title */}
          <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-shrink-0">
            <div className="h-8 w-8 md:h-9 md:w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <CurrentPageIcon className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <h1 className="text-sm md:text-base font-bold text-foreground truncate leading-tight max-w-full">
                {currentPageTitle}
              </h1>
              <Breadcrumb className="block">
                <BreadcrumbList className="flex-wrap max-w-full text-xs">
                  {breadcrumbs.slice(0, -1).map((crumb, index) => (
                    <React.Fragment key={`${crumb.path}-${index}`}>
                      <BreadcrumbItem className="max-w-[100px] md:max-w-[150px] truncate">
                        <BreadcrumbLink asChild>
                          <Link
                            to={crumb.path}
                            className="text-muted-foreground hover:text-foreground truncate transition-colors"
                          >
                            {crumb.label}
                          </Link>
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                      {index < breadcrumbs.slice(0, -1).length - 1 && (
                        <BreadcrumbSeparator className="h-3 w-3" />
                      )}
                    </React.Fragment>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </div>
        </div>

        {/* Center Section: Agency Info (on larger screens) */}
        {agencySettings?.agency_name && (
          <div className="hidden xl:flex items-center gap-2 px-4 flex-shrink-0">
            {agencySettings?.logo_url && 
             typeof agencySettings.logo_url === 'string' && 
             agencySettings.logo_url.trim() !== '' && (
              <img
                src={agencySettings.logo_url}
                alt="Agency Logo"
                className="h-6 w-6 object-contain"
                style={{ display: 'block' }}
                onError={(e) => {
                  console.warn('Failed to load agency logo:', agencySettings.logo_url?.substring(0, 50));
                  const img = e.target as HTMLImageElement;
                  img.style.opacity = '0';
                }}
                onLoad={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.style.opacity = '1';
                  img.style.display = 'block';
                }}
              />
            )}
            <span className="text-sm font-semibold text-foreground whitespace-nowrap">
              {agencySettings.agency_name}
            </span>
          </div>
        )}

        {/* Right Section: Actions */}
        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0 flex-nowrap justify-end">
          {/* Global Search */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 flex-shrink-0"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="h-4 w-4" />
                <span className="sr-only">Search</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Search (⌘K)</p>
            </TooltipContent>
          </Tooltip>

          {/* Real-time Clock */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="hidden lg:flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50 text-xs flex-shrink-0">
                <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="font-mono font-medium leading-none">
                    {formatTime(currentTime)}
                  </span>
                  <span className="text-[10px] text-muted-foreground leading-none mt-0.5">
                    {formatDate(currentTime)}
                  </span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Current Date & Time</p>
            </TooltipContent>
          </Tooltip>

          {/* System Status */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 flex-shrink-0">
                {isOnline ? (
                  <Wifi className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                ) : (
                  <WifiOff className="h-3.5 w-3.5 text-red-600 flex-shrink-0" />
                )}
                <span className="text-xs font-medium whitespace-nowrap">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isOnline ? 'System is online' : 'System is offline'}</p>
            </TooltipContent>
          </Tooltip>

          {/* Notifications */}
          <div className="flex-shrink-0">
            <NotificationCenter />
          </div>

          {/* Help/Support */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 flex-shrink-0"
                onClick={() => {
                  window.open('https://docs.buildflow.com', '_blank');
                }}
              >
                <HelpCircle className="h-4 w-4" />
                <span className="sr-only">Help & Support</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Help & Support</p>
            </TooltipContent>
          </Tooltip>

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 flex-shrink-0">
                <Avatar className="h-9 w-9">
                  <AvatarImage
                    src={
                      profile?.avatar_url && 
                      typeof profile.avatar_url === 'string' && 
                      profile.avatar_url.trim() !== ''
                        ? profile.avatar_url
                        : undefined
                    }
                    alt={userDisplayName}
                  />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={
                          profile?.avatar_url && 
                          typeof profile.avatar_url === 'string' && 
                          profile.avatar_url.trim() !== ''
                            ? profile.avatar_url
                            : undefined
                        }
                        alt={userDisplayName}
                      />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col flex-1 min-w-0">
                      <p className="text-sm font-medium leading-none truncate">
                        {userDisplayName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {user?.email}
                      </p>
                      {userRole && (
                        <Badge
                          variant="outline"
                          className={cn(
                            'mt-1.5 w-fit text-[10px] px-1.5 py-0',
                            getRoleBadgeColor(userRole)
                          )}
                        >
                          {getRoleLabel(userRole)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link to="/my-profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>My Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                    <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
                  </Link>
                </DropdownMenuItem>
                {userRole && (userRole === 'admin' || userRole === 'super_admin') && (
                  <DropdownMenuItem asChild>
                    <Link to="/system-dashboard" className="cursor-pointer">
                      <Shield className="mr-2 h-4 w-4" />
                      <span>System Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => {
                  window.open('https://docs.buildflow.com', '_blank');
                }}
              >
                <HelpCircle className="mr-2 h-4 w-4" />
                <span>Help & Support</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
                <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Agency Logo/Name (on smaller screens, if not shown in center) */}
          {agencySettings?.agency_name && (
            <div className="hidden sm:flex xl:hidden items-center gap-2 ml-2 flex-shrink-0">
              {agencySettings?.logo_url && 
               typeof agencySettings.logo_url === 'string' && 
               agencySettings.logo_url.trim() !== '' && (
                <img
                  src={agencySettings.logo_url}
                  alt="Agency Logo"
                  className="h-6 w-6 object-contain"
                  style={{ display: 'block' }}
                  onError={(e) => {
                    console.warn('Failed to load agency logo:', agencySettings.logo_url?.substring(0, 50));
                    const img = e.target as HTMLImageElement;
                    img.style.opacity = '0';
                  }}
                  onLoad={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.style.opacity = '1';
                    img.style.display = 'block';
                  }}
                />
              )}
              <span className="text-xs font-semibold text-foreground whitespace-nowrap max-w-[100px] truncate">
                {agencySettings.agency_name}
              </span>
            </div>
          )}
        </div>

        {/* Command Palette (Search Dialog) */}
        <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
          <CommandInput placeholder="Type a command or search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Navigation">
              {searchItems.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.id}
                    onSelect={() => {
                      navigate(item.path);
                      setSearchOpen(false);
                    }}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <span>{item.label}</span>
                    {item.shortcut && (
                      <CommandShortcut>{item.shortcut}</CommandShortcut>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </CommandDialog>
      </div>
    </TooltipProvider>
  );
};
