import { useState, useEffect } from 'react';
import { selectOne, updateRecord, insertRecord } from '@/services/api/postgresql-service';
import { useAuth } from '@/hooks/useAuth';
import { getAgencyId } from '@/utils/agencyUtils';
import { getApiBaseUrl } from '@/config/api';

export interface AgencySettings {
  id?: string;
  agency_id?: string;
  agency_name: string;
  logo_url: string | null;
  domain: string | null;
  default_currency: string;
  currency?: string; // Legacy field for backward compatibility
  primary_color: string;
  secondary_color: string;
  timezone: string;
  date_format: string;
  fiscal_year_start: string;
  working_hours_start: string;
  working_hours_end: string;
  working_days: string[] | string; // Can be array or JSON string
  created_at?: string;
  updated_at?: string;
}

const DEFAULT_SETTINGS: Omit<AgencySettings, 'id' | 'agency_id' | 'created_at' | 'updated_at'> = {
  agency_name: '',
  logo_url: null,
  domain: null,
  default_currency: 'IN',
  primary_color: '#3b82f6',
  secondary_color: '#1e40af',
  timezone: 'Asia/Kolkata',
  date_format: 'DD/MM/YYYY',
  fiscal_year_start: '04-01',
  working_hours_start: '09:00',
  working_hours_end: '18:00',
  working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
};

