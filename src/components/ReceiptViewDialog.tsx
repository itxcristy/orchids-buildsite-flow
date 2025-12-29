import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/database';
import { Download, Eye, X, FileText, Image, File, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Receipt {
  id: string;
  vendor: string;
  category: string;
  amount: number;
  date: string;
  status: string;
  description: string;
  receiptUrl: string | null;
  request_id?: string;
  business_purpose?: string;
}

interface ReceiptViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: Receipt | null;
}

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
}

export const ReceiptViewDialog: React.FC<ReceiptViewDialogProps> = ({
  open,
  onOpenChange,
  receipt,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  useEffect(() => {
    if (open && receipt?.request_id) {
      fetchAttachments();
    }
  }, [open, receipt]);

  const fetchAttachments = async () => {
    if (!receipt?.request_id) return;

    try {
      setLoading(true);
      const { data, error } = await db
        .from('reimbursement_attachments')
        .select('*')
        .eq('reimbursement_id', receipt.request_id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setAttachments((data as any) || []);
    } catch (error: any) {
      console.error("Error fetching attachments:", error);
      toast({
        title: "Error",
        description: "Failed to load attachments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (attachment: Attachment) => {
    try {
      const { data, error } = await db.storage
        .from('receipts')
        .download(attachment.file_path);

      if (error) throw error;

      // Create blob URL and trigger download
      const blob = data as Blob;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "File downloaded successfully",
      });
    } catch (error: any) {
      console.error("Error downloading file:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const handleViewImage = async (attachment: Attachment) => {
    try {
      const { data, error } = await db.storage
        .from('receipts')
        .download(attachment.file_path);

      if (error) throw error;

      const blob = data as Blob;
      const url = window.URL.createObjectURL(blob);
      setViewingImage(url);
    } catch (error: any) {
      console.error("Error loading image:", error);
      toast({
        title: "Error",
        description: "Failed to load image",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': 
      case 'paid': return 'default';
      case 'submitted': 
      case 'manager_review':
      case 'finance_review': return 'secondary';
      case 'rejected': return 'destructive';
      case 'draft': return 'outline';
      default: return 'secondary';
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (fileType === 'application/pdf') return <FileText className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (!receipt) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receipt Details</DialogTitle>
            <DialogDescription>View receipt information and attachments</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Receipt Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Receipt ID</p>
                <p className="text-sm font-semibold">{receipt.id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge variant={getStatusColor(receipt.status)} className="mt-1">
                  {receipt.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vendor</p>
                <p className="text-sm">{receipt.vendor}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Category</p>
                <p className="text-sm">{receipt.category}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Amount</p>
                <p className="text-lg font-bold">₹{receipt.amount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Date</p>
                <p className="text-sm">{format(new Date(receipt.date), "PPP")}</p>
              </div>
            </div>

            {/* Description */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
              <p className="text-sm">{receipt.description || "No description"}</p>
            </div>

            {/* Business Purpose */}
            {receipt.business_purpose && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Business Purpose</p>
                <p className="text-sm">{receipt.business_purpose}</p>
              </div>
            )}

            {/* Attachments */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-3">Attachments</p>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attachments found</p>
              ) : (
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="text-muted-foreground">
                          {getFileIcon(attachment.file_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{attachment.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(attachment.file_size)} • {format(new Date(attachment.uploaded_at), "PPp")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {attachment.file_type.startsWith('image/') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewImage(attachment)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(attachment)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Viewer Modal */}
      {viewingImage && (
        <Dialog open={!!viewingImage} onOpenChange={() => setViewingImage(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 z-10 bg-background/80 hover:bg-background"
                onClick={() => setViewingImage(null)}
              >
                <X className="h-4 w-4" />
              </Button>
              <img
                src={viewingImage}
                alt="Receipt"
                className="w-full h-auto max-h-[85vh] object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

