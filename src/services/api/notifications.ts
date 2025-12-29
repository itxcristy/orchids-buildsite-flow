import { BaseApiService, type ApiResponse, type ApiOptions } from './base';

interface Notification {
  id: string;
  user_id: string;
  type: string;
  category: string;
  title: string;
  message: string;
  metadata?: any;
  priority: string;
  action_url?: string;
  read_at?: string;
  expires_at?: string;
  created_at: string;
}

export class NotificationService extends BaseApiService {
  static async getNotifications(
    userId: string, 
    options: ApiOptions = {}
  ): Promise<ApiResponse<Notification[]>> {
    return this.query<Notification[]>('notifications', {
      select: '*',
      filters: { user_id: userId },
      orderBy: { column: 'created_at', ascending: false },
      limit: 50
    }, options);
  }

  static async getUnreadCount(
    userId: string,
    options: ApiOptions = {}
  ): Promise<ApiResponse<number>> {
    return this.rpc<number>('get_unread_notification_count', {
      p_user_id: userId
    }, options);
  }

  static async markAsRead(
    notificationId: string,
    options: ApiOptions = {}
  ): Promise<ApiResponse<any>> {
    return this.rpc('mark_notification_read', {
      p_notification_id: notificationId
    }, options);
  }

  static async createNotification(
    data: {
      userId: string;
      type: string;
      category: string;
      title: string;
      message: string;
      metadata?: any;
      priority?: string;
      actionUrl?: string;
      expiresAt?: string;
      agencyId?: string;
    },
    options: ApiOptions = {}
  ): Promise<ApiResponse<any>> {
    return this.rpc('create_notification', {
      p_user_id: data.userId,
      p_type: data.type,
      p_category: data.category,
      p_title: data.title,
      p_message: data.message,
      p_metadata: data.metadata || {},
      p_priority: data.priority || 'normal',
      p_action_url: data.actionUrl,
      p_expires_at: data.expiresAt,
      p_agency_id: data.agencyId
    }, options);
  }

  static async deleteNotification(
    notificationId: string,
    options: ApiOptions = {}
  ): Promise<ApiResponse<any>> {
    return this.delete('notifications', { id: notificationId }, options);
  }

  static async bulkDeleteNotifications(
    notificationIds: string[],
    options: ApiOptions = {}
  ): Promise<ApiResponse<any>> {
    // Delete notifications one by one using the base delete method
    // This ensures proper error handling and transaction safety
    const results = await Promise.all(
      notificationIds.map(id => this.deleteNotification(id, { ...options, showErrorToast: false }))
    );
    
    const errors = results.filter(r => !r.success);
    if (errors.length > 0) {
      return {
        data: null,
        error: `Failed to delete ${errors.length} notification(s)`,
        success: false
      };
    }
    
    return {
      data: null,
      error: null,
      success: true
    };
  }

  static async markAllAsRead(
    userId: string,
    options: ApiOptions = {}
  ): Promise<ApiResponse<any>> {
    return this.update('notifications', 
      { read_at: new Date().toISOString() },
      { user_id: userId },
      options
    );
  }
}