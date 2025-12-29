import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/database';
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle, XCircle, Download, Eye, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { PaymentDialog } from "./PaymentDialog";

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
  expense_categories: {
    name: string;
  };
  profiles?: {
    full_name: string;
  };
}

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
}

interface ReimbursementReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: ReimbursementRequest | null;
  onSuccess?: () => void;
}

export const ReimbursementReviewDialog: React.FC<ReimbursementReviewDialogProps> = ({
  open,
  onOpenChange,
  request,
  onSuccess,
}) => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  const isFinanceUser = userRole === 'finance_manager' || userRole === 'cfo' || userRole === 'admin';

  useEffect(() => {
    if (open && request) {
      fetchAttachments();
    }
  }, [open, request]);

  const fetchAttachments = async () => {
    if (!request) return;

    try {
      const { data, error } = await db
        .from("reimbursement_attachments")
        .select("*")
        .eq("reimbursement_id", request.id);

      if (error) throw error;
      setAttachments((data as any) || []);
    } catch (error) {
      console.error("Error fetching attachments:", error);
    }
  };

  const handleApprove = async () => {
    if (!request || !user) return;

    setLoading(true);
    try {
      const { error } = await db
        .from("reimbursement_requests")
        .update({
          status: "approved",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Reimbursement request approved",
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error approving request:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to approve reimbursement request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!request || !user || !rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await db
        .from("reimbursement_requests")
        .update({
          status: "rejected",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq("id", request.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Reimbursement request rejected",
      });

      setRejectionReason("");
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error rejecting request:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to reject reimbursement request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (attachment: Attachment) => {
    try {
      const { data, error } = await db.storage
        .from('receipts')
        .download(attachment.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const viewFile = async (attachment: Attachment) => {
    try {
      const { data, error } = await db.storage
        .from('receipts')
        .getPublicUrl(attachment.file_path);

      if (error) throw error;

      window.open(data.publicUrl, '_blank');
    } catch (error: any) {
      console.error("Error viewing file:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to view file",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!request) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Reimbursement Request</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Request Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Employee</Label>
              <p className="font-medium">{request.profiles?.full_name || "Unknown Employee"}</p>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Status</Label>
              <Badge className={`${getStatusColor(request.status)} mt-1`}>
                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
              </Badge>
            </div>

            <div>
              <Label className="text-sm font-medium text-muted-foreground">Category</Label>
              <p className="font-medium">{request.expense_categories?.name}</p>
            </div>

            <div>
              <Label className="text-sm font-medium text-muted-foreground">Amount</Label>
              <p className="font-medium text-lg">{request.currency} {Number(request.amount).toFixed(2)}</p>
            </div>

            <div>
              <Label className="text-sm font-medium text-muted-foreground">Expense Date</Label>
              <p className="font-medium">{format(new Date(request.expense_date), "MMM dd, yyyy")}</p>
            </div>

            <div>
              <Label className="text-sm font-medium text-muted-foreground">Submitted</Label>
              <p className="font-medium">{format(new Date(request.submitted_at), "MMM dd, yyyy")}</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Description</Label>
            <p className="mt-1 p-3 bg-muted rounded-md">{request.description}</p>
          </div>

          {/* Business Purpose */}
          {request.business_purpose && (
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Business Purpose</Label>
              <p className="mt-1 p-3 bg-muted rounded-md">{request.business_purpose}</p>
            </div>
          )}

          {/* Attachments */}
          {attachments.length > 0 && (
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Receipts & Attachments</Label>
              <div className="mt-2 space-y-2">
                {attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <p className="font-medium">{attachment.file_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {attachment.file_type} • {formatFileSize(attachment.file_size)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewFile(attachment)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadFile(attachment)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rejection Reason (if rejecting) */}
          {request.status === "submitted" && (
            <div>
              <Label htmlFor="rejection_reason">Rejection Reason (optional for rejection)</Label>
              <Textarea
                id="rejection_reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Provide a reason if rejecting this request..."
                className="mt-1"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          
          {request.status === "submitted" && (
            <>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <XCircle className="h-4 w-4" />
                {loading ? "Rejecting..." : "Reject"}
              </Button>
              
              <Button
                onClick={handleApprove}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                {loading ? "Approving..." : "Approve"}
              </Button>
            </>
          )}

          {request.status === "approved" && isFinanceUser && (
            <Button
              onClick={() => setShowPaymentDialog(true)}
              className="flex items-center gap-2"
            >
              <DollarSign className="h-4 w-4" />
              Process Payment
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      <PaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        request={request}
        onSuccess={() => {
          onSuccess?.();
          onOpenChange(false);
        }}
      />
    </Dialog>
  );
};