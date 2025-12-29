import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Check, X, Clock, User, Loader2, Plus, Search, Edit, Trash2, 
  Settings, MoreVertical
} from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { selectRecords, updateRecord, deleteRecord } from '@/services/api/postgresql-service';
import LeaveRequestFormDialog from "@/components/LeaveRequestFormDialog";
import LeaveTypeFormDialog from "@/components/LeaveTypeFormDialog";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { LeaveRequest as LeaveRequestType, LeaveType } from '@/integrations/postgresql/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LeaveRequest {
  id: string;
  employee: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
  submittedDate: string;
  employee_id?: string;
  leave_type_id?: string;
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  rawData?: any; // Store raw database record
}

const LeaveRequests = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [selectedTab, setSelectedTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLeaveRequestDialog, setShowLeaveRequestDialog] = useState(false);
  const [showLeaveTypeDialog, setShowLeaveTypeDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedLeaveRequest, setSelectedLeaveRequest] = useState<LeaveRequest | null>(null);
  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveType | null>(null);
  const [deleteItem, setDeleteItem] = useState<{ id: string; name: string; type: 'request' | 'type' } | null>(null);
  const [viewMode, setViewMode] = useState<'requests' | 'types'>('requests');
  
  // Filter function to filter leave requests by status
  const filterByStatus = (status: string) => {
    if (status === 'all') {
      return leaveRequests;
    }
    return leaveRequests.filter(request => request.status === status);
  };

  useEffect(() => {
    fetchLeaveRequests();
    fetchLeaveTypes();
  }, []);

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      
      // Fetch leave requests using PostgreSQL service
      const leaveData = await selectRecords('leave_requests', {
        orderBy: 'created_at DESC'
      });

      // Fetch leave types for names
      const leaveTypesData = await selectRecords('leave_types', {
        select: 'id, name'
      });

      const leaveTypeMap = new Map(leaveTypesData.map((lt: any) => [lt.id, lt.name]));

      // Fetch employee details and profiles
      const userIds = leaveData.map((l: any) => l.employee_id).filter(Boolean);
      let employees: any[] = [];
      let profiles: any[] = [];

      if (userIds.length > 0) {
        employees = await selectRecords('employee_details', {
          select: 'user_id, first_name, last_name',
          filters: [
            { column: 'user_id', operator: 'in', value: userIds }
          ]
        });

        profiles = await selectRecords('profiles', {
          select: 'user_id, full_name',
          filters: [
            { column: 'user_id', operator: 'in', value: userIds }
          ]
        });
      }

      const profileMap = new Map(profiles.map((p: any) => [p.user_id, p.full_name]));
      const employeeMap = new Map(employees.map((e: any) => [e.user_id, e]));

      // Transform leave requests
      const transformedRequests: LeaveRequest[] = leaveData.map((request: any) => {
        const employee = employeeMap.get(request.employee_id);
        const fullName = profileMap.get(request.employee_id) || 
          (employee ? `${employee.first_name} ${employee.last_name}`.trim() : 'Unknown Employee');
        const leaveTypeName = leaveTypeMap.get(request.leave_type_id) || 'Leave';

        const start = new Date(request.start_date);
        const end = new Date(request.end_date);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        return {
          id: request.id,
          employee: fullName,
          type: leaveTypeName,
          startDate: request.start_date,
          endDate: request.end_date,
          days: request.total_days || days,
          reason: request.reason || 'No reason provided',
          status: request.status || 'pending',
          submittedDate: request.created_at,
          employee_id: request.employee_id,
          leave_type_id: request.leave_type_id,
          approved_by: request.approved_by,
          approved_at: request.approved_at,
          rejection_reason: request.rejection_reason,
          rawData: request
        };
      });

      setLeaveRequests(transformedRequests);

    } catch (error: any) {
      console.error('Error fetching leave requests:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load leave requests. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveTypes = async () => {
    try {
      const types = await selectRecords<LeaveType>('leave_types', {
        orderBy: 'name ASC'
      });
      setLeaveTypes(types);
    } catch (error: any) {
      console.error('Error fetching leave types:', error);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      if (!user?.id) {
        toast({
          title: "Error",
          description: "You must be logged in to approve requests",
          variant: "destructive",
        });
        return;
      }

      await updateRecord('leave_requests', { 
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user.id
      }, { id: requestId }, user.id);

      toast({
        title: "Success",
        description: "Leave request approved",
      });

      fetchLeaveRequests();
    } catch (error: any) {
      console.error('Error approving leave request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to approve leave request",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      if (!user?.id) {
        toast({
          title: "Error",
          description: "You must be logged in to reject requests",
          variant: "destructive",
        });
        return;
      }

      await updateRecord('leave_requests', { 
        status: 'rejected',
        rejection_reason: 'Rejected by administrator'
      }, { id: requestId }, user.id);

      toast({
        title: "Success",
        description: "Leave request rejected",
      });

      fetchLeaveRequests();
    } catch (error: any) {
      console.error('Error rejecting leave request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reject leave request",
        variant: "destructive",
      });
    }
  };

  const handleEditRequest = (request: LeaveRequest) => {
    if (request.rawData) {
      setSelectedLeaveRequest(request.rawData as any);
      setShowLeaveRequestDialog(true);
    }
  };

  const handleDeleteRequest = (request: LeaveRequest) => {
    setDeleteItem({
      id: request.id,
      name: `${request.employee} - ${request.type}`,
      type: 'request'
    });
    setShowDeleteDialog(true);
  };

  const handleEditType = (type: LeaveType) => {
    setSelectedLeaveType(type);
    setShowLeaveTypeDialog(true);
  };

  const handleDeleteType = (type: LeaveType) => {
    setDeleteItem({
      id: type.id,
      name: type.name,
      type: 'type'
    });
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteItem) return;

    try {
      if (deleteItem.type === 'request') {
        await deleteRecord('leave_requests', { id: deleteItem.id });
        toast({
          title: 'Success',
          description: 'Leave request deleted successfully',
        });
        fetchLeaveRequests();
      } else {
        await deleteRecord('leave_types', { id: deleteItem.id });
        toast({
          title: 'Success',
          description: 'Leave type deleted successfully',
        });
        fetchLeaveTypes();
      }

      setShowDeleteDialog(false);
      setDeleteItem(null);
    } catch (error: any) {
      console.error('Error deleting:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete',
        variant: 'destructive',
      });
    }
  };

  // Filter requests by search query
  const getFilteredRequests = () => {
    let filtered = filterByStatus(selectedTab);
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(request => 
        request.employee.toLowerCase().includes(query) ||
        request.type.toLowerCase().includes(query) ||
        request.reason.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2 text-muted-foreground">Loading leave requests...</span>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <Check className="h-3 w-3" />;
      case 'pending': return <Clock className="h-3 w-3" />;
      case 'rejected': return <X className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const filteredRequests = getFilteredRequests();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Leave Management</h1>
          <p className="text-muted-foreground">Review and manage employee leave requests and leave types</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setViewMode(viewMode === 'requests' ? 'types' : 'requests')}
          >
            <Settings className="mr-2 h-4 w-4" />
            {viewMode === 'requests' ? 'Manage Leave Types' : 'View Requests'}
          </Button>
          {viewMode === 'requests' ? (
            <Button 
              type="button"
              onClick={() => {
                setSelectedLeaveRequest(null);
                setShowLeaveRequestDialog(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Leave Request
            </Button>
          ) : (
            <Button onClick={() => {
              setSelectedLeaveType(null);
              setShowLeaveTypeDialog(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              New Leave Type
            </Button>
          )}
        </div>
      </div>

      {viewMode === 'requests' ? (
        <>
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by employee, type, or reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All Requests ({leaveRequests.length})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({filterByStatus('pending').length})</TabsTrigger>
              <TabsTrigger value="approved">Approved ({filterByStatus('approved').length})</TabsTrigger>
              <TabsTrigger value="rejected">Rejected ({filterByStatus('rejected').length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value={selectedTab} className="mt-6">
              {filteredRequests.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        No {selectedTab === 'all' ? '' : selectedTab} leave requests found.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredRequests.map((request) => (
                    <Card key={request.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3 flex-1">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold">{request.employee}</h3>
                                <Badge variant={getStatusColor(request.status)} className="flex items-center gap-1">
                                  {getStatusIcon(request.status)}
                                  {request.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{request.type}</p>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleEditRequest(request)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              {request.status === 'pending' && (
                                <>
                                  <DropdownMenuItem onClick={() => handleApprove(request.id)}>
                                    <Check className="mr-2 h-4 w-4" />
                                    Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleReject(request.id)}>
                                    <X className="mr-2 h-4 w-4" />
                                    Reject
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteRequest(request)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                          <div>
                            <p className="text-muted-foreground">Duration</p>
                            <p className="font-medium">
                              {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                            </p>
                            <p className="text-muted-foreground">{request.days} days</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Submitted</p>
                            <p className="font-medium">{new Date(request.submittedDate).toLocaleDateString()}</p>
                            {request.approved_at && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Approved: {new Date(request.approved_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="mb-4">
                          <p className="text-muted-foreground text-sm mb-1">Reason</p>
                          <p className="text-sm bg-muted/50 p-3 rounded-md">{request.reason}</p>
                        </div>

                        {request.rejection_reason && (
                          <div className="mb-4">
                            <p className="text-muted-foreground text-sm mb-1">Rejection Reason</p>
                            <p className="text-sm bg-destructive/10 text-destructive p-3 rounded-md">
                              {request.rejection_reason}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Leave Types</CardTitle>
            <CardDescription>Manage leave type categories and their settings</CardDescription>
          </CardHeader>
          <CardContent>
            {leaveTypes.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No leave types found. Create one to get started.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Max Days</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Requires Approval</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveTypes.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell className="font-medium">{type.name}</TableCell>
                      <TableCell>{type.description || '-'}</TableCell>
                      <TableCell>{(type as any).max_days_per_year || (type as any).max_days || 'Unlimited'}</TableCell>
                      <TableCell>
                        <Badge variant={type.is_paid ? 'default' : 'secondary'}>
                          {type.is_paid ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={type.requires_approval ? 'default' : 'secondary'}>
                          {type.requires_approval ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={type.is_active !== false ? 'default' : 'secondary'}>
                          {type.is_active !== false ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEditType(type)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteType(type)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <LeaveRequestFormDialog
        isOpen={showLeaveRequestDialog}
        onClose={() => {
          setShowLeaveRequestDialog(false);
          setSelectedLeaveRequest(null);
        }}
        leaveRequest={selectedLeaveRequest as any}
        onLeaveRequestSaved={() => {
          fetchLeaveRequests();
          setShowLeaveRequestDialog(false);
          setSelectedLeaveRequest(null);
        }}
      />

      <LeaveTypeFormDialog
        isOpen={showLeaveTypeDialog}
        onClose={() => {
          setShowLeaveTypeDialog(false);
          setSelectedLeaveType(null);
        }}
        leaveType={selectedLeaveType}
        onLeaveTypeSaved={() => {
          fetchLeaveTypes();
          fetchLeaveRequests(); // Refresh requests to update type names
          setShowLeaveTypeDialog(false);
          setSelectedLeaveType(null);
        }}
      />

      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setDeleteItem(null);
        }}
        onDeleted={handleDeleteConfirmed}
        itemType={deleteItem?.type === 'request' ? 'Leave Request' : 'Leave Type'}
        itemName={deleteItem?.name || ''}
        itemId={deleteItem?.id || ''}
        tableName={deleteItem?.type === 'request' ? 'leave_requests' : 'leave_types'}
      />
    </div>
  );
};

export default LeaveRequests;
