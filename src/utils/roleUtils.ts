// Role utility functions for the comprehensive role system

export type AppRole = 'super_admin' | 'ceo' | 'cto' | 'cfo' | 'coo' | 'admin' | 'operations_manager' | 
  'department_head' | 'team_lead' | 'project_manager' | 'hr' | 'finance_manager' | 'sales_manager' |
  'marketing_manager' | 'quality_assurance' | 'it_support' | 'legal_counsel' | 'business_analyst' |
  'customer_success' | 'employee' | 'contractor' | 'intern';

export interface RoleMetadata {
  role: AppRole;
  displayName: string;
  description: string;
  permissions: string[];
  departmentRestricted: boolean;
  level: number;
}

// Role hierarchy levels (lower number = higher authority)
export const ROLE_HIERARCHY: Record<AppRole, number> = {
  super_admin: 1,
  ceo: 2,
  cto: 3,
  cfo: 4,
  coo: 5,
  admin: 6,
  operations_manager: 7,
  department_head: 8,
  team_lead: 9,
  project_manager: 10,
  hr: 11,
  finance_manager: 12,
  sales_manager: 13,
  marketing_manager: 14,
  quality_assurance: 15,
  it_support: 16,
  legal_counsel: 17,
  business_analyst: 18,
  customer_success: 19,
  employee: 20,
  contractor: 21,
  intern: 22,
};

// Role display names
export const ROLE_DISPLAY_NAMES: Record<AppRole, string> = {
  super_admin: 'Super Admin',
  ceo: 'Chief Executive Officer',
  cto: 'Chief Technology Officer',
  cfo: 'Chief Financial Officer',
  coo: 'Chief Operations Officer',
  admin: 'Administrator',
  operations_manager: 'Operations Manager',
  department_head: 'Department Head',
  team_lead: 'Team Lead',
  project_manager: 'Project Manager',
  hr: 'Human Resources',
  finance_manager: 'Finance Manager',
  sales_manager: 'Sales Manager',
  marketing_manager: 'Marketing Manager',
  quality_assurance: 'Quality Assurance',
  it_support: 'IT Support',
  legal_counsel: 'Legal Counsel',
  business_analyst: 'Business Analyst',
  customer_success: 'Customer Success',
  employee: 'Employee',
  contractor: 'Contractor',
  intern: 'Intern',
};

// Role categories for organization
export const ROLE_CATEGORIES = {
  executive: ['super_admin', 'ceo', 'cto', 'cfo', 'coo'] as AppRole[],
  management: ['admin', 'operations_manager', 'department_head', 'team_lead', 'project_manager'] as AppRole[],
  specialized: ['hr', 'finance_manager', 'sales_manager', 'marketing_manager', 'quality_assurance', 
               'it_support', 'legal_counsel', 'business_analyst', 'customer_success'] as AppRole[],
  general: ['employee', 'contractor', 'intern'] as AppRole[],
};

/**
 * Check if a role has higher authority than another role
 */
export function hasHigherRole(userRole: AppRole, comparedRole: AppRole): boolean {
  return ROLE_HIERARCHY[userRole] < ROLE_HIERARCHY[comparedRole];
}

/**
 * Check if a role has equal or higher authority than another role
 */
export function hasRoleOrHigher(userRole: AppRole, minimumRole: AppRole): boolean {
  return ROLE_HIERARCHY[userRole] <= ROLE_HIERARCHY[minimumRole];
}

/**
 * Get the display name for a role
 */
export function getRoleDisplayName(role: AppRole): string {
  return ROLE_DISPLAY_NAMES[role] || role;
}

/**
 * Get the category of a role
 */
export function getRoleCategory(role: AppRole): string {
  for (const [category, roles] of Object.entries(ROLE_CATEGORIES)) {
    if (roles.includes(role)) {
      return category;
    }
  }
  return 'unknown';
}

/**
 * Check if a role can manage another role (based on hierarchy)
 */
export function canManageRole(managerRole: AppRole, targetRole: AppRole): boolean {
  // Super admin can manage all roles
  if (managerRole === 'super_admin') return true;
  
  // Executive roles can manage management and below
  if (ROLE_CATEGORIES.executive.includes(managerRole) && 
      !ROLE_CATEGORIES.executive.includes(targetRole)) return true;
  
  // Management roles can manage specialized and general roles
  if (ROLE_CATEGORIES.management.includes(managerRole) && 
      (ROLE_CATEGORIES.specialized.includes(targetRole) || 
       ROLE_CATEGORIES.general.includes(targetRole))) return true;
  
  // Department heads and team leads can manage employees in their department
  if ((managerRole === 'department_head' || managerRole === 'team_lead') &&
      ROLE_CATEGORIES.general.includes(targetRole)) return true;
  
  return false;
}

/**
 * Get roles that a user can assign based on their current role
 */
export function getAssignableRoles(userRole: AppRole): AppRole[] {
  const allRoles = Object.keys(ROLE_HIERARCHY) as AppRole[];
  return allRoles.filter(role => canManageRole(userRole, role));
}

/**
 * Check if user has financial access (CFO, Finance Manager, Super Admin only)
 */
export function hasFinancialAccess(userRole: AppRole): boolean {
  return ['super_admin', 'cfo', 'finance_manager'].includes(userRole);
}

/**
 * Check if user can access employee data based on department restrictions
 */
export function canAccessEmployeeData(userRole: AppRole, userDepartment?: string, targetDepartment?: string): boolean {
  // Super admins, CEOs, CFOs, and HR can access all employee data
  if (['super_admin', 'ceo', 'cfo', 'hr'].includes(userRole)) {
    return true;
  }
  
  // Department heads can only access employees in their department
  if (userRole === 'department_head' && userDepartment && targetDepartment) {
    return userDepartment === targetDepartment;
  }
  
  return false;
}

/**
 * Check if user can manage user roles (CEO and Super Admin only)
 */
export function canManageUserRoles(userRole: AppRole): boolean {
  return ['super_admin', 'ceo'].includes(userRole);
}