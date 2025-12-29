import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  FileText, 
  Image, 
  File, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Download,
  Eye,
  Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProcessedDocument {
  id: string;
  filename: string;
  type: 'invoice' | 'contract' | 'report' | 'receipt';
  status: 'processing' | 'completed' | 'failed';
  extractedData: any;
  processed_at: string;
}

interface DocumentProcessorProps {
  onDocumentUpload: (file: File) => Promise<void>;
  processedDocuments: ProcessedDocument[];
}

export function DocumentProcessor({ onDocumentUpload, processedDocuments }: DocumentProcessorProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await processFiles(files);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await processFiles(files);
    }
  };

  const processFiles = async (files: File[]) => {
    setUploading(true);
    
    for (const file of files) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: `${file.name} is not a supported file type`,
          variant: "destructive"
        });
        continue;
      }

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: `${file.name} exceeds the 10MB limit`,
          variant: "destructive"
        });
        continue;
      }

      try {
        await onDocumentUpload(file);
        toast({
          title: "Document Uploaded",
          description: `${file.name} is being processed by AI`
        });
      } catch (error) {
        toast({
          title: "Upload Failed",
          description: `Failed to upload ${file.name}`,
          variant: "destructive"
        });
      }
    }
    
    setUploading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFileIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-500" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
        return <Image className="h-5 w-5 text-blue-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="h-5 w-5 text-blue-600" />;
      default:
        return <File className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">AI Document Processing</h3>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Batch Export
        </Button>
      </div>

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Documents for AI Processing</CardTitle>
          <CardDescription>
            Supported formats: PDF, PNG, JPG, DOC, DOCX (Max 10MB each)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              {dragActive ? 'Drop files here' : 'Drop files to upload'}
            </h3>
            <p className="text-muted-foreground mb-4">
              or click to select files from your computer
            </p>
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Processing...' : 'Choose Files'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {uploading && (
            <div className="mt-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">Processing documents...</span>
              </div>
              <Progress value={75} className="mt-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processed Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Processed Documents</CardTitle>
          <CardDescription>
            AI-extracted data and processing results
          </CardDescription>
        </CardHeader>
        <CardContent>
          {processedDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No documents processed yet. Upload some documents to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {processedDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/25">
                  <div className="flex items-center space-x-4">
                    {getFileIcon(doc.filename)}
                    <div>
                      <h4 className="font-medium">{doc.filename}</h4>
                      <div className="flex items-center space-x-2 mt-1">
                        {getStatusIcon(doc.status)}
                        <Badge className={getStatusColor(doc.status)} variant="outline">
                          {doc.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(doc.processed_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {doc.status === 'completed' && doc.extractedData && (
                      <div className="text-right mr-4">
                        <p className="text-sm font-medium">Extracted Data:</p>
                        <div className="text-xs text-muted-foreground">
                          {doc.type === 'invoice' && doc.extractedData.amount && (
                            <span>Amount: ${doc.extractedData.amount}</span>
                          )}
                          {doc.type === 'contract' && doc.extractedData.value && (
                            <span>Value: ${doc.extractedData.value}</span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Processing Capabilities */}
      <Card>
        <CardHeader>
          <CardTitle>AI Processing Capabilities</CardTitle>
          <CardDescription>
            What our AI can extract from your documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 border rounded-lg">
              <FileText className="h-8 w-8 text-blue-500 mb-2" />
              <h4 className="font-semibold">Invoices</h4>
              <p className="text-sm text-muted-foreground">
                Extract amounts, dates, vendor info, line items
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <File className="h-8 w-8 text-green-500 mb-2" />
              <h4 className="font-semibold">Contracts</h4>
              <p className="text-sm text-muted-foreground">
                Identify parties, terms, values, key clauses
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <Image className="h-8 w-8 text-purple-500 mb-2" />
              <h4 className="font-semibold">Receipts</h4>
              <p className="text-sm text-muted-foreground">
                Parse expenses, categories, tax amounts
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <FileText className="h-8 w-8 text-orange-500 mb-2" />
              <h4 className="font-semibold">Reports</h4>
              <p className="text-sm text-muted-foreground">
                Summarize content, extract key metrics
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}