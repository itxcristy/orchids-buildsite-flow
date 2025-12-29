import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { logError } from '@/utils/consoleLogger';
import { 
  Building, 
  Users, 
  Calculator, 
  DollarSign, 
  User, 
  FileText, 
  Calendar,
  Settings,
  BarChart3,
  ClipboardList,
  Clock,
  UserCheck,
  CreditCard,
  Receipt,
  BookOpen,
  Building2,
  ChartLine,
  Briefcase,
  Users2,
  FileCheck,
  Monitor,
  FolderKanban,
  CalendarDays,
  UserCog,
  Settings2,
  UserPlus,
  TrendingUp,
  Bell,
  Package,
  ShoppingCart,
  Mail,
  Warehouse,
  ArrowRightLeft,
  Edit,
  Hash,
  PackageCheck,
  FileSearch,
  FolderTree,
  MapPin,
  Wrench,
  TrendingDown,
  Trash2,
  GitBranch,
  CheckCircle2,
  Zap,
  Plug,
  Download,
  Activity,
  Layers,
  ShoppingBag,
  FileBarChart,
  Boxes,
  Truck,
  Handshake,
  Target,
  Workflow,
  Network,
  Database,
  Server,
  Shield,
  Cog,
  Eye,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuthWithViewAs } from '@/hooks/useAuthWithViewAs';
import { getApiBaseUrl } from '@/config/api';
import { useIsMobile } from '@/hooks/use-mobile';
import { getPagesForRole, type PageConfig } from '@/utils/rolePages';
import { AppRole } from '@/utils/roleUtils';
import { useAgencySettings } from '@/hooks/useAgencySettings';
import { canAccessRouteSync } from '@/utils/routePermissions';
import { getAccessiblePagePaths } from '@/utils/agencyPageAccess';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Icon mapping from string names to icon components
const iconMap: Record<string, any> = {
  Monitor,
  BarChart3,
  Users,
  Users2,
  User,
  Building,
  Building2,
  Calculator,
  DollarSign,
  Calendar,
  Clock,
  TrendingUp,
  AlertCircle: Clock,
  CalendarDays,
  Shield,
  ChevronRight: Clock,
  Bell,
  Briefcase,
  FileText,
  Settings,
  BookOpen,
  ChartLine,
  CreditCard,
  Receipt,
  ClipboardList,
  FolderKanban,
  UserCog,
  Settings2,
  UserPlus,
  FileCheck,
  Package,
  ShoppingCart,
  Mail,
  Warehouse,
  ArrowRightLeft,
  Edit,
  Hash,
  PackageCheck,
  FileSearch,
  FolderTree,
  MapPin,
  Wrench,
  TrendingDown,
  Trash2,
  GitBranch,
  CheckCircle2,
  Zap,
  Plug,
  Download,
  Activity,
  Layers,
  ShoppingBag,
  FileBarChart,
  Boxes,
  Truck,
  Handshake,
  Target,
  Workflow,
  Network,
  Database,
  Server,
  Cog,
  Eye,
};

