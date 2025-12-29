import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { generateUUID } from '@/lib/uuid';
import { 
  Loader2, 
  Building2, 
  Users, 
  Settings,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  MapPin,
  Phone,
  Globe,
  Briefcase,
  FileText,
  Check,
  Sparkles,
  Upload,
  Image as ImageIcon,
  DollarSign,
  Calendar,
  Bell,
  Shield,
  Zap,
  TrendingUp,
  Mail,
  CreditCard,
  FileCheck,
  Info,
  AlertCircle,
  Plus,
  X,
  Building,
  Landmark,
  Receipt,
  Wallet,
  BarChart3,
  Target,
  Clock,
  Globe2,
  FileSpreadsheet
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getApiBaseUrl } from '@/config/api';

const SETUP_STEPS = [
  { id: 1, title: 'Company Profile', icon: Building2, description: 'Basic company information and branding' },
  { id: 2, title: 'Business Details', icon: FileText, description: 'Legal and tax information' },
  { id: 3, title: 'Departments', icon: Briefcase, description: 'Organizational structure' },
  { id: 4, title: 'Financial Setup', icon: DollarSign, description: 'Currency, payment, and billing' },
  { id: 5, title: 'Team Members', icon: Users, description: 'Add your team' },
  { id: 6, title: 'Preferences', icon: Settings, description: 'System preferences' },
  { id: 7, title: 'Review', icon: CheckCircle2, description: 'Review and complete' },
];

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
];

const TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Toronto', label: 'Eastern Time - Toronto' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST)' },
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
  { value: 'Asia/Singapore', label: 'Singapore Time (SGT)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
];

const DATE_FORMATS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US Format)' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (European Format)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO Format)' },
  { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY (Alternative)' },
];

const BUSINESS_TYPES = [
  'Corporation',
  'LLC',
  'Partnership',
  'Sole Proprietorship',
  'Non-Profit',
  'Government',
  'Other'
];

const INDUSTRY_OPTIONS = [
  'Technology',
  'Healthcare',
  'Finance',
  'Manufacturing',
  'Retail',
  'Construction',
  'Real Estate',
  'Education',
  'Consulting',
  'Legal',
  'Marketing',
  'Hospitality',
  'Transportation',
  'Energy',
  'Other'
];

