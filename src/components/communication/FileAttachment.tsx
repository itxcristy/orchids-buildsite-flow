/**
 * File Attachment Component
 * Displays file attachments with preview and download
 */

import { Download, File, Image, FileText, Video, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Attachment } from '@/services/api/messaging';
import { getApiBaseUrl } from '@/config/api';

// Partial attachment type for simplified attachments from Message interface
type AttachmentLike = Pick<Attachment, 'id' | 'file_name' | 'file_path' | 'file_size' | 'mime_type'> & 
  Partial<Pick<Attachment, 'thumbnail_path'>>;

interface FileAttachmentProps {
  attachment: AttachmentLike;
  onDownload?: (attachment: AttachmentLike) => void;
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.startsWith('video/')) return Video;
  if (mimeType.startsWith('audio/')) return Music;
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return FileText;
  return File;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const FileAttachment: React.FC<FileAttachmentProps> = ({ attachment, onDownload }) => {
  const FileIcon = getFileIcon(attachment.mime_type);
  const isImage = attachment.mime_type.startsWith('image/');

  const handleDownload = async () => {
    if (onDownload) {
      onDownload(attachment);
    } else {
      // Default download behavior
      const baseUrl = getApiBaseUrl();
      const token = localStorage.getItem('auth_token') || '';
      window.open(`${baseUrl}/api/files/messaging/${attachment.file_path}?token=${token}`, '_blank');
    }
  };

  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg bg-muted/50">
      {isImage && attachment.thumbnail_path ? (
        <img
          src={`${getApiBaseUrl()}/api/files/messaging/${attachment.thumbnail_path}`}
          alt={attachment.file_name}
          className="w-16 h-16 object-cover rounded"
        />
      ) : (
        <div className="w-16 h-16 flex items-center justify-center bg-background rounded border">
          <FileIcon className="w-8 h-8 text-muted-foreground" />
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{attachment.file_name}</p>
        <p className="text-xs text-muted-foreground">{formatFileSize(attachment.file_size)}</p>
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDownload}
        className="shrink-0"
      >
        <Download className="w-4 h-4" />
      </Button>
    </div>
  );
};
