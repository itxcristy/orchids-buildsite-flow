/**
 * Two-Factor Authentication Service
 * Frontend API client for 2FA operations
 */

import { getApiBaseUrl } from '@/config/api';

// Get API base URL as a function to ensure it's called at runtime, not module load time
function getApiBase(): string {
  try {
    return getApiBaseUrl();
  } catch (error) {
    console.error('[2FA Service] Error getting API base URL:', error);
    // Fallback to localhost:3000 if there's an error
    return 'http://localhost:3000';
  }
}

export interface TwoFactorSetupResponse {
  success: boolean;
  data: {
    secret: string;
    qrCode: string;
    recoveryCodes: string[];
  };
  message: string;
}

export interface TwoFactorStatusResponse {
  success: boolean;
  data: {
    enabled: boolean;
    verifiedAt: string | null;
  };
}

/**
 * Get authentication token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

/**
 * Setup 2FA - Generate secret and QR code
 */
export async function setupTwoFactor(): Promise<TwoFactorSetupResponse> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${getApiBase()}/api/two-factor/setup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to setup 2FA' }));
    throw new Error(error.error || 'Failed to setup 2FA');
  }

  return response.json();
}

/**
 * Verify token and enable 2FA
 */
export async function verifyAndEnableTwoFactor(token: string): Promise<{ success: boolean; message: string }> {
  const authToken = getAuthToken();
  if (!authToken) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${getApiBase()}/api/two-factor/verify-and-enable`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to enable 2FA' }));
    throw new Error(error.error || 'Failed to enable 2FA');
  }

  return response.json();
}

/**
 * Verify 2FA token during login
 */
export async function verifyTwoFactor(
  userId: string,
  agencyDatabase: string,
  token?: string,
  recoveryCode?: string
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${getApiBase()}/api/two-factor/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      agencyDatabase,
      token,
      recoveryCode,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to verify 2FA' }));
    throw new Error(error.error || 'Failed to verify 2FA');
  }

  return response.json();
}

/**
 * Disable 2FA
 */
export async function disableTwoFactor(password: string): Promise<{ success: boolean; message: string }> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${getApiBase()}/api/two-factor/disable`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Agency-Database': localStorage.getItem('agency_database') || '',
    },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to disable 2FA' }));
    throw new Error(error.error || 'Failed to disable 2FA');
  }

  return response.json();
}

/**
 * Get 2FA status
 */
export async function getTwoFactorStatus(): Promise<TwoFactorStatusResponse> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const agencyDatabase = localStorage.getItem('agency_database') || '';
  if (!agencyDatabase) {
    console.warn('[2FA] Agency database not found in localStorage');
  }

  try {
    const apiBase = getApiBase();
    // Ensure the URL is valid
    if (!apiBase || typeof apiBase !== 'string') {
      throw new Error('Invalid API base URL configuration');
    }
    
    const apiUrl = `${apiBase}/api/two-factor/status`;
    
    // Validate URL before making request
    try {
      new URL(apiUrl);
    } catch (urlError) {
      throw new Error(`Invalid API URL: ${apiUrl}`);
    }
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Agency-Database': agencyDatabase,
      },
    }).catch((fetchError) => {
      // Handle network errors or fetch failures
      console.error('[2FA] Fetch error:', fetchError);
      throw new Error(`Network error: ${fetchError.message || 'Failed to connect to server'}`);
    });

    if (!response || !response.ok) {
      let errorData;
      try {
        const text = response ? await response.text() : '';
        errorData = text ? JSON.parse(text) : { error: `HTTP ${response?.status || 'Unknown'}` };
      } catch (parseError) {
        errorData = { 
          error: `Failed to get 2FA status (${response?.status || 'Unknown'})`,
          message: `Server returned status ${response?.status || 'Unknown'}`
        };
      }
      
      const errorMessage = errorData.error || errorData.message || `Failed to get 2FA status (${response?.status || 'Unknown'})`;
      throw new Error(errorMessage);
    }

    const data = await response.json().catch((jsonError) => {
      console.error('[2FA] JSON parse error:', jsonError);
      throw new Error('Invalid JSON response from server');
    });
    
    // Validate response structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response from server');
    }

    return data;
  } catch (error) {
    // Handle URL/searchParams errors specifically
    if (error && typeof error === 'object' && 'message' in error) {
      const errorMessage = String(error.message || '');
      if (errorMessage.includes('searchParams') || errorMessage.includes('URL')) {
        console.error('[2FA] URL-related error:', error);
        throw new Error('Configuration error: Invalid API URL. Please check your environment settings.');
      }
    }
    
    // Re-throw if it's already an Error instance
    if (error instanceof Error) {
      throw error;
    }
    // Handle non-Error objects
    throw new Error(typeof error === 'string' ? error : 'Failed to get 2FA status');
  }
}
