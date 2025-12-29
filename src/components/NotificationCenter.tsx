import React, { useState, useEffect } from 'react';
import { Bell, Check, X, ExternalLink, Clock, AlertTriangle, Info, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { db } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from './LoadingSpinner';
import { useAsyncOperation } from '@/hooks/useAsyncOperation';
import { useAuth } from '@/hooks/useAuth';

interface Notification {
  id: string;
  type: 'email' | 'in_app' | 'push';
  category: 'approval' | 'reminder' | 'update' | 'alert' | 'system';
  title: string;
  message: string;
  metadata: any;
  read_at: string | null;
  sent_at: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  expires_at: string | null;
  action_url: string | null;
  created_at: string;
}

export const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const { toast } = useToast();
  const { user } = useAuth();

  const { execute: fetchNotifications, loading: loadingNotifications } = useAsyncOperation({
    onError: (error) => {
      // Don't show error if table doesn't exist - it's expected during initial setup
      if (!error.message?.includes('does not exist') && !error.message?.includes('42P01')) {
        toast({ variant: 'destructive', title: 'Failed to load notifications', description: error.message });
      }
    }
  });

  const { execute: markAsRead, loading: markingRead } = useAsyncOperation({
    onSuccess: () => {
      setUnreadCount(prev => Math.max(0, prev - 1));
      toast({ title: 'Notification marked as read' });
    }
  });

  const loadNotifications = async () => {
    if (!user) return;
    
    return fetchNotifications(async () => {
      const { data, error } = await db
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      // Handle case where notifications table doesn't exist
      if (error) {
        // If table doesn't exist, just return empty array (don't show error to user)
        if (error.message?.includes('does not exist') || error.message?.includes('42P01')) {
          setNotifications([]);
          setUnreadCount(0);
          return [];
        }
        throw error;
      }
      
      setNotifications((data || []) as Notification[]);
      
      // Get unread count - count unread notifications
      const unreadNotifications = (data || []).filter(n => !n.read_at);
      setUnreadCount(unreadNotifications.length);
      
      return data;
    });
  };

  const handleMarkAsRead = async (notificationId: string) => {
    return markAsRead(async () => {
      // Try to use RPC function, but if it doesn't exist, just update locally
      try {
        const { error } = await db.rpc('mark_notification_read', {
          p_notification_id: notificationId
        });

        if (error && !error.message?.includes('does not exist') && !error.message?.includes('42P01')) {
          throw error;
        }
      } catch (error: any) {
        // If RPC doesn't exist or table doesn't exist, just update locally
        if (!error.message?.includes('does not exist') && !error.message?.includes('42P01')) {
          throw error;
        }
      }

      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, read_at: new Date().toISOString() }
            : notif
        )
      );
    });
  };

  const handleMarkAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.read_at);
    
    for (const notification of unreadNotifications) {
      await handleMarkAsRead(notification.id);
    }
    
    setUnreadCount(0);
    toast({ title: 'All notifications marked as read' });
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read_at) {
      handleMarkAsRead(notification.id);
    }
    
    if (notification.action_url) {
      window.open(notification.action_url, '_blank');
    }
  };

  useEffect(() => {
    if (user) {
      loadNotifications();
      
      // Set up polling for notifications (realtime not available in browser-only mode)
      const pollInterval = setInterval(() => {
        loadNotifications();
      }, 30000); // Poll every 30 seconds

      return () => {
        clearInterval(pollInterval);
      };
    }
  }, [user]);

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'high': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'normal': return <Info className="w-4 h-4 text-blue-500" />;
      case 'low': return <Info className="w-4 h-4 text-gray-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'approval': return 'bg-yellow-100 text-yellow-800';
      case 'reminder': return 'bg-blue-100 text-blue-800';
      case 'update': return 'bg-green-100 text-green-800';
      case 'alert': return 'bg-red-100 text-red-800';
      case 'system': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !notification.read_at;
    return notification.category === activeTab;
  });

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-[90vw] sm:w-96 max-w-sm p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notifications</CardTitle>
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleMarkAllAsRead}
                  disabled={markingRead}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>
            <CardDescription>
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="px-2 sm:px-3 pt-2 pb-2 border-b">
                <TabsList className="grid grid-cols-4 w-full h-auto p-0.5 bg-muted/50 gap-0.5">
                  <TabsTrigger 
                    value="all" 
                    className="text-[10px] sm:text-xs px-1 sm:px-2 py-1.5 whitespace-nowrap truncate"
                  >
                    All
                  </TabsTrigger>
                  <TabsTrigger 
                    value="unread" 
                    className="text-[10px] sm:text-xs px-1 sm:px-2 py-1.5 whitespace-nowrap truncate"
                  >
                    Unread
                  </TabsTrigger>
                  <TabsTrigger 
                    value="approval" 
                    className="text-[10px] sm:text-xs px-1 sm:px-2 py-1.5 whitespace-nowrap truncate"
                  >
                    Approval
                  </TabsTrigger>
                  <TabsTrigger 
                    value="alert" 
                    className="text-[10px] sm:text-xs px-1 sm:px-2 py-1.5 whitespace-nowrap truncate"
                  >
                    Alerts
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <ScrollArea className="h-96">
                <TabsContent value={activeTab} className="mt-0">
                  {loadingNotifications ? (
                    <div className="flex justify-center py-8">
                      <LoadingSpinner size="md" text="Loading notifications..." />
                    </div>
                  ) : filteredNotifications.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No notifications</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredNotifications.map((notification, index) => (
                        <div key={notification.id}>
                          <div 
                            className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                              !notification.read_at ? 'bg-blue-50/50' : ''
                            }`}
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0 mt-1">
                                {getPriorityIcon(notification.priority)}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className="text-sm font-medium truncate">
                                    {notification.title}
                                  </h4>
                                  <div className="flex items-center space-x-1">
                                    <Badge 
                                      variant="secondary" 
                                      className={`text-xs ${getCategoryColor(notification.category)}`}
                                    >
                                      {notification.category}
                                    </Badge>
                                    {!notification.read_at && (
                                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                                    )}
                                  </div>
                                </div>
                                
                                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                  {notification.message}
                                </p>
                                
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <div className="flex items-center">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {new Date(notification.created_at).toLocaleString()}
                                  </div>
                                  {notification.action_url && (
                                    <ExternalLink className="w-3 h-3" />
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          {index < filteredNotifications.length - 1 && <Separator />}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>
            
            <div className="border-t p-3">
              <Button variant="ghost" className="w-full" asChild>
                <Link to="/notifications">
                  View All Notifications
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
};