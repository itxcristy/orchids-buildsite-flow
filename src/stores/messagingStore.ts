/**
 * Messaging Store
 * Zustand store for managing channels, threads, messages, unread counts, and real-time state
 */

import { create } from 'zustand';
import type { Channel, Thread, Message } from '@/services/api/messaging';

interface TypingUser {
  userId: string;
  userName: string;
  threadId: string;
}

interface MessagingState {
  // Channels
  channels: Channel[];
  activeChannelId: string | null;
  
  // Threads
  threads: Record<string, Thread[]>; // channelId -> threads
  activeThreadId: string | null;
  
  // Messages
  messages: Record<string, Message[]>; // threadId -> messages
  
  // Unread counts
  unreadCounts: Record<string, number>; // threadId -> unread count
  
  // Typing indicators
  typingUsers: Record<string, Set<string>>; // threadId -> Set of userIds
  
  // Online users
  onlineUsers: Set<string>;
  
  // Loading states
  loadingChannels: boolean;
  loadingThreads: boolean;
  loadingMessages: boolean;
  
  // Actions - Channels
  setChannels: (channels: Channel[]) => void;
  addChannel: (channel: Channel) => void;
  updateChannel: (channelId: string, updates: Partial<Channel>) => void;
  removeChannel: (channelId: string) => void;
  setActiveChannel: (channelId: string | null) => void;
  
  // Actions - Threads
  setThreads: (channelId: string, threads: Thread[]) => void;
  addThread: (channelId: string, thread: Thread) => void;
  updateThread: (threadId: string, updates: Partial<Thread>) => void;
  removeThread: (channelId: string, threadId: string) => void;
  setActiveThread: (threadId: string | null) => void;
  
  // Actions - Messages
  setMessages: (threadId: string, messages: Message[]) => void;
  addMessage: (threadId: string, message: Message) => void;
  updateMessage: (threadId: string, messageId: string, updates: Partial<Message>) => void;
  removeMessage: (threadId: string, messageId: string) => void;
  prependMessages: (threadId: string, messages: Message[]) => void;
  
  // Actions - Unread counts
  setUnreadCount: (threadId: string, count: number) => void;
  incrementUnreadCount: (threadId: string) => void;
  clearUnreadCount: (threadId: string) => void;
  
  // Actions - Typing indicators
  addTypingUser: (threadId: string, userId: string) => void;
  removeTypingUser: (threadId: string, userId: string) => void;
  clearTypingUsers: (threadId: string) => void;
  
  // Actions - Online users
  setUserOnline: (userId: string) => void;
  setUserOffline: (userId: string) => void;
  
  // Actions - Loading states
  setLoadingChannels: (loading: boolean) => void;
  setLoadingThreads: (loading: boolean) => void;
  setLoadingMessages: (loading: boolean) => void;
  
  // Utility
  reset: () => void;
}

const initialState = {
  channels: [],
  activeChannelId: null,
  threads: {},
  activeThreadId: null,
  messages: {},
  unreadCounts: {},
  typingUsers: {},
  onlineUsers: new Set<string>(),
  loadingChannels: false,
  loadingThreads: false,
  loadingMessages: false,
};

