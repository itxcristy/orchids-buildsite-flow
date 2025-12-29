import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { db } from '@/lib/database';
import { useAuth } from "@/hooks/useAuth";
import { selectOne, updateRecord, insertRecord } from '@/services/api/postgresql-service';
import { useCurrency } from "@/hooks/useCurrency";
import { useAgencySettings } from "@/hooks/useAgencySettings";
import { getAgencyId } from '@/utils/agencyUtils';
import { compressImage } from "@/utils/imageCompression";
import { 
  Save, Bell, Shield, User, Building, Upload, X, DollarSign, 
  Palette, Globe, Calendar, Clock, Lock, Eye, EyeOff, Mail, 
  Smartphone, CheckCircle, AlertCircle, Loader2, KeyRound, QrCode
} from "lucide-react";
import { TwoFactorSetup } from "@/components/TwoFactorSetup";
import { getTwoFactorStatus, disableTwoFactor } from "@/services/api/twoFactor-service";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Type definitions for all settings
interface AgencySettings {
  id?: string;
  agency_id?: string;
  agency_name: string;
  logo_url: string;
  domain: string;
  default_currency: string;
  primary_color: string;
  secondary_color: string;
  timezone: string;
  date_format: string;
  fiscal_year_start: string;
  working_hours_start: string;
  working_hours_end: string;
  working_days: string[];
}

interface ProfileSettings {
  id?: string;
  user_id?: string;
  full_name: string;
  phone: string;
  department: string;
  position: string;
  avatar_url: string;
}

interface NotificationSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  task_reminders: boolean;
  leave_notifications: boolean;
  payroll_notifications: boolean;
  project_updates: boolean;
  system_alerts: boolean;
  marketing_emails: boolean;
}

interface SecuritySettings {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

// Available timezones
const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST)' },
  { value: 'Asia/Singapore', label: 'Singapore Time (SGT)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
];

// Date format options
const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2024)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2024)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2024-12-31)' },
  { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY (31-12-2024)' },
  { value: 'MMM DD, YYYY', label: 'MMM DD, YYYY (Dec 31, 2024)' },
];

// Fiscal year start options
const FISCAL_YEAR_OPTIONS = [
  { value: '01-01', label: 'January 1' },
  { value: '04-01', label: 'April 1 (India)' },
  { value: '07-01', label: 'July 1 (Australia)' },
  { value: '10-01', label: 'October 1' },
];

// Working days
const WEEKDAYS = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
];

// Preset color themes
const COLOR_PRESETS = [
  { name: 'Blue', primary: '#3b82f6', secondary: '#1e40af' },
  { name: 'Green', primary: '#22c55e', secondary: '#15803d' },
  { name: 'Purple', primary: '#8b5cf6', secondary: '#6d28d9' },
  { name: 'Orange', primary: '#f97316', secondary: '#c2410c' },
  { name: 'Red', primary: '#ef4444', secondary: '#b91c1c' },
  { name: 'Teal', primary: '#14b8a6', secondary: '#0f766e' },
  { name: 'Pink', primary: '#ec4899', secondary: '#be185d' },
  { name: 'Indigo', primary: '#6366f1', secondary: '#4338ca' },
];

