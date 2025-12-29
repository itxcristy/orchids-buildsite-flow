// Application Constants - Centralized configuration
export const ROUTES = {
  HOME: '/',
  AUTH: '/auth',
  DASHBOARD: '/dashboard',
  EMPLOYEES: '/employees',
  CLIENTS: '/clients',
  PROJECTS: '/projects',
  ANALYTICS: '/analytics',
  SETTINGS: '/settings',
  MY_PROFILE: '/my-profile',
  MY_TEAM: '/my-team',
  MY_ATTENDANCE: '/my-attendance',
  MY_LEAVE: '/my-leave',
  INVOICES: '/invoices',
  PAYMENTS: '/payments',
  REIMBURSEMENTS: '/reimbursements'
} as const;

export const API_ENDPOINTS = {
  FUNCTIONS: {
    AI_PREDICTIONS: '/functions/v1/ai-predictions',
    DOCUMENT_PROCESSOR: '/functions/v1/ai-document-processor',
    SEND_EMAIL: '/functions/v1/send-welcome-email',
    GENERATE_REPORT: '/functions/v1/generate-report',
    CREATE_DEMO_USERS: '/functions/v1/create-demo-users',
    GENERATE_DEMO_DATA: '/functions/v1/generate-demo-data'
  }
} as const;

export const ERROR_TYPES = {
  NETWORK: 'network',
  AUTH: 'auth',
  PERMISSION: 'permission',
  VALIDATION: 'validation',
  UNKNOWN: 'unknown'
} as const;

export type ErrorType = typeof ERROR_TYPES[keyof typeof ERROR_TYPES];

export const STATUS_VALUES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  DRAFT: 'draft',
  PUBLISHED: 'published',
  COMPLETED: 'completed',
  IN_PROGRESS: 'in_progress',
  CANCELLED: 'cancelled'
} as const;

export const PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
} as const;

export const TIMEOUT_CONFIG = {
  DEFAULT_REQUEST: 30000, // 30 seconds
  AUTH_REQUEST: 10000, // 10 seconds
  FILE_UPLOAD: 120000, // 2 minutes
  RETRY_DELAY: 1000, // 1 second
  MAX_RETRIES: 3
} as const;

export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  INITIAL_DELAY: 1000,
  MAX_DELAY: 10000,
  BACKOFF_FACTOR: 2
} as const;

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  LARGE_PAGE_SIZE: 50
} as const;

export const VALIDATION_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_EMAIL_LENGTH: 255,
  MIN_PASSWORD_LENGTH: 8
} as const;

export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
} as const;

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_PREFERENCES: 'user_preferences',
  THEME: 'theme',
  LANGUAGE: 'language'
} as const;

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  CEO: 'ceo',
  CTO: 'cto',
  CFO: 'cfo',
  COO: 'coo',
  ADMIN: 'admin',
  OPERATIONS_MANAGER: 'operations_manager',
  DEPARTMENT_HEAD: 'department_head',
  TEAM_LEAD: 'team_lead',
  PROJECT_MANAGER: 'project_manager',
  HR: 'hr',
  FINANCE_MANAGER: 'finance_manager',
  SALES_MANAGER: 'sales_manager',
  MARKETING_MANAGER: 'marketing_manager',
  QUALITY_ASSURANCE: 'quality_assurance',
  IT_SUPPORT: 'it_support',
  LEGAL_COUNSEL: 'legal_counsel',
  BUSINESS_ANALYST: 'business_analyst',
  CUSTOMER_SUCCESS: 'customer_success',
  EMPLOYEE: 'employee',
  CONTRACTOR: 'contractor',
  INTERN: 'intern'
} as const;

export const MOCK_USERS = [
  { email: 'super@buildflow.com', password: 'super123', fullName: 'Super Administrator', role: ROLES.SUPER_ADMIN, userId: '00000000000000000000000000000000' },
  { email: 'admin@buildflow.com', password: 'admin123', fullName: 'System Administrator', role: ROLES.ADMIN, userId: '11111111111111111111111111111111' },
  { email: 'hr@buildflow.com', password: 'hr123', fullName: 'HR Manager', role: ROLES.HR, userId: '22222222222222222222222222222222' },
  { email: 'finance@buildflow.com', password: 'finance123', fullName: 'Finance Manager', role: ROLES.FINANCE_MANAGER, userId: '33333333333333333333333333333333' },
  { email: 'employee@buildflow.com', password: 'employee123', fullName: 'John Employee', role: ROLES.EMPLOYEE, userId: '44444444444444444444444444444444' },
  { email: 'ceo@buildflow.com', password: 'ceo123', fullName: 'Sarah Wilson', role: ROLES.CEO, userId: '55555555555555555555555555555555' },
  { email: 'cto@buildflow.com', password: 'cto123', fullName: 'Michael Chen', role: ROLES.CTO, userId: '66666666666666666666666666666666' },
  { email: 'cfo@buildflow.com', password: 'cfo123', fullName: 'Jennifer Davis', role: ROLES.CFO, userId: '77777777777777777777777777777777' },
  { email: 'pm@buildflow.com', password: 'pm123', fullName: 'David Rodriguez', role: ROLES.PROJECT_MANAGER, userId: '88888888888888888888888888888888' },
  { email: 'sales@buildflow.com', password: 'sales123', fullName: 'Lisa Johnson', role: ROLES.SALES_MANAGER, userId: '99999999999999999999999999999999' },
  { email: 'marketing@buildflow.com', password: 'marketing123', fullName: 'Alex Thompson', role: ROLES.MARKETING_MANAGER, userId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
  { email: 'ops@buildflow.com', password: 'ops123', fullName: 'Maria Garcia', role: ROLES.OPERATIONS_MANAGER, userId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' }
] as const;

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network connection error. Please check your internet connection.',
  UNAUTHORIZED: 'You are not authorized to access this resource.',
  FORBIDDEN: 'Access forbidden. Please contact your administrator.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_FAILED: 'Please check your input and try again.',
  SERVER_ERROR: 'An unexpected error occurred. Please try again later.',
  SESSION_EXPIRED: 'Your session has expired. Please sign in again.'
} as const;

export const SUCCESS_MESSAGES = {
  SAVE_SUCCESS: 'Changes saved successfully.',
  DELETE_SUCCESS: 'Item deleted successfully.',
  CREATE_SUCCESS: 'Item created successfully.',
  UPDATE_SUCCESS: 'Item updated successfully.',
  LOGIN_SUCCESS: 'Welcome back!',
  LOGOUT_SUCCESS: 'You have been signed out successfully.'
} as const;