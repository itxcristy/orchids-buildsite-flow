/**
 * Page Catalog Hook
 * Manages page catalog operations (super admin only)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getApiBaseUrl } from '@/config/api';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import type { PageCatalog, PageRecommendationRule } from '@/types/pageCatalog';

interface UsePageCatalogOptions {
  category?: string;
  is_active?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export function usePageCatalog(options: UsePageCatalogOptions = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pages, setPages] = useState<PageCatalog[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });
  
  // Prevent multiple simultaneous requests
  const fetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const getAuthToken = useCallback(() => {
    // Try both token keys for compatibility
    return localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
  }, []);

  const fetchPages = useCallback(async () => {
    // Don't fetch if no user or already fetching
    if (!user || fetchingRef.current) {
      return;
    }

    const token = getAuthToken();
    if (!token) {
      console.warn('[usePageCatalog] No authentication token found');
      return;
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    fetchingRef.current = true;
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (options.category) params.append('category', options.category);
      if (options.is_active !== undefined) params.append('is_active', String(options.is_active));
      if (options.search) params.append('search', options.search);
      if (options.page) params.append('page', String(options.page));
      if (options.limit) params.append('limit', String(options.limit));

      const response = await fetch(
        `${getApiBaseUrl()}/api/system/page-catalog?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          signal: abortControllerRef.current.signal
        }
      );

      if (response.status === 401) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Authentication failed. Please log in again.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Failed to fetch pages: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setPages(data.data || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        throw new Error(data.error?.message || 'Failed to fetch page catalog');
      }
    } catch (error: any) {
      // Don't show error for aborted requests
      if (error.name === 'AbortError') {
        return;
      }
      
      console.error('Error fetching pages:', error);
      
      // Only show toast for non-aborted errors
      if (error.message) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive'
        });
      }
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, [user, options.category, options.is_active, options.search, options.page, options.limit, getAuthToken, toast]);

  useEffect(() => {
    fetchPages();
    
    // Cleanup: abort request on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchPages]);

  const createPage = useCallback(async (pageData: Partial<PageCatalog>) => {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication token not found');
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/system/page-catalog`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pageData)
      });

      if (response.status === 401) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Authentication failed. Please log in again.');
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || 'Failed to create page');
      }

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Page created successfully'
        });
        await fetchPages();
        return data.data;
      } else {
        throw new Error(data.error?.message || 'Failed to create page');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create page',
        variant: 'destructive'
      });
      throw error;
    }
  }, [fetchPages, toast, getAuthToken]);

  const updatePage = useCallback(async (id: string, updates: Partial<PageCatalog>) => {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication token not found');
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/system/page-catalog/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (response.status === 401) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Authentication failed. Please log in again.');
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || 'Failed to update page');
      }

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Page updated successfully'
        });
        await fetchPages();
        return data.data;
      } else {
        throw new Error(data.error?.message || 'Failed to update page');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update page',
        variant: 'destructive'
      });
      throw error;
    }
  }, [fetchPages, toast, getAuthToken]);

  const deletePage = useCallback(async (id: string) => {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication token not found');
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/system/page-catalog/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Authentication failed. Please log in again.');
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || 'Failed to delete page');
      }

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Page deactivated successfully'
        });
        await fetchPages();
      } else {
        throw new Error(data.error?.message || 'Failed to delete page');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete page',
        variant: 'destructive'
      });
      throw error;
    }
  }, [fetchPages, toast, getAuthToken]);

  const createRecommendationRule = useCallback(async (
    pageId: string,
    rule: Partial<PageRecommendationRule>
  ) => {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication token not found');
    }

    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/system/page-catalog/${pageId}/recommendation-rules`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(rule)
        }
      );

      if (response.status === 401) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Authentication failed. Please log in again.');
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || 'Failed to create recommendation rule');
      }

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Recommendation rule created successfully'
        });
        return data.data;
      } else {
        throw new Error(data.error?.message || 'Failed to create recommendation rule');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create recommendation rule',
        variant: 'destructive'
      });
      throw error;
    }
  }, [toast, getAuthToken]);

  return {
    pages,
    loading,
    pagination,
    fetchPages,
    createPage,
    updatePage,
    deletePage,
    createRecommendationRule
  };
}