export default function AgencySetup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSetup, setIsCheckingSetup] = useState(true);
  const [setupComplete, setSetupComplete] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    // Step 1: Company Profile
    companyName: '',
    companyTagline: '',
    industry: '',
    businessType: '',
    foundedYear: '',
    employeeCount: '',
    logo: null as File | null,
    description: '',
    
    // Step 2: Business Details
    legalName: '',
    registrationNumber: '',
    taxId: '',
    taxIdType: 'EIN', // EIN, VAT, GST, Other
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'United States',
    },
    phone: '',
    email: '',
    website: '',
    socialMedia: {
      linkedin: '',
      twitter: '',
      facebook: '',
    },
    
    // Step 3: Departments
    departments: [] as Array<{ id: string; name: string; description: string; manager: string; budget: string }>,
    
    // Step 4: Financial Setup
    currency: 'USD',
    fiscalYearStart: '01-01',
    paymentTerms: '30',
    invoicePrefix: 'INV',
    taxRate: '0',
    enableGST: false,
    gstNumber: '',
    bankDetails: {
      accountName: '',
      accountNumber: '',
      bankName: '',
      routingNumber: '',
      swiftCode: '',
    },
    
    // Step 5: Team Members
    teamMembers: [] as Array<{ 
      name: string; 
      email: string; 
      role: string; 
      department: string;
      phone: string;
      title: string;
    }>,
    
    // Step 6: Preferences
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12', // 12 or 24
    weekStart: 'Monday',
    language: 'en',
    notifications: {
      email: true,
      sms: false,
      push: true,
      weeklyReport: true,
      monthlyReport: true,
    },
    features: {
      enablePayroll: true,
      enableProjects: true,
      enableCRM: true,
      enableInventory: false,
      enableReports: true,
    },
  });

  // Scroll to top on mount and step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentStep]);

  // Check if setup is already complete
  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        const agencyDatabase = localStorage.getItem('agency_database');
        if (!agencyDatabase) {
          navigate('/dashboard');
          return;
        }

        const apiBaseUrl = getApiBaseUrl();
        
        const response = await fetch(`${apiBaseUrl}/api/agencies/check-setup?database=${encodeURIComponent(agencyDatabase || '')}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'X-Agency-Database': agencyDatabase || '',
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.setupComplete) {
            setSetupComplete(true);
            navigate('/dashboard');
            return;
          }
        }
      } catch (error) {
        console.error('Error checking setup status:', error);
      } finally {
        setIsCheckingSetup(false);
      }
    };

    checkSetupStatus();
  }, [navigate]);

  // Prefill from both main DB and agency DB agency_settings
  useEffect(() => {
    const prefillFromSettings = async () => {
      try {
        const agencyId = localStorage.getItem('agency_id');
        const agencyDatabase = localStorage.getItem('agency_database');
        
        if (!agencyId && !agencyDatabase) return;

        const apiBaseUrl = getApiBaseUrl();

        // Fetch from both sources in parallel
        const [mainDbResponse, agencyDbResponse] = await Promise.allSettled([
          // Main DB settings (for modules, primary_focus, etc.)
          agencyId ? fetch(`${apiBaseUrl}/api/system/agency-settings/${encodeURIComponent(agencyId)}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
            },
          }) : Promise.resolve(null),
          
          // Agency DB settings (for detailed onboarding data)
          agencyDatabase ? fetch(`${apiBaseUrl}/api/agencies/agency-settings?database=${encodeURIComponent(agencyDatabase)}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
              'X-Agency-Database': agencyDatabase,
            },
          }) : Promise.resolve(null),
        ]);

        // Parse main DB settings
        let mainSettings = null;
        if (mainDbResponse.status === 'fulfilled' && mainDbResponse.value && mainDbResponse.value.ok) {
          try {
            const mainData = await mainDbResponse.value.json();
            mainSettings = mainData?.data?.settings || mainData.settings;
            console.log('[AgencySetup] Loaded main DB settings:', { 
              agency_name: mainSettings?.agency_name, 
              industry: mainSettings?.industry,
              phone: mainSettings?.phone,
              employee_count: mainSettings?.employee_count 
            });
          } catch (error) {
            console.warn('[AgencySetup] Failed to parse main DB settings:', error);
          }
        } else if (mainDbResponse.status === 'rejected') {
          console.warn('[AgencySetup] Main DB settings fetch rejected:', mainDbResponse.reason);
        }

        // Parse agency DB settings
        let agencySettings = null;
        if (agencyDbResponse.status === 'fulfilled' && agencyDbResponse.value && agencyDbResponse.value.ok) {
          try {
            const agencyData = await agencyDbResponse.value.json();
            agencySettings = agencyData?.data?.settings || agencyData.settings;
            console.log('[AgencySetup] Loaded agency DB settings:', { 
              agency_name: agencySettings?.agency_name, 
              industry: agencySettings?.industry,
              phone: agencySettings?.phone,
              employee_count: agencySettings?.employee_count 
            });
          } catch (error) {
            console.warn('[AgencySetup] Failed to parse agency DB settings:', error);
          }
        } else if (agencyDbResponse.status === 'rejected') {
          console.warn('[AgencySetup] Agency DB settings fetch rejected:', agencyDbResponse.reason);
        }

        // Merge settings intelligently (agency DB takes precedence for detailed fields)
        // But skip default values like "My Agency" and prefer main DB in those cases
        const agencyNameFromAgencyDb = agencySettings?.agency_name;
        const agencyNameFromMainDb = mainSettings?.agency_name;
        // Use agency DB name only if it's not empty and not the default "My Agency"
        const finalAgencyName = (agencyNameFromAgencyDb && 
                                 agencyNameFromAgencyDb !== '' && 
                                 agencyNameFromAgencyDb !== 'My Agency')
          ? agencyNameFromAgencyDb
          : (agencyNameFromMainDb || agencyNameFromAgencyDb);
        
        const mergedSettings = {
          ...mainSettings,
          ...agencySettings,
          // Use the final agency name (prefer main DB if agency DB has default)
          agency_name: finalAgencyName,
          industry: agencySettings?.industry || mainSettings?.industry,
          phone: agencySettings?.phone || mainSettings?.phone,
          employee_count: agencySettings?.employee_count || mainSettings?.employee_count,
          enable_gst: typeof agencySettings?.enable_gst === 'boolean' 
            ? agencySettings.enable_gst 
            : (typeof mainSettings?.enable_gst === 'boolean' ? mainSettings.enable_gst : undefined),
          modules: agencySettings?.modules || mainSettings?.modules,
        };

        if (!mergedSettings && !mainSettings && !agencySettings) return;

        // Build address object from structured fields - check both agency DB and main DB
        const addressObj = agencySettings?.address || (
          (agencySettings && (
            agencySettings.address_street || agencySettings.address_city || agencySettings.address_state
              ? {
                  street: agencySettings.address_street || '',
                  city: agencySettings.address_city || '',
                  state: agencySettings.address_state || '',
                  zipCode: agencySettings.address_zip || '',
                  country: agencySettings.address_country || '',
                }
              : null
          )) ||
          (mainSettings && (
            mainSettings.address_street || mainSettings.address_city || mainSettings.address_state
              ? {
                  street: mainSettings.address_street || '',
                  city: mainSettings.address_city || '',
                  state: mainSettings.address_state || '',
                  zipCode: mainSettings.address_zip || '',
                  country: mainSettings.address_country || '',
                }
              : null
          ))
        );

        // Only update if we have actual data to prefill
        // Check if we have any settings data (even if agency_name is default, we might have other fields)
        const hasDataToPrefill = (mergedSettings && Object.keys(mergedSettings).length > 0) || 
                                  agencySettings || 
                                  mainSettings;
        
        console.log('[AgencySetup] Prefill check:', {
          hasDataToPrefill,
          finalAgencyName,
          agencyNameFromAgencyDb,
          agencyNameFromMainDb,
          mergedSettingsAgencyName: mergedSettings?.agency_name
        });
        
        if (hasDataToPrefill) {
          console.log('[AgencySetup] Prefilling form with settings data');
          
          // Load logo preview if logo_url exists
          const logoUrl = agencySettings?.logo_url || mainSettings?.logo_url;
          if (logoUrl) {
            setLogoPreview(logoUrl);
          }
          
          // Determine the company name to use - prefer main DB if agency DB has default
          const companyNameToUse = finalAgencyName || mergedSettings?.agency_name;
          
          // Helper function to get value only if it's not empty/null
          const getValue = (value: any, fallback: any) => {
            return (value && value !== '' && value !== null && value !== undefined) ? value : fallback;
          };
          
          // Get industry from all sources
          const industryValue = mergedSettings?.industry || agencySettings?.industry || mainSettings?.industry;
          // Get employee count from all sources
          const employeeCountValue = mergedSettings?.employee_count || agencySettings?.employee_count || mainSettings?.employee_count;
          // Get phone from all sources
          const phoneValue = mergedSettings?.phone || agencySettings?.phone || mainSettings?.phone;
          
          console.log('[AgencySetup] Prefilling values:', {
            companyName: companyNameToUse,
            industry: industryValue,
            employeeCount: employeeCountValue,
            phone: phoneValue,
            enableGST: mergedSettings?.enable_gst,
            address: addressObj
          });
          
          setFormData(prev => ({
            ...prev,
            // Company Profile - use the final merged agency name (which skips "My Agency" default)
            companyName: getValue(companyNameToUse, prev.companyName),
            companyTagline: getValue(agencySettings?.company_tagline, prev.companyTagline),
            // Industry - check both sources and ensure it matches one of the valid options
            industry: getValue(industryValue, prev.industry),
            businessType: getValue(agencySettings?.business_type, prev.businessType),
            foundedYear: getValue(agencySettings?.founded_year, prev.foundedYear),
            // Employee count - map companySize to employeeCount format if needed
            employeeCount: getValue(employeeCountValue, prev.employeeCount),
            description: getValue(agencySettings?.description, prev.description),
            
            // Business Details
            legalName: getValue(agencySettings?.legal_name, prev.legalName),
            registrationNumber: getValue(agencySettings?.registration_number, prev.registrationNumber),
            taxId: getValue(agencySettings?.tax_id, prev.taxId),
            taxIdType: getValue(agencySettings?.tax_id_type, prev.taxIdType),
            // Address - merge address object with existing, only update fields that have values
            address: addressObj ? {
              street: getValue(addressObj.street, prev.address.street),
              city: getValue(addressObj.city, prev.address.city),
              state: getValue(addressObj.state, prev.address.state),
              zipCode: getValue(addressObj.zipCode, prev.address.zipCode),
              country: getValue(addressObj.country, prev.address.country),
            } : prev.address,
            // Phone - check both sources
            phone: getValue(phoneValue, prev.phone),
            email: getValue(agencySettings?.email, prev.email),
            website: getValue(agencySettings?.website, prev.website),
            socialMedia: {
              linkedin: agencySettings?.social_linkedin || prev.socialMedia.linkedin,
              twitter: agencySettings?.social_twitter || prev.socialMedia.twitter,
              facebook: agencySettings?.social_facebook || prev.socialMedia.facebook,
            },
            
            // Financial Setup
            currency: getValue(agencySettings?.currency, prev.currency),
            fiscalYearStart: getValue(agencySettings?.fiscal_year_start, prev.fiscalYearStart),
            paymentTerms: getValue(agencySettings?.payment_terms, prev.paymentTerms),
            invoicePrefix: getValue(agencySettings?.invoice_prefix, prev.invoicePrefix),
            taxRate: agencySettings?.tax_rate !== undefined && agencySettings?.tax_rate !== null
              ? agencySettings.tax_rate.toString()
              : prev.taxRate,
            // Enable GST - check both sources
            enableGST: mergedSettings?.enable_gst !== undefined 
              ? mergedSettings.enable_gst 
              : (mainSettings?.enable_gst !== undefined ? mainSettings.enable_gst : prev.enableGST),
            gstNumber: getValue(agencySettings?.gst_number, prev.gstNumber),
            bankDetails: {
              accountName: agencySettings?.bank_account_name || prev.bankDetails.accountName,
              accountNumber: agencySettings?.bank_account_number || prev.bankDetails.accountNumber,
              bankName: agencySettings?.bank_name || prev.bankDetails.bankName,
              routingNumber: agencySettings?.bank_routing_number || prev.bankDetails.routingNumber,
              swiftCode: agencySettings?.bank_swift_code || prev.bankDetails.swiftCode,
            },
            
            // Preferences
            timezone: agencySettings?.timezone || prev.timezone,
            dateFormat: agencySettings?.date_format || prev.dateFormat,
            timeFormat: agencySettings?.time_format || prev.timeFormat,
            weekStart: agencySettings?.week_start || prev.weekStart,
            language: agencySettings?.language || prev.language,
            notifications: {
              email: agencySettings?.notifications_email !== undefined ? agencySettings.notifications_email : prev.notifications.email,
              sms: agencySettings?.notifications_sms !== undefined ? agencySettings.notifications_sms : prev.notifications.sms,
              push: agencySettings?.notifications_push !== undefined ? agencySettings.notifications_push : prev.notifications.push,
              weeklyReport: agencySettings?.notifications_weekly_report !== undefined ? agencySettings.notifications_weekly_report : prev.notifications.weeklyReport,
              monthlyReport: agencySettings?.notifications_monthly_report !== undefined ? agencySettings.notifications_monthly_report : prev.notifications.monthlyReport,
            },
            features: {
              enablePayroll: mergedSettings?.modules?.finance ?? agencySettings?.features_enable_payroll ?? prev.features.enablePayroll,
              enableProjects: mergedSettings?.modules?.projects ?? agencySettings?.features_enable_projects ?? prev.features.enableProjects,
              enableCRM: mergedSettings?.modules?.people ?? agencySettings?.features_enable_crm ?? prev.features.enableCRM,
              enableInventory: mergedSettings?.modules?.inventory ?? agencySettings?.features_enable_inventory ?? prev.features.enableInventory,
              enableReports: mergedSettings?.modules?.reports ?? agencySettings?.features_enable_reports ?? prev.features.enableReports,
            },
          }));
        } else {
          console.log('[AgencySetup] No settings data found to prefill');
        }
      } catch (error) {
        // Non-fatal: setup can be completed manually even if prefill fails
        console.warn('Failed to prefill AgencySetup from settings:', error);
      }
    };

    prefillFromSettings();
  }, []);

  if (isCheckingSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Checking setup status...</p>
        </div>
      </div>
    );
  }

  if (setupComplete) {
    return null;
  }

  const progress = (currentStep / SETUP_STEPS.length) * 100;
  const CurrentStepIcon = SETUP_STEPS[currentStep - 1]?.icon || Building2;

  const handleNext = () => {
    // Step-by-step validation
    if (currentStep === 1) {
      if (!formData.companyName.trim()) {
        toast({
          title: 'Validation Error',
          description: 'Company name is required',
          variant: 'destructive',
        });
        return;
      }
    } else if (currentStep === 5) {
      // Validate team members if any are added
      if (formData.teamMembers.length > 0) {
        for (let i = 0; i < formData.teamMembers.length; i++) {
          const member = formData.teamMembers[i];
          if (!member.name || !member.name.trim()) {
            toast({
              title: 'Validation Error',
              description: `Team member ${i + 1}: Name is required`,
              variant: 'destructive',
            });
            return;
          }
          if (!member.email || !member.email.trim()) {
            toast({
              title: 'Validation Error',
              description: `Team member ${i + 1}: Email is required`,
              variant: 'destructive',
            });
            return;
          }
          // Basic email validation
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(member.email)) {
            toast({
              title: 'Validation Error',
              description: `Team member ${i + 1}: Please enter a valid email address`,
              variant: 'destructive',
            });
            return;
          }
        }
      }
    }
    
    if (currentStep < SETUP_STEPS.length) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Logo must be less than 5MB',
          variant: 'destructive',
        });
        return;
      }
      setFormData(prev => ({ ...prev, logo: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleComplete = async () => {
    if (!formData.companyName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Company name is required',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const apiBaseUrl = getApiBaseUrl();
      
      const agencyDatabase = localStorage.getItem('agency_database');
      
      // Convert logo to base64 if present
      let logoBase64 = null;
      if (formData.logo) {
        const reader = new FileReader();
        logoBase64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(formData.logo!);
        });
      }

      // Normalize team members: ensure all have role='department_head' (backend will enforce this too)
      const normalizedTeamMembers = formData.teamMembers.map(member => ({
        ...member,
        role: 'department_head', // Force department_head role for all team members in setup
      }));

      const response = await fetch(`${apiBaseUrl}/api/agencies/complete-setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'X-Agency-Database': agencyDatabase || '',
        },
        body: JSON.stringify({
          ...formData,
          teamMembers: normalizedTeamMembers,
          logo: logoBase64,
          database: agencyDatabase,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to complete setup');
      }

      const result = await response.json().catch(() => ({} as any));

      // If backend returned a CSV of department head credentials, trigger a download
      if (result?.teamCredentialsCsv) {
        try {
          const blob = new Blob([result.teamCredentialsCsv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', 'department-head-credentials.csv');
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } catch (e) {
          console.warn('Failed to trigger CSV download for team credentials:', e);
        }
      }

      toast({
        title: '🎉 Setup Complete!',
        description: 'Your agency is now fully configured and ready to use.',
      });

      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error: any) {
      toast({
        title: 'Setup Failed',
        description: error.message || 'An error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const completedSteps = currentStep - 1;
  const totalSteps = SETUP_STEPS.length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 md:pb-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Professional Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                Agency Setup
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                Configure your workspace settings
              </p>
            </div>
          </div>
        </div>

        {/* Professional Progress Section */}
        <Card className="mb-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 px-4 md:px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                  <CurrentStepIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg md:text-xl font-semibold text-slate-900 dark:text-white">
                    {SETUP_STEPS[currentStep - 1]?.title}
                  </CardTitle>
                  <CardDescription className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                    {SETUP_STEPS[currentStep - 1]?.description}
                  </CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs font-medium px-3 py-1">
                Step {currentStep} of {totalSteps}
              </Badge>
            </div>
            
            {/* Professional Progress Bar */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">Overall Progress</span>
                <span className="font-semibold text-primary">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              {/* Step Indicators */}
              <div className="flex items-center justify-between pt-2">
                {SETUP_STEPS.map((step, idx) => {
                  const isCompleted = idx + 1 < currentStep;
                  const isCurrent = idx + 1 === currentStep;
                  const StepIcon = step.icon;
                  
                  return (
                    <div key={step.id} className="flex flex-col items-center gap-2 flex-1">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-all ${
                        isCompleted
                          ? 'bg-primary text-white'
                          : isCurrent
                          ? 'bg-primary text-white ring-2 ring-primary/30'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <StepIcon className="h-4 w-4" />
                        )}
                      </div>
                      <span className={`text-[10px] font-medium text-center hidden sm:block max-w-[60px] ${
                        isCurrent ? 'text-primary' : isCompleted ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-600'
                      }`}>
                        {step.title.split(' ')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Step Content - Professional Window Design */}
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm mb-20 md:mb-0">
          <CardContent className="p-4 md:p-6 lg:p-8">
            {/* Step 1: Company Profile */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-lg md:text-xl font-semibold mb-1.5 flex items-center gap-2 text-slate-900 dark:text-white">
                    <Building2 className="h-5 w-5 text-primary" />
                    Company Profile
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Tell us about your company. This information will be used throughout the platform.
                  </p>
                </div>

                <div className="grid gap-6">
                  {/* Logo Upload */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Company Logo</Label>
                    <div className="flex items-center gap-6">
                      <div className="h-32 w-32 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/50 overflow-hidden">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo preview" className="h-full w-full object-contain" />
                        ) : (
                          <div className="text-center">
                            <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">No logo</p>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                          id="logo-upload"
                        />
                        <Label htmlFor="logo-upload" className="cursor-pointer">
                          <Button type="button" variant="outline" asChild>
                            <span>
                              <Upload className="mr-2 h-4 w-4" />
                              Upload Logo
                            </span>
                          </Button>
                        </Label>
                        <p className="text-xs text-muted-foreground mt-2">
                          Recommended: 512x512px, PNG or JPG, max 5MB
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="companyName" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Company Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="companyName"
                        placeholder="Enter your company name"
                        value={formData.companyName}
                        onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                        className="h-11 md:h-11 text-base"
                        autoComplete="organization"
                        inputMode="text"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="companyTagline" className="text-sm font-medium text-slate-700 dark:text-slate-300">Company Tagline</Label>
                      <Input
                        id="companyTagline"
                        placeholder="Your company's tagline or slogan"
                        value={formData.companyTagline}
                        onChange={(e) => setFormData(prev => ({ ...prev, companyTagline: e.target.value }))}
                        className="h-11 md:h-11 text-base"
                        autoComplete="off"
                        inputMode="text"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="industry" className="text-sm font-medium text-slate-700 dark:text-slate-300">Industry</Label>
                      <Select
                        value={formData.industry}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, industry: value }))}
                      >
                        <SelectTrigger className="h-11 md:h-11 text-base">
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {INDUSTRY_OPTIONS.map((industry) => (
                            <SelectItem key={industry} value={industry} className="text-base">
                              {industry}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="businessType" className="text-sm font-medium text-slate-700 dark:text-slate-300">Business Type</Label>
                      <Select
                        value={formData.businessType}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, businessType: value }))}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select business type" />
                        </SelectTrigger>
                        <SelectContent>
                          {BUSINESS_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                      <div className="space-y-2">
                        <Label htmlFor="foundedYear" className="text-sm font-medium text-slate-700 dark:text-slate-300">Year Founded</Label>
                        <Input
                          id="foundedYear"
                          type="number"
                          placeholder="e.g., 2020"
                          value={formData.foundedYear}
                          onChange={(e) => setFormData(prev => ({ ...prev, foundedYear: e.target.value }))}
                          className="h-11 md:h-11 text-base"
                          min="1900"
                          max={new Date().getFullYear()}
                          inputMode="numeric"
                          autoComplete="off"
                        />
                      </div>

                    <div className="space-y-2">
                      <Label htmlFor="employeeCount">Number of Employees</Label>
                      <Select
                        value={formData.employeeCount}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, employeeCount: value }))}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-10">1-10</SelectItem>
                          <SelectItem value="11-50">11-50</SelectItem>
                          <SelectItem value="51-200">51-200</SelectItem>
                          <SelectItem value="201-500">201-500</SelectItem>
                          <SelectItem value="501-1000">501-1000</SelectItem>
                          <SelectItem value="1000+">1000+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="description" className="text-sm font-medium text-slate-700 dark:text-slate-300">Company Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Brief description of your company..."
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows={4}
                        className="resize-none text-base"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Business Details */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-lg md:text-xl font-semibold mb-1.5 flex items-center gap-2 text-slate-900 dark:text-white">
                    <FileText className="h-5 w-5 text-primary" />
                    Business Details
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Legal and contact information for your business
                  </p>
                </div>

                <Tabs defaultValue="legal" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 h-auto">
                    <TabsTrigger value="legal" className="text-xs md:text-sm py-2 md:py-2.5 px-2 md:px-4">Legal Info</TabsTrigger>
                    <TabsTrigger value="address" className="text-xs md:text-sm py-2 md:py-2.5 px-2 md:px-4">Address</TabsTrigger>
                    <TabsTrigger value="contact" className="text-xs md:text-sm py-2 md:py-2.5 px-2 md:px-4">Contact</TabsTrigger>
                  </TabsList>

                  <TabsContent value="legal" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
                    <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="legalName" className="text-sm font-medium text-slate-700 dark:text-slate-300">Legal Business Name</Label>
                        <Input
                          id="legalName"
                          placeholder="As registered with authorities"
                          value={formData.legalName}
                          onChange={(e) => setFormData(prev => ({ ...prev, legalName: e.target.value }))}
                          className="h-11 md:h-11 text-base"
                          autoComplete="organization"
                          inputMode="text"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="registrationNumber">Registration Number</Label>
                        <Input
                          id="registrationNumber"
                          placeholder="Business registration number"
                          value={formData.registrationNumber}
                          onChange={(e) => setFormData(prev => ({ ...prev, registrationNumber: e.target.value }))}
                          className="h-11"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="taxIdType" className="text-sm font-medium text-slate-700 dark:text-slate-300">Tax ID Type</Label>
                        <Select
                          value={formData.taxIdType}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, taxIdType: value }))}
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="EIN">EIN (US)</SelectItem>
                            <SelectItem value="VAT">VAT (EU)</SelectItem>
                            <SelectItem value="GST">GST (India/Canada)</SelectItem>
                            <SelectItem value="ABN">ABN (Australia)</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="taxId">Tax ID Number</Label>
                        <Input
                          id="taxId"
                          placeholder="Enter your tax ID"
                          value={formData.taxId}
                          onChange={(e) => setFormData(prev => ({ ...prev, taxId: e.target.value }))}
                          className="h-11"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="address" className="space-y-6 mt-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="street" className="text-sm font-medium text-slate-700 dark:text-slate-300">Street Address</Label>
                        <Input
                          id="street"
                          placeholder="123 Main Street"
                          value={formData.address.street}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            address: { ...prev.address, street: e.target.value }
                          }))}
                          className="h-11"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="city" className="text-sm font-medium text-slate-700 dark:text-slate-300">City</Label>
                        <Input
                          id="city"
                          placeholder="City"
                          value={formData.address.city}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            address: { ...prev.address, city: e.target.value }
                          }))}
                          className="h-11"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="state" className="text-sm font-medium text-slate-700 dark:text-slate-300">State/Province</Label>
                        <Input
                          id="state"
                          placeholder="State or Province"
                          value={formData.address.state}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            address: { ...prev.address, state: e.target.value }
                          }))}
                          className="h-11"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="zipCode" className="text-sm font-medium text-slate-700 dark:text-slate-300">ZIP/Postal Code</Label>
                        <Input
                          id="zipCode"
                          placeholder="12345"
                          value={formData.address.zipCode}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            address: { ...prev.address, zipCode: e.target.value }
                          }))}
                          className="h-11"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="country" className="text-sm font-medium text-slate-700 dark:text-slate-300">Country</Label>
                        <Input
                          id="country"
                          placeholder="Country"
                          value={formData.address.country}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            address: { ...prev.address, country: e.target.value }
                          }))}
                          className="h-11"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="contact" className="space-y-6 mt-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone Number</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="+1 (555) 123-4567"
                            value={formData.phone}
                            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                            className="h-11 md:h-11 pl-10 text-base"
                            autoComplete="tel"
                            inputMode="tel"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">Business Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="contact@company.com"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            className="h-11 md:h-11 pl-10 text-base"
                            autoComplete="email"
                            inputMode="email"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="website" className="text-sm font-medium text-slate-700 dark:text-slate-300">Website</Label>
                        <div className="relative">
                          <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="website"
                            type="url"
                            placeholder="https://yourcompany.com"
                            value={formData.website}
                            onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                            className="h-11 md:h-11 pl-10 text-base"
                            autoComplete="url"
                            inputMode="url"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="linkedin" className="text-sm font-medium text-slate-700 dark:text-slate-300">LinkedIn</Label>
                        <Input
                          id="linkedin"
                          type="url"
                          placeholder="https://linkedin.com/company/..."
                          value={formData.socialMedia.linkedin}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            socialMedia: { ...prev.socialMedia, linkedin: e.target.value }
                          }))}
                          className="h-11"
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* Step 3: Departments - Enhanced */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-lg md:text-xl font-semibold mb-1.5 flex items-center gap-2 text-slate-900 dark:text-white">
                    <Briefcase className="h-5 w-5 text-primary" />
                    Organizational Structure
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Set up your departments and organizational hierarchy
                  </p>
                </div>

                <div className="space-y-4">
                  {formData.departments.map((dept, index) => (
                    <Card key={dept.id} className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                      <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-semibold text-slate-900 dark:text-white">
                            Department {index + 1}
                          </CardTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                departments: prev.departments.filter((_, i) => i !== index)
                              }));
                            }}
                            className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Department Name *</Label>
                          <Input
                            value={dept.name}
                            onChange={(e) => {
                              const updated = [...formData.departments];
                              updated[index].name = e.target.value;
                              setFormData(prev => ({ ...prev, departments: updated }));
                            }}
                            placeholder="e.g., Engineering, Sales, HR"
                            className="h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Department Manager</Label>
                          <Input
                            value={dept.manager}
                            onChange={(e) => {
                              const updated = [...formData.departments];
                              updated[index].manager = e.target.value;
                              setFormData(prev => ({ ...prev, departments: updated }));
                            }}
                            placeholder="Manager name"
                            className="h-11"
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</Label>
                          <Textarea
                            value={dept.description}
                            onChange={(e) => {
                              const updated = [...formData.departments];
                              updated[index].description = e.target.value;
                              setFormData(prev => ({ ...prev, departments: updated }));
                            }}
                            placeholder="Brief description of department responsibilities"
                            rows={2}
                            className="resize-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Annual Budget (Optional)</Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="number"
                              value={dept.budget}
                              onChange={(e) => {
                                const updated = [...formData.departments];
                                updated[index].budget = e.target.value;
                                setFormData(prev => ({ ...prev, departments: updated }));
                              }}
                              placeholder="0.00"
                              className="h-11 md:h-11 pl-10 text-base"
                              inputMode="decimal"
                              autoComplete="off"
                            />
                          </div>
                        </div>
                      </div>
                      </CardContent>
                    </Card>
                  ))}

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        departments: [...prev.departments, {
                          id: generateUUID(),
                          name: '',
                          description: '',
                          manager: '',
                          budget: ''
                        }]
                      }));
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Department
                  </Button>

                  {formData.departments.length === 0 && (
                    <Card className="p-6 text-center border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
                      <Briefcase className="h-10 w-10 mx-auto mb-3 text-slate-400 dark:text-slate-500" />
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">No departments added yet</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        You can add departments now or later from the department management page
                      </p>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Financial Setup */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-lg md:text-xl font-semibold mb-1.5 flex items-center gap-2 text-slate-900 dark:text-white">
                    <DollarSign className="h-5 w-5 text-primary" />
                    Financial Configuration
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Configure currency, billing, and financial settings
                  </p>
                </div>

                <div className="grid gap-6">
                  <Card className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
                      <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
                        <CreditCard className="h-4 w-4 text-primary" />
                        Currency & Billing
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Base Currency</Label>
                          <Select
                            value={formData.currency}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                          >
                            <SelectTrigger className="h-11">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CURRENCIES.map((curr) => (
                                <SelectItem key={curr.code} value={curr.code}>
                                  {curr.symbol} {curr.code} - {curr.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Fiscal Year Start</Label>
                          <Input
                            type="text"
                            placeholder="MM-DD (e.g., 01-01)"
                            value={formData.fiscalYearStart}
                            onChange={(e) => setFormData(prev => ({ ...prev, fiscalYearStart: e.target.value }))}
                            className="h-11"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Default Payment Terms (Days)</Label>
                            <Input
                              type="number"
                              placeholder="30"
                              value={formData.paymentTerms}
                              onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                              className="h-11 md:h-11 text-base"
                              inputMode="numeric"
                              autoComplete="off"
                            />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Invoice Prefix</Label>
                          <Input
                            placeholder="INV"
                            value={formData.invoicePrefix}
                            onChange={(e) => setFormData(prev => ({ ...prev, invoicePrefix: e.target.value }))}
                            className="h-11"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
                      <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
                        <Receipt className="h-4 w-4 text-primary" />
                        Tax Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Default Tax Rate (%)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={formData.taxRate}
                              onChange={(e) => setFormData(prev => ({ ...prev, taxRate: e.target.value }))}
                              className="h-11 md:h-11 text-base"
                              inputMode="decimal"
                              autoComplete="off"
                            />
                        </div>

                        <div className="space-y-2 flex items-center gap-4">
                          <div className="flex-1">
                            <Label>Enable GST/VAT</Label>
                            <p className="text-xs text-muted-foreground">Enable GST/VAT tracking</p>
                          </div>
                          <Switch
                            checked={formData.enableGST}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enableGST: checked }))}
                          />
                        </div>

                        {formData.enableGST && (
                          <div className="space-y-2 md:col-span-2">
                            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">GST/VAT Number</Label>
                            <Input
                              placeholder="Enter GST/VAT number"
                              value={formData.gstNumber}
                              onChange={(e) => setFormData(prev => ({ ...prev, gstNumber: e.target.value }))}
                              className="h-11"
                            />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
                      <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
                        <Landmark className="h-4 w-4 text-primary" />
                        Bank Details (Optional)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Account Name</Label>
                          <Input
                            placeholder="Account holder name"
                            value={formData.bankDetails.accountName}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              bankDetails: { ...prev.bankDetails, accountName: e.target.value }
                            }))}
                            className="h-11"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Account Number</Label>
                          <Input
                            placeholder="Account number"
                            value={formData.bankDetails.accountNumber}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              bankDetails: { ...prev.bankDetails, accountNumber: e.target.value }
                            }))}
                            className="h-11"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Bank Name</Label>
                          <Input
                            placeholder="Bank name"
                            value={formData.bankDetails.bankName}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              bankDetails: { ...prev.bankDetails, bankName: e.target.value }
                            }))}
                            className="h-11"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Routing/SWIFT Code</Label>
                          <Input
                            placeholder="Routing or SWIFT code"
                            value={formData.bankDetails.routingNumber}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              bankDetails: { ...prev.bankDetails, routingNumber: e.target.value }
                            }))}
                            className="h-11"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Step 5: Team Members - Enhanced */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-lg md:text-xl font-semibold mb-1.5 flex items-center gap-2 text-slate-900 dark:text-white">
                    <Users className="h-5 w-5 text-primary" />
                    Department Heads
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Add the key department heads who should lead each area. Other employees can be added later from the employee management page.
                  </p>
                </div>

                <div className="space-y-4">
                  {formData.teamMembers.map((member, index) => (
                    <Card key={index} className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                      <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-semibold text-slate-900 dark:text-white">
                            Team Member {index + 1}
                          </CardTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                teamMembers: prev.teamMembers.filter((_, i) => i !== index)
                              }));
                            }}
                            className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Name *</Label>
                          <Input
                            value={member.name}
                            onChange={(e) => {
                              const updated = [...formData.teamMembers];
                              updated[index].name = e.target.value;
                              setFormData(prev => ({ ...prev, teamMembers: updated }));
                            }}
                            placeholder="John Doe"
                            className="h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Address *</Label>
                          <Input
                            type="email"
                            value={member.email}
                            onChange={(e) => {
                              const updated = [...formData.teamMembers];
                              updated[index].email = e.target.value;
                              setFormData(prev => ({ ...prev, teamMembers: updated }));
                            }}
                            placeholder="john@company.com"
                            className="h-11 md:h-11 text-base"
                            autoComplete="email"
                            inputMode="email"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Job Title</Label>
                          <Input
                            value={member.title}
                            onChange={(e) => {
                              const updated = [...formData.teamMembers];
                              updated[index].title = e.target.value;
                              setFormData(prev => ({ ...prev, teamMembers: updated }));
                            }}
                            placeholder="e.g., Software Engineer"
                            className="h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Department</Label>
                          <Select
                            value={member.department}
                            onValueChange={(value) => {
                              const updated = [...formData.teamMembers];
                              updated[index].department = value;
                              setFormData(prev => ({ ...prev, teamMembers: updated }));
                            }}
                          >
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                            <SelectContent>
                              {formData.departments.map((dept) => (
                                <SelectItem key={dept.id} value={dept.name}>
                                  {dept.name}
                                </SelectItem>
                              ))}
                              <SelectItem value="none">None</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Role</Label>
                          <Input
                            value="Department Head"
                            disabled
                            className="h-11 bg-muted cursor-not-allowed"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone</Label>
                          <Input
                            type="tel"
                            value={member.phone}
                            onChange={(e) => {
                              const updated = [...formData.teamMembers];
                              updated[index].phone = e.target.value;
                              setFormData(prev => ({ ...prev, teamMembers: updated }));
                            }}
                            placeholder="+1 (555) 123-4567"
                            className="h-11 md:h-11 text-base"
                            autoComplete="tel"
                            inputMode="tel"
                          />
                        </div>
                      </div>
                      </CardContent>
                    </Card>
                  ))}

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        teamMembers: [...prev.teamMembers, {
                          name: '',
                          email: '',
                          role: 'department_head',
                          department: '',
                          phone: '',
                          title: ''
                        }]
                      }));
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Team Member
                  </Button>

                  {formData.teamMembers.length === 0 && (
                    <Card className="p-6 text-center border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
                      <Users className="h-10 w-10 mx-auto mb-3 text-slate-400 dark:text-slate-500" />
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">No team members added yet</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        You can add team members now or later from the employee management page
                      </p>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {/* Step 6: Preferences */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-lg md:text-xl font-semibold mb-1.5 flex items-center gap-2 text-slate-900 dark:text-white">
                    <Settings className="h-5 w-5 text-primary" />
                    System Preferences
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Configure your system preferences and notification settings
                  </p>
                </div>

                <div className="grid gap-6">
                  <Card className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
                      <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
                        <Globe2 className="h-4 w-4 text-primary" />
                        Localization
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Timezone</Label>
                          <Select
                            value={formData.timezone}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))}
                          >
                            <SelectTrigger className="h-11">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIMEZONES.map((tz) => (
                                <SelectItem key={tz.value} value={tz.value}>
                                  {tz.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Date Format</Label>
                          <Select
                            value={formData.dateFormat}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, dateFormat: value }))}
                          >
                            <SelectTrigger className="h-11">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DATE_FORMATS.map((format) => (
                                <SelectItem key={format.value} value={format.value}>
                                  {format.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Time Format</Label>
                          <Select
                            value={formData.timeFormat}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, timeFormat: value }))}
                          >
                            <SelectTrigger className="h-11">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="12">12-hour (AM/PM)</SelectItem>
                              <SelectItem value="24">24-hour</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Week Starts On</Label>
                          <Select
                            value={formData.weekStart}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, weekStart: value }))}
                          >
                            <SelectTrigger className="h-11">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Monday">Monday</SelectItem>
                              <SelectItem value="Sunday">Sunday</SelectItem>
                              <SelectItem value="Saturday">Saturday</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
                      <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
                        <Bell className="h-4 w-4 text-primary" />
                        Notifications
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Notifications</Label>
                          <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                        </div>
                        <Switch
                          checked={formData.notifications.email}
                          onCheckedChange={(checked) => setFormData(prev => ({ 
                            ...prev, 
                            notifications: { ...prev.notifications, email: checked }
                          }))}
                        />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">SMS Notifications</Label>
                          <p className="text-sm text-muted-foreground">Receive notifications via SMS</p>
                        </div>
                        <Switch
                          checked={formData.notifications.sms}
                          onCheckedChange={(checked) => setFormData(prev => ({ 
                            ...prev, 
                            notifications: { ...prev.notifications, sms: checked }
                          }))}
                        />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Push Notifications</Label>
                          <p className="text-sm text-muted-foreground">Receive browser push notifications</p>
                        </div>
                        <Switch
                          checked={formData.notifications.push}
                          onCheckedChange={(checked) => setFormData(prev => ({ 
                            ...prev, 
                            notifications: { ...prev.notifications, push: checked }
                          }))}
                        />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Weekly Reports</Label>
                          <p className="text-sm text-muted-foreground">Receive weekly summary reports</p>
                        </div>
                        <Switch
                          checked={formData.notifications.weeklyReport}
                          onCheckedChange={(checked) => setFormData(prev => ({ 
                            ...prev, 
                            notifications: { ...prev.notifications, weeklyReport: checked }
                          }))}
                        />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Monthly Reports</Label>
                          <p className="text-sm text-muted-foreground">Receive monthly summary reports</p>
                        </div>
                        <Switch
                          checked={formData.notifications.monthlyReport}
                          onCheckedChange={(checked) => setFormData(prev => ({ 
                            ...prev, 
                            notifications: { ...prev.notifications, monthlyReport: checked }
                          }))}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
                      <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
                        <Zap className="h-4 w-4 text-primary" />
                        Feature Preferences
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Payroll Management</Label>
                          <p className="text-sm text-muted-foreground">Enable payroll features</p>
                        </div>
                        <Switch
                          checked={formData.features.enablePayroll}
                          onCheckedChange={(checked) => setFormData(prev => ({ 
                            ...prev, 
                            features: { ...prev.features, enablePayroll: checked }
                          }))}
                        />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Project Management</Label>
                          <p className="text-sm text-muted-foreground">Enable project tracking</p>
                        </div>
                        <Switch
                          checked={formData.features.enableProjects}
                          onCheckedChange={(checked) => setFormData(prev => ({ 
                            ...prev, 
                            features: { ...prev.features, enableProjects: checked }
                          }))}
                        />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">CRM</Label>
                          <p className="text-sm text-muted-foreground">Enable customer relationship management</p>
                        </div>
                        <Switch
                          checked={formData.features.enableCRM}
                          onCheckedChange={(checked) => setFormData(prev => ({ 
                            ...prev, 
                            features: { ...prev.features, enableCRM: checked }
                          }))}
                        />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Inventory Management</Label>
                          <p className="text-sm text-muted-foreground">Enable inventory tracking</p>
                        </div>
                        <Switch
                          checked={formData.features.enableInventory}
                          onCheckedChange={(checked) => setFormData(prev => ({ 
                            ...prev, 
                            features: { ...prev.features, enableInventory: checked }
                          }))}
                        />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Advanced Reports</Label>
                          <p className="text-sm text-muted-foreground">Enable advanced reporting features</p>
                        </div>
                        <Switch
                          checked={formData.features.enableReports}
                          onCheckedChange={(checked) => setFormData(prev => ({ 
                            ...prev, 
                            features: { ...prev.features, enableReports: checked }
                          }))}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Step 7: Review & Complete */}
            {currentStep === 7 && (
              <div className="space-y-6">
                <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-lg md:text-xl font-semibold mb-1.5 flex items-center gap-2 text-slate-900 dark:text-white">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Review & Complete Setup
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Review all your information before completing the setup
                  </p>
                </div>

                <div className="grid gap-4">
                  {/* Company Profile */}
                  <Card className="border border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
                      <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
                        <Building2 className="h-4 w-4 text-primary" />
                        Company Profile
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Company Name</Label>
                          <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">{formData.companyName || <span className="text-slate-400 dark:text-slate-500 italic">Not provided</span>}</p>
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Industry</Label>
                          <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">{formData.industry || <span className="text-slate-400 dark:text-slate-500 italic">Not provided</span>}</p>
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Business Type</Label>
                          <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">{formData.businessType || <span className="text-slate-400 dark:text-slate-500 italic">Not provided</span>}</p>
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Employees</Label>
                          <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">{formData.employeeCount || <span className="text-slate-400 dark:text-slate-500 italic">Not provided</span>}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Business Details */}
                  <Card className="border border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
                      <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
                        <FileText className="h-4 w-4 text-primary" />
                        Business Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Legal Name</Label>
                          <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">{formData.legalName || <span className="text-slate-400 dark:text-slate-500 italic">Not provided</span>}</p>
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Tax ID</Label>
                          <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">{formData.taxId || <span className="text-slate-400 dark:text-slate-500 italic">Not provided</span>}</p>
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Address</Label>
                          <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">
                            {formData.address.street || <span className="text-slate-400 dark:text-slate-500 italic">Not provided</span>}
                            {formData.address.city && `, ${formData.address.city}`}
                            {formData.address.state && `, ${formData.address.state}`}
                            {formData.address.zipCode && ` ${formData.address.zipCode}`}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Departments */}
                  <Card className="border border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
                      <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
                        <Briefcase className="h-4 w-4 text-primary" />
                        Departments ({formData.departments.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      {formData.departments.length > 0 ? (
                        <div className="space-y-2">
                          {formData.departments.map((dept) => (
                            <div key={dept.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                              <Check className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium text-slate-900 dark:text-white">{dept.name}</span>
                              {dept.manager && <span className="text-xs text-slate-500 dark:text-slate-400">- {dept.manager}</span>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400">No departments added</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Financial */}
                  <Card className="border border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
                      <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
                        <DollarSign className="h-4 w-4 text-primary" />
                        Financial Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Currency</Label>
                          <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">{formData.currency}</p>
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Payment Terms</Label>
                          <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">{formData.paymentTerms} days</p>
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Tax Rate</Label>
                          <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">{formData.taxRate}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Team Members */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Team Members ({formData.teamMembers.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {formData.teamMembers.length > 0 ? (
                        <div className="space-y-2">
                          {formData.teamMembers.map((member, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                              <Check className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium text-slate-900 dark:text-white">{member.name}</span>
                              <span className="text-xs text-slate-500 dark:text-slate-400">({member.email})</span>
                              <Badge variant="secondary" className="ml-auto text-xs">{member.role}</Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400">No team members added</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Preferences */}
                  <Card className="border border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
                      <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
                        <Settings className="h-4 w-4 text-primary" />
                        Preferences
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Timezone</Label>
                          <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">{TIMEZONES.find(tz => tz.value === formData.timezone)?.label || formData.timezone}</p>
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Date Format</Label>
                          <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">{DATE_FORMATS.find(df => df.value === formData.dateFormat)?.label || formData.dateFormat}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-primary/50 bg-primary/5">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-start gap-3 md:gap-4">
                      <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Info className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold mb-1 text-sm md:text-base">Ready to Complete Setup?</h4>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          Once you complete the setup, you'll be redirected to your dashboard. 
                          You can always update these settings later from the settings page.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Navigation Buttons - Desktop */}
            <div className="hidden md:flex justify-between items-center mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1 || isLoading}
                size="lg"
                className="border-slate-300 dark:border-slate-700"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <span>Step {currentStep} of {totalSteps}</span>
              </div>

              {currentStep < SETUP_STEPS.length ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={isLoading}
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleComplete}
                  disabled={isLoading}
                  size="lg"
                  className="min-w-[160px] bg-primary hover:bg-primary/90 text-white"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Completing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Complete Setup
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sticky Navigation Buttons - Mobile Only */}
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-lg safe-area-inset-bottom">
          <div className="max-w-5xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1 || isLoading}
                size="default"
                className="flex-1 max-w-[120px] border-slate-300 dark:border-slate-700"
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                <span className="text-sm">Back</span>
              </Button>

              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 px-2">
                <span className="font-medium">{currentStep}</span>
                <span>/</span>
                <span>{totalSteps}</span>
              </div>

              {currentStep < SETUP_STEPS.length ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={isLoading}
                  size="default"
                  className="flex-1 bg-primary hover:bg-primary/90 text-white font-medium"
                >
                  <span className="text-sm">Continue</span>
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleComplete}
                  disabled={isLoading}
                  size="default"
                  className="flex-1 bg-primary hover:bg-primary/90 text-white font-medium"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      <span className="text-sm">Completing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-1.5 h-4 w-4" />
                      <span className="text-sm">Complete Setup</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
