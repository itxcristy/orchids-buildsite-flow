import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReimbursementFormDialog } from "@/components/ReimbursementFormDialog";
import { ReimbursementReviewDialog } from "@/components/ReimbursementReviewDialog";
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/database';
import { useAuth } from "@/hooks/useAuth";
import { Plus, Search, DollarSign, Clock, CheckCircle, XCircle, Eye, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface ReimbursementRequest {
  id: string;
  employee_id: string;
  amount: number;
  currency: string;
  expense_date: string;
  description: string;
  business_purpose: string;
  status: string;
  submitted_at: string;
  created_at: string;
  expense_categories: {
    name: string;
  };
  profiles?: {
    full_name: string;
  };
}

export const Reimbursements: React.FC = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ReimbursementRequest | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [requests, setRequests] = useState<ReimbursementRequest[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalAmount: 0,
  });

  const isFinanceManager = userRole === 'admin' || userRole === 'finance_manager';

  useEffect(() => {
    if (user) {
      fetchReimbursements();
    }
  }, [user]);

  const fetchReimbursements = async () => {
    try {
      setLoading(true);
      
      // Fetch reimbursement requests
      let query = db
        .from("reimbursement_requests")
        .select("*");
      
      // Filter by employee if not finance manager
      // Use employee_id if available, otherwise fall back to user_id
      if (!isFinanceManager && user) {
        // Try employee_id first, fall back to user_id
        query = query.or(`employee_id.eq.${user.id},user_id.eq.${user.id}`);
      }
      
      const { data: requestsData, error: requestsError } = await query
        .order("created_at", { ascending: false });

      if (requestsError) {
        // If employee_id column doesn't exist, try with user_id only
        if (requestsError.message?.includes('employee_id') || requestsError.code === '42703') {
          let fallbackQuery = db
            .from("reimbursement_requests")
            .select("*");
          
          if (!isFinanceManager && user) {
            fallbackQuery = fallbackQuery.eq("user_id", user.id);
          }
          
          const { data: fallbackData, error: fallbackError } = await fallbackQuery
            .order("created_at", { ascending: false });
          
          if (fallbackError) throw fallbackError;
          var requests = (fallbackData as any) || [];
        } else {
          throw requestsError;
        }
      } else {
        var requests = (requestsData as any) || [];
      }
      
      // Fetch expense categories
      const categoryIds = [...new Set(requests.map((r: any) => r.category_id).filter(Boolean))];
      let categories: any[] = [];
      if (categoryIds.length > 0) {
        const { data: categoriesData, error: categoriesError } = await db
          .from("expense_categories")
          .select("id, name")
          .in("id", categoryIds);
        
        if (!categoriesError) {
          categories = (categoriesData as any) || [];
        }
      }

      // Fetch profiles for employee names
      // Use employee_id if available, otherwise use user_id
      const employeeIds = [...new Set(
        requests
          .map((r: any) => r.employee_id || r.user_id)
          .filter(Boolean)
      )];
      let profiles: any[] = [];
      if (employeeIds.length > 0) {
        const { data: profilesData, error: profilesError } = await db
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", employeeIds);
        
        if (!profilesError) {
          profiles = (profilesData as any) || [];
        }
      }

      // Create maps for quick lookup
      const categoryMap = new Map(categories.map((c: any) => [c.id, c]));
      const profileMap = new Map(profiles.map((p: any) => [p.user_id, p]));

      // Combine data
      const enrichedRequests: ReimbursementRequest[] = requests.map((req: any) => ({
        ...req,
        expense_categories: categoryMap.get(req.category_id) || { name: "Unknown" },
        profiles: profileMap.get(req.employee_id) || undefined,
      }));

      setRequests(enrichedRequests);
      
      // Calculate stats
      const totalAmount = enrichedRequests.reduce((sum, req) => sum + Number(req.amount), 0);
      const pending = enrichedRequests.filter(req => req.status === 'submitted' || req.status === 'draft').length;
      const approved = enrichedRequests.filter(req => req.status === 'approved').length;
      const rejected = enrichedRequests.filter(req => req.status === 'rejected').length;

      setStats({
        total: enrichedRequests.length,
        pending,
        approved,
        rejected,
        totalAmount,
      });
    } catch (error: any) {
      console.error("Error fetching reimbursements:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to load reimbursement requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewRequest = (request: ReimbursementRequest) => {
    setSelectedRequest(request);
    setShowReviewDialog(true);
  };

  const handleEditRequest = (request: ReimbursementRequest) => {
    setSelectedRequest(request);
    setShowForm(true);
  };

  const handleDeleteRequest = async (request: ReimbursementRequest) => {
    if (!window.confirm(`Are you sure you want to delete this reimbursement request? This action cannot be undone.`)) {
      return;
    }

    try {
      // First delete attachments if any
      const { error: attachmentsError } = await db
        .from("reimbursement_attachments")
        .delete()
        .eq("reimbursement_id", request.id);

      if (attachmentsError) {
        console.error("Error deleting attachments:", attachmentsError);
      }

      // Then delete the request
      const { error } = await db
        .from("reimbursement_requests")
        .delete()
        .eq("id", request.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Reimbursement request deleted successfully",
      });

      fetchReimbursements();
    } catch (error: any) {
      console.error("Error deleting reimbursement:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to delete reimbursement request",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-muted text-muted-foreground";
      case "submitted":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "paid":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "submitted":
        return <Clock className="h-4 w-4" />;
      case "approved":
      case "paid":
        return <CheckCircle className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const filteredRequests = requests.filter(request =>
    request.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.expense_categories?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {isFinanceManager ? "Reimbursement Requests" : "My Reimbursements"}
          </h1>
          <p className="text-muted-foreground">
            {isFinanceManager 
              ? "Review and approve employee reimbursement requests" 
              : "Submit and track your expense reimbursement requests"
            }
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Request
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold">${stats.totalAmount.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle>Reimbursement Requests</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search requests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {requests.length === 0 ? "No reimbursement requests yet." : "No requests match your search."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    {isFinanceManager && <TableHead>Employee</TableHead>}
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        {format(new Date(request.expense_date), "MMM dd, yyyy")}
                      </TableCell>
                      {isFinanceManager && (
                        <TableCell>
                          <span className="font-medium">
                            {request.profiles?.full_name || "Unknown Employee"}
                          </span>
                        </TableCell>
                      )}
                      <TableCell>
                        <span className="font-medium">
                          {request.expense_categories?.name || "Unknown"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{request.description}</p>
                          {request.business_purpose && (
                            <p className="text-sm text-muted-foreground">
                              {request.business_purpose}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {request.currency} {Number(request.amount).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={`flex items-center gap-1 ${getStatusColor(request.status)}`}>
                          {getStatusIcon(request.status)}
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {request.submitted_at
                          ? format(new Date(request.submitted_at), "MMM dd, yyyy")
                          : "Not submitted"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewRequest(request)}
                            className="flex items-center gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            {isFinanceManager ? "Review" : "View"}
                          </Button>
                          {(request.status === 'draft' || (!isFinanceManager && request.status === 'submitted')) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditRequest(request)}
                              className="flex items-center gap-1"
                            >
                              <Edit className="h-4 w-4" />
                              Edit
                            </Button>
                          )}
                          {(request.status === 'draft' || (!isFinanceManager && request.status === 'submitted')) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteRequest(request)}
                              className="flex items-center gap-1 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ReimbursementFormDialog
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) {
            setSelectedRequest(null);
          }
        }}
        onSuccess={fetchReimbursements}
        request={selectedRequest}
      />

      <ReimbursementReviewDialog
        open={showReviewDialog}
        onOpenChange={setShowReviewDialog}
        request={selectedRequest}
        onSuccess={fetchReimbursements}
      />
    </div>
  );
};