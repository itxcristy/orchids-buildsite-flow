/**
 * Page Catalog Types
 * Type definitions for the dynamic page catalog system
 */

export interface PageCatalog {
  id: string;
  path: string;
  title: string;
  description?: string;
  icon?: string;
  category: PageCategory;
  base_cost: number;
  is_active: boolean;
  requires_approval: boolean;
  metadata?: Record<string, unknown>;
  assigned_agencies_count?: number;
  recommendation_rules_count?: number;
  created_at: string;
  updated_at: string;
}

export type PageCategory =
  | 'dashboard'
  | 'management'
  | 'finance'
  | 'hr'
  | 'projects'
  | 'reports'
  | 'personal'
  | 'settings'
  | 'system'
  | 'inventory'
  | 'procurement'
  | 'assets'
  | 'workflows'
  | 'automation';

export interface PageRecommendationRule {
  id: string;
  page_id: string;
  industry?: string[];
  company_size?: string[];
  primary_focus?: string[];
  business_goals?: string[];
  priority: number;
  is_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecommendedPage {
  id: string;
  path: string;
  title: string;
  description?: string;
  icon?: string;
  category: PageCategory;
  base_cost: number;
  requires_approval: boolean;
  metadata?: Record<string, unknown>;
  rules: PageRecommendationRule[];
  score: number;
  reasoning: string[];
}

export interface PageRecommendations {
  all: RecommendedPage[];
  categorized: {
    required: RecommendedPage[];
    recommended: RecommendedPage[];
    optional: RecommendedPage[];
  };
  summary: {
    total: number;
    required: number;
    recommended: number;
    optional: number;
  };
}

export interface AgencyPageAssignment {
  id: string;
  agency_id: string;
  page_id: string;
  path: string;
  title: string;
  description?: string;
  icon?: string;
  category: PageCategory;
  base_cost: number;
  cost_override?: number;
  final_cost: number;
  status: 'active' | 'pending_approval' | 'suspended';
  assigned_at: string;
  metadata?: Record<string, unknown>;
}

export interface AgencyPageRequest {
  id: string;
  agency_id: string;
  agency_name?: string;
  page_id: string;
  path: string;
  title: string;
  description?: string;
  base_cost: number;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  requested_by: string;
  requested_by_email?: string;
  reviewed_by?: string;
  reviewed_by_email?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PagePricingTier {
  id: string;
  page_id: string;
  tier_name: string;
  cost: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessGoal {
  id: string;
  label: string;
  description: string;
  icon?: string;
}

export const BUSINESS_GOALS: BusinessGoal[] = [
  {
    id: 'client_management',
    label: 'Manage Client Relationships',
    description: 'Track and manage client interactions, communications, and relationships',
    icon: 'Handshake'
  },
  {
    id: 'project_tracking',
    label: 'Track Projects and Deliverables',
    description: 'Monitor project progress, deadlines, and deliverables',
    icon: 'Briefcase'
  },
  {
    id: 'financial_planning',
    label: 'Financial Planning and Budgeting',
    description: 'Manage finances, budgets, and financial planning',
    icon: 'DollarSign'
  },
  {
    id: 'hr_management',
    label: 'HR and Employee Management',
    description: 'Manage employees, attendance, leave, and HR processes',
    icon: 'Users'
  },
  {
    id: 'inventory_control',
    label: 'Inventory and Stock Management',
    description: 'Track inventory levels, stock movements, and warehouse management',
    icon: 'Package'
  },
  {
    id: 'procurement',
    label: 'Procurement and Vendor Management',
    description: 'Manage purchases, vendors, and procurement processes',
    icon: 'ShoppingCart'
  },
  {
    id: 'asset_tracking',
    label: 'Fixed Asset Management',
    description: 'Track and manage fixed assets, depreciation, and maintenance',
    icon: 'Building2'
  },
  {
    id: 'compliance_reporting',
    label: 'Compliance and Reporting',
    description: 'Ensure regulatory compliance and generate required reports',
    icon: 'FileBarChart'
  },
  {
    id: 'workflow_automation',
    label: 'Workflow Automation',
    description: 'Automate business processes and workflows',
    icon: 'Zap'
  },
  {
    id: 'analytics_insights',
    label: 'Advanced Analytics',
    description: 'Get insights from data analytics and reporting',
    icon: 'BarChart3'
  }
];