export const useMessagingStore = create<MessagingState>((set, get) => ({
  ...initialState,

  // Channels
  setChannels: (channels) => {
    set({ channels });
  },

  addChannel: (channel) => {
    set((state) => ({
      channels: [...state.channels, channel],
    }));
  },

  updateChannel: (channelId, updates) => {
    set((state) => ({
      channels: state.channels.map((c) =>
        c.id === channelId ? { ...c, ...updates } : c
      ),
    }));
  },

  removeChannel: (channelId) => {
    set((state) => ({
      channels: state.channels.filter((c) => c.id !== channelId),
      activeChannelId: state.activeChannelId === channelId ? null : state.activeChannelId,
    }));
  },

  setActiveChannel: (channelId) => {
    set({ activeChannelId: channelId });
  },

  // Threads
  setThreads: (channelId, threads) => {
    set((state) => ({
      threads: {
        ...state.threads,
        [channelId]: threads,
      },
    }));
  },

  addThread: (channelId, thread) => {
    set((state) => ({
      threads: {
        ...state.threads,
        [channelId]: [...(state.threads[channelId] || []), thread],
      },
    }));
  },

  updateThread: (threadId, updates) => {
    set((state) => {
      const newThreads = { ...state.threads };
      for (const channelId in newThreads) {
        newThreads[channelId] = newThreads[channelId].map((t) =>
          t.id === threadId ? { ...t, ...updates } : t
        );
      }
      return { threads: newThreads };
    });
  },

  removeThread: (channelId, threadId) => {
    set((state) => ({
      threads: {
        ...state.threads,
        [channelId]: (state.threads[channelId] || []).filter((t) => t.id !== threadId),
      },
      activeThreadId: state.activeThreadId === threadId ? null : state.activeThreadId,
    }));
  },

  setActiveThread: (threadId) => {
    set({ activeThreadId: threadId });
  },

  // Messages
  setMessages: (threadId, messages) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [threadId]: messages,
      },
    }));
  },

  addMessage: (threadId, message) => {
    set((state) => {
      const existingMessages = state.messages[threadId] || [];
      // Check if message already exists to prevent duplicates
      const messageExists = existingMessages.some((m) => m.id === message.id);
      
      if (messageExists) {
        // Message already exists, update it instead of adding duplicate
        return {
          messages: {
            ...state.messages,
            [threadId]: existingMessages.map((m) =>
              m.id === message.id ? { ...m, ...message } : m
            ),
          },
        };
      }
      
      // Add new message
      return {
        messages: {
          ...state.messages,
          [threadId]: [...existingMessages, message],
        },
      };
    });
  },

  updateMessage: (threadId, messageId, updates) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [threadId]: (state.messages[threadId] || []).map((m) =>
          m.id === messageId ? { ...m, ...updates } : m
        ),
      },
    }));
  },

  removeMessage: (threadId, messageId) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [threadId]: (state.messages[threadId] || []).filter((m) => m.id !== messageId),
      },
    }));
  },

  prependMessages: (threadId, newMessages) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [threadId]: [...newMessages, ...(state.messages[threadId] || [])],
      },
    }));
  },

  // Unread counts
  setUnreadCount: (threadId, count) => {
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [threadId]: count,
      },
    }));
  },

  incrementUnreadCount: (threadId) => {
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [threadId]: (state.unreadCounts[threadId] || 0) + 1,
      },
    }));
  },

  clearUnreadCount: (threadId) => {
    set((state) => {
      const newUnreadCounts = { ...state.unreadCounts };
      delete newUnreadCounts[threadId];
      return { unreadCounts: newUnreadCounts };
    });
  },

  // Typing indicators
  addTypingUser: (threadId, userId) => {
    set((state) => {
      const typingUsers = { ...state.typingUsers };
      if (!typingUsers[threadId]) {
        typingUsers[threadId] = new Set();
      }
      typingUsers[threadId].add(userId);
      return { typingUsers };
    });
  },

  removeTypingUser: (threadId, userId) => {
    set((state) => {
      const typingUsers = { ...state.typingUsers };
      if (typingUsers[threadId]) {
        typingUsers[threadId].delete(userId);
        if (typingUsers[threadId].size === 0) {
          delete typingUsers[threadId];
        }
      }
      return { typingUsers };
    });
  },

  clearTypingUsers: (threadId) => {
    set((state) => {
      const typingUsers = { ...state.typingUsers };
      delete typingUsers[threadId];
      return { typingUsers };
    });
  },

  // Online users
  setUserOnline: (userId) => {
    set((state) => {
      const onlineUsers = new Set(state.onlineUsers);
      onlineUsers.add(userId);
      return { onlineUsers };
    });
  },

  setUserOffline: (userId) => {
    set((state) => {
      const onlineUsers = new Set(state.onlineUsers);
      onlineUsers.delete(userId);
      return { onlineUsers };
    });
  },

  // Loading states
  setLoadingChannels: (loading) => {
    set({ loadingChannels: loading });
  },

  setLoadingThreads: (loading) => {
    set({ loadingThreads: loading });
  },

  setLoadingMessages: (loading) => {
    set({ loadingMessages: loading });
  },

  // Utility
  reset: () => {
    set(initialState);
  },
}));
