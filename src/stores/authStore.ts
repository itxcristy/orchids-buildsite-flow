import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppRole } from '@/utils/roleUtils';

// Local type definitions for authentication
interface User {
  id: string;
  email: string;
  email_confirmed?: boolean;
  is_active?: boolean;
}

interface Session {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  refresh_token: string;
  user: User;
}

interface Profile {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  department: string | null;
  position: string | null;
  hire_date: string | null;
  avatar_url: string | null;
  is_active: boolean;
  agency_id: string | null;
}

interface UserRole {
  role: AppRole;
}

interface AuthState {
  // Core auth state
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  userRole: AppRole | null;
  loading: boolean;
  isAuthenticated: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setUserRole: (role: AppRole | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
  
  // Computed values
  isAdmin: () => boolean;
  isHR: () => boolean;
  isFinance: () => boolean;
  isSuperAdmin: () => boolean;
  hasRole: (role: AppRole) => boolean;
}

const initialState = {
  user: null,
  session: null,
  profile: null,
  userRole: null,
  loading: true,
  isAuthenticated: false,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setUser: (user) => {
        set({ 
          user, 
          isAuthenticated: !!user 
        });
      },

      setSession: (session) => {
        set({ 
          session,
          user: session?.user ?? null,
          isAuthenticated: !!session?.user
        });
      },

      setProfile: (profile) => {
        set({ profile });
      },

      setUserRole: (userRole) => {
        set({ userRole });
      },

      setLoading: (loading) => {
        set({ loading });
      },

      reset: () => {
        set(initialState);
      },

      // Computed values
      isAdmin: () => {
        const { userRole } = get();
        return userRole === 'admin' || userRole === 'super_admin';
      },

      isHR: () => {
        const { userRole } = get();
        return userRole === 'hr';
      },

      isFinance: () => {
        const { userRole } = get();
        return userRole === 'finance_manager' || userRole === 'cfo';
      },

      isSuperAdmin: () => {
        const { userRole } = get();
        return userRole === 'super_admin';
      },

      hasRole: (role: AppRole) => {
        const { userRole } = get();
        return userRole === role;
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        // Only persist non-sensitive data
        isAuthenticated: state.isAuthenticated,
        userRole: state.userRole,
      }),
    }
  )
);