export const useAgencySettings = () => {
  const { profile, user, userRole } = useAuth();
  const [settings, setSettings] = useState<AgencySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    // Skip for super admins - they don't use agency settings
    if (userRole === 'super_admin') {
      setLoading(false);
      setSettings(null);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);

      // Try to fetch agency settings from agency database
      const agencySettings = await selectOne<AgencySettings>('agency_settings', {});

      // Also fetch from main database if agency_name is missing or default
      let mainDbSettings = null;
      const agencyId = await getAgencyId(profile, user?.id);
      // Skip API call if agencyId is the placeholder UUID
      const isValidAgencyId = agencyId && agencyId !== '00000000-0000-0000-0000-000000000000';
      if (isValidAgencyId && (!agencySettings?.agency_name || agencySettings.agency_name === 'My Agency' || agencySettings.agency_name === '')) {
        try {
          const apiBaseUrl = getApiBaseUrl();
          const response = await fetch(`${apiBaseUrl}/api/system/agency-settings/${encodeURIComponent(agencyId)}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            mainDbSettings = data?.data?.settings || data.settings;
            console.log('[useAgencySettings] Fetched main DB settings for agency_name:', mainDbSettings?.agency_name);
          }
        } catch (error) {
          console.warn('[useAgencySettings] Failed to fetch from main DB:', error);
        }
      }

      // Merge settings: prefer agency DB, but use main DB for agency_name if agency DB has default/empty
      const mergedSettings = agencySettings ? {
        ...agencySettings,
        // Use main DB agency_name if agency DB has default/empty value
        agency_name: (agencySettings.agency_name && agencySettings.agency_name !== 'My Agency' && agencySettings.agency_name !== '')
          ? agencySettings.agency_name
          : (mainDbSettings?.agency_name || agencySettings.agency_name),
      } : (mainDbSettings ? {
        ...mainDbSettings,
        // Map main DB fields to agency settings structure
        default_currency: mainDbSettings.default_currency || mainDbSettings.currency || DEFAULT_SETTINGS.default_currency,
      } : null);

      if (mergedSettings) {
        // Parse working_days if it's a string or handle JSONB
        let workingDays = mergedSettings.working_days;
        if (typeof workingDays === 'string') {
          try {
            // Try to parse as JSON
            const parsed = JSON.parse(workingDays);
            workingDays = Array.isArray(parsed) ? parsed : DEFAULT_SETTINGS.working_days;
          } catch {
            // If parsing fails, check if it's a comma-separated string
            if (workingDays.includes(',')) {
              workingDays = workingDays.split(',').map(d => d.trim());
            } else {
              // Use default if parsing fails
              workingDays = DEFAULT_SETTINGS.working_days;
            }
          }
        } else if (!Array.isArray(workingDays)) {
          // If it's not an array, use default
          workingDays = DEFAULT_SETTINGS.working_days;
        }

        const parsedSettings: AgencySettings = {
          ...mergedSettings,
          working_days: workingDays as string[],
          default_currency: mergedSettings.default_currency || mergedSettings.currency || DEFAULT_SETTINGS.default_currency,
          primary_color: mergedSettings.primary_color || DEFAULT_SETTINGS.primary_color,
          secondary_color: mergedSettings.secondary_color || DEFAULT_SETTINGS.secondary_color,
          timezone: mergedSettings.timezone || DEFAULT_SETTINGS.timezone,
          date_format: mergedSettings.date_format || DEFAULT_SETTINGS.date_format,
          fiscal_year_start: mergedSettings.fiscal_year_start || DEFAULT_SETTINGS.fiscal_year_start,
          working_hours_start: mergedSettings.working_hours_start || DEFAULT_SETTINGS.working_hours_start,
          working_hours_end: mergedSettings.working_hours_end || DEFAULT_SETTINGS.working_hours_end,
          // Ensure agency_name is set from merged settings
          agency_name: mergedSettings.agency_name || DEFAULT_SETTINGS.agency_name,
        };

        setSettings(parsedSettings);
        
        // Apply theme colors to CSS variables
        if (parsedSettings.primary_color) {
          document.documentElement.style.setProperty('--primary-color', parsedSettings.primary_color);
          // Convert hex to HSL for CSS variables if needed
          const hsl = hexToHsl(parsedSettings.primary_color);
          if (hsl) {
            document.documentElement.style.setProperty('--primary', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
          }
        }
        if (parsedSettings.secondary_color) {
          document.documentElement.style.setProperty('--secondary-color', parsedSettings.secondary_color);
          const hsl = hexToHsl(parsedSettings.secondary_color);
          if (hsl) {
            document.documentElement.style.setProperty('--primary-dark', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
          }
        }
      } else {
        // No settings found, use defaults
        // Note: agency_id is not included - agency_settings table doesn't have this column
        setSettings({
          ...DEFAULT_SETTINGS,
        } as AgencySettings);
      }
    } catch (err: any) {
      console.error('Error fetching agency settings:', err);
      setError(err.message || 'Failed to fetch agency settings');
      // Use defaults on error
      // Note: agency_id is not included - agency_settings table doesn't have this column
      setSettings({
        ...DEFAULT_SETTINGS,
      } as AgencySettings);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: Partial<AgencySettings>) => {
    try {
      setError(null);
      
      // Remove agency_id from newSettings if present - agency_settings table doesn't have this column
      // Each agency has its own database, so agency is identified by database name, not a column
      const { agency_id: _, ...settingsWithoutAgencyId } = newSettings;
      
      // Only include fields that are actually provided (not undefined)
      const settingsToSave: any = {};
      
      // Copy only defined fields, but exclude large logo_url unless it's actually new
      Object.keys(settingsWithoutAgencyId).forEach(key => {
        const value = (settingsWithoutAgencyId as any)[key];
        
        // Special handling for logo_url: only include if it's a new/changed value
        // Don't send existing large base64 strings that haven't changed
        if (key === 'logo_url') {
          // Only include logo_url if:
          // 1. It's explicitly provided (not undefined/null)
          // 2. It's different from the existing value
          // 3. It's not an extremely large base64 string (> 1MB uncompressed)
          if (value !== undefined && value !== null && value !== '') {
            const existingLogo = settings?.logo_url;
            // If it's different from existing, include it
            if (value !== existingLogo) {
              // Check if it's a reasonable size (base64 is ~33% larger than binary)
              // If it's a data URL and larger than 1.5MB, it might cause issues
              if (typeof value === 'string' && value.startsWith('data:')) {
                const base64Length = value.length;
                // Approximate: base64 is ~4/3 the size of binary, so 1.5MB binary = ~2MB base64
                if (base64Length > 2 * 1024 * 1024) {
                  console.warn('Logo URL is very large, but including it anyway. Consider compressing the image.');
                }
              }
              settingsToSave[key] = value;
            }
            // If it's the same as existing, don't include it (saves bandwidth)
          } else if (value === '') {
            // Explicitly setting to empty string means remove logo
            settingsToSave[key] = '';
          }
        } else if (value !== undefined && value !== null) {
          settingsToSave[key] = value;
        }
      });

      // Ensure working_days is stored as JSON string if provided
      if (settingsWithoutAgencyId.working_days !== undefined) {
        settingsToSave.working_days = typeof settingsWithoutAgencyId.working_days === 'string' 
          ? settingsWithoutAgencyId.working_days 
          : JSON.stringify(settingsWithoutAgencyId.working_days || DEFAULT_SETTINGS.working_days);
      }

      // Also save as currency for backward compatibility if default_currency is provided
      if (settingsWithoutAgencyId.default_currency) {
        settingsToSave.currency = settingsWithoutAgencyId.default_currency;
      } else if (settingsWithoutAgencyId.currency) {
        settingsToSave.currency = settingsWithoutAgencyId.currency;
      }

      // Final safety check: explicitly remove agency_id if it somehow got into settingsToSave
      // agency_settings table doesn't have this column - each agency has its own database
      delete settingsToSave.agency_id;
      
      if (settings?.id) {
        // Update existing settings
        const updated = await updateRecord<AgencySettings>(
          'agency_settings',
          settingsToSave,
          { id: settings.id }
        );
        setSettings(updated);
      } else {
        // Insert new settings
        const inserted = await insertRecord<AgencySettings>('agency_settings', settingsToSave);
        setSettings(inserted);
      }

      // Apply theme colors immediately
      if (newSettings.primary_color) {
        document.documentElement.style.setProperty('--primary-color', newSettings.primary_color);
        const hsl = hexToHsl(newSettings.primary_color);
        if (hsl) {
          document.documentElement.style.setProperty('--primary', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
        }
      }
      if (newSettings.secondary_color) {
        document.documentElement.style.setProperty('--secondary-color', newSettings.secondary_color);
        const hsl = hexToHsl(newSettings.secondary_color);
        if (hsl) {
          document.documentElement.style.setProperty('--primary-dark', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
        }
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error saving agency settings:', err);
      setError(err.message || 'Failed to save agency settings');
      return { success: false, error: err.message };
    }
  };

  useEffect(() => {
    // Don't fetch for super admins - they don't use agency settings
    if (userRole === 'super_admin') {
      setLoading(false);
      setSettings(null);
      return;
    }
    // Only fetch if we have a profile or user (not super admin)
    if (profile || user) {
      fetchSettings();
    }
  }, [profile?.agency_id, userRole, profile, user]);

  return {
    settings,
    loading,
    error,
    fetchSettings,
    saveSettings,
  };
};

// Helper function to convert hex to HSL
function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

