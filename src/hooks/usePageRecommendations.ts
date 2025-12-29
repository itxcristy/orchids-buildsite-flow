/**
 * Page Recommendations Hook
 * Fetches page recommendations based on agency criteria
 */

import { useState, useCallback } from 'react';
import { getApiBaseUrl } from '@/config/api';
import { useToast } from './use-toast';
import { logError } from '@/utils/consoleLogger';
import type { PageRecommendations } from '@/types/pageCatalog';

interface RecommendationCriteria {
  industry: string;
  company_size: string;
  primary_focus: string;
  business_goals?: string[];
}

export function usePageRecommendations() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<PageRecommendations | null>(null);

  const getRecommendations = useCallback(async (criteria: RecommendationCriteria) => {
    // Validate criteria before making API call
    if (!criteria.industry || !criteria.industry.trim() || 
        !criteria.company_size || !criteria.company_size.trim() || 
        !criteria.primary_focus || !criteria.primary_focus.trim()) {
      console.warn('[Page Recommendations] Skipping API call - missing required criteria');
      return {
        all: [],
        categorized: {
          required: [],
          recommended: [],
          optional: []
        }
      };
    }
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('industry', criteria.industry.trim());
      params.append('company_size', criteria.company_size.trim());
      params.append('primary_focus', criteria.primary_focus.trim());
      if (criteria.business_goals && criteria.business_goals.length > 0) {
        criteria.business_goals.forEach(goal => params.append('business_goals', goal));
      }

      const apiBase = getApiBaseUrl();
      const url = `${apiBase}/api/system/page-catalog/recommendations/preview?${params.toString()}`;
      
      // Log API URL for debugging (only in development or when explicitly enabled)
      if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || import.meta.env.DEV)) {
        console.log('[Page Recommendations] Fetching from URL:', url);
        console.log('[Page Recommendations] API Base URL:', apiBase);
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors', // Explicitly enable CORS
        credentials: 'omit', // Don't send cookies (auth is header-based)
        cache: 'no-cache', // Always fetch fresh data
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        // If response is not JSON, create error from status
        const errorMessage = `Failed to fetch recommendations: ${response.status} ${response.statusText}`;
        logError('Failed to parse recommendations response:', parseError);
        throw new Error(errorMessage);
      }

      // Check if backend provided fallback data (even on error)
      const hasFallbackData = data.data && (
        Array.isArray(data.data.all) || 
        (data.data.categorized && typeof data.data.categorized === 'object')
      );

      if (!response.ok) {
        // Try to get error message from response - check multiple possible locations
        let errorMessage = `Failed to fetch recommendations: ${response.status} ${response.statusText}`;
        
        if (data) {
          // Check various error message locations
          if (data.error) {
            if (typeof data.error === 'string') {
              errorMessage = data.error;
            } else if (data.error.message) {
              errorMessage = data.error.message;
            } else if (data.error.code) {
              errorMessage = `${data.error.code}: ${data.error.message || data.error.details || 'Unknown error'}`;
            }
          } else if (data.message) {
            errorMessage = data.message;
          } else if (typeof data === 'string') {
            errorMessage = data;
          }
        }
        
        // If backend returns fallback data, use it instead of throwing
        if (hasFallbackData) {
          logError('Recommendations API returned error but provided fallback data:', {
            error: data?.error,
            message: errorMessage,
            status: response.status,
            fullResponse: data
          });
          setRecommendations(data.data);
          return data.data;
        }
        
        // Log the full error for debugging
        logError('Recommendations API error:', {
          status: response.status,
          statusText: response.statusText,
          error: data?.error,
          message: errorMessage,
          fullResponse: data,
          url: url
        });
        
        throw new Error(errorMessage);
      }

      if (data.success && data.data) {
        setRecommendations(data.data);
        return data.data;
      } else {
        // Handle case where API returns success:false or no data
        // But check if fallback data exists
        if (hasFallbackData) {
          logError('Recommendations API returned success:false but provided data:', data);
          setRecommendations(data.data);
          return data.data;
        }
        const errorMsg = data.error?.message || data.message || 'No recommendations available';
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to fetch page recommendations';
      
      // Check for CORS errors specifically
      const isCorsError = errorMessage.includes('CORS') || 
                         errorMessage.includes('cross-origin') ||
                         errorMessage.includes('Access-Control') ||
                         (error.name === 'TypeError' && errorMessage.includes('Failed to fetch'));
      
      logError('Error fetching recommendations:', {
        message: errorMessage,
        error: error,
        stack: error?.stack,
        name: error?.name,
        isCorsError,
        apiBase: getApiBaseUrl(),
        currentUrl: typeof window !== 'undefined' ? window.location.href : 'N/A'
      });
      
      // Provide more specific error messages
      let userMessage = 'Failed to fetch page recommendations';
      if (errorMessage.includes('does not exist') || errorMessage.includes('MISSING_TABLES')) {
        userMessage = 'Page catalog tables not found. Please run database migrations.';
      } else if (isCorsError || errorMessage.includes('NetworkError') || errorMessage.includes('Failed to fetch')) {
        userMessage = 'Unable to connect to the server. This may be a CORS or network configuration issue. Please check your server settings.';
      } else if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
        userMessage = 'Server error occurred. Please try again later or contact support.';
      } else if (errorMessage.includes('TypeError') && errorMessage.includes('undefined')) {
        userMessage = 'Configuration error detected. Please refresh the page or contact support.';
      } else if (errorMessage) {
        userMessage = errorMessage;
      }
      
      toast({
        title: 'Error',
        description: userMessage,
        variant: 'destructive'
      });
      
      // Return empty recommendations structure instead of throwing
      // This allows the UI to continue functioning
      const emptyRecs = {
        all: [],
        categorized: {
          required: [],
          recommended: [],
          optional: []
        },
        summary: {
          total: 0,
          required: 0,
          recommended: 0,
          optional: 0
        }
      };
      setRecommendations(emptyRecs);
      return emptyRecs;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    recommendations,
    loading,
    getRecommendations
  };
}

