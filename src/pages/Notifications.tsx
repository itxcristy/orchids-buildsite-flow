import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Check, 
  X, 
  ExternalLink, 
  Clock, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  Trash2,
  Search,
  Filter,
  Send,
  Users,
  Mail,
  Eye,
  EyeOff,
  MoreVertical,
  Archive
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { db } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useAsyncOperation } from '@/hooks/useAsyncOperation';
import { useAuth } from '@/hooks/useAuth';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface Notification {
  id: string;
  user_id: string;
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
  updated_at: string;
}

interface User {
  id: string;
  email: string;
  full_name?: string;
}

const Notifications = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<string | null>(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  
  // Send notification form state
  const [sendForm, setSendForm] = useState({
    userIds: [] as string[],
    type: 'in_app' as 'email' | 'in_app' | 'push',
    category: 'system' as 'approval' | 'reminder' | 'update' | 'alert' | 'system',
    title: '',
    message: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    actionUrl: '',
    expiresAt: '',
  });

  const isAdmin = userRole === 'admin' || userRole === 'hr' || userRole === 'super_admin';

  const { execute: fetchNotifications, loading: loadingNotifications } = useAsyncOperation({
    onError: (error) => {
      if (!error.message?.includes('does not exist') && !error.message?.includes('42P01')) {
        toast({ variant: 'destructive', title: 'Failed to load notifications', description: error.message });
      }
    }
  });

  const { execute: markAsRead, loading: markingRead } = useAsyncOperation({
    onSuccess: () => {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  });

  const { execute: deleteNotification, loading: deleting } = useAsyncOperation({
    onSuccess: () => {
      toast({ title: 'Notification deleted successfully' });
      loadNotifications();
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Failed to delete notification', description: error.message });
    }
  });

  const { execute: sendNotification, loading: sending } = useAsyncOperation({
    onSuccess: () => {
      toast({ title: 'Notification sent successfully' });
      setSendDialogOpen(false);
      setSendForm({
        userIds: [],
        type: 'in_app',
        category: 'system',
        title: '',
        message: '',
        priority: 'normal',
        actionUrl: '',
        expiresAt: '',
      });
      loadNotifications();
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Failed to send notification', description: error.message });
    }
  });

  const loadNotifications = async () => {
    if (!user) return;
    
    return fetchNotifications(async () => {
      const { data, error } = await db
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.message?.includes('does not exist') || error.message?.includes('42P01')) {
          setNotifications([]);
          setFilteredNotifications([]);
          setUnreadCount(0);
          return [];
        }
        throw error;
      }
      
      const notificationsData = (data || []) as Notification[];
      setNotifications(notificationsData);
      
      const unreadNotifications = notificationsData.filter(n => !n.read_at);
      setUnreadCount(unreadNotifications.length);
      
      return data;
    });
  };

  const loadUsers = async () => {
    if (!isAdmin) return;
    
    try {
      // Use unified_employees view which has all user data including full_name
      const { data, error } = await db
        .from('unified_employees')
        .select('user_id, email, display_name, full_name')
        .order('email', { ascending: true });

      if (error) throw error;
      
      // Transform the data to match User interface
      const transformedUsers = (data || []).map((user: any) => ({
        id: user.user_id,
        email: user.email,
        full_name: user.full_name || user.display_name || null
      }));
      
      setUsers(transformedUsers as User[]);
    } catch (error: any) {
      console.error('Failed to load users:', error);
      // Fallback: get users and profiles separately
      try {
        const { data: usersData } = await db
          .from('users')
          .select('id, email')
          .order('email', { ascending: true });
        
        if (usersData && usersData.length > 0) {
          const userIds = usersData.map((u: any) => u.id);
          const { data: profilesData } = await db
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', userIds);
          
          const profileMap = new Map((profilesData || []).map((p: any) => [p.user_id, p.full_name]));
          
          const usersWithNames = usersData.map((u: any) => ({
            id: u.id,
            email: u.email,
            full_name: profileMap.get(u.id) || null
          }));
          
          setUsers(usersWithNames as User[]);
        }
      } catch (fallbackErr) {
        console.error('Fallback also failed:', fallbackErr);
      }
    }
  };

  useEffect(() => {
    if (user) {
      loadNotifications();
      if (isAdmin) {
        loadUsers();
      }
    }
  }, [user]);

  // Filter notifications based on search, category, priority, and tab
  useEffect(() => {
    let filtered = [...notifications];

    // Apply tab filter
    if (activeTab === 'unread') {
      filtered = filtered.filter(n => !n.read_at);
    } else if (activeTab !== 'all') {
      filtered = filtered.filter(n => n.category === activeTab);
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(n => n.category === categoryFilter);
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(n => n.priority === priorityFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(query) || 
        n.message.toLowerCase().includes(query)
      );
    }

    setFilteredNotifications(filtered);
  }, [notifications, activeTab, categoryFilter, priorityFilter, searchQuery]);

  const handleMarkAsRead = async (notificationId: string) => {
    return markAsRead(async () => {
      try {
        const { error } = await db.rpc('mark_notification_read', {
          p_notification_id: notificationId
        });

        if (error && !error.message?.includes('does not exist') && !error.message?.includes('42P01')) {
          throw error;
        }
      } catch (error: any) {
        if (!error.message?.includes('does not exist') && !error.message?.includes('42P01')) {
          throw error;
        }
      }

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
    
    toast({ title: 'All notifications marked as read' });
  };

  const handleDeleteNotification = async (notificationId: string) => {
    return deleteNotification(async () => {
      const { error } = await db
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setSelectedNotifications(prev => {
        const next = new Set(prev);
        next.delete(notificationId);
        return next;
      });
    });
  };

  const handleBulkDelete = async () => {
    if (selectedNotifications.size === 0) return;

    const ids = Array.from(selectedNotifications);
    try {
      for (const id of ids) {
        const { error } = await db
          .from('notifications')
          .delete()
          .eq('id', id);

        if (error) throw error;
      }

      setNotifications(prev => prev.filter(n => !selectedNotifications.has(n.id)));
      setSelectedNotifications(new Set());
      toast({ title: `${ids.length} notification(s) deleted successfully` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed to delete notifications', description: error.message });
    }
  };

  const handleBulkMarkAsRead = async () => {
    if (selectedNotifications.size === 0) return;

    const ids = Array.from(selectedNotifications);
    for (const id of ids) {
      await handleMarkAsRead(id);
    }
    
    setSelectedNotifications(new Set());
    toast({ title: `${ids.length} notification(s) marked as read` });
  };

  const handleSendNotification = async () => {
    if (!sendForm.title.trim() || !sendForm.message.trim()) {
      toast({ variant: 'destructive', title: 'Title and message are required' });
      return;
    }

    if (sendForm.userIds.length === 0) {
      toast({ variant: 'destructive', title: 'Please select at least one user' });
      return;
    }

    return sendNotification(async () => {
      const promises = sendForm.userIds.map(userId => 
        db.rpc('create_notification', {
          p_user_id: userId,
          p_type: sendForm.type,
          p_category: sendForm.category,
          p_title: sendForm.title,
          p_message: sendForm.message,
          p_metadata: {},
          p_priority: sendForm.priority,
          p_action_url: sendForm.actionUrl || null,
          p_expires_at: sendForm.expiresAt || null,
        })
      );

      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        throw new Error(`Failed to send ${errors.length} notification(s)`);
      }
    });
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read_at) {
      handleMarkAsRead(notification.id);
    }
    
    if (notification.action_url) {
      window.open(notification.action_url, '_blank');
    }
  };

  const toggleSelection = (notificationId: string) => {
    setSelectedNotifications(prev => {
      const next = new Set(prev);
      if (next.has(notificationId)) {
        next.delete(notificationId);
      } else {
        next.add(notificationId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedNotifications.size === filteredNotifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(filteredNotifications.map(n => n.id)));
    }
  };

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            Manage and view all your notifications
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Send className="w-4 h-4 mr-2" />
                  Send Notification
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Send Notification</DialogTitle>
                  <DialogDescription>
                    Send a notification to one or more users
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="users">Recipients *</Label>
                    <Select
                      value={sendForm.userIds.length > 0 ? 'selected' : ''}
                      onValueChange={() => {}}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select users" />
                      </SelectTrigger>
                      <SelectContent>
                        <ScrollArea className="h-60">
                          {users.map(u => (
                            <div key={u.id} className="flex items-center space-x-2 px-2 py-1.5">
                              <Checkbox
                                checked={sendForm.userIds.includes(u.id)}
                                onCheckedChange={(checked) => {
                                  setSendForm(prev => ({
                                    ...prev,
                                    userIds: checked
                                      ? [...prev.userIds, u.id]
                                      : prev.userIds.filter(id => id !== u.id)
                                  }));
                                }}
                              />
                              <Label className="font-normal cursor-pointer">
                                {u.full_name || u.email}
                              </Label>
                            </div>
                          ))}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                    {sendForm.userIds.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {sendForm.userIds.length} user(s) selected
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Type</Label>
                      <Select
                        value={sendForm.type}
                        onValueChange={(value: 'email' | 'in_app' | 'push') => 
                          setSendForm(prev => ({ ...prev, type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in_app">In-App</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="push">Push</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={sendForm.category}
                        onValueChange={(value: 'approval' | 'reminder' | 'update' | 'alert' | 'system') => 
                          setSendForm(prev => ({ ...prev, category: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="system">System</SelectItem>
                          <SelectItem value="approval">Approval</SelectItem>
                          <SelectItem value="reminder">Reminder</SelectItem>
                          <SelectItem value="update">Update</SelectItem>
                          <SelectItem value="alert">Alert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={sendForm.priority}
                      onValueChange={(value: 'low' | 'normal' | 'high' | 'urgent') => 
                        setSendForm(prev => ({ ...prev, priority: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={sendForm.title}
                      onChange={(e) => setSendForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Notification title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      value={sendForm.message}
                      onChange={(e) => setSendForm(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Notification message"
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="actionUrl">Action URL (optional)</Label>
                    <Input
                      id="actionUrl"
                      value={sendForm.actionUrl}
                      onChange={(e) => setSendForm(prev => ({ ...prev, actionUrl: e.target.value }))}
                      placeholder="https://example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expiresAt">Expires At (optional)</Label>
                    <Input
                      id="expiresAt"
                      type="datetime-local"
                      value={sendForm.expiresAt}
                      onChange={(e) => setSendForm(prev => ({ ...prev, expiresAt: e.target.value }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSendDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSendNotification} disabled={sending}>
                    {sending ? <LoadingSpinner size="sm" /> : 'Send Notification'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          
          {unreadCount > 0 && (
            <Button variant="outline" onClick={handleMarkAllAsRead} disabled={markingRead}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="approval">Approval</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="alert">Alert</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedNotifications.size > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {selectedNotifications.size} notification(s) selected
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleBulkMarkAsRead}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark as Read
                </Button>
                <Button variant="outline" size="sm" onClick={handleBulkDelete}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Notifications</CardTitle>
              <CardDescription>
                {unreadCount} unread • {notifications.length} total
              </CardDescription>
            </div>
            {filteredNotifications.length > 0 && (
              <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
                {selectedNotifications.size === filteredNotifications.length ? (
                  <>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Select All
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
              <TabsTrigger value="approval">Approval</TabsTrigger>
              <TabsTrigger value="alert">Alerts</TabsTrigger>
              <TabsTrigger value="system">System</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-4">
              {loadingNotifications ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner size="md" text="Loading notifications..." />
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No notifications found</p>
                  <p className="text-sm">Try adjusting your filters or search query</p>
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-2">
                    {filteredNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 rounded-lg border transition-colors ${
                          !notification.read_at ? 'bg-blue-50/50 border-blue-200' : 'bg-card'
                        } ${
                          selectedNotifications.has(notification.id) ? 'ring-2 ring-primary' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedNotifications.has(notification.id)}
                            onCheckedChange={() => toggleSelection(notification.id)}
                            className="mt-1"
                          />
                          
                          <div
                            className="flex-1 cursor-pointer"
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2 flex-1">
                                {getPriorityIcon(notification.priority)}
                                <h4 className="font-semibold text-base">
                                  {notification.title}
                                </h4>
                                {!notification.read_at && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant="secondary" 
                                  className={`text-xs ${getCategoryColor(notification.category)}`}
                                >
                                  {notification.category}
                                </Badge>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-48 p-2">
                                    <div className="space-y-1">
                                      {!notification.read_at && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="w-full justify-start"
                                          onClick={() => handleMarkAsRead(notification.id)}
                                        >
                                          <Check className="w-4 h-4 mr-2" />
                                          Mark as Read
                                        </Button>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-start text-destructive"
                                        onClick={() => {
                                          setNotificationToDelete(notification.id);
                                          setDeleteDialogOpen(true);
                                        }}
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete
                                      </Button>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-3">
                              {notification.message}
                            </p>
                            
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {formatDate(notification.created_at)}
                                </div>
                                {notification.action_url && (
                                  <div className="flex items-center text-primary">
                                    <ExternalLink className="w-3 h-3 mr-1" />
                                    Has action
                                  </div>
                                )}
                              </div>
                              {notification.expires_at && (
                                <div className="text-orange-600">
                                  Expires: {new Date(notification.expires_at).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notification</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this notification? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNotificationToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (notificationToDelete) {
                  handleDeleteNotification(notificationToDelete);
                  setNotificationToDelete(null);
                  setDeleteDialogOpen(false);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Notifications;

