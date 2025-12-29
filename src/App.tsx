import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AuthProvider } from "@/hooks/useAuth";
import { ViewAsUserProvider } from "@/contexts/ViewAsUserContext";
import { AppSidebar } from "@/components/AppSidebar";
import { AgencyHeader } from "@/components/AgencyHeader";
import { AuthRedirect } from "@/components/AuthRedirect";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ViewAsUserBanner } from "@/components/ViewAsUserBanner";
// Note: Route permissions are now automatically checked by ProtectedRoute component
// using routePermissions.ts. The requiredRole prop is optional and can be omitted
// to use auto-detection from routePermissions.
import { TicketFloatingButton } from "@/components/TicketFloatingButton";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useAuth } from "@/hooks/useAuth";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import HoverReceiver from "./visual-edits/VisualEditsMessenger";
// Initialize console logger on app load
import "@/utils/consoleLogger";
import OnboardingWizard from "./components/onboarding/OnboardingWizard";

// Lazy load all page components for better code splitting
const Index = React.lazy(() => import("./pages/Index"));
const Landing = React.lazy(() => import("./pages/Landing"));
const Pricing = React.lazy(() => import("./pages/Pricing"));
const Auth = React.lazy(() => import("./pages/Auth"));
const SignupSuccess = React.lazy(() => import("./pages/SignupSuccess"));
const AgencyDashboard = React.lazy(() => import("./pages/AgencyDashboard"));
const AgencySetup = React.lazy(() => import("./pages/AgencySetup"));
const AgencySetupProgress = React.lazy(() => import("./pages/AgencySetupProgress"));
const SuperAdminDashboard = React.lazy(() => import("./pages/SuperAdminDashboard"));
const ForgotPassword = React.lazy(() => import("./pages/ForgotPassword"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const EmployeeManagement = React.lazy(() => import("./pages/EmployeeManagement"));
const Projects = React.lazy(() => import("./pages/Projects"));
const Settings = React.lazy(() => import("./pages/Settings"));
const Attendance = React.lazy(() => import("./pages/Attendance"));
const LeaveRequests = React.lazy(() => import("./pages/LeaveRequests"));
const Payroll = React.lazy(() => import("./pages/Payroll"));
const Invoices = React.lazy(() => import("./pages/Invoices"));
const Payments = React.lazy(() => import("./pages/Payments"));
const Receipts = React.lazy(() => import("./pages/Receipts"));
const MyProfile = React.lazy(() => import("./pages/MyProfile"));
const MyAttendance = React.lazy(() => import("./pages/MyAttendance"));
const MyLeave = React.lazy(() => import("./pages/MyLeave"));
const Ledger = React.lazy(() => import("./pages/Ledger"));
const CreateJournalEntry = React.lazy(() => import("./pages/CreateJournalEntry"));
const Clients = React.lazy(() => import("./pages/Clients"));
const CreateClient = React.lazy(() => import("./pages/CreateClient"));
const Reports = React.lazy(() => import("./pages/Reports"));
const Analytics = React.lazy(() => import("./pages/Analytics"));
const ProjectManagement = React.lazy(() => import("./pages/ProjectManagement"));
const ProjectDetails = React.lazy(() => import("./pages/ProjectDetails"));
const TaskDetails = React.lazy(() => import("./pages/TaskDetails"));
const DepartmentManagement = React.lazy(() => import("./pages/DepartmentManagement"));
const AIFeatures = React.lazy(() => import("./pages/AIFeatures"));
const CreateEmployee = React.lazy(() => import("./pages/CreateEmployee"));
const AssignUserRoles = React.lazy(() => import("./pages/AssignUserRoles"));
const JobCosting = React.lazy(() => import("./pages/JobCosting"));
const Quotations = React.lazy(() => import("./pages/Quotations"));
const QuotationForm = React.lazy(() => import("./pages/QuotationForm"));
const CRM = React.lazy(() => import("./pages/CRM"));
const LeadDetail = React.lazy(() => import("./pages/LeadDetail"));
const ActivityDetail = React.lazy(() => import("./pages/ActivityDetail"));
const FinancialManagement = React.lazy(() => import("./pages/FinancialManagement"));
const GstCompliance = React.lazy(() => import("./pages/GstCompliance"));
const EmployeeProjects = React.lazy(() => import("./pages/EmployeeProjects"));
const Reimbursements = React.lazy(() => import("./pages/Reimbursements").then(m => ({ default: m.Reimbursements })));
const SystemDashboard = React.lazy(() => import("./pages/SystemDashboard"));
const Calendar = React.lazy(() => import("./pages/Calendar"));
const HolidayManagement = React.lazy(() => import('./pages/HolidayManagement'));
const CentralizedReports = React.lazy(() => import("./pages/CentralizedReports"));
const Notifications = React.lazy(() => import("./pages/Notifications"));
const EmployeePerformance = React.lazy(() => import("./pages/EmployeePerformance"));
const SystemHealth = React.lazy(() => import("./pages/SystemHealth"));
const InventoryManagement = React.lazy(() => import("./pages/InventoryManagement"));
const InventoryProducts = React.lazy(() => import("./pages/InventoryProducts"));
const InventoryBOM = React.lazy(() => import("./pages/InventoryBOM"));
const InventorySerialBatch = React.lazy(() => import("./pages/InventorySerialBatch"));
const InventoryReports = React.lazy(() => import("./pages/InventoryReports"));
const InventorySettings = React.lazy(() => import("./pages/InventorySettings"));
const ReportingDashboard = React.lazy(() => import("./pages/ReportingDashboard"));
const CustomReports = React.lazy(() => import("./pages/CustomReports"));
const ScheduledReports = React.lazy(() => import("./pages/ScheduledReports"));
const ReportExports = React.lazy(() => import("./pages/ReportExports"));
const AnalyticsDashboard = React.lazy(() => import("./pages/AnalyticsDashboard"));
const AssetSettings = React.lazy(() => import("./pages/AssetSettings"));
const WorkflowSettings = React.lazy(() => import("./pages/WorkflowSettings"));
const IntegrationSettings = React.lazy(() => import("./pages/IntegrationSettings"));
const Workflows = React.lazy(() => import("./pages/Workflows"));
const WorkflowInstances = React.lazy(() => import("./pages/WorkflowInstances"));
const WorkflowBuilder = React.lazy(() => import("./pages/WorkflowBuilder"));
const WorkflowApprovals = React.lazy(() => import("./pages/WorkflowApprovals"));
const WorkflowAutomation = React.lazy(() => import("./pages/WorkflowAutomation"));
const Integrations = React.lazy(() => import("./pages/Integrations"));
const InventoryWarehouses = React.lazy(() => import("./pages/InventoryWarehouses"));
const InventoryStockLevels = React.lazy(() => import("./pages/InventoryStockLevels"));
const InventoryTransfers = React.lazy(() => import("./pages/InventoryTransfers"));
const InventoryAdjustments = React.lazy(() => import("./pages/InventoryAdjustments"));
const ProcurementManagement = React.lazy(() => import("./pages/ProcurementManagement"));
const ProcurementVendors = React.lazy(() => import("./pages/ProcurementVendors"));
const ProcurementPurchaseOrders = React.lazy(() => import("./pages/ProcurementPurchaseOrders"));
const ProcurementRequisitions = React.lazy(() => import("./pages/ProcurementRequisitions"));
const ProcurementGoodsReceipts = React.lazy(() => import("./pages/ProcurementGoodsReceipts"));
const ProcurementRFQ = React.lazy(() => import("./pages/ProcurementRFQ"));
const ProcurementVendorContracts = React.lazy(() => import("./pages/ProcurementVendorContracts"));
const ProcurementVendorPerformance = React.lazy(() => import("./pages/ProcurementVendorPerformance"));
const ProcurementReports = React.lazy(() => import("./pages/ProcurementReports"));
const ProcurementSettings = React.lazy(() => import("./pages/ProcurementSettings"));
const Assets = React.lazy(() => import("./pages/Assets"));
const AssetCategories = React.lazy(() => import("./pages/AssetCategories"));
const AssetLocations = React.lazy(() => import("./pages/AssetLocations"));
const AssetMaintenance = React.lazy(() => import("./pages/AssetMaintenance"));
const AssetDepreciation = React.lazy(() => import("./pages/AssetDepreciation"));
const AssetDisposals = React.lazy(() => import("./pages/AssetDisposals"));
const AssetReports = React.lazy(() => import("./pages/AssetReports"));
const EmailTesting = React.lazy(() => import("./pages/EmailTesting"));
const PageRequestCenter = React.lazy(() => import("./pages/PageRequestCenter"));

// Lazy load component modules
const RoleChangeRequests = React.lazy(() => import('./components/RoleChangeRequests').then(m => ({ default: m.RoleChangeRequests })));
const AdvancedPermissions = React.lazy(() => import('./components/AdvancedPermissions'));
const ViewAsUser = React.lazy(() => import('./pages/ViewAsUser'));
const AdvancedDashboard = React.lazy(() => import('./components/analytics/AdvancedDashboard').then(m => ({ default: m.AdvancedDashboard })));
const DocumentManager = React.lazy(() => import('./components/documents/DocumentManager').then(m => ({ default: m.DocumentManager })));
const MessageCenter = React.lazy(() => import('./components/communication/MessageCenter').then(m => ({ default: m.MessageCenter })));

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

// Suspense wrapper utility
const SuspenseRoute = ({ children }: { children: React.ReactNode }) => (
  <React.Suspense fallback={<LoadingFallback />}>
    {children}
  </React.Suspense>
);

const queryClient = new QueryClient();

const DashboardLayout = ({ children }: { children: React.ReactNode }) => (
  <SidebarProvider defaultOpen={false}>
      <AppSidebar />
    <SidebarInset className="flex flex-col min-w-0 overflow-hidden">
      <header className="sticky top-0 z-0 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="h-auto py-2.5 sm:py-3 md:py-3.5 px-3 sm:px-4 md:px-5 lg:px-6 flex items-start sm:items-center gap-2 sm:gap-3 overflow-hidden">
          <SidebarTrigger className="mt-0.5 sm:mt-0 mr-1 sm:mr-2 flex-shrink-0 h-9 w-9 sm:h-10 sm:w-10 md:h-9 md:w-9 rounded-lg hover:bg-muted transition-colors flex items-center justify-center" />
          <div className="flex-1 min-w-0">
            <AgencyHeader />
          </div>
        </div>
        </header>
        <div className="flex-1 p-3 sm:p-4 md:p-5 lg:p-6 overflow-auto">
          <ViewAsUserBanner />
          {children}
        </div>
    </SidebarInset>
  </SidebarProvider>
);

const AppContent = () => {
  const { user, loading } = useAuth();
  // Load and apply system settings (SEO, analytics, branding, etc.)
  useSystemSettings();
  
  return (
    <>
      <BrowserRouter>
        <ScrollToTop />
        <AuthRedirect />
        {!loading && user && <TicketFloatingButton />}
        <Routes>
              <Route path="/" element={<SuspenseRoute><Landing /></SuspenseRoute>} />
              <Route path="/pricing" element={<SuspenseRoute><Pricing /></SuspenseRoute>} />
              <Route path="/auth" element={<SuspenseRoute><Auth /></SuspenseRoute>} />
              <Route path="/agency-signup" element={<SuspenseRoute><OnboardingWizard /></SuspenseRoute>} />
              <Route path="/signup-success" element={<SuspenseRoute><SignupSuccess /></SuspenseRoute>} />
              <Route path="/forgot-password" element={<SuspenseRoute><ForgotPassword /></SuspenseRoute>} />
              
              <Route 
                path="/agency-setup" 
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><AgencySetup /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/agency-setup-progress" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <SuspenseRoute><AgencySetupProgress /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <SuspenseRoute><Index /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/employee-management" 
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><EmployeeManagement /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              {/* Redirect old routes to unified employee management */}
              <Route 
                path="/my-team" 
                element={<Navigate to="/employee-management" replace />} 
              />
              <Route 
                path="/users" 
                element={<Navigate to="/employee-management" replace />} 
              />
              <Route 
                path="/employees" 
                element={<Navigate to="/employee-management" replace />} 
              />
              
              <Route 
                path="/project-management" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <SuspenseRoute><ProjectManagement /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/projects/:id" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <SuspenseRoute><ProjectDetails /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/tasks/:id" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <SuspenseRoute><TaskDetails /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/projects" 
                element={
                  <ProtectedRoute requiredRole="admin">
                    <DashboardLayout>
                      <SuspenseRoute><Projects /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <SuspenseRoute><Settings /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/page-requests" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <SuspenseRoute><PageRequestCenter /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/attendance" 
                element={
                  <ProtectedRoute requiredRole={["hr", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><Attendance /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/leave-requests" 
                element={
                  <ProtectedRoute requiredRole="hr">
                    <DashboardLayout>
                      <SuspenseRoute><LeaveRequests /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/payroll" 
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin", "finance_manager", "cfo"]}>
                    <DashboardLayout>
                      <SuspenseRoute><Payroll /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/invoices" 
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin", "finance_manager", "cfo"]}>
                    <DashboardLayout>
                      <SuspenseRoute><Invoices /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/payments" 
                element={
                  <ProtectedRoute requiredRole={["admin", "finance_manager", "cfo"]}>
                    <DashboardLayout>
                      <SuspenseRoute><Payments /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/receipts" 
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin", "finance_manager", "cfo"]}>
                    <DashboardLayout>
                      <SuspenseRoute><Receipts /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/my-profile" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <SuspenseRoute><MyProfile /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/my-attendance" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <SuspenseRoute><MyAttendance /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/my-leave" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <SuspenseRoute><MyLeave /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/ledger" 
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin", "finance_manager", "cfo"]}>
                    <DashboardLayout>
                      <SuspenseRoute><Ledger /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/ledger/create-entry" 
                element={
                  <ProtectedRoute requiredRole={["admin", "finance_manager", "cfo"]}>
                    <DashboardLayout>
                      <SuspenseRoute><CreateJournalEntry /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/clients" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <SuspenseRoute><Clients /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/clients/create" 
                element={
                  <ProtectedRoute requiredRole="sales_manager">
                    <DashboardLayout>
                      <SuspenseRoute><CreateClient /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/clients/edit/:id" 
                element={
                  <ProtectedRoute requiredRole="sales_manager">
                    <DashboardLayout>
                      <SuspenseRoute><CreateClient /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/reports" 
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><Reports /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/analytics" 
                element={
                  <ProtectedRoute requiredRole="admin">
                    <DashboardLayout>
                      <SuspenseRoute><Analytics /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/department-management" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <SuspenseRoute><DepartmentManagement /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/ai-features" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <SuspenseRoute><AIFeatures /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/create-employee" 
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><CreateEmployee /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/assign-user-roles" 
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><AssignUserRoles /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/jobs" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <SuspenseRoute><JobCosting /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/inventory"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><InventoryManagement /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              
              <Route 
                path="/inventory/products"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><InventoryProducts /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/inventory/bom"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><InventoryBOM /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/inventory/serial-batch"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><InventorySerialBatch /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/inventory/reports"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><InventoryReports /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              
              <Route 
                path="/inventory/settings"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><InventorySettings /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              
              <Route 
                path="/procurement/settings"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><ProcurementSettings /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              
              <Route 
                path="/reports/dashboard"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><ReportingDashboard /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              
              <Route 
                path="/reports/custom"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><CustomReports /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              
              <Route 
                path="/reports/scheduled"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><ScheduledReports /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              
              <Route 
                path="/reports/exports"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><ReportExports /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              
              <Route 
                path="/reports/analytics"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><AnalyticsDashboard /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              
              <Route 
                path="/inventory/warehouses"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><InventoryWarehouses /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              
              <Route 
                path="/inventory/stock-levels"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><InventoryStockLevels /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              
              <Route 
                path="/inventory/transfers"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><InventoryTransfers /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              
              <Route 
                path="/inventory/adjustments"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><InventoryAdjustments /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/procurement/vendors"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><ProcurementVendors /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              
              <Route 
                path="/procurement/purchase-orders"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><ProcurementPurchaseOrders /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              
              <Route 
                path="/procurement/requisitions"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><ProcurementRequisitions /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              
              <Route 
                path="/procurement/goods-receipts"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><ProcurementGoodsReceipts /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              
              <Route 
                path="/procurement/rfq"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><ProcurementRFQ /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              
              <Route 
                path="/procurement/vendor-contracts"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><ProcurementVendorContracts /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              
              <Route 
                path="/procurement/vendor-performance"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><ProcurementVendorPerformance /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              
              <Route 
                path="/procurement/reports"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><ProcurementReports /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              
              <Route 
                path="/procurement"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><ProcurementManagement /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              
              <Route 
                path="/assets"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><Assets /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/assets/categories"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><AssetCategories /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/assets/locations"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><AssetLocations /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/assets/maintenance"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><AssetMaintenance /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/assets/depreciation"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><AssetDepreciation /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              
              <Route 
                path="/assets/disposals"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><AssetDisposals /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              
              <Route 
                path="/assets/reports"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><AssetReports /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              
              <Route 
                path="/assets/settings"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><AssetSettings /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              
              <Route 
                path="/workflows"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><Workflows /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/workflows/instances"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><WorkflowInstances /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              
              <Route 
                path="/workflows/approvals"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><WorkflowApprovals /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              
              <Route 
                path="/workflows/automation"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><WorkflowAutomation /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              
              <Route 
                path="/workflows/settings"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><WorkflowSettings /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              
              <Route 
                path="/workflows/builder"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><WorkflowBuilder /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/integrations"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><Integrations /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              
              <Route 
                path="/integrations/settings"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><IntegrationSettings /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              
              <Route 
                path="/quotations" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <SuspenseRoute><Quotations /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/quotations/new" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <SuspenseRoute><QuotationForm /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/quotations/:id" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <SuspenseRoute><QuotationForm /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/crm" 
                element={
                  <ProtectedRoute requiredRole={["hr", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><CRM /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/crm/leads/:leadId" 
                element={
                  <ProtectedRoute requiredRole="hr">
                    <DashboardLayout>
                      <SuspenseRoute><LeadDetail /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/crm/activities/:activityId" 
                element={
                  <ProtectedRoute requiredRole={["hr", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><ActivityDetail /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/calendar" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <SuspenseRoute><Calendar /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/financial-management" 
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin", "finance_manager", "ceo", "cfo"]}>
                    <DashboardLayout>
                      <SuspenseRoute><FinancialManagement /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/gst-compliance" 
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin", "finance_manager", "cfo"]}>
                    <DashboardLayout>
                      <SuspenseRoute><GstCompliance /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/my-projects" 
                element={
                  <ProtectedRoute requiredRole="employee">
                    <DashboardLayout>
                      <SuspenseRoute><EmployeeProjects /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/reimbursements" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <SuspenseRoute><Reimbursements /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/holiday-management" 
                element={
                  <ProtectedRoute requiredRole={["hr", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><HolidayManagement /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/centralized-reports" 
                element={
                  <ProtectedRoute requiredRole={["admin", "finance_manager", "cfo", "ceo"]}>
                    <DashboardLayout>
                      <SuspenseRoute><CentralizedReports /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route
                path="/agency" 
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><AgencyDashboard /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route
                path="/agency/:agencyId/super-admin-dashboard"
                element={
                  <ProtectedRoute requiredRole="super_admin">
                    <DashboardLayout>
                      <SuspenseRoute><SuperAdminDashboard /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              
              <Route 
                path="/system-health"
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><SystemHealth /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              
              <Route 
                path="/system" 
                element={
                  <ProtectedRoute requiredRole="super_admin">
                    <DashboardLayout>
                      <SuspenseRoute><SystemDashboard /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/role-requests" 
                element={
                  <ProtectedRoute requiredRole="hr">
                    <DashboardLayout>
                      <SuspenseRoute><RoleChangeRequests /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/permissions" 
                element={
                  <ProtectedRoute requiredRole={['super_admin', 'ceo', 'admin']}>
                    <DashboardLayout>
                      <SuspenseRoute><AdvancedPermissions /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/advanced-dashboard" 
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><AdvancedDashboard /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/documents" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <SuspenseRoute><DocumentManager /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/messages" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <SuspenseRoute><MessageCenter /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/notifications" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <SuspenseRoute><Notifications /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/employee-performance" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <SuspenseRoute><EmployeePerformance /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/email-testing" 
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><EmailTesting /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/view-as-user" 
                element={
                  <ProtectedRoute requiredRole={["admin", "super_admin"]}>
                    <DashboardLayout>
                      <SuspenseRoute><ViewAsUser /></SuspenseRoute>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route path="*" element={<SuspenseRoute><NotFound /></SuspenseRoute>} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ViewAsUserProvider>
          <Toaster />
          <Sonner />
          <HoverReceiver />
          <AppContent />
        </ViewAsUserProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
