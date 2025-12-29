/**
 * Messaging API Service
 * Type-safe interfaces for all messaging operations
 */

import { getApiBaseUrl } from '@/config/api';

// Get API base URL - VITE_API_URL already includes /api
// Endpoints in this file start with /api/messaging, so we use getApiBaseUrl() which returns base without /api
const API_URL = getApiBaseUrl();

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  message?: string;
}

/**
 * Get auth token from localStorage
 */
function getAuthToken(): string {
  return localStorage.getItem('auth_token') || '';
}

/**
 * Make authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getAuthToken();
  
  // API_URL is base URL (without /api), endpoints start with /api/messaging
  // So we use the endpoint as-is and prepend API_URL
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_URL}${cleanEndpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || data.message || 'Request failed');
  }

  return data;
}

/**
 * Channel Types
 */
export interface Channel {
  id: string;
  name: string;
  description: string | null;
  channel_type: 'public' | 'private' | 'direct';
  agency_id: string;
  created_by: string;
  is_archived: boolean;
  is_pinned: boolean;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  member_count?: number;
  thread_count?: number;
  is_member?: boolean;
}

export interface CreateChannelData {
  name: string;
  description?: string;
  channel_type?: 'public' | 'private' | 'direct';
  other_user_id?: string; // For direct messages
  settings?: Record<string, any>;
}

export interface UpdateChannelData {
  name?: string;
  description?: string;
  settings?: Record<string, any>;
  is_pinned?: boolean;
}

/**
 * Thread Types
 */
export interface Thread {
  id: string;
  channel_id: string;
  title: string | null;
  parent_message_id: string | null;
  agency_id: string;
  created_by: string;
  last_message_at: string | null;
  message_count: number;
  is_pinned: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  unread_count?: number;
  last_message_content?: string;
}

export interface CreateThreadData {
  title?: string;
  parent_message_id?: string;
}

/**
 * Message Types
 */
export interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'file' | 'system' | 'reply';
  parent_message_id: string | null;
  is_edited: boolean;
  edited_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  metadata: Record<string, any>;
  agency_id: string;
  created_at: string;
  updated_at: string;
  sender_email?: string;
  sender_name?: string;
  sender_avatar?: string;
  reaction_count?: number;
  reactions?: Array<{
    emoji: string;
    count: number;
    users: Array<{ id: string; name: string }>;
  }>;
  is_read?: boolean;
  attachments?: Array<{
    id: string;
    file_name: string;
    file_path: string;
    mime_type: string;
    file_size: number;
  }>;
}

export interface CreateMessageData {
  content: string;
  message_type?: 'text' | 'file' | 'system' | 'reply';
  parent_message_id?: string;
  mentions?: Array<{
    user_id: string;
    type?: 'user' | 'channel' | 'here' | 'everyone';
  }>;
  metadata?: Record<string, any>;
}

export interface UpdateMessageData {
  content?: string;
  metadata?: Record<string, any>;
}

/**
 * Reaction Types
 */
export interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

/**
 * Attachment Types
 */
export interface Attachment {
  id: string;
  message_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  file_type: string | null;
  thumbnail_path: string | null;
  uploaded_by: string;
  created_at: string;
}

/**
 * Draft Types
 */
export interface Draft {
  id: string;
  thread_id: string;
  user_id: string;
  content: string;
  attachments: any[];
  created_at: string;
  updated_at: string;
}

/**
 * Channel API
 */
