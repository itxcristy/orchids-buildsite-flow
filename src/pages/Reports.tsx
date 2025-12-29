import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { Download, Calendar, TrendingUp, TrendingDown, DollarSign, Users, FileText, BarChart3, PieChart, Building, Loader2, RefreshCw, Edit, Trash2, Eye, Plus, Search, Clock, Briefcase, Receipt, UserCheck, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ReportService, MonthlyReportData, YearlyReportData, MonthlyTrend, DepartmentReport, ProjectReport, CustomReport, Report } from "@/services/api/reports";
import { useAppStore } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { selectOne } from '@/services/api/postgresql-service';

const Reports = () => {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));
  
  const [monthlyData, setMonthlyData] = useState<MonthlyReportData | null>(null);
  const [yearlyData, setYearlyData] = useState<YearlyReportData | null>(null);
  const [previousMonthData, setPreviousMonthData] = useState<MonthlyReportData | null>(null);
  const [previousYearData, setPreviousYearData] = useState<YearlyReportData | null>(null);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [departmentData, setDepartmentData] = useState<DepartmentReport[]>([]);
  const [projectReports, setProjectReports] = useState<ProjectReport[]>([]);
  const [customReports, setCustomReports] = useState<CustomReport[]>([]);
  const [savedReports, setSavedReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReportType, setSelectedReportType] = useState<string>("all");
  
  const [loading, setLoading] = useState({
    monthly: false,
    yearly: false,
    trends: false,
    departments: false,
    projects: false,
    custom: false,
    saved: false,
  });
  
  const [error, setError] = useState<string | null>(null);
  const [createReportOpen, setCreateReportOpen] = useState(false);
  const [editReportOpen, setEditReportOpen] = useState(false);
  const [viewReportOpen, setViewReportOpen] = useState(false);
  const [deleteReportOpen, setDeleteReportOpen] = useState(false);
  const [deleteSavedReportOpen, setDeleteSavedReportOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<CustomReport | null>(null);
  const [selectedSavedReport, setSelectedSavedReport] = useState<Report | null>(null);
  const [newReportName, setNewReportName] = useState("");
  const [newReportDescription, setNewReportDescription] = useState("");
  const [newReportType, setNewReportType] = useState("custom");

  const { addNotification } = useAppStore();
  const { user, profile } = useAuthStore();
  const [profileId, setProfileId] = useState<string | null>(null);

  // Fetch profile ID when user/profile changes
  useEffect(() => {
    const fetchProfileId = async () => {
      if (user?.id) {
        try {
          const profileData = await selectOne('profiles', { user_id: user.id });
          if (profileData?.id) {
            setProfileId(profileData.id);
          } else {
            setProfileId(null);
          }
        } catch (err) {
          console.error('Failed to fetch profile:', err);
          setProfileId(null);
        }
      } else {
        setProfileId(null);
      }
    };
    fetchProfileId();
  }, [user]);

  // Fetch monthly report data
  useEffect(() => {
    const fetchMonthlyData = async () => {
      setLoading(prev => ({ ...prev, monthly: true }));
      setError(null);
      try {
        const [month, year] = selectedMonth.split('-');
        const monthNum = parseInt(month);
        const yearNum = parseInt(year);
        
        // Calculate previous month
        let prevMonth = monthNum - 1;
        let prevYear = yearNum;
        if (prevMonth < 1) {
          prevMonth = 12;
          prevYear = yearNum - 1;
        }
        const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
        
        const agencyId = profile?.agency_id;
        const [currentResponse, previousResponse] = await Promise.all([
          ReportService.getMonthlyReport(selectedMonth, year, agencyId, { showLoading: false }),
          ReportService.getMonthlyReport(prevMonthStr, String(prevYear), agencyId, { showLoading: false }),
        ]);
        
        if (currentResponse.success && currentResponse.data) {
          setMonthlyData(currentResponse.data);
        } else {
          setError(currentResponse.error || 'Failed to load monthly data');
        }
        
        if (previousResponse.success && previousResponse.data) {
          setPreviousMonthData(previousResponse.data);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load monthly data');
        addNotification({
          type: 'error',
          title: 'Error',
          message: 'Failed to load monthly report data',
        });
      } finally {
        setLoading(prev => ({ ...prev, monthly: false }));
      }
    };
    fetchMonthlyData();
  }, [selectedMonth, addNotification]);

  // Fetch yearly report data
  useEffect(() => {
    const fetchYearlyData = async () => {
      setLoading(prev => ({ ...prev, yearly: true }));
      setError(null);
      try {
        const currentYear = parseInt(selectedYear);
        const previousYear = String(currentYear - 1);
        const agencyId = profile?.agency_id;
        
        const [currentResponse, previousResponse] = await Promise.all([
          ReportService.getYearlyReport(selectedYear, agencyId, { showLoading: false }),
          ReportService.getYearlyReport(previousYear, agencyId, { showLoading: false }),
        ]);
        
        if (currentResponse.success && currentResponse.data) {
          setYearlyData(currentResponse.data);
        } else {
          setError(currentResponse.error || 'Failed to load yearly data');
        }
        
        if (previousResponse.success && previousResponse.data) {
          setPreviousYearData(previousResponse.data);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load yearly data');
        addNotification({
          type: 'error',
          title: 'Error',
          message: 'Failed to load yearly report data',
        });
      } finally {
        setLoading(prev => ({ ...prev, yearly: false }));
      }
    };
    fetchYearlyData();
  }, [selectedYear, addNotification]);

  // Fetch monthly trends
  useEffect(() => {
    const fetchTrends = async () => {
      setLoading(prev => ({ ...prev, trends: true }));
      try {
        const agencyId = profile?.agency_id;
        const response = await ReportService.getMonthlyTrends(selectedYear, agencyId, { showLoading: false });
        if (response.success && response.data) {
          setMonthlyTrends(response.data);
        }
      } catch (err: any) {
        console.error('Failed to load trends:', err);
      } finally {
        setLoading(prev => ({ ...prev, trends: false }));
      }
    };
    fetchTrends();
  }, [selectedYear]);

  // Fetch department data
  useEffect(() => {
    const fetchDepartments = async () => {
      setLoading(prev => ({ ...prev, departments: true }));
      try {
        const response = await ReportService.getDepartmentReports(undefined, { showLoading: false });
        if (response.success && response.data) {
          setDepartmentData(response.data);
        }
      } catch (err: any) {
        console.error('Failed to load departments:', err);
      } finally {
        setLoading(prev => ({ ...prev, departments: false }));
      }
    };
    fetchDepartments();
  }, []);

  // Fetch project reports
  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(prev => ({ ...prev, projects: true }));
      try {
        const agencyId = profile?.agency_id;
        const response = await ReportService.getProjectReports(agencyId, { showLoading: false });
        if (response.success && response.data) {
          setProjectReports(response.data);
        }
      } catch (err: any) {
        console.error('Failed to load projects:', err);
      } finally {
        setLoading(prev => ({ ...prev, projects: false }));
      }
    };
    fetchProjects();
  }, []);

  // Fetch custom reports
  useEffect(() => {
    const fetchCustomReports = async () => {
      if (!profileId) return;
      
      setLoading(prev => ({ ...prev, custom: true }));
      try {
        const response = await ReportService.getCustomReports(profileId, { showLoading: false });
        if (response.success && response.data) {
          setCustomReports(response.data);
        }
      } catch (err: any) {
        console.error('Failed to load custom reports:', err);
      } finally {
        setLoading(prev => ({ ...prev, custom: false }));
      }
    };
    fetchCustomReports();
  }, [profileId]);

  // Fetch saved reports from reports table
  useEffect(() => {
    const fetchSavedReports = async () => {
      setLoading(prev => ({ ...prev, saved: true }));
      try {
        const filters: any = {};
        if (user?.id) {
          filters.generated_by = user.id;
        }
        const response = await ReportService.getReports(filters, { showLoading: false });
        if (response.success && response.data) {
          setSavedReports(response.data || []);
          setFilteredReports(response.data || []);
        }
      } catch (err: any) {
        console.error('Failed to load saved reports:', err);
      } finally {
        setLoading(prev => ({ ...prev, saved: false }));
      }
    };
    fetchSavedReports();
  }, [user?.id]);

  // Filter reports based on search and type
  useEffect(() => {
    let filtered = savedReports;

    // Filter by type
    if (selectedReportType !== 'all') {
      filtered = filtered.filter(r => r.report_type === selectedReportType);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.name.toLowerCase().includes(term) ||
        (r.description && r.description.toLowerCase().includes(term))
      );
    }

    setFilteredReports(filtered);
  }, [savedReports, selectedReportType, searchTerm]);

  // Generate month options dynamically
  const generateMonthOptions = () => {
    const options = [];
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= currentYear - 2; year--) {
      for (let month = 1; month <= 12; month++) {
        const monthStr = `${year}-${String(month).padStart(2, '0')}`;
        const monthName = new Date(year, month - 1).toLocaleString('en-IN', { month: 'long' });
        options.push(
          <SelectItem key={monthStr} value={monthStr}>
            {monthName} {year}
          </SelectItem>
        );
      }
    }
    return options;
  };

  // Generate year options
  const generateYearOptions = () => {
    const options = [];
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= currentYear - 5; year--) {
      options.push(
        <SelectItem key={year} value={String(year)}>
          {year}
        </SelectItem>
      );
    }
    return options;
  };

  // Export all reports
  const handleExportAll = () => {
    const data = {
      monthly: monthlyData,
      yearly: yearlyData,
      trends: monthlyTrends,
      departments: departmentData,
      projects: projectReports,
      generatedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reports-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addNotification({
      type: 'success',
      title: 'Export Successful',
      message: 'All reports have been exported',
    });
  };

  // Refresh all data
  const handleRefresh = async () => {
    const [month, year] = selectedMonth.split('-');
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    
    // Calculate previous month and year for comparisons
    let prevMonth = monthNum - 1;
    let prevYear = yearNum;
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear = yearNum - 1;
    }
    const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
    const previousYear = String(yearNum - 1);
    
    setLoading({
      monthly: true,
      yearly: true,
      trends: true,
      departments: true,
      projects: true,
      custom: true,
      saved: true,
    });

    try {
      const userId = user?.id || profile?.user_id;
      const agencyId = profile?.agency_id;
      const [monthlyRes, prevMonthlyRes, yearlyRes, prevYearlyRes, trendsRes, deptRes, projRes, customRes, savedRes] = await Promise.all([
        ReportService.getMonthlyReport(selectedMonth, year, agencyId, { showLoading: false }),
        ReportService.getMonthlyReport(prevMonthStr, String(prevYear), agencyId, { showLoading: false }),
        ReportService.getYearlyReport(selectedYear, agencyId, { showLoading: false }),
        ReportService.getYearlyReport(previousYear, agencyId, { showLoading: false }),
        ReportService.getMonthlyTrends(selectedYear, agencyId, { showLoading: false }),
        ReportService.getDepartmentReports(agencyId, { showLoading: false }),
        ReportService.getProjectReports(agencyId, { showLoading: false }),
        profileId ? ReportService.getCustomReports(profileId, { showLoading: false }) : Promise.resolve({ success: true, data: [] }),
        ReportService.getReports(userId ? { generated_by: userId } : {}, { showLoading: false }),
      ]);

      if (monthlyRes.success && monthlyRes.data) setMonthlyData(monthlyRes.data);
      if (prevMonthlyRes.success && prevMonthlyRes.data) setPreviousMonthData(prevMonthlyRes.data);
      if (yearlyRes.success && yearlyRes.data) setYearlyData(yearlyRes.data);
      if (prevYearlyRes.success && prevYearlyRes.data) setPreviousYearData(prevYearlyRes.data);
      if (trendsRes.success && trendsRes.data) setMonthlyTrends(trendsRes.data);
      if (deptRes.success && deptRes.data) setDepartmentData(deptRes.data);
      if (projRes.success && projRes.data) setProjectReports(projRes.data);
      if (customRes.success && customRes.data) setCustomReports(customRes.data);
      if (savedRes.success && savedRes.data) {
        setSavedReports(savedRes.data);
        setFilteredReports(savedRes.data);
      }

      addNotification({
        type: 'success',
        title: 'Refresh Complete',
        message: 'All reports have been refreshed',
      });
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Refresh Failed',
        message: 'Failed to refresh reports',
      });
    } finally {
      setLoading({
        monthly: false,
        yearly: false,
        trends: false,
        departments: false,
        projects: false,
        custom: false,
        saved: false,
      });
    }
  };

  // Create custom report
  const handleCreateReport = async () => {
    if (!newReportName.trim()) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Report name is required',
      });
      return;
    }

    try {
      // Get profile ID - custom_reports.created_by references profiles(id), not users(id)
      if (!profileId) {
        addNotification({
          type: 'error',
          title: 'Error',
          message: 'Unable to find user profile. Please ensure you are logged in.',
        });
        return;
      }

      console.log('Creating report with profileId:', profileId, 'agency_id:', profile?.agency_id);
      
      const response = await ReportService.createCustomReport({
        name: newReportName,
        description: newReportDescription,
        report_type: newReportType,
        parameters: {
          month: selectedMonth,
          year: selectedYear,
          reportData: {
            monthly: monthlyData,
            yearly: yearlyData,
            trends: monthlyTrends,
            departments: departmentData,
            projects: projectReports,
          },
        },
        created_by: profileId,
        agency_id: profile?.agency_id || undefined,
      }, { showLoading: true, showErrorToast: true });

      console.log('Create report response:', response);

      if (response.success) {
        addNotification({
          type: 'success',
          title: 'Success',
          message: 'Custom report created successfully',
        });
        setCreateReportOpen(false);
        setNewReportName("");
        setNewReportDescription("");
        setNewReportType("custom");
        // Refresh custom reports list
        if (profileId) {
          const customRes = await ReportService.getCustomReports(profileId, { showLoading: false });
          if (customRes.success && customRes.data) {
            setCustomReports(customRes.data);
          }
        }
      } else {
        addNotification({
          type: 'error',
          title: 'Error',
          message: response.error || 'Failed to create custom report',
        });
      }
    } catch (err: any) {
      console.error('Failed to create report:', err);
      addNotification({
        type: 'error',
        title: 'Error',
        message: err.message || 'Failed to create custom report. Please try again.',
      });
    }
  };

  // Edit custom report
  const handleEditReport = async () => {
    if (!selectedReport || !newReportName.trim()) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Report name is required',
      });
      return;
    }

    try {
      const response = await ReportService.updateCustomReport(selectedReport.id, {
        name: newReportName,
        description: newReportDescription,
        parameters: selectedReport.parameters,
      }, { showLoading: true, showErrorToast: true });

      if (response.success) {
        addNotification({
          type: 'success',
          title: 'Success',
          message: 'Custom report updated successfully',
        });
        setEditReportOpen(false);
        setSelectedReport(null);
        // Refresh custom reports list
        if (profileId) {
          const customRes = await ReportService.getCustomReports(profileId, { showLoading: false });
          if (customRes.success && customRes.data) {
            setCustomReports(customRes.data);
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to update report:', err);
    }
  };

  // Delete custom report
  const handleDeleteReport = async () => {
    if (!selectedReport) return;

    try {
      const response = await ReportService.deleteCustomReport(selectedReport.id, { showLoading: true, showErrorToast: true });

      if (response.success) {
        addNotification({
          type: 'success',
          title: 'Success',
          message: 'Custom report deleted successfully',
        });
        setDeleteReportOpen(false);
        setSelectedReport(null);
        // Refresh custom reports list
        if (profileId) {
          const customRes = await ReportService.getCustomReports(profileId, { showLoading: false });
          if (customRes.success && customRes.data) {
            setCustomReports(customRes.data);
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to delete report:', err);
    }
  };

  // Save current report to reports table
  const handleSaveReport = async (reportType: string, reportData: any, reportName?: string) => {
    if (!user?.id) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'You must be logged in to save reports',
      });
      return;
    }

    try {
      const name = reportName || `${reportType} Report - ${formatIndianDate(new Date())}`;
      const response = await ReportService.createReport({
        name,
        description: `Generated ${reportType} report`,
        report_type: reportType as any,
        parameters: reportData,
        generated_by: user.id,
        is_public: false,
      }, { showLoading: true, showErrorToast: true });

      if (response.success) {
        addNotification({
          type: 'success',
          title: 'Report Saved',
          message: 'Report has been saved successfully',
        });
        // Refresh saved reports
        const reportsRes = await ReportService.getReports({ generated_by: user.id }, { showLoading: false });
        if (reportsRes.success && reportsRes.data) {
          setSavedReports(reportsRes.data);
        }
      }
    } catch (err: any) {
      console.error('Failed to save report:', err);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to save report',
      });
    }
  };

  // Delete saved report
  const handleDeleteSavedReport = async () => {
    if (!selectedSavedReport) return;

    try {
      const response = await ReportService.deleteReport(selectedSavedReport.id, { showLoading: true, showErrorToast: true });

      if (response.success) {
        addNotification({
          type: 'success',
          title: 'Success',
          message: 'Report deleted successfully',
        });
        setDeleteSavedReportOpen(false);
        setSelectedSavedReport(null);
        // Refresh saved reports
        if (user?.id) {
          const reportsRes = await ReportService.getReports({ generated_by: user.id }, { showLoading: false });
          if (reportsRes.success && reportsRes.data) {
            setSavedReports(reportsRes.data);
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to delete report:', err);
    }
  };

  // Get report type icon
  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'attendance': return Clock;
      case 'payroll': return DollarSign;
      case 'leave': return Calendar;
      case 'employee': return Users;
      case 'project': return Briefcase;
      case 'financial': return FileText;
      case 'gst': return Receipt;
      default: return BarChart3;
    }
  };

  // Get report type color
  const getReportTypeColor = (type: string) => {
    switch (type) {
      case 'attendance': return 'text-blue-600';
      case 'payroll': return 'text-green-600';
      case 'leave': return 'text-purple-600';
      case 'employee': return 'text-orange-600';
      case 'project': return 'text-indigo-600';
      case 'financial': return 'text-red-600';
      case 'gst': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  // Open edit dialog
  const openEditDialog = (report: CustomReport) => {
    setSelectedReport(report);
    setNewReportName(report.name);
    setNewReportDescription(report.description || "");
    setNewReportType(report.report_type);
    setEditReportOpen(true);
  };

  // Open view dialog
  const openViewDialog = (report: CustomReport) => {
    setSelectedReport(report);
    setViewReportOpen(true);
  };

  // Export individual report
  const handleExportReport = (type: string, data: any) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addNotification({
      type: 'success',
      title: 'Export Successful',
      message: `${type} report has been exported`,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in-progress': return 'secondary';
      case 'planning': return 'outline';
      default: return 'secondary';
    }
  };

  const getMarginColor = (margin: number) => {
    if (margin > 10) return 'text-green-600';
    if (margin < 0) return 'text-red-600';
    return 'text-yellow-600';
  };

  // Calculate percentage change
  const calculateChange = (current: number, previous: number): { value: number; isPositive: boolean } => {
    if (previous === 0) return { value: current > 0 ? 100 : 0, isPositive: current > 0 };
    const change = ((current - previous) / previous) * 100;
    return { value: Math.abs(change), isPositive: change >= 0 };
  };

  // Format change percentage
  const formatChange = (current: number, previous: number): string => {
    const { value, isPositive } = calculateChange(current, previous);
    const sign = isPositive ? '+' : '-';
    return `${sign}${value.toFixed(1)}%`;
  };

  // Indian currency formatting
  const formatIndianCurrency = (amount: number): string => {
    return `₹${amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true
    })}`;
  };

  // Indian date formatting (DD/MM/YYYY)
  const formatIndianDate = (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Indian date-time formatting
  const formatIndianDateTime = (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Format large numbers in Indian style (lakhs/crores)
  const formatIndianNumber = (num: number, showCurrency: boolean = false): string => {
    const absNum = Math.abs(num);
    let formatted: string;
    
    if (absNum >= 10000000) { // Crores
      formatted = (num / 10000000).toFixed(2) + ' Cr';
    } else if (absNum >= 100000) { // Lakhs
      formatted = (num / 100000).toFixed(2) + ' L';
    } else if (absNum >= 1000) { // Thousands
      formatted = (num / 1000).toFixed(2) + ' K';
    } else {
      formatted = num.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
    
    return showCurrency ? `₹${formatted}` : formatted;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">View comprehensive business reports and performance metrics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={Object.values(loading).some(l => l)}>
            <RefreshCw className={`mr-2 h-4 w-4 ${Object.values(loading).some(l => l) ? 'animate-spin' : ''}`} />
            Refresh All
          </Button>
          <Button variant="outline" onClick={handleExportAll} disabled={loading.monthly || loading.yearly}>
            <Download className="mr-2 h-4 w-4" />
            Export All
          </Button>
          <Dialog open={createReportOpen} onOpenChange={setCreateReportOpen}>
            <DialogTrigger asChild>
          <Button>
            <BarChart3 className="mr-2 h-4 w-4" />
            Create Custom Report
          </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Custom Report</DialogTitle>
                <DialogDescription>
                  Create a custom report with specific parameters and filters
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="report-name">Report Name</Label>
                  <Input
                    id="report-name"
                    value={newReportName}
                    onChange={(e) => setNewReportName(e.target.value)}
                    placeholder="Enter report name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="report-description">Description</Label>
                  <Textarea
                    id="report-description"
                    value={newReportDescription}
                    onChange={(e) => setNewReportDescription(e.target.value)}
                    placeholder="Enter report description (optional)"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="report-type">Report Type</Label>
                  <Select value={newReportType} onValueChange={setNewReportType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Custom</SelectItem>
                      <SelectItem value="financial">Financial</SelectItem>
                      <SelectItem value="hr">HR</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateReportOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Button clicked, calling handleCreateReport');
                    await handleCreateReport(e);
                  }}
                  type="button"
                  disabled={!newReportName.trim() || !profileId}
                >
                  Create Report
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      <Tabs defaultValue="monthly" className="w-full">
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="yearly">Yearly</TabsTrigger>
          <TabsTrigger value="departmental">Department</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="saved">Saved Reports</TabsTrigger>
          <TabsTrigger value="custom">Custom</TabsTrigger>
        </TabsList>
        
        <TabsContent value="monthly" className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Monthly Performance Report</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                const [month, year] = selectedMonth.split('-');
                handleExportReport('monthly', { month, year, data: monthlyData });
              }} disabled={!monthlyData}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                  {generateMonthOptions()}
              </SelectContent>
            </Select>
            </div>
          </div>

          {loading.monthly ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : monthlyData ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Revenue</p>
                    <p className="text-2xl font-bold text-green-600">{formatIndianCurrency(monthlyData.revenue)}</p>
                      {previousMonthData && (
                        <p className={`text-xs mt-1 ${calculateChange(monthlyData.revenue, previousMonthData.revenue).isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {formatChange(monthlyData.revenue, previousMonthData.revenue)} from last month
                        </p>
                      )}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <TrendingDown className="h-8 w-8 text-red-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Expenses</p>
                    <p className="text-2xl font-bold text-red-600">{formatIndianCurrency(monthlyData.expenses)}</p>
                      {previousMonthData && (
                        <p className={`text-xs mt-1 ${calculateChange(monthlyData.expenses, previousMonthData.expenses).isPositive ? 'text-red-600' : 'text-green-600'}`}>
                          {formatChange(monthlyData.expenses, previousMonthData.expenses)} from last month
                        </p>
                      )}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Net Profit</p>
                    <p className="text-2xl font-bold text-blue-600">{formatIndianCurrency(monthlyData.profit)}</p>
                      {previousMonthData && (
                        <p className={`text-xs mt-1 ${calculateChange(monthlyData.profit, previousMonthData.profit).isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {formatChange(monthlyData.profit, previousMonthData.profit)} from last month
                        </p>
                      )}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Attendance</p>
                      <p className="text-2xl font-bold text-purple-600">{monthlyData.attendanceRate.toFixed(1)}%</p>
                      {previousMonthData && (
                        <p className={`text-xs mt-1 ${calculateChange(monthlyData.attendanceRate, previousMonthData.attendanceRate).isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {formatChange(monthlyData.attendanceRate, previousMonthData.attendanceRate)} from last month
                        </p>
                      )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">No data available</div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Key Metrics Summary</CardTitle>
                <CardDescription>Important business metrics for the selected month</CardDescription>
              </CardHeader>
              <CardContent>
                {monthlyData ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Active Projects</span>
                    <span className="font-medium">{monthlyData.activeProjects}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Completed Projects</span>
                    <span className="font-medium">{monthlyData.completedProjects}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">New Clients</span>
                    <span className="font-medium">{monthlyData.newClients}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Invoices Sent</span>
                    <span className="font-medium">{monthlyData.invoicesSent}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Payments Received</span>
                    <span className="font-medium">{monthlyData.paymentsReceived}</span>
                  </div>
                </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No data available</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Trends</CardTitle>
                <CardDescription>Revenue, expenses, and profit trends</CardDescription>
              </CardHeader>
              <CardContent>
                {loading.trends ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : monthlyTrends.length > 0 ? (
                <div className="space-y-3">
                  {monthlyTrends.slice(-6).map((trend, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="font-medium">{trend.month}</span>
                      <div className="flex gap-4">
                        <span className="text-green-600">{formatIndianNumber(trend.revenue, true)}</span>
                        <span className="text-red-600">{formatIndianNumber(trend.expenses, true)}</span>
                        <span className="text-blue-600">{formatIndianNumber(trend.profit, true)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No trend data available</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="yearly" className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Annual Performance Report</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                handleExportReport('yearly', { year: selectedYear, data: yearlyData });
              }} disabled={!yearlyData}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                  {generateYearOptions()}
              </SelectContent>
            </Select>
            </div>
          </div>

          {loading.yearly ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : yearlyData ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Annual Revenue</p>
                    <p className="text-2xl font-bold text-green-600">{formatIndianCurrency(yearlyData.revenue)}</p>
                      {previousYearData && (
                        <p className={`text-xs mt-1 ${calculateChange(yearlyData.revenue, previousYearData.revenue).isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {formatChange(yearlyData.revenue, previousYearData.revenue)} from last year
                        </p>
                      )}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <TrendingDown className="h-8 w-8 text-red-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Annual Expenses</p>
                    <p className="text-2xl font-bold text-red-600">{formatIndianCurrency(yearlyData.expenses)}</p>
                      {previousYearData && (
                        <p className={`text-xs mt-1 ${calculateChange(yearlyData.expenses, previousYearData.expenses).isPositive ? 'text-red-600' : 'text-green-600'}`}>
                          {formatChange(yearlyData.expenses, previousYearData.expenses)} from last year
                        </p>
                      )}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Annual Profit</p>
                    <p className="text-2xl font-bold text-blue-600">{formatIndianCurrency(yearlyData.profit)}</p>
                      {previousYearData && (
                        <p className={`text-xs mt-1 ${calculateChange(yearlyData.profit, previousYearData.profit).isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {formatChange(yearlyData.profit, previousYearData.profit)} from last year
                        </p>
                      )}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Avg Attendance</p>
                      <p className="text-2xl font-bold text-purple-600">{yearlyData.avgAttendance.toFixed(1)}%</p>
                      {previousYearData && (
                        <p className={`text-xs mt-1 ${calculateChange(yearlyData.avgAttendance, previousYearData.avgAttendance).isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {formatChange(yearlyData.avgAttendance, previousYearData.avgAttendance)} from last year
                        </p>
                      )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">No data available</div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Annual Achievements</CardTitle>
                <CardDescription>Key accomplishments for the year</CardDescription>
              </CardHeader>
              <CardContent>
                {yearlyData ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Employees Hired</span>
                    <span className="font-medium">{yearlyData.employeesHired}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Projects Completed</span>
                    <span className="font-medium">{yearlyData.projectsCompleted}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">New Clients Acquired</span>
                    <span className="font-medium">{yearlyData.newClients}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Invoices</span>
                    <span className="font-medium">{yearlyData.totalInvoices}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Payments Processed</span>
                    <span className="font-medium">{yearlyData.totalPayments}</span>
                  </div>
                </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No data available</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Breakdown</CardTitle>
                <CardDescription>Revenue and profit by month</CardDescription>
              </CardHeader>
              <CardContent>
                {loading.trends ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : monthlyTrends.length > 0 ? (
                <div className="space-y-2">
                  {monthlyTrends.map((trend, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="font-medium">{trend.month}</span>
                      <div className="flex gap-4">
                        <span className="text-green-600">{formatIndianNumber(trend.revenue, true)}</span>
                        <span className="text-blue-600">{formatIndianNumber(trend.profit, true)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No trend data available</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="departmental" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
              <CardTitle>Department Performance</CardTitle>
              <CardDescription>Budget utilization and employee metrics by department</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => {
                  handleExportReport('department', { data: departmentData });
                }} disabled={departmentData.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading.departments ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : departmentData.length > 0 ? (
              <div className="space-y-4">
                {departmentData.map((dept, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Building className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{dept.name}</h3>
                        <p className="text-sm text-muted-foreground">{dept.employees} employees</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatIndianCurrency(dept.budget)}</p>
                      <p className="text-sm text-muted-foreground">Budget</p>
                    </div>
                    <div className="text-right">
                        <p className="font-medium">{dept.utilization.toFixed(1)}%</p>
                      <p className="text-sm text-muted-foreground">Utilization</p>
                    </div>
                  </div>
                ))}
              </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">No department data available</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="projects" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
              <CardTitle>Project Financial Report</CardTitle>
              <CardDescription>Budget vs actual costs and profit margins</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => {
                  handleExportReport('project', { data: projectReports });
                }} disabled={projectReports.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading.projects ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : projectReports.length > 0 ? (
              <div className="space-y-4">
                {projectReports.map((project, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{project.name}</h3>
                        <Badge variant={getStatusColor(project.status)}>
                          {project.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Budget</p>
                          <p className="font-medium">{formatIndianCurrency(project.budget)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Actual Cost</p>
                          <p className="font-medium">{formatIndianCurrency(project.actual)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Margin</p>
                          <p className={`font-medium ${getMarginColor(project.margin)}`}>
                              {project.margin > 0 ? '+' : ''}{project.margin.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">No project data available</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Attendance Reports</CardTitle>
                  <CardDescription>View and generate attendance reports</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigate('/attendance')}>
                    <Clock className="mr-2 h-4 w-4" />
                    View Attendance
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    if (monthlyData) {
                      handleSaveReport('attendance', {
                        month: selectedMonth,
                        year: selectedYear,
                        attendanceRate: monthlyData.attendanceRate,
                        data: monthlyData,
                      }, `Attendance Report - ${selectedMonth}`);
                    }
                  }} disabled={!monthlyData}>
                    <Plus className="mr-2 h-4 w-4" />
                    Save Report
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {monthlyData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground mb-2">Attendance Rate</p>
                          <p className="text-3xl font-bold text-purple-600">{monthlyData.attendanceRate.toFixed(1)}%</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground mb-2">Total Employees</p>
                          <p className="text-3xl font-bold">{monthlyData.employees}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground mb-2">Month</p>
                          <p className="text-lg font-medium">{new Date(selectedMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="text-center text-sm text-muted-foreground">
                    <p>For detailed attendance reports, visit the Attendance page</p>
                    <Button variant="link" onClick={() => navigate('/attendance')} className="mt-2">
                      Go to Attendance Page →
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No attendance data available</p>
                  <Button variant="outline" onClick={() => navigate('/attendance')} className="mt-4">
                    View Attendance Page
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Payroll Reports</CardTitle>
                  <CardDescription>View and generate payroll reports</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigate('/payroll')}>
                    <DollarSign className="mr-2 h-4 w-4" />
                    View Payroll
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    if (monthlyData) {
                      handleSaveReport('payroll', {
                        month: selectedMonth,
                        year: selectedYear,
                        expenses: monthlyData.expenses,
                        data: monthlyData,
                      }, `Payroll Report - ${selectedMonth}`);
                    }
                  }} disabled={!monthlyData}>
                    <Plus className="mr-2 h-4 w-4" />
                    Save Report
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-2">Monthly Expenses</p>
                        <p className="text-3xl font-bold text-red-600">{monthlyData?.expenses ? formatIndianCurrency(monthlyData.expenses) : '₹0.00'}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-2">Total Employees</p>
                        <p className="text-3xl font-bold">{monthlyData?.employees || 0}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div className="text-center text-sm text-muted-foreground">
                  <p>For detailed payroll reports, visit the Payroll page</p>
                  <Button variant="link" onClick={() => navigate('/payroll')} className="mt-2">
                    Go to Payroll Page →
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Financial Reports</CardTitle>
                  <CardDescription>View and generate financial reports</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigate('/financial-management')}>
                    <FileText className="mr-2 h-4 w-4" />
                    View Financial
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    if (monthlyData && yearlyData) {
                      handleSaveReport('financial', {
                        month: selectedMonth,
                        year: selectedYear,
                        monthly: monthlyData,
                        yearly: yearlyData,
                        trends: monthlyTrends,
                      }, `Financial Report - ${selectedMonth}`);
                    }
                  }} disabled={!monthlyData || !yearlyData}>
                    <Plus className="mr-2 h-4 w-4" />
                    Save Report
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {monthlyData && yearlyData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground mb-2">Revenue</p>
                          <p className="text-2xl font-bold text-green-600">{formatIndianCurrency(monthlyData.revenue)}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground mb-2">Expenses</p>
                          <p className="text-2xl font-bold text-red-600">{formatIndianCurrency(monthlyData.expenses)}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground mb-2">Profit</p>
                          <p className="text-2xl font-bold text-blue-600">{formatIndianCurrency(monthlyData.profit)}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground mb-2">Annual Revenue</p>
                          <p className="text-2xl font-bold text-green-600">{formatIndianCurrency(yearlyData.revenue)}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="text-center text-sm text-muted-foreground">
                    <p>For detailed financial reports, visit the Financial Management page</p>
                    <Button variant="link" onClick={() => navigate('/financial-management')} className="mt-2">
                      Go to Financial Management →
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No financial data available</p>
                  <Button variant="outline" onClick={() => navigate('/financial-management')} className="mt-4">
                    View Financial Management Page
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="saved" className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold">Saved Reports</h2>
              <p className="text-sm text-muted-foreground">View and manage all your saved reports</p>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={selectedReportType} onValueChange={setSelectedReportType}>
                <SelectTrigger className="w-48">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="attendance">Attendance</SelectItem>
                  <SelectItem value="payroll">Payroll</SelectItem>
                  <SelectItem value="leave">Leave</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="financial">Financial</SelectItem>
                  <SelectItem value="gst">GST</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading.saved ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredReports.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredReports.map((report) => {
                const IconComponent = getReportTypeIcon(report.report_type);
                return (
                  <Card key={report.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <IconComponent className={`h-5 w-5 ${getReportTypeColor(report.report_type)}`} />
                            <CardTitle className="text-lg">{report.name}</CardTitle>
                          </div>
                          <CardDescription className="mt-1">
                            {report.description || 'No description'}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="capitalize">{report.report_type}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4">
                        <div className="text-sm text-muted-foreground">
                          Generated: {formatIndianDate(report.generated_at)}
                        </div>
                        {report.expires_at && (
                          <div className="text-sm text-muted-foreground">
                            Expires: {formatIndianDate(report.expires_at)}
                          </div>
                        )}
                        {report.file_size && (
                          <div className="text-sm text-muted-foreground">
                            Size: {(report.file_size / 1024).toFixed(2)} KB
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setSelectedSavedReport(report);
                            setViewReportOpen(true);
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            handleExportReport(report.report_type, report.parameters || {});
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedSavedReport(report);
                            setDeleteSavedReportOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">No saved reports</p>
                <p className="text-muted-foreground mb-4 text-center">
                  {searchTerm || selectedReportType !== 'all' 
                    ? 'No reports match your filters'
                    : 'Save reports from other tabs to view them here'}
                </p>
                {(searchTerm || selectedReportType !== 'all') && (
                  <Button variant="outline" onClick={() => {
                    setSearchTerm('');
                    setSelectedReportType('all');
                  }}>
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="custom" className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Custom Reports</h2>
            <Button onClick={() => {
              setNewReportName("");
              setNewReportDescription("");
              setNewReportType("custom");
              setCreateReportOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Create Report
            </Button>
          </div>

          {loading.custom ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : customReports.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {customReports.map((report) => (
                <Card key={report.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{report.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {report.description || 'No description'}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">{report.report_type}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <div className="text-sm text-muted-foreground">
                        Created: {formatIndianDate(report.created_at)}
                      </div>
                      {report.updated_at !== report.created_at && (
                        <div className="text-sm text-muted-foreground">
                          Updated: {formatIndianDate(report.updated_at)}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => openViewDialog(report)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(report)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedReport(report);
                          setDeleteReportOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">No custom reports</p>
                <p className="text-muted-foreground mb-4 text-center">
                  Create custom reports to save and analyze your data
                </p>
                <Button onClick={() => setCreateReportOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Report
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* View Custom Report Dialog */}
      <Dialog open={viewReportOpen && selectedReport !== null && selectedSavedReport === null} onOpenChange={setViewReportOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedReport?.name}</DialogTitle>
            <DialogDescription>{selectedReport?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Report Type</Label>
              <p className="text-sm font-medium mt-1">{selectedReport?.report_type}</p>
            </div>
            <div>
              <Label>Parameters</Label>
              <pre className="mt-2 p-4 bg-muted rounded-lg text-sm overflow-auto">
                {JSON.stringify(selectedReport?.parameters || {}, null, 2)}
              </pre>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label>Created</Label>
                <p className="text-muted-foreground">
                  {selectedReport ? formatIndianDateTime(selectedReport.created_at) : ''}
                </p>
              </div>
              <div>
                <Label>Last Updated</Label>
                <p className="text-muted-foreground">
                  {selectedReport ? formatIndianDateTime(selectedReport.updated_at) : ''}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              if (selectedReport) {
                handleExportReport('custom', selectedReport);
              }
            }}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button onClick={() => {
              setViewReportOpen(false);
              setSelectedReport(null);
            }}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Report Dialog */}
      <Dialog open={editReportOpen} onOpenChange={setEditReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Custom Report</DialogTitle>
            <DialogDescription>
              Update your custom report details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-report-name">Report Name</Label>
              <Input
                id="edit-report-name"
                value={newReportName}
                onChange={(e) => setNewReportName(e.target.value)}
                placeholder="Enter report name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-report-description">Description</Label>
              <Textarea
                id="edit-report-description"
                value={newReportDescription}
                onChange={(e) => setNewReportDescription(e.target.value)}
                placeholder="Enter report description (optional)"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setEditReportOpen(false);
              setSelectedReport(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleEditReport}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteReportOpen} onOpenChange={setDeleteReportOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Custom Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedReport?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteReport} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Saved Report Confirmation Dialog */}
      <AlertDialog open={deleteSavedReportOpen} onOpenChange={setDeleteSavedReportOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedSavedReport?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSavedReport} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Saved Report Dialog */}
      <Dialog open={viewReportOpen && selectedSavedReport !== null} onOpenChange={setViewReportOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSavedReport?.name}</DialogTitle>
            <DialogDescription>{selectedSavedReport?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Report Type</Label>
              <p className="text-sm font-medium mt-1 capitalize">{selectedSavedReport?.report_type}</p>
            </div>
            <div>
              <Label>Parameters</Label>
              <pre className="mt-2 p-4 bg-muted rounded-lg text-sm overflow-auto">
                {JSON.stringify(selectedSavedReport?.parameters || {}, null, 2)}
              </pre>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label>Generated</Label>
                <p className="text-muted-foreground">
                  {selectedSavedReport ? formatIndianDateTime(selectedSavedReport.generated_at) : ''}
                </p>
              </div>
              {selectedSavedReport?.expires_at && (
                <div>
                  <Label>Expires</Label>
                  <p className="text-muted-foreground">
                    {formatIndianDateTime(selectedSavedReport.expires_at)}
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              if (selectedSavedReport) {
                handleExportReport(selectedSavedReport.report_type, selectedSavedReport.parameters || {});
              }
            }}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button onClick={() => {
              setViewReportOpen(false);
              setSelectedSavedReport(null);
            }}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Reports;