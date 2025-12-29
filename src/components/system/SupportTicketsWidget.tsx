import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { TicketIcon, CheckCircle, TrendingUp, Plus, Edit, Trash2, Eye, MoreHorizontal, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  fetchTicketSummary,
  fetchTickets,
  fetchTicket,
  createTicket,
  updateTicket,
  deleteTicket,
  type TicketStats,
  type RecentTicket,
  type SupportTicket,
  type CreateTicketData,
} from '@/services/system-tickets';

export const SupportTicketsWidget = () => {
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
  const [allTickets, setAllTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  const [ticketForm, setTicketForm] = useState<CreateTicketData>({
    title: '',
    description: '',
    priority: 'medium',
    category: 'general',
    status: 'open',
  });

  const loadTicketStats = async () => {
    try {
      setLoading(true);
      const data = await fetchTicketSummary();
      setStats(data.stats);
      setRecentTickets(data.recentTickets);
      
      // Also load all tickets for the list view
      const tickets = await fetchTickets({ limit: 100 });
      setAllTickets(tickets);
    } catch (error: any) {
      console.error('Error fetching ticket stats:', error);
      toast({
        title: 'Error loading ticket data',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTicketStats();
    const interval = setInterval(loadTicketStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateTicket = async () => {
    if (!ticketForm.title || !ticketForm.description) {
      toast({
        title: 'Validation Error',
        description: 'Title and description are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createTicket(ticketForm);
      toast({
        title: 'Success',
        description: 'Ticket created successfully',
      });
      setIsCreateDialogOpen(false);
      setTicketForm({
        title: '',
        description: '',
        priority: 'medium',
        category: 'general',
        status: 'open',
      });
      loadTicketStats();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create ticket',
        variant: 'destructive',
      });
    }
  };

  const handleViewTicket = async (ticketId: string) => {
    try {
      const ticket = await fetchTicket(ticketId);
      setSelectedTicket(ticket);
      setIsViewDialogOpen(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load ticket details',
        variant: 'destructive',
      });
    }
  };

  const handleEditTicket = async () => {
    if (!selectedTicket) return;

    try {
      await updateTicket(selectedTicket.id, {
        title: ticketForm.title || selectedTicket.title,
        description: ticketForm.description || selectedTicket.description,
        status: ticketForm.status || selectedTicket.status,
        priority: ticketForm.priority || selectedTicket.priority,
        category: ticketForm.category || selectedTicket.category,
      });
      toast({
        title: 'Success',
        description: 'Ticket updated successfully',
      });
      setIsEditDialogOpen(false);
      setSelectedTicket(null);
      loadTicketStats();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update ticket',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(ticketId);
      await deleteTicket(ticketId);
      toast({
        title: 'Success',
        description: 'Ticket deleted successfully',
      });
      loadTicketStats();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete ticket',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      await updateTicket(ticketId, { status: newStatus as any });
      toast({
        title: 'Success',
        description: 'Ticket status updated',
      });
      loadTicketStats();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update ticket status',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setTicketForm({
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority,
      category: ticket.category,
      status: ticket.status,
    });
    setIsEditDialogOpen(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'destructive';
      case 'in_progress': return 'default';
      case 'resolved': return 'default';
      case 'closed': return 'secondary';
      default: return 'secondary';
    }
  };

  if (loading && !stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TicketIcon className="h-5 w-5" />
            Support Tickets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TicketIcon className="h-5 w-5" />
              Support Tickets
            </CardTitle>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => {
                  setTicketForm({
                    title: '',
                    description: '',
                    priority: 'medium',
                    category: 'general',
                    status: 'open',
                  });
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Ticket
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Support Ticket</DialogTitle>
                  <DialogDescription>
                    Create a new support ticket to track customer issues and requests.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={ticketForm.title}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Brief description of the issue"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={ticketForm.description}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Detailed description of the issue"
                      rows={5}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        value={ticketForm.priority}
                        onValueChange={(value) => setTicketForm(prev => ({ ...prev, priority: value as any }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Input
                        id="category"
                        value={ticketForm.category}
                        onChange={(e) => setTicketForm(prev => ({ ...prev, category: e.target.value }))}
                        placeholder="e.g., technical, billing, feature"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTicket}>
                    Create Ticket
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="recent">Recent Tickets</TabsTrigger>
              <TabsTrigger value="all">All Tickets</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {stats && (
                <>
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{stats.total}</div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{stats.open}</div>
                      <div className="text-xs text-muted-foreground">Open</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
                      <div className="text-xs text-muted-foreground">In Progress</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
                      <div className="text-xs text-muted-foreground">Resolved</div>
                    </div>
                  </div>

                  {/* Today's Activity */}
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Today's Activity</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">New: {stats.newToday}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Resolved: {stats.resolvedToday}</span>
                      </div>
                    </div>
                    {stats.avgResolutionTime > 0 && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        Avg Resolution Time: {stats.avgResolutionTime.toFixed(1)} hours
                      </div>
                    )}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="recent" className="space-y-3">
              {recentTickets.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {recentTickets.map((ticket) => (
                    <div key={ticket.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{ticket.ticket_number}</span>
                          <Badge variant={getPriorityColor(ticket.priority)} className="text-xs">
                            {ticket.priority}
                          </Badge>
                          <Badge variant={getStatusColor(ticket.status)} className="text-xs">
                            {ticket.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {ticket.title}
                        </p>
                        <div className="text-xs text-muted-foreground mt-1">
                          {ticket.category} • {new Date(ticket.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewTicket(ticket.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewTicket(ticket.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              const fullTicket = allTickets.find(t => t.id === ticket.id);
                              if (fullTicket) openEditDialog(fullTicket);
                            }}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(ticket.id, 'in_progress')}>
                              Mark In Progress
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(ticket.id, 'resolved')}>
                              Mark Resolved
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteTicket(ticket.id)}
                              disabled={isDeleting === ticket.id}
                            >
                              {isDeleting === ticket.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="mr-2 h-4 w-4" />
                              )}
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <TicketIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No support tickets found</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="all" className="space-y-3">
              {allTickets.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {allTickets.map((ticket) => (
                    <div key={ticket.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{ticket.ticket_number}</span>
                          <Badge variant={getPriorityColor(ticket.priority)} className="text-xs">
                            {ticket.priority}
                          </Badge>
                          <Badge variant={getStatusColor(ticket.status)} className="text-xs">
                            {ticket.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium mt-1">{ticket.title}</p>
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {ticket.description}
                        </p>
                        <div className="text-xs text-muted-foreground mt-1">
                          {ticket.category} • Created: {new Date(ticket.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewTicket(ticket.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewTicket(ticket.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(ticket)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(ticket.id, 'in_progress')}>
                              Mark In Progress
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(ticket.id, 'resolved')}>
                              Mark Resolved
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteTicket(ticket.id)}
                              disabled={isDeleting === ticket.id}
                            >
                              {isDeleting === ticket.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="mr-2 h-4 w-4" />
                              )}
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <TicketIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No support tickets found</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* View Ticket Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Ticket Details</DialogTitle>
            <DialogDescription>
              View complete information about this support ticket
            </DialogDescription>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Ticket Number</Label>
                  <p className="font-medium">{selectedTicket.ticket_number}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div>
                    <Badge variant={getStatusColor(selectedTicket.status)}>
                      {selectedTicket.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Priority</Label>
                  <div>
                    <Badge variant={getPriorityColor(selectedTicket.priority)}>
                      {selectedTicket.priority}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Category</Label>
                  <p className="font-medium">{selectedTicket.category}</p>
                </div>
                {selectedTicket.department && (
                  <div>
                    <Label className="text-muted-foreground">Department</Label>
                    <p className="font-medium">{selectedTicket.department}</p>
                  </div>
                )}
                {selectedTicket.page_url && (
                  <div>
                    <Label className="text-muted-foreground">Page URL</Label>
                    <p className="text-sm text-blue-600 break-all">
                      <a href={selectedTicket.page_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {selectedTicket.page_url}
                      </a>
                    </p>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-muted-foreground">Title</Label>
                <p className="font-medium">{selectedTicket.title}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Description</Label>
                <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">{selectedTicket.description}</p>
              </div>

              {/* Console Logs Section */}
              {selectedTicket.console_logs && (
                <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                  <Label className="text-muted-foreground mb-2 block font-semibold">
                    Console Logs ({Array.isArray(selectedTicket.console_logs) ? selectedTicket.console_logs.length : 0} entries)
                  </Label>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {Array.isArray(selectedTicket.console_logs) && selectedTicket.console_logs.map((log: any, idx: number) => (
                      <div key={idx} className="text-xs font-mono bg-white dark:bg-gray-800 p-2 rounded border">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={log.level === 'error' ? 'destructive' : log.level === 'warn' ? 'outline' : 'secondary'} className="text-xs">
                            {log.level}
                          </Badge>
                          <span className="text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                        <pre className="whitespace-pre-wrap text-xs">{log.message}</pre>
                        {log.stack && (
                          <details className="mt-1">
                            <summary className="cursor-pointer text-xs text-muted-foreground">Stack Trace</summary>
                            <pre className="mt-1 text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap">{log.stack}</pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Details Section */}
              {selectedTicket.error_details && (
                <div className="border rounded-lg p-4 bg-red-50 dark:bg-red-900/20">
                  <Label className="text-muted-foreground mb-2 block font-semibold">Error Details</Label>
                  <div className="space-y-2 text-sm">
                    {selectedTicket.error_details.error_count !== undefined && (
                      <div>
                        <span className="font-medium">Errors: </span>
                        <Badge variant="destructive">{selectedTicket.error_details.error_count}</Badge>
                      </div>
                    )}
                    {selectedTicket.error_details.warning_count !== undefined && (
                      <div>
                        <span className="font-medium">Warnings: </span>
                        <Badge variant="outline">{selectedTicket.error_details.warning_count}</Badge>
                      </div>
                    )}
                    {selectedTicket.error_details.recent_errors && selectedTicket.error_details.recent_errors.length > 0 && (
                      <div className="mt-2">
                        <Label className="text-xs text-muted-foreground">Recent Errors:</Label>
                        <div className="mt-1 space-y-1">
                          {selectedTicket.error_details.recent_errors.slice(0, 5).map((err: any, idx: number) => (
                            <div key={idx} className="text-xs bg-white dark:bg-gray-800 p-2 rounded">
                              {err.message}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Browser Info Section */}
              {selectedTicket.browser_info && (
                <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                  <Label className="text-muted-foreground mb-2 block font-semibold">Browser Information</Label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {selectedTicket.browser_info.userAgent && (
                      <div>
                        <span className="font-medium">User Agent: </span>
                        <span className="text-muted-foreground break-all">{selectedTicket.browser_info.userAgent}</span>
                      </div>
                    )}
                    {selectedTicket.browser_info.platform && (
                      <div>
                        <span className="font-medium">Platform: </span>
                        <span className="text-muted-foreground">{selectedTicket.browser_info.platform}</span>
                      </div>
                    )}
                    {selectedTicket.browser_info.viewport && (
                      <>
                        <div>
                          <span className="font-medium">Viewport: </span>
                          <span className="text-muted-foreground">
                            {selectedTicket.browser_info.viewport.width} × {selectedTicket.browser_info.viewport.height}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Screen: </span>
                          <span className="text-muted-foreground">
                            {selectedTicket.browser_info.screen?.width} × {selectedTicket.browser_info.screen?.height}
                          </span>
                        </div>
                      </>
                    )}
                    {selectedTicket.browser_info.language && (
                      <div>
                        <span className="font-medium">Language: </span>
                        <span className="text-muted-foreground">{selectedTicket.browser_info.language}</span>
                      </div>
                    )}
                    {selectedTicket.browser_info.onLine !== undefined && (
                      <div>
                        <span className="font-medium">Online: </span>
                        <span className="text-muted-foreground">{selectedTicket.browser_info.onLine ? 'Yes' : 'No'}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <Label className="text-muted-foreground">Created</Label>
                  <p className="text-sm">{new Date(selectedTicket.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Last Updated</Label>
                  <p className="text-sm">{new Date(selectedTicket.updated_at).toLocaleString()}</p>
                </div>
                {selectedTicket.resolved_at && (
                  <div>
                    <Label className="text-muted-foreground">Resolved</Label>
                    <p className="text-sm">{new Date(selectedTicket.resolved_at).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            {selectedTicket && (
              <Button onClick={() => {
                setIsViewDialogOpen(false);
                openEditDialog(selectedTicket);
              }}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Ticket
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Ticket Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Support Ticket</DialogTitle>
            <DialogDescription>
              Update ticket information and status
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={ticketForm.title}
                onChange={(e) => setTicketForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description *</Label>
              <Textarea
                id="edit-description"
                value={ticketForm.description}
                onChange={(e) => setTicketForm(prev => ({ ...prev, description: e.target.value }))}
                rows={5}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={ticketForm.status}
                  onValueChange={(value) => setTicketForm(prev => ({ ...prev, status: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-priority">Priority</Label>
                <Select
                  value={ticketForm.priority}
                  onValueChange={(value) => setTicketForm(prev => ({ ...prev, priority: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Input
                  id="edit-category"
                  value={ticketForm.category}
                  onChange={(e) => setTicketForm(prev => ({ ...prev, category: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditTicket}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
