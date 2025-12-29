/**
 * Message Composer Component
 * Rich text message input with file upload and formatting
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Paperclip, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { attachmentApi, draftApi } from '@/services/api/messaging';
import { toast } from 'sonner';

interface MessageComposerProps {
  threadId: string;
  onSend: (content: string, attachments?: any[]) => void;
  onTyping?: () => void;
  placeholder?: string;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  threadId,
  onSend,
  onTyping,
  placeholder = 'Type a message...',
}) => {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSend = async () => {
    if (!content.trim() && attachments.length === 0) return;

    try {
      await onSend(content.trim(), attachments);
      setContent('');
      setAttachments([]);
      
      // Clear draft
      try {
        await draftApi.delete(threadId);
      } catch (error) {
        // Draft might not exist, ignore
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    
    // Auto-save draft
    if (e.target.value.trim()) {
      draftApi.save(threadId, e.target.value, attachments).catch(() => {});
    }
    
    // Typing indicator
    if (onTyping) {
      onTyping();
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        // Typing stopped
      }, 3000);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      // For now, we'll store file info locally
      // In production, upload files first and get message_id
      const fileArray = Array.from(files);
      setAttachments((prev) => [...prev, ...fileArray.map((file) => ({
        file,
        name: file.name,
        size: file.size,
        type: file.type,
      }))]);
      
      toast.success(`${fileArray.length} file(s) added`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to add file');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Load draft on mount
  useEffect(() => {
    draftApi.get(threadId).then((draft) => {
      if (draft) {
        setContent(draft.content);
        setAttachments(draft.attachments || []);
      }
    }).catch(() => {});
  }, [threadId]);

  return (
    <div className="border-t p-4 space-y-2">
      {attachments.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-2 py-1 bg-muted rounded text-sm"
            >
              <span className="truncate max-w-[200px]">{attachment.name}</span>
              <button
                type="button"
                onClick={() => removeAttachment(index)}
                className="text-muted-foreground hover:text-foreground"
                title="Remove attachment"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex items-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Paperclip className="w-4 h-4" />
        </Button>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        
        <Textarea
          value={content}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-h-[60px] max-h-[200px] resize-none"
          rows={2}
        />
        
        <Button
          onClick={handleSend}
          disabled={(!content.trim() && attachments.length === 0) || isUploading}
          size="sm"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
