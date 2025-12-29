import { useAuth } from './useAuth';
import { useViewAsUser } from '@/contexts/ViewAsUserContext';
import { AppRole } from '@/utils/roleUtils';

/**
 * Enhanced auth hook that returns the viewed user's role when in view-as mode
 * This allows components to seamlessly use the impersonated user's permissions
 */
export function useAuthWithViewAs() {
  const auth = useAuth();
  const { viewingAs } = useViewAsUser();

  // Return the viewed user's role if in view-as mode, otherwise return actual role
  const effectiveRole: AppRole | null = viewingAs ? viewingAs.role : auth.userRole;

  return {
    ...auth,
    userRole: effectiveRole,
    // Keep original role accessible for admin functions
    originalUserRole: auth.userRole,
    isViewingAs: !!viewingAs,
    viewingAsUser: viewingAs,
  };
}