export const channelApi = {
  /**
   * Get all channels
   */
  async getAll(): Promise<Channel[]> {
    const response = await apiRequest<Channel[]>('/messaging/channels');
    return response.data || [];
  },

  /**
   * Get channel by ID
   */
  async getById(channelId: string): Promise<Channel> {
    const response = await apiRequest<Channel>(`/messaging/channels/${channelId}`);
    if (!response.data) {
      throw new Error('Channel not found');
    }
    return response.data;
  },

  /**
   * Create channel
   */
  async create(data: CreateChannelData): Promise<Channel> {
    const response = await apiRequest<Channel>('/messaging/channels', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.data) {
      throw new Error('Failed to create channel');
    }
    return response.data;
  },

  /**
   * Update channel
   */
  async update(channelId: string, data: UpdateChannelData): Promise<Channel> {
    const response = await apiRequest<Channel>(`/messaging/channels/${channelId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response.data) {
      throw new Error('Failed to update channel');
    }
    return response.data;
  },

  /**
   * Archive channel
   */
  async archive(channelId: string): Promise<Channel> {
    const response = await apiRequest<Channel>(`/messaging/channels/${channelId}`, {
      method: 'DELETE',
    });
    if (!response.data) {
      throw new Error('Failed to archive channel');
    }
    return response.data;
  },

  /**
   * Add member to channel
   */
  async addMember(channelId: string, userId: string, role: 'owner' | 'admin' | 'member' = 'member'): Promise<any> {
    const response = await apiRequest(`/messaging/channels/${channelId}/members`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, role }),
    });
    return response.data;
  },

  /**
   * Remove member from channel
   */
  async removeMember(channelId: string, userId: string): Promise<any> {
    const response = await apiRequest(`/messaging/channels/${channelId}/members/${userId}`, {
      method: 'DELETE',
    });
    return response.data;
  },

  /**
   * Get pinned messages
   */
  async getPinnedMessages(channelId: string): Promise<Message[]> {
    const response = await apiRequest<Message[]>(`/messaging/channels/${channelId}/pins`);
    return response.data || [];
  },
};

/**
 * Thread API
 */
export const threadApi = {
  /**
   * Get threads for channel
   */
  async getByChannel(channelId: string, limit = 50, offset = 0): Promise<Thread[]> {
    const response = await apiRequest<Thread[]>(
      `/messaging/channels/${channelId}/threads?limit=${limit}&offset=${offset}`
    );
    return response.data || [];
  },

  /**
   * Get thread by ID
   */
  async getById(threadId: string): Promise<Thread> {
    const response = await apiRequest<Thread>(`/messaging/threads/${threadId}`);
    if (!response.data) {
      throw new Error('Thread not found');
    }
    return response.data;
  },

  /**
   * Create thread
   */
  async create(channelId: string, data: CreateThreadData): Promise<Thread> {
    const response = await apiRequest<Thread>(`/messaging/channels/${channelId}/threads`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.data) {
      throw new Error('Failed to create thread');
    }
    return response.data;
  },
};

/**
 * Message API
 */
export const messageApi = {
  /**
   * Get messages for thread
   */
  async getByThread(threadId: string, limit = 50, offset = 0): Promise<Message[]> {
    const response = await apiRequest<Message[]>(
      `/messaging/threads/${threadId}/messages?limit=${limit}&offset=${offset}`
    );
    return response.data || [];
  },

  /**
   * Create message
   */
  async create(threadId: string, data: CreateMessageData): Promise<Message> {
    const response = await apiRequest<Message>(`/messaging/threads/${threadId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.data) {
      throw new Error('Failed to create message');
    }
    return response.data;
  },

  /**
   * Update message
   */
  async update(messageId: string, data: UpdateMessageData): Promise<Message> {
    const response = await apiRequest<Message>(`/messaging/messages/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response.data) {
      throw new Error('Failed to update message');
    }
    return response.data;
  },

  /**
   * Delete message
   */
  async delete(messageId: string): Promise<Message> {
    const response = await apiRequest<Message>(`/messaging/messages/${messageId}`, {
      method: 'DELETE',
    });
    if (!response.data) {
      throw new Error('Failed to delete message');
    }
    return response.data;
  },

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<any> {
    const response = await apiRequest(`/messaging/messages/${messageId}/read`, {
      method: 'POST',
    });
    return response.data;
  },
};

/**
 * Reaction API
 */
export const reactionApi = {
  /**
   * Add reaction
   */
  async add(messageId: string, emoji: string): Promise<Reaction> {
    const response = await apiRequest<Reaction>(`/messaging/messages/${messageId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    });
    if (!response.data) {
      throw new Error('Failed to add reaction');
    }
    return response.data;
  },

  /**
   * Remove reaction
   */
  async remove(messageId: string, emoji: string): Promise<Reaction> {
    const response = await apiRequest<Reaction>(
      `/messaging/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
      {
        method: 'DELETE',
      }
    );
    if (!response.data) {
      throw new Error('Failed to remove reaction');
    }
    return response.data;
  },
};

/**
 * Search API
 */
export const searchApi = {
  /**
   * Search messages
   */
  async search(
    query: string,
    filters?: {
      channel_id?: string;
      thread_id?: string;
      sender_id?: string;
      date_from?: string;
      date_to?: string;
      limit?: number;
    }
  ): Promise<Message[]> {
    const params = new URLSearchParams({ q: query });
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      });
    }

    const response = await apiRequest<Message[]>(`/messaging/search?${params.toString()}`);
    return response.data || [];
  },
};

/**
 * Attachment API
 */
export const attachmentApi = {
  /**
   * Upload attachment
   */
  async upload(messageId: string, file: File): Promise<Attachment> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('message_id', messageId);

    const token = getAuthToken();
    const response = await fetch(`${API_URL}/api/messaging/attachments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || data.message || 'Upload failed');
    }

    return data.data;
  },

  /**
   * Get attachment by ID
   */
  async getById(attachmentId: string): Promise<Attachment> {
    const response = await apiRequest<Attachment>(`/messaging/attachments/${attachmentId}`);
    if (!response.data) {
      throw new Error('Attachment not found');
    }
    return response.data;
  },
};

/**
 * Draft API
 */
export const draftApi = {
  /**
   * Get draft
   */
  async get(threadId: string): Promise<Draft | null> {
    const response = await apiRequest<Draft>(`/messaging/threads/${threadId}/draft`);
    return response.data || null;
  },

  /**
   * Save draft
   */
  async save(threadId: string, content: string, attachments: any[] = []): Promise<Draft> {
    const response = await apiRequest<Draft>(`/messaging/threads/${threadId}/draft`, {
      method: 'POST',
      body: JSON.stringify({ content, attachments }),
    });
    if (!response.data) {
      throw new Error('Failed to save draft');
    }
    return response.data;
  },

  /**
   * Delete draft
   */
  async delete(threadId: string): Promise<void> {
    await apiRequest(`/messaging/threads/${threadId}/draft`, {
      method: 'DELETE',
    });
  },
};

/**
 * Pin API
 */
export const pinApi = {
  /**
   * Pin message
   */
  async pin(messageId: string, channelId: string): Promise<any> {
    const response = await apiRequest(`/messaging/messages/${messageId}/pin`, {
      method: 'POST',
      body: JSON.stringify({ channel_id: channelId }),
    });
    return response.data;
  },

  /**
   * Unpin message
   */
  async unpin(messageId: string, channelId: string): Promise<void> {
    await apiRequest(`/messaging/messages/${messageId}/pin`, {
      method: 'DELETE',
      body: JSON.stringify({ channel_id: channelId }),
    });
  },
};
