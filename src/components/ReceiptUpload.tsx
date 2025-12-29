import React, { useState, useCallback } from 'react';
import { Upload, X, FileText, Image, File, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { db } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';
import { useAsyncOperation } from '@/hooks/useAsyncOperation';

interface ReceiptFile {
  id?: string;
  file: File;
  preview?: string;
  uploaded?: boolean;
  uploadProgress?: number;
  error?: string;
}

interface ReceiptUploadProps {
  reimbursementId: string;
  existingReceipts?: any[];
  onUploadComplete?: (files: any[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // in MB
}

export const ReceiptUpload: React.FC<ReceiptUploadProps> = ({
  reimbursementId,
  existingReceipts = [],
  onUploadComplete,
  maxFiles = 5,
  maxFileSize = 10
}) => {
  const [files, setFiles] = useState<ReceiptFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const { execute: uploadFile, loading: uploading } = useAsyncOperation({
    onError: (error) => toast({ 
      variant: 'destructive', 
      title: 'Upload failed', 
      description: error.message 
    })
  });

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File size must be less than ${maxFileSize}MB`;
    }

    // Check file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return 'File type not supported. Please upload images, PDFs, or documents.';
    }

    return null;
  };

  const processFiles = useCallback((fileList: FileList) => {
    const newFiles: ReceiptFile[] = [];
    
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const error = validateFile(file);
      
      if (error) {
        toast({ 
          variant: 'destructive', 
          title: 'Invalid file', 
          description: `${file.name}: ${error}` 
        });
        continue;
      }

      if (files.length + newFiles.length >= maxFiles) {
        toast({ 
          variant: 'destructive', 
          title: 'Too many files', 
          description: `Maximum ${maxFiles} files allowed` 
        });
        break;
      }

      const receiptFile: ReceiptFile = {
        file,
        uploadProgress: 0,
        uploaded: false
      };

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          receiptFile.preview = e.target?.result as string;
          setFiles(prev => [...prev]);
        };
        reader.readAsDataURL(file);
      }

      newFiles.push(receiptFile);
    }

    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);
    }
  }, [files.length, maxFiles, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    const uploadPromises = files
      .filter(f => !f.uploaded)
      .map(async (fileItem, index) => {
        return uploadFile(async () => {
          // Update progress
          setFiles(prev => prev.map(f => 
            f === fileItem ? { ...f, uploadProgress: 10 } : f
          ));

          const fileExt = fileItem.file.name.split('.').pop();
          const fileName = `${reimbursementId}_${Date.now()}_${index}.${fileExt}`;
          const filePath = `receipts/${fileName}`;

          // Upload to file storage
          const { data: uploadData, error: uploadError } = await db.storage
            .from('receipts')
            .upload(filePath, fileItem.file);

          if (uploadError) throw uploadError;

          // Simulate progress for UI feedback
          setFiles(prev => prev.map(f => 
            f === fileItem ? { ...f, uploadProgress: 100 } : f
          ));

          // Save attachment record
          const { data: attachmentData, error: attachmentError } = await db
            .from('reimbursement_attachments')
            .insert({
              reimbursement_id: reimbursementId,
              file_name: fileItem.file.name,
              file_path: filePath,
              file_type: fileItem.file.type,
              file_size: fileItem.file.size
            })
            .select()
            .single();

          if (attachmentError) throw attachmentError;

          // Mark as uploaded
          setFiles(prev => prev.map(f => 
            f === fileItem ? { 
              ...f, 
              uploaded: true, 
              uploadProgress: 100,
              id: attachmentData.id 
            } : f
          ));

          return attachmentData;
        });
      });

    try {
      const results = await Promise.all(uploadPromises);
      toast({ 
        title: 'Upload complete', 
        description: `${results.length} file(s) uploaded successfully` 
      });
      onUploadComplete?.(results);
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="w-6 h-6" />;
    if (fileType === 'application/pdf') return <FileText className="w-6 h-6" />;
    return <File className="w-6 h-6" />;
  };

  const hasUnuploadedFiles = files.some(f => !f.uploaded);
  const totalFiles = files.length + existingReceipts.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Receipt Upload</CardTitle>
        <CardDescription>
          Upload receipts and supporting documents ({totalFiles}/{maxFiles} files)
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {totalFiles < maxFiles && (
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={() => setDragActive(true)}
            onDragLeave={() => setDragActive(false)}
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              Drag and drop files here, or click to select
            </p>
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button variant="outline" size="sm" asChild>
                <span>Choose Files</span>
              </Button>
            </label>
            <p className="text-xs text-muted-foreground mt-2">
              Images, PDFs, Documents (max {maxFileSize}MB each)
            </p>
          </div>
        )}

        {totalFiles >= maxFiles && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Maximum number of files ({maxFiles}) reached. Remove files to upload more.
            </AlertDescription>
          </Alert>
        )}

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">New Files</h4>
            {files.map((fileItem, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                <div className="flex-shrink-0 text-muted-foreground">
                  {getFileIcon(fileItem.file.type)}
                </div>
                
                {fileItem.preview && (
                  <img 
                    src={fileItem.preview} 
                    alt="Preview" 
                    className="w-12 h-12 object-cover rounded border"
                  />
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{fileItem.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(fileItem.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  
                  {fileItem.uploadProgress !== undefined && !fileItem.uploaded && (
                    <div className="mt-1">
                      <Progress value={fileItem.uploadProgress} className="h-1" />
                    </div>
                  )}
                  
                  {fileItem.error && (
                    <p className="text-xs text-red-600 mt-1">{fileItem.error}</p>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  {fileItem.uploaded && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Uploaded
                    </Badge>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    disabled={uploading}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Existing Files */}
        {existingReceipts.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Existing Files</h4>
            {existingReceipts.map((receipt) => (
              <div key={receipt.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                <div className="flex-shrink-0 text-muted-foreground">
                  {getFileIcon(receipt.file_type)}
                </div>
                
                <div className="flex-1">
                  <p className="text-sm font-medium">{receipt.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(receipt.file_size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                
                <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                  Uploaded
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Upload Button */}
        {hasUnuploadedFiles && (
          <Button 
            onClick={uploadFiles} 
            disabled={uploading}
            className="w-full"
          >
            {uploading ? 'Uploading...' : `Upload ${files.filter(f => !f.uploaded).length} File(s)`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