const Settings = () => {
  const { user, profile, userRole, refreshProfile } = useAuth();
  const { toast } = useToast();
  const { availableCurrencies } = useCurrency();
  const { settings: agencySettingsData, saveSettings: saveAgencySettingsData, loading: loadingAgencyData } = useAgencySettings();
  
  // Loading states
  const [loadingAgency, setLoadingAgency] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [loadingSecurity, setLoadingSecurity] = useState(false);
  const [loading2FA, setLoading2FA] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  // 2FA states
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorVerifiedAt, setTwoFactorVerifiedAt] = useState<string | null>(null);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [disable2FAPassword, setDisable2FAPassword] = useState('');
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  
  // File states
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  
  // Password visibility
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Agency Settings State
  const [agencySettings, setAgencySettings] = useState<AgencySettings>({
    agency_name: '',
    logo_url: '',
    domain: '',
    default_currency: 'IN',
    primary_color: '#3b82f6',
    secondary_color: '#1e40af',
    timezone: 'Asia/Kolkata',
    date_format: 'DD/MM/YYYY',
    fiscal_year_start: '04-01',
    working_hours_start: '09:00',
    working_hours_end: '18:00',
    working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  });

  // Profile Settings State
  const [profileSettings, setProfileSettings] = useState<ProfileSettings>({
    full_name: '',
    phone: '',
    department: '',
    position: '',
    avatar_url: '',
  });

  // Notification Settings State
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email_notifications: true,
    push_notifications: false,
    task_reminders: true,
    leave_notifications: true,
    payroll_notifications: true,
    project_updates: true,
    system_alerts: true,
    marketing_emails: false,
  });

  // Security Settings State
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  // Check if user is admin or super_admin
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  // Fetch all settings on mount
  useEffect(() => {
    const fetchAllSettings = async () => {
      setInitialLoading(true);
      await Promise.all([
        fetchProfileSettings(),
        fetchNotificationSettings(),
        fetch2FAStatus(),
      ]);
      setInitialLoading(false);
    };
    
    fetchAllSettings();
  }, [user?.id]);
  
  // Fetch 2FA status
  const fetch2FAStatus = async () => {
    if (!user?.id) {
      setTwoFactorEnabled(false);
      return;
    }
    
    setLoading2FA(true);
    try {
      const response = await getTwoFactorStatus();
      if (response && response.success) {
        setTwoFactorEnabled(response.data?.enabled || false);
        setTwoFactorVerifiedAt(response.data?.verifiedAt || null);
      } else {
        setTwoFactorEnabled(false);
      }
    } catch (error) {
      console.error('Error fetching 2FA status:', error);
      // If 2FA is not set up or there's an error, status will be false
      setTwoFactorEnabled(false);
      setTwoFactorVerifiedAt(null);
    } finally {
      setLoading2FA(false);
    }
  };

  // Update agency settings when hook data changes
  useEffect(() => {
    if (agencySettingsData) {
      fetchAgencySettings();
    }
  }, [agencySettingsData]);

  // Fetch Agency Settings - now using the hook
  const fetchAgencySettings = async () => {
    if (agencySettingsData) {
      // Parse working_days if it's a string
      let workingDays = agencySettingsData.working_days;
      if (typeof workingDays === 'string') {
        try {
          workingDays = JSON.parse(workingDays);
        } catch {
          workingDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        }
      }

      setAgencySettings({
        id: agencySettingsData.id,
        agency_id: agencySettingsData.agency_id,
        agency_name: agencySettingsData.agency_name || '',
        logo_url: agencySettingsData.logo_url || '',
        domain: agencySettingsData.domain || '',
        default_currency: agencySettingsData.default_currency || 'IN',
        primary_color: agencySettingsData.primary_color || '#3b82f6',
        secondary_color: agencySettingsData.secondary_color || '#1e40af',
        timezone: agencySettingsData.timezone || 'Asia/Kolkata',
        date_format: agencySettingsData.date_format || 'DD/MM/YYYY',
        fiscal_year_start: agencySettingsData.fiscal_year_start || '04-01',
        working_hours_start: agencySettingsData.working_hours_start || '09:00',
        working_hours_end: agencySettingsData.working_hours_end || '18:00',
        working_days: (workingDays as string[]) || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      });
      setLogoPreview(agencySettingsData.logo_url || '');
    }
  };

  // Fetch Profile Settings
  const fetchProfileSettings = async () => {
    if (!user?.id) return;
    
    try {
      // Fetch profile using PostgreSQL service
      const profileData = await selectOne('profiles', { user_id: user.id });

      if (profileData) {
        setProfileSettings({
          id: profileData.id,
          user_id: profileData.user_id,
          full_name: profileData.full_name || '',
          phone: profileData.phone || '',
          department: profileData.department || '',
          position: profileData.position || '',
          avatar_url: profileData.avatar_url || '',
        });
        setAvatarPreview(profileData.avatar_url || '');
      } else if (profile) {
        // Use profile from auth context if available
        setProfileSettings({
          full_name: profile.full_name || '',
          phone: profile.phone || '',
          department: profile.department || '',
          position: profile.position || '',
          avatar_url: profile.avatar_url || '',
        });
        setAvatarPreview(profile.avatar_url || '');
      }
    } catch (error) {
      console.error('Error fetching profile settings:', error);
    }
  };

  // Fetch Notification Settings
  const fetchNotificationSettings = async () => {
    if (!user?.id) return;
    
    try {
      // Try to fetch from user_preferences table
      const { data, error } = await db
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setNotificationSettings({
          email_notifications: data.email_notifications ?? true,
          push_notifications: data.push_notifications ?? false,
          task_reminders: data.task_reminders ?? true,
          leave_notifications: data.leave_notifications ?? true,
          payroll_notifications: data.payroll_notifications ?? true,
          project_updates: data.project_updates ?? true,
          system_alerts: data.system_alerts ?? true,
          marketing_emails: data.marketing_emails ?? false,
        });
      } else {
        // Fallback to localStorage
        const stored = localStorage.getItem(`notification_prefs_${user.id}`);
        if (stored) {
          setNotificationSettings(JSON.parse(stored));
        }
      }
    } catch {
      // Fallback to localStorage if table doesn't exist
      const stored = localStorage.getItem(`notification_prefs_${user?.id}`);
      if (stored) {
        setNotificationSettings(JSON.parse(stored));
      }
    }
  };

  // Handle logo file change
  const handleLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "Logo file size must be less than 5MB",
          variant: "destructive",
        });
        return;
      }

      try {
        setLogoFile(file);
        // Compress the image more aggressively to reduce size (max 600x600, 70% quality)
        // This ensures even large images are compressed to a reasonable size
        const compressedDataUrl = await compressImage(file, 600, 600, 0.7);
        const sizeMB = (compressedDataUrl.length / (1024 * 1024)).toFixed(2);
        setLogoPreview(compressedDataUrl);
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to process logo image",
          variant: "destructive",
        });
      }
    }
  };

  // Handle avatar file change
  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "Avatar file size must be less than 2MB",
          variant: "destructive",
        });
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove logo preview
  const removeLogoPreview = () => {
    setLogoFile(null);
    setLogoPreview('');
    setAgencySettings(prev => ({ ...prev, logo_url: '' }));
  };

  // Remove avatar preview
  const removeAvatarPreview = () => {
    setAvatarFile(null);
    setAvatarPreview('');
    setProfileSettings(prev => ({ ...prev, avatar_url: '' }));
  };

  // Save Agency Settings
  const saveAgencySettings = async () => {
    if (!isAdmin) {
      toast({
        title: "Error",
        description: "Only admins can update agency settings",
        variant: "destructive",
      });
      return;
    }

    setLoadingAgency(true);
    try {
      const settingsToSave: any = {
        agency_name: agencySettings.agency_name,
        domain: agencySettings.domain,
        default_currency: agencySettings.default_currency,
        currency: agencySettings.default_currency, // Also save as currency for backward compatibility
        primary_color: agencySettings.primary_color,
        secondary_color: agencySettings.secondary_color,
        timezone: agencySettings.timezone,
        date_format: agencySettings.date_format,
        fiscal_year_start: agencySettings.fiscal_year_start,
        working_hours_start: agencySettings.working_hours_start,
        working_hours_end: agencySettings.working_hours_end,
        working_days: agencySettings.working_days,
      };

      // Only include logo_url if a new logo file was selected
      // This avoids sending large base64 strings if the logo hasn't changed
      if (logoFile && logoPreview) {
        // Log the size for debugging
        const logoSize = logoPreview.length;
        const logoSizeMB = (logoSize / (1024 * 1024)).toFixed(2);
        
        // Warn if still too large (shouldn't happen with compression, but just in case)
        if (logoSize > 5 * 1024 * 1024) {
          toast({
            title: "Warning",
            description: `Logo is ${logoSizeMB}MB. Consider using a smaller image.`,
            variant: "destructive",
          });
        }
        
        settingsToSave.logo_url = logoPreview;
      } else if (!agencySettings.logo_url && agencySettingsData?.logo_url) {
        // If logo was removed, send empty string
        settingsToSave.logo_url = '';
      }
      // If logo hasn't changed, don't include it in the update

      // Use the hook's saveSettings function
      const result = await saveAgencySettingsData(settingsToSave);

      if (result.success) {
        if (logoFile && logoPreview) {
          setAgencySettings(prev => ({ ...prev, logo_url: logoPreview }));
        }
        setLogoFile(null);

        toast({
          title: "Success",
          description: "Agency settings updated successfully",
        });
      } else {
        throw new Error(result.error || 'Failed to save settings');
      }
    } catch (error: any) {
      console.error('Error saving agency settings:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update agency settings",
        variant: "destructive",
      });
    } finally {
      setLoadingAgency(false);
    }
  };

  // Save Profile Settings
  const saveProfileSettings = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to update profile settings",
        variant: "destructive",
      });
      return;
    }

    setLoadingProfile(true);
    try {
      let avatarUrl = profileSettings.avatar_url;

      // If a new avatar file is selected, upload it to file storage
      if (avatarFile) {
        try {
          // Upload avatar to file storage
          const fileExt = avatarFile.name.split('.').pop() || 'jpg';
          const fileName = `avatars/${user.id}_${Date.now()}.${fileExt}`;
          
          const { data: uploadData, error: uploadError } = await db.storage
            .from('avatars')
            .upload(fileName, avatarFile);

          if (uploadError) throw uploadError;

          // Get public URL for the uploaded file
          const { data: urlData } = db.storage
            .from('avatars')
            .getPublicUrl(fileName);

          avatarUrl = urlData?.publicUrl || avatarPreview; // Fallback to base64 if URL generation fails
        } catch (uploadError: any) {
          console.error('Error uploading avatar:', uploadError);
          // Fallback to base64 if upload fails
          avatarUrl = avatarPreview;
        }
      }

      const profileToSave = {
        full_name: profileSettings.full_name,
        phone: profileSettings.phone,
        department: profileSettings.department,
        position: profileSettings.position,
        avatar_url: avatarUrl,
      };

      // Check if profile exists and update/insert using PostgreSQL service
      const existingProfile = await selectOne('profiles', { user_id: user.id });

      if (existingProfile) {
        await updateRecord('profiles', profileToSave, { user_id: user.id }, user.id);
      } else {
        await insertRecord('profiles', {
          ...profileToSave,
          user_id: user.id,
          agency_id: await getAgencyId(profile, user?.id) || undefined,
          is_active: true,
        }, user.id);
      }

      setProfileSettings(prev => ({ ...prev, avatar_url: avatarUrl }));
      setAvatarFile(null);

      // Refresh auth profile so dashboards and headers immediately reflect new avatar/name
      await refreshProfile();

      toast({
        title: "Success",
        description: "Profile settings updated successfully",
      });
    } catch (error: any) {
      console.error('Error saving profile settings:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile settings",
        variant: "destructive",
      });
    } finally {
      setLoadingProfile(false);
    }
  };

  // Save Notification Settings
  const saveNotificationSettings = async () => {
    if (!user?.id) return;

    setLoadingNotifications(true);
    try {
      // Try to save to database first
      try {
        const { data: existingPrefs } = await db
          .from('user_preferences')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (existingPrefs) {
          await db
            .from('user_preferences')
            .update(notificationSettings)
            .eq('user_id', user.id);
        } else {
          await db
            .from('user_preferences')
            .insert({
              user_id: user.id,
              ...notificationSettings,
            });
        }
      } catch {
        // Fallback to localStorage if table doesn't exist
        localStorage.setItem(
          `notification_prefs_${user.id}`,
          JSON.stringify(notificationSettings)
        );
      }

      toast({
        title: "Success",
        description: "Notification preferences updated successfully",
      });
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast({
        title: "Error",
        description: "Failed to update notification preferences",
        variant: "destructive",
      });
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Save Security Settings (Change Password)
  const saveSecuritySettings = async () => {
    if (!user?.id) return;

    // Validate passwords
    if (!securitySettings.current_password) {
      toast({
        title: "Error",
        description: "Please enter your current password",
        variant: "destructive",
      });
      return;
    }

    if (!securitySettings.new_password) {
      toast({
        title: "Error",
        description: "Please enter a new password",
        variant: "destructive",
      });
      return;
    }

    if (securitySettings.new_password.length < 8) {
      toast({
        title: "Error",
        description: "New password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }

    if (securitySettings.new_password !== securitySettings.confirm_password) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    setLoadingSecurity(true);
    try {
      // In a real app, you would call an API to change the password
      // For now, we'll update the users table directly (this is a demo)
      const { data: userData } = await db
        .from('users')
        .select('password_hash')
        .eq('id', user.id)
        .single();

      if (!userData) {
        // For mock users, just show success
        toast({
          title: "Success",
          description: "Password changed successfully",
        });
        setSecuritySettings({
          current_password: '',
          new_password: '',
          confirm_password: '',
        });
        setLoadingSecurity(false);
        return;
      }

      // Update password (in production, this would be hashed server-side)
      const { error } = await db
        .from('users')
        .update({
          password_hash: `hashed_${securitySettings.new_password}`, // Demo only
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Password changed successfully",
      });

      // Clear form
      setSecuritySettings({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        title: "Error",
        description: "Failed to change password",
        variant: "destructive",
      });
    } finally {
      setLoadingSecurity(false);
    }
  };

  // Handle disable 2FA
  const handleDisable2FA = async () => {
    if (!disable2FAPassword) {
      toast({
        title: "Error",
        description: "Please enter your password",
        variant: "destructive",
      });
      return;
    }

    setLoading2FA(true);
    try {
      await disableTwoFactor(disable2FAPassword);
      setTwoFactorEnabled(false);
      setTwoFactorVerifiedAt(null);
      setDisable2FAPassword('');
      setShowDisableDialog(false);
      
      toast({
        title: "Success",
        description: "Two-factor authentication has been disabled",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to disable 2FA",
        variant: "destructive",
      });
    } finally {
      setLoading2FA(false);
    }
  };

  // Toggle working day
  const toggleWorkingDay = (day: string) => {
    setAgencySettings(prev => ({
      ...prev,
      working_days: prev.working_days.includes(day)
        ? prev.working_days.filter(d => d !== day)
        : [...prev.working_days, day],
    }));
  };

  // Apply color preset
  const applyColorPreset = (preset: { primary: string; secondary: string }) => {
    setAgencySettings(prev => ({
      ...prev,
      primary_color: preset.primary,
      secondary_color: preset.secondary,
    }));
  };

  if (initialLoading || loadingAgencyData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account, agency, and application preferences</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="agency" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Agency
            </TabsTrigger>
          )}
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Profile Settings Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>Update your personal information and avatar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar */}
              <div className="space-y-2">
                <Label>Profile Photo</Label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Avatar preview"
                        className="w-24 h-24 rounded-full object-cover border-2 border-primary"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-2 border-dashed">
                        <User className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                    {avatarPreview && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full"
                        onClick={removeAvatarPreview}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Recommended: Square image, at least 200x200px (Max 2MB)
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={profileSettings.full_name}
                    onChange={(e) => setProfileSettings(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={profileSettings.phone}
                    onChange={(e) => setProfileSettings(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={profileSettings.department}
                    onChange={(e) => setProfileSettings(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="e.g., Engineering"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position / Job Title</Label>
                  <Input
                    id="position"
                    value={profileSettings.position}
                    onChange={(e) => setProfileSettings(prev => ({ ...prev, position: e.target.value }))}
                    placeholder="e.g., Senior Developer"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  value={user?.email || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Contact your administrator to change your email address
                </p>
              </div>

              <Button onClick={saveProfileSettings} disabled={loadingProfile} className="w-full md:w-auto">
                {loadingProfile ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Profile
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agency Settings Tab - Admin Only */}
        {isAdmin && (
          <TabsContent value="agency" className="space-y-6">
            {/* Basic Agency Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Agency Information
                </CardTitle>
                <CardDescription>Configure your agency's basic information and branding</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="agencyName">Agency Name</Label>
                    <Input
                      id="agencyName"
                      value={agencySettings.agency_name}
                      onChange={(e) => setAgencySettings(prev => ({ ...prev, agency_name: e.target.value }))}
                      placeholder="Enter your agency name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agencyDomain">Email Domain</Label>
                    <Input
                      id="agencyDomain"
                      value={agencySettings.domain}
                      onChange={(e) => setAgencySettings(prev => ({ ...prev, domain: e.target.value }))}
                      placeholder="company.com (without @)"
                    />
                    <p className="text-xs text-muted-foreground">
                      Used for auto-generating employee email addresses
                    </p>
                  </div>
                </div>

                {/* Logo Upload */}
                <div className="space-y-2">
                  <Label>Agency Logo</Label>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Upload a logo (PNG, JPG, SVG - Max 5MB)
                      </p>
                    </div>
                    {logoPreview && (
                      <div className="relative">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="w-16 h-16 object-contain border rounded"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute -top-2 -right-2 w-6 h-6 p-0"
                          onClick={removeLogoPreview}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Branding & Theme */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Branding & Theme
                </CardTitle>
                <CardDescription>Customize your agency's color scheme</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Color Presets */}
                <div className="space-y-2">
                  <Label>Quick Color Presets</Label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_PRESETS.map(preset => (
                      <button
                        key={preset.name}
                        onClick={() => applyColorPreset(preset)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-muted transition-colors"
                      >
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: preset.primary }}
                        />
                        <span className="text-sm">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primaryColor"
                        type="color"
                        value={agencySettings.primary_color}
                        onChange={(e) => setAgencySettings(prev => ({ ...prev, primary_color: e.target.value }))}
                        className="w-16 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={agencySettings.primary_color}
                        onChange={(e) => setAgencySettings(prev => ({ ...prev, primary_color: e.target.value }))}
                        placeholder="#3b82f6"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondaryColor">Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="secondaryColor"
                        type="color"
                        value={agencySettings.secondary_color}
                        onChange={(e) => setAgencySettings(prev => ({ ...prev, secondary_color: e.target.value }))}
                        className="w-16 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={agencySettings.secondary_color}
                        onChange={(e) => setAgencySettings(prev => ({ ...prev, secondary_color: e.target.value }))}
                        placeholder="#1e40af"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                  <div className="flex gap-2">
                    <button
                      className="px-4 py-2 rounded text-white transition-colors"
                      style={{ backgroundColor: agencySettings.primary_color }}
                    >
                      Primary Button
                    </button>
                    <button
                      className="px-4 py-2 rounded text-white transition-colors"
                      style={{ backgroundColor: agencySettings.secondary_color }}
                    >
                      Secondary Button
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Regional & Financial Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Regional & Financial Settings
                </CardTitle>
                <CardDescription>Configure timezone, currency, and fiscal settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="defaultCurrency">Default Currency</Label>
                    <Select
                      value={agencySettings.default_currency}
                      onValueChange={(value) => setAgencySettings(prev => ({ ...prev, default_currency: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency">
                          {availableCurrencies[agencySettings.default_currency] ? (
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4" />
                              <span>
                                {availableCurrencies[agencySettings.default_currency].symbol} {availableCurrencies[agencySettings.default_currency].code}
                              </span>
                            </div>
                          ) : (
                            <span>Select currency</span>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(availableCurrencies)
                          .filter(([key]) => key !== 'default')
                          .map(([countryCode, currency]) => (
                            <SelectItem key={countryCode} value={countryCode}>
                              <div className="flex items-center gap-2">
                                <span>{currency.symbol}</span>
                                <span>{currency.code}</span>
                                <span className="text-muted-foreground">- {currency.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={agencySettings.timezone}
                      onValueChange={(value) => setAgencySettings(prev => ({ ...prev, timezone: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map(tz => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dateFormat">Date Format</Label>
                    <Select
                      value={agencySettings.date_format}
                      onValueChange={(value) => setAgencySettings(prev => ({ ...prev, date_format: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select date format" />
                      </SelectTrigger>
                      <SelectContent>
                        {DATE_FORMATS.map(fmt => (
                          <SelectItem key={fmt.value} value={fmt.value}>
                            {fmt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fiscalYearStart">Fiscal Year Start</Label>
                    <Select
                      value={agencySettings.fiscal_year_start}
                      onValueChange={(value) => setAgencySettings(prev => ({ ...prev, fiscal_year_start: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select fiscal year start" />
                      </SelectTrigger>
                      <SelectContent>
                        {FISCAL_YEAR_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Working Hours & Days */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Working Hours & Days
                </CardTitle>
                <CardDescription>Configure default working schedule for the organization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="workingHoursStart">Working Hours Start</Label>
                    <Input
                      id="workingHoursStart"
                      type="time"
                      value={agencySettings.working_hours_start}
                      onChange={(e) => setAgencySettings(prev => ({ ...prev, working_hours_start: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workingHoursEnd">Working Hours End</Label>
                    <Input
                      id="workingHoursEnd"
                      type="time"
                      value={agencySettings.working_hours_end}
                      onChange={(e) => setAgencySettings(prev => ({ ...prev, working_hours_end: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Working Days</Label>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map(day => (
                      <button
                        key={day.value}
                        onClick={() => toggleWorkingDay(day.value)}
                        className={`px-4 py-2 rounded-lg border transition-colors ${
                          agencySettings.working_days.includes(day.value)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background hover:bg-muted'
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Button onClick={saveAgencySettings} disabled={loadingAgency} className="w-full md:w-auto">
                  {loadingAgency ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Agency Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Notifications Settings Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Configure how and when you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Delivery Methods */}
              <div className="space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Delivery Methods
                </h3>
                
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label htmlFor="emailNotifications" className="font-medium">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                  </div>
                  <Switch
                    id="emailNotifications"
                    checked={notificationSettings.email_notifications}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, email_notifications: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label htmlFor="pushNotifications" className="font-medium">Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive browser push notifications</p>
                  </div>
                  <Switch
                    id="pushNotifications"
                    checked={notificationSettings.push_notifications}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, push_notifications: checked }))}
                  />
                </div>
              </div>

              <Separator />

              {/* Notification Categories */}
              <div className="space-y-4">
                <h3 className="font-medium">Notification Categories</h3>
                
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label htmlFor="taskReminders" className="font-medium">Task Reminders</Label>
                    <p className="text-sm text-muted-foreground">Get reminded about upcoming and overdue tasks</p>
                  </div>
                  <Switch
                    id="taskReminders"
                    checked={notificationSettings.task_reminders}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, task_reminders: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label htmlFor="leaveNotifications" className="font-medium">Leave Notifications</Label>
                    <p className="text-sm text-muted-foreground">Updates about leave requests and approvals</p>
                  </div>
                  <Switch
                    id="leaveNotifications"
                    checked={notificationSettings.leave_notifications}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, leave_notifications: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label htmlFor="payrollNotifications" className="font-medium">Payroll Notifications</Label>
                    <p className="text-sm text-muted-foreground">Salary processing and reimbursement updates</p>
                  </div>
                  <Switch
                    id="payrollNotifications"
                    checked={notificationSettings.payroll_notifications}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, payroll_notifications: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label htmlFor="projectUpdates" className="font-medium">Project Updates</Label>
                    <p className="text-sm text-muted-foreground">Project status changes and milestones</p>
                  </div>
                  <Switch
                    id="projectUpdates"
                    checked={notificationSettings.project_updates}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, project_updates: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label htmlFor="systemAlerts" className="font-medium">System Alerts</Label>
                    <p className="text-sm text-muted-foreground">Important system announcements and alerts</p>
                  </div>
                  <Switch
                    id="systemAlerts"
                    checked={notificationSettings.system_alerts}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, system_alerts: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label htmlFor="marketingEmails" className="font-medium">Marketing & Promotional</Label>
                    <p className="text-sm text-muted-foreground">News, updates, and promotional content</p>
                  </div>
                  <Switch
                    id="marketingEmails"
                    checked={notificationSettings.marketing_emails}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, marketing_emails: checked }))}
                  />
                </div>
              </div>

              <Button onClick={saveNotificationSettings} disabled={loadingNotifications} className="w-full md:w-auto">
                {loadingNotifications ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Notification Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>Update your account password for security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={securitySettings.current_password}
                    onChange={(e) => setSecuritySettings(prev => ({ ...prev, current_password: e.target.value }))}
                    placeholder="Enter your current password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={securitySettings.new_password}
                    onChange={(e) => setSecuritySettings(prev => ({ ...prev, new_password: e.target.value }))}
                    placeholder="Enter your new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Password must be at least 8 characters long
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={securitySettings.confirm_password}
                    onChange={(e) => setSecuritySettings(prev => ({ ...prev, confirm_password: e.target.value }))}
                    placeholder="Confirm your new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {securitySettings.new_password && securitySettings.confirm_password && (
                  <div className="flex items-center gap-2 mt-2">
                    {securitySettings.new_password === securitySettings.confirm_password ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-500">Passwords match</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <span className="text-sm text-destructive">Passwords do not match</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <Button onClick={saveSecuritySettings} disabled={loadingSecurity} variant="default" className="w-full md:w-auto">
                {loadingSecurity ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="mr-2 h-4 w-4" />
                )}
                Change Password
              </Button>
            </CardContent>
          </Card>

          {/* Two-Factor Authentication */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>
                Add an extra layer of security to your account with 2FA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!show2FASetup ? (
                <>
                  {/* 2FA Status */}
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">Status</p>
                        {twoFactorEnabled ? (
                          <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                            <CheckCircle className="h-4 w-4" />
                            Enabled
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <AlertCircle className="h-4 w-4" />
                            Disabled
                          </span>
                        )}
                      </div>
                      {twoFactorEnabled && twoFactorVerifiedAt && (
                        <p className="text-xs text-muted-foreground">
                          Last verified: {new Date(twoFactorVerifiedAt).toLocaleDateString()}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {twoFactorEnabled
                          ? 'Your account is protected with two-factor authentication'
                          : 'Enable 2FA to add an extra layer of security to your account'}
                      </p>
                    </div>
                  </div>

                  {/* 2FA Actions */}
                  <div className="flex gap-2">
                    {!twoFactorEnabled ? (
                      <Button
                        onClick={() => setShow2FASetup(true)}
                        className="flex items-center gap-2"
                      >
                        <QrCode className="h-4 w-4" />
                        Enable Two-Factor Authentication
                      </Button>
                    ) : (
                      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="flex items-center gap-2">
                            <X className="h-4 w-4" />
                            Disable 2FA
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Disable Two-Factor Authentication?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove the extra security layer from your account. 
                              You'll need to enter your password to confirm.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="disable2FAPassword">Enter your password</Label>
                              <Input
                                id="disable2FAPassword"
                                type="password"
                                value={disable2FAPassword}
                                onChange={(e) => setDisable2FAPassword(e.target.value)}
                                placeholder="Enter your password to confirm"
                              />
                            </div>
                          </div>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setDisable2FAPassword('')}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDisable2FA}
                              disabled={!disable2FAPassword || loading2FA}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {loading2FA ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Disabling...
                                </>
                              ) : (
                                'Disable 2FA'
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>

                  {/* 2FA Info */}
                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      <strong>How 2FA works:</strong> When enabled, you'll need to enter a 6-digit code 
                      from your authenticator app (like Google Authenticator or Authy) each time you sign in. 
                      You'll also receive recovery codes that you can use if you lose access to your device.
                    </AlertDescription>
                  </Alert>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Set Up Two-Factor Authentication</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShow2FASetup(false);
                        fetch2FAStatus();
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                  <TwoFactorSetup 
                    onComplete={() => {
                      setShow2FASetup(false);
                      fetch2FAStatus();
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Security Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Additional Security
              </CardTitle>
              <CardDescription>Additional security features for your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="space-y-0.5">
                  <p className="font-medium">Active Sessions</p>
                  <p className="text-sm text-muted-foreground">View and manage your active login sessions</p>
                </div>
                <Button variant="outline" disabled>
                  Coming Soon
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="space-y-0.5">
                  <p className="font-medium">Login History</p>
                  <p className="text-sm text-muted-foreground">View recent login activity on your account</p>
                </div>
                <Button variant="outline" disabled>
                  Coming Soon
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