// Category configuration with icons and colors
const categoryConfig: Record<string, { label: string; icon: any; color: string; order: number }> = {
  dashboard: { label: 'Overview', icon: BarChart3, color: 'text-blue-600', order: 1 },
  system: { label: 'System', icon: Shield, color: 'text-purple-600', order: 2 },
  management: { label: 'Management', icon: Users, color: 'text-green-600', order: 3 },
  hr: { label: 'Human Resources', icon: UserCheck, color: 'text-pink-600', order: 4 },
  finance: { label: 'Finance', icon: DollarSign, color: 'text-yellow-600', order: 5 },
  projects: { label: 'Projects', icon: Briefcase, color: 'text-indigo-600', order: 6 },
  inventory: { label: 'Inventory', icon: Package, color: 'text-amber-600', order: 7 },
  procurement: { label: 'Procurement', icon: ShoppingCart, color: 'text-teal-600', order: 8 },
  assets: { label: 'Assets', icon: Building2, color: 'text-slate-600', order: 9 },
  workflows: { label: 'Workflows', icon: Workflow, color: 'text-violet-600', order: 10 },
  automation: { label: 'Automation', icon: Zap, color: 'text-rose-600', order: 11 },
  reports: { label: 'Reports & Analytics', icon: ChartLine, color: 'text-cyan-600', order: 12 },
  personal: { label: 'Personal', icon: User, color: 'text-orange-600', order: 13 },
};

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const auth = useAuthWithViewAs();
  const effectiveRole = auth.userRole;
  const loading = auth.loading;
  const profile = auth.profile;
  const { settings: agencySettings } = useAgencySettings();
  const location = useLocation();
  const currentPath = location.pathname;
  const isMobile = useIsMobile();
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);
  
  // Get accessible pages for agency (for non-super-admin users)
  // MUST be declared before any early returns to follow Rules of Hooks
  const [accessiblePagePaths, setAccessiblePagePaths] = useState<string[]>([]);
  const [pagesLoaded, setPagesLoaded] = useState(false);

  // Check setup status
  useEffect(() => {
    const checkSetup = async () => {
      try {
        const agencyDatabase = localStorage.getItem('agency_database');
        if (!agencyDatabase) {
          setSetupComplete(true);
          return;
        }

        const apiBaseUrl = getApiBaseUrl();
        
        const response = await fetch(`${apiBaseUrl}/api/agencies/check-setup?database=${encodeURIComponent(agencyDatabase)}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'X-Agency-Database': agencyDatabase || '',
          },
        });

        if (response.ok) {
          const result = await response.json();
          setSetupComplete(result.setupComplete || false);
        } else {
          setSetupComplete(true);
        }
      } catch (error) {
        logError('Error checking setup status:', error);
        setSetupComplete(true);
      }
    };

    if (!loading && effectiveRole) {
      checkSetup();
    }
  }, [loading, effectiveRole]);

  // Auto-collapse sidebar on mobile when navigating
  useEffect(() => {
    if (isMobile && setOpenMobile) {
      setOpenMobile(false);
    }
  }, [currentPath, isMobile, setOpenMobile]);

  // Load accessible pages for non-super-admin users
  useEffect(() => {
    if (effectiveRole && effectiveRole !== 'super_admin') {
      getAccessiblePagePaths().then(paths => {
        setAccessiblePagePaths(paths);
        setPagesLoaded(true);
      }).catch(() => {
        setAccessiblePagePaths([]);
        setPagesLoaded(true);
      });
    } else {
      setPagesLoaded(true);
      setAccessiblePagePaths([]); // Super admin has access to all
    }
  }, [effectiveRole]);

  // Don't show any navigation items if still loading or no role
  if (loading || !effectiveRole) {
    return (
      <Sidebar className="w-14" collapsible="icon">
        <SidebarContent className="flex flex-col">
          <SidebarHeader className="p-3 sm:p-4 border-b border-sidebar-border bg-sidebar-background">
            <div className="h-9 w-9 sm:h-10 sm:w-10 bg-primary rounded-lg flex items-center justify-center">
              <Building className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
            </div>
          </SidebarHeader>
        </SidebarContent>
      </Sidebar>
    );
  }

  // Get pages for the effective role from rolePages mapping
  const role = effectiveRole as AppRole;
  const rolePages = getPagesForRole(role);
  
  // Filter and organize pages by category
  const mainPages = rolePages
    .filter(page => {
      if (!page.exists) return false;
      if (page.category === 'settings') return false;
      
      // For non-super-admin, check if page is assigned to agency
      if (effectiveRole && effectiveRole !== 'super_admin') {
        if (!pagesLoaded) return false; // Wait for pages to load
        if (accessiblePagePaths.length === 0) return false; // No pages assigned
        const hasAccess = accessiblePagePaths.some(path => {
          // Exact match
          if (path === page.path) return true;
          // Parameterized route match
          const pathPattern = path.replace(/:[^/]+/g, '[^/]+');
          const regex = new RegExp(`^${pathPattern}$`);
          return regex.test(page.path);
        });
        if (!hasAccess) return false;
      }
      
      // Check role-based access
      if (effectiveRole && !canAccessRouteSync(effectiveRole, page.path)) return false;
      return true;
    })
    .sort((a, b) => {
      const orderA = categoryConfig[a.category]?.order || 99;
      const orderB = categoryConfig[b.category]?.order || 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.title.localeCompare(b.title);
    });
  
  // Group pages by category
  const pagesByCategory = mainPages.reduce((acc, page) => {
    const category = page.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(page);
    return acc;
  }, {} as Record<string, PageConfig[]>);
  
  // Find settings page
  const settingsPage = rolePages.find(page => {
    if (page.path !== '/settings' || !page.exists) return false;
    
    // Check page assignment for non-super-admin
    if (effectiveRole && effectiveRole !== 'super_admin' && pagesLoaded) {
      const hasAccess = accessiblePagePaths.includes('/settings');
      if (!hasAccess) return false;
    }
    
    if (effectiveRole && !canAccessRouteSync(effectiveRole, '/settings')) return false;
    return true;
  });
  
  const collapsed = state === 'collapsed';

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return currentPath === '/dashboard';
    }
    return currentPath.startsWith(path);
  };

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    cn(
      "relative rounded-lg transition-all duration-200",
      isActive 
        ? "bg-primary/10 text-primary font-semibold border-l-2 border-primary shadow-sm" 
        : "hover:bg-muted/80 text-muted-foreground hover:text-foreground hover:translate-x-0.5"
    );

  const CategoryIcon = ({ category }: { category: string }) => {
    const config = categoryConfig[category];
    if (!config) return null;
    const Icon = config.icon;
    return <Icon className={cn("h-3.5 w-3.5 flex-shrink-0", config.color)} />;
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Sidebar
        className={cn(
          "border-r border-sidebar-border bg-sidebar-background transition-all duration-300",
          isMobile ? "w-full" : collapsed ? "w-20" : "w-72"
        )}
        collapsible={isMobile ? "offcanvas" : "icon"}
        variant={isMobile ? "floating" : "sidebar"}
        side="left"
      >
        <SidebarContent className="flex flex-col overflow-hidden">
          {/* Professional Header with Branding */}
          <SidebarHeader className={cn(
            "border-b border-sidebar-border bg-sidebar-background flex-shrink-0",
            collapsed && !isMobile ? "p-2 flex justify-center" : "p-3 sm:p-4"
          )}>
            <div className={cn(
              "flex items-center min-w-0",
              collapsed && !isMobile ? "justify-center w-full" : "gap-2 sm:gap-3"
            )}>
              {agencySettings?.logo_url ? (
                <div className="relative flex-shrink-0">
                  <img
                    src={agencySettings.logo_url}
                    alt={agencySettings.agency_name || 'Agency Logo'}
                    className={cn(
                      "rounded-lg object-contain bg-card border border-border",
                      collapsed && !isMobile ? "h-10 w-10" : "h-10 w-10 sm:h-12 sm:w-12"
                    )}
                  />
                </div>
              ) : (
                <img
                  src="/images/landing/logo.png"
                  alt="BuildFlow Logo"
                  className={cn(
                    "rounded-lg object-contain flex-shrink-0",
                    collapsed && !isMobile ? "h-10 w-10" : "h-10 w-10 sm:h-12 sm:w-12"
                  )}
                />
              )}
              {(!collapsed || isMobile) && (
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm sm:text-base font-bold text-foreground truncate">
                    {agencySettings?.agency_name || 'BuildFlow'}
                  </span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground font-medium truncate">
                    Enterprise ERP
                  </span>
                </div>
              )}
            </div>
          </SidebarHeader>
          
          {/* Main Navigation - Scrollable */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 sm:py-3 px-1" data-sidebar="content">
            {/* Setup Progress - Special Highlight */}
            {setupComplete === false && (
              <div className={cn(
                "mb-3 sm:mb-4",
                collapsed && !isMobile ? "px-0 flex justify-center" : "px-2 sm:px-3"
              )}>
                <NavLink 
                  to="/agency-setup-progress" 
                  className={({ isActive }) => cn(
                    "flex items-center rounded-lg transition-colors",
                    collapsed && !isMobile 
                      ? "justify-center px-0 py-2 w-full" 
                      : "gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-2.5",
                    "bg-warning-light border border-warning/30",
                    "hover:bg-warning-light/80",
                    isActive && "ring-2 ring-warning/30"
                  )}
                >
                  <div className="relative flex-shrink-0">
                    <TrendingUp className={cn(
                      "text-warning",
                      collapsed && !isMobile ? "h-5 w-5" : "h-3.5 w-3.5 sm:h-4 sm:w-4"
                    )} />
                    {!collapsed || isMobile ? (
                      <div className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 sm:h-2 sm:w-2 bg-warning rounded-full" />
                    ) : null}
                  </div>
                  {(!collapsed || isMobile) && (
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-semibold text-foreground truncate">Setup Progress</div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground truncate">Complete your setup</div>
                    </div>
                  )}
                </NavLink>
              </div>
            )}

            {/* Category-based Navigation Groups */}
            {Object.entries(pagesByCategory).map(([category, pages]) => {
              const config = categoryConfig[category];
              if (!config || pages.length === 0) return null;

              return (
                <SidebarGroup key={category} className={cn(
                  collapsed && !isMobile ? "px-0" : "px-1 sm:px-2",
                  "mb-2 sm:mb-3"
                )}>
                  {/* Only show category label when expanded */}
                  {(!collapsed || isMobile) && (
                    <SidebarGroupLabel className="px-2 sm:px-3 py-2 sm:py-2.5 mb-2 sm:mb-2.5">
                      <div className="flex items-center gap-2 sm:gap-2.5">
                        <CategoryIcon category={category} />
                        <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
                          {config.label}
                        </span>
                      </div>
                    </SidebarGroupLabel>
                  )}
                  <SidebarGroupContent className={cn(
                    collapsed && !isMobile && "flex items-center justify-center"
                  )}>
                    <SidebarMenu className={cn(
                      "space-y-1 sm:space-y-1.5",
                      collapsed && !isMobile && "space-y-1.5 w-full"
                    )}>
                      {pages.map((page) => {
                        const IconComponent = iconMap[page.icon] || User;
                        const active = isActive(page.path);
                        
                        return (
                          <Tooltip key={page.path} delayDuration={300}>
                            <TooltipTrigger asChild>
                              <SidebarMenuItem className={cn(
                                collapsed && !isMobile && "flex justify-center"
                              )}>
                                <SidebarMenuButton asChild className={cn(
                                  collapsed && !isMobile ? "w-auto justify-center" : "w-full"
                                )}>
                                  <NavLink 
                                    to={page.path} 
                                    end={page.path === '/'}
                                    className={({ isActive }) => getNavCls({ isActive: active || isActive })}
                                  >
                                    <div className={cn(
                                      "flex items-center min-w-0 transition-all duration-200",
                                      collapsed && !isMobile 
                                        ? "justify-center px-0 py-2.5 sm:py-3 w-full" 
                                        : "w-full gap-2.5 sm:gap-3 px-2.5 sm:px-3 py-2 sm:py-2.5",
                                      active && !collapsed && "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 sm:before:w-1 before:bg-primary before:rounded-r-full"
                                    )}>
                                      <IconComponent className={cn(
                                        "flex-shrink-0 transition-colors",
                                        collapsed && !isMobile 
                                          ? "h-5 w-5" 
                                          : "h-4 w-4 sm:h-4 sm:w-4",
                                        active ? "text-primary" : "text-muted-foreground"
                                      )} />
                                      {(!collapsed || isMobile) && (
                                        <span className="text-xs sm:text-sm font-medium flex-1 text-left truncate min-w-0">
                                          {page.title}
                                        </span>
                                      )}
                                      {active && (!collapsed || isMobile) && (
                                        <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-primary flex-shrink-0" />
                                      )}
                                    </div>
                                  </NavLink>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            </TooltipTrigger>
                            {collapsed && !isMobile && (
                              <TooltipContent side="right" className="ml-2">
                                <p className="font-medium">{page.title}</p>
                                {config && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{config.label}</p>
                                )}
                              </TooltipContent>
                            )}
                          </Tooltip>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              );
            })}
          </div>
          
          {/* Settings Footer */}
          {settingsPage && (
            <>
              <SidebarSeparator className={cn(
                collapsed && !isMobile ? "mx-2" : "mx-2 sm:mx-4"
              )} />
              <SidebarFooter className={cn(
                "flex-shrink-0",
                collapsed && !isMobile ? "p-2 flex justify-center" : "p-2"
              )}>
                <SidebarGroup className={cn(
                  collapsed && !isMobile && "w-full"
                )}>
                  <SidebarGroupContent className={cn(
                    collapsed && !isMobile && "flex justify-center"
                  )}>
                    <SidebarMenu className={cn(
                      collapsed && !isMobile && "w-full"
                    )}>
                      <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                          <SidebarMenuItem className={cn(
                            collapsed && !isMobile && "flex justify-center"
                          )}>
                            <SidebarMenuButton asChild className={cn(
                              collapsed && !isMobile ? "w-auto justify-center" : "w-full"
                            )}>
                              <NavLink 
                                to={settingsPage.path} 
                                className={({ isActive }) => getNavCls({ isActive })}
                              >
                                <div className={cn(
                                  "flex items-center",
                                  collapsed && !isMobile 
                                    ? "justify-center px-0 py-2.5 w-full" 
                                    : "w-full gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-2.5"
                                )}>
                                  <Settings className={cn(
                                    "flex-shrink-0",
                                    collapsed && !isMobile 
                                      ? "h-5 w-5" 
                                      : "h-3.5 w-3.5 sm:h-4 sm:w-4"
                                  )} />
                                  {(!collapsed || isMobile) && (
                                    <span className="text-xs sm:text-sm font-medium flex-1 text-left truncate">
                                      {settingsPage.title}
                                    </span>
                                  )}
                                </div>
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        </TooltipTrigger>
                        {collapsed && !isMobile && (
                          <TooltipContent side="right" className="ml-2">
                            <p className="font-medium">{settingsPage.title}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarFooter>
            </>
          )}

          {/* User Info Footer (when expanded) */}
          {(!collapsed || isMobile) && profile && (
            <>
              <SidebarSeparator className="mx-2 sm:mx-4" />
              <SidebarFooter className="p-2 sm:p-3 border-t border-sidebar-border bg-muted/50 flex-shrink-0">
                <div className="flex items-center gap-2 sm:gap-3 px-1 sm:px-2 min-w-0">
                  <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[10px] sm:text-xs font-semibold flex-shrink-0">
                    {(profile.full_name || 'U')
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] sm:text-xs font-semibold text-foreground truncate">
                      {profile.full_name || 'User'}
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-muted-foreground truncate">
                      {profile.position || effectiveRole || 'Member'}
                    </div>
                  </div>
                </div>
              </SidebarFooter>
            </>
          )}
        </SidebarContent>
      </Sidebar>
    </TooltipProvider>
  );
}


