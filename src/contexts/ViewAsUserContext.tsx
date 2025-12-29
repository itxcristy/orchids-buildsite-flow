import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AppRole } from '@/utils/roleUtils';

interface ViewAsUser {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  avatar_url?: string;
}

interface ViewAsUserContextType {
  viewingAs: ViewAsUser | null;
  setViewingAs: (user: ViewAsUser | null) => void;
  exitViewAs: () => void;
  isViewingAs: boolean;
}

const ViewAsUserContext = createContext<ViewAsUserContextType | undefined>(undefined);

export function ViewAsUserProvider({ children }: { children: ReactNode }) {
  const [viewingAs, setViewingAsState] = useState<ViewAsUser | null>(() => {
    // Restore from localStorage on mount
    const stored = localStorage.getItem('viewing_as_user');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  });

  const setViewingAs = (user: ViewAsUser | null) => {
    setViewingAsState(user);
    if (user) {
      localStorage.setItem('viewing_as_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('viewing_as_user');
    }
  };

  const exitViewAs = () => {
    setViewingAs(null);
  };

  return (
    <ViewAsUserContext.Provider
      value={{
        viewingAs,
        setViewingAs,
        exitViewAs,
        isViewingAs: !!viewingAs,
      }}
    >
      {children}
    </ViewAsUserContext.Provider>
  );
}

export function useViewAsUser() {
  const context = useContext(ViewAsUserContext);
  if (context === undefined) {
    throw new Error('useViewAsUser must be used within a ViewAsUserProvider');
  }
  return context;
}

