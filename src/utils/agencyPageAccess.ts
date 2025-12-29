/**
 * Agency Page Access Utilities
 * Functions to check and manage agency page access based on assignments
 */

import { getApiBaseUrl } from '@/config/api';
import type { AgencyPageAssignment } from '@/types/pageCatalog';

let cachedPages: AgencyPageAssignment[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get all pages assigned to the current agency
 */
export async function getAgencyAccessiblePages(): Promise<AgencyPageAssignment[]> {
  const now = Date.now();
  
  // Return cached pages if still valid
  if (cachedPages && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedPages;
  }

  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return [];
    }

    const response = await fetch(`${getApiBaseUrl()}/api/system/page-catalog/agencies/me/pages`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn('Failed to fetch agency pages, using empty list');
      return [];
    }

    const data = await response.json();
    if (data.success && data.data) {
      cachedPages = data.data;
      cacheTimestamp = now;
      return data.data;
    }

    return [];
  } catch (error) {
    console.error('Error fetching agency pages:', error);
    return [];
  }
}

/**
 * Check if agency has access to a specific page path
 */
export async function hasPageAccess(path: string): Promise<boolean> {
  const pages = await getAgencyAccessiblePages();
  
  // Normalize path (remove trailing slashes, handle parameterized routes)
  const normalizedPath = path.replace(/\/$/, '');
  
  return pages.some(page => {
    const pagePath = page.path.replace(/\/$/, '');
    
    // Exact match
    if (pagePath === normalizedPath) {
      return true;
    }
    
    // Parameterized route match (e.g., /projects/:id matches /projects/123)
    const pagePattern = pagePath.replace(/:[^/]+/g, '[^/]+');
    const regex = new RegExp(`^${pagePattern}$`);
    return regex.test(normalizedPath);
  });
}

/**
 * Clear the page access cache (call after page assignments change)
 */
export function clearPageAccessCache() {
  cachedPages = null;
  cacheTimestamp = 0;
}

/**
 * Get all accessible page paths for the agency
 */
export async function getAccessiblePagePaths(): Promise<string[]> {
  const pages = await getAgencyAccessiblePages();
  return pages.map(page => page.path);
}

