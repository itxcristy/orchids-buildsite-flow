import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateUUID } from '@/lib/uuid';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  actionUrl?: string;
}

interface AppState {
  // UI State
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark' | 'system';
  loading: boolean;
  
  // Notifications
  notifications: Notification[];
  unreadCount: number;

  // Global error state
  globalError: string | null;
  
  // Actions
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLoading: (loading: boolean) => void;
  setGlobalError: (error: string | null) => void;
  
  // Notification actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  removeNotification: (id: string) => void;
  setNotifications: (notifications: Notification[]) => void;
  setUnreadCount: (count: number) => void;

  // Utility actions
  reset: () => void;
}

const initialState = {
  sidebarCollapsed: false,
  theme: 'system' as const,
  loading: false,
  notifications: [],
  unreadCount: 0,
  globalError: null,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setSidebarCollapsed: (collapsed) => {
        set({ sidebarCollapsed: collapsed });
      },

      setTheme: (theme) => {
        set({ theme });
      },

      setLoading: (loading) => {
        set({ loading });
      },

      setGlobalError: (error) => {
        set({ globalError: error });
      },

      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: generateUUID(),
          timestamp: Date.now(),
          read: false,
        };

        set((state) => ({
          notifications: [newNotification, ...state.notifications],
          unreadCount: state.unreadCount + 1,
        }));
      },

      markNotificationRead: (id) => {
        set((state) => {
          const notifications = state.notifications.map((n) =>
            n.id === id && !n.read ? { ...n, read: true } : n
          );
          const unreadCount = notifications.filter((n) => !n.read).length;
          
          return { notifications, unreadCount };
        });
      },

      markAllNotificationsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        }));
      },

      removeNotification: (id) => {
        set((state) => {
          const notification = state.notifications.find((n) => n.id === id);
          const notifications = state.notifications.filter((n) => n.id !== id);
          const unreadCount = notification && !notification.read 
            ? state.unreadCount - 1 
            : state.unreadCount;

          return { notifications, unreadCount };
        });
      },

      setNotifications: (notifications) => {
        const unreadCount = notifications.filter((n) => !n.read).length;
        set({ notifications, unreadCount });
      },

      setUnreadCount: (count) => {
        set({ unreadCount: count });
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'app-store',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
      }),
    }
  )
);