/**
 * Utility functions for agency_id management
 * Helps ensure agency_id is always available even if not in profile
 */

import { selectOne } from '@/services/api/postgresql-service';
import { queryMainDatabase } from '@/integrations/postgresql/client-http';

/**
 * Get agency_id from profile or fetch from database
 * NOTE: In the new multi-database architecture, agency_id is not needed
 * as each agency has its own isolated database. This function returns a
 * placeholder value to maintain backward compatibility.
 * @param profile - User profile from useAuth hook (optional)
 * @param userId - User ID (optional)
 * @returns agency_id (placeholder) or null if not available
 */
export async function getAgencyId(
  profile?: { agency_id?: string | null } | null | undefined,
  userId?: string | null | undefined
): Promise<string | null> {
  // Check if user is super admin - super admins don't have agency_id
  if (typeof window !== 'undefined') {
    const userRole = window.localStorage.getItem('user_role');
    if (userRole === 'super_admin') {
      // Super admin - return null (they use main database, not agency database)
      return null;
    }
  }
  
  // First try from profile (for backward compatibility)
  if (profile?.agency_id) {
    return profile.agency_id;
  }

  // Try from localStorage (set by frontend)
  if (typeof window !== 'undefined') {
    const storedAgencyId = window.localStorage.getItem('agency_id');
    if (storedAgencyId && storedAgencyId !== '00000000-0000-0000-0000-000000000000') {
      return storedAgencyId;
    }
  }

  // If not in profile, try to fetch from database (for backward compatibility)
  // Only if we don't already know user is super admin
  if (userId) {
    try {
      const userProfile = await selectOne('profiles', { user_id: userId });
      if (userProfile?.agency_id) {
        return userProfile.agency_id;
      }
    } catch (error) {
      console.warn('Could not fetch profile for agency_id:', error);
    }
  }

  // Try to get from agency_settings table (first record) - skip for super admins
  if (typeof window !== 'undefined') {
    const userRole = window.localStorage.getItem('user_role');
    if (userRole === 'super_admin') {
      return null; // Super admin doesn't need agency_id
    }
  }
  
  try {
    const agencySettings = await selectOne('agency_settings', {});
    if (agencySettings?.agency_id) {
      return agencySettings.agency_id;
    }
  } catch (error) {
    // Ignore - table might not exist
  }

  // Try to get from profiles table (first user's agency_id)
  try {
    const firstProfile = await selectOne('profiles', {});
    if (firstProfile?.agency_id && firstProfile.agency_id !== '00000000-0000-0000-0000-000000000000') {
      return firstProfile.agency_id;
    }
  } catch (error) {
    // Ignore
  }

  // Try to get from agencies table by database name
  if (typeof window !== 'undefined') {
    const agencyDatabase = window.localStorage.getItem('agency_database');
    if (agencyDatabase) {
      try {
        // Query main database for agency_id
        const result = await queryMainDatabase(`
          SELECT id FROM public.agencies WHERE database_name = $1
        `, [agencyDatabase]);
        if (result.rows && result.rows.length > 0 && result.rows[0].id) {
          return result.rows[0].id;
        }
      } catch (error) {
        // Ignore
      }
    }
  }

  // Last resort: In new architecture, we don't need agency_id for isolation
  // But GST tables require it, so return a consistent placeholder
  // The database isolation handles multi-tenancy
  return '00000000-0000-0000-0000-000000000000';
}

/**
 * Get agency_id with retry logic
 * @param profile - User profile from useAuth hook
 * @param userId - User ID
 * @param retries - Number of retries (default: 1)
 * @returns agency_id or null if not found
 */
export async function getAgencyIdWithRetry(
  profile: { agency_id?: string | null } | null | undefined,
  userId: string | null | undefined,
  retries: number = 1
): Promise<string | null> {
  let agencyId = await getAgencyId(profile, userId);
  
  // Retry if not found and we have retries left
  if (!agencyId && retries > 0 && userId) {
    // Wait a bit before retry
    await new Promise(resolve => setTimeout(resolve, 500));
    agencyId = await getAgencyId(profile, userId);
  }

  return agencyId;
}
