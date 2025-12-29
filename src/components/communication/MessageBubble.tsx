/**
 * Message Bubble Component
 * Displays individual messages with reactions, attachments, and metadata
 */

import { useState } from 'react';
import { MoreVertical, Edit, Trash2, Reply, Pin } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileAttachment } from './FileAttachment';
import { formatDistanceToNow } from 'date-fns';
import type { Message } from '@/services/api/messaging';
import { useAuth } from '@/hooks/useAuth';

interface MessageBubbleProps {
  message: Message;
  onEdit?: (message: Message) => void;
  onDelete?: (message: Message) => void;
  onReply?: (message: Message) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  onPin?: (message: Message) => void;
  showAvatar?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onEdit,
  onDelete,
  onReply,
  onReaction,
  onPin,
  showAvatar = true,
}) => {
  const { user } = useAuth();
  const [showReactions, setShowReactions] = useState(false);
  const isOwnMessage = message.sender_id === user?.id;

  const handleReactionClick = (emoji: string) => {
    if (onReaction) {
      onReaction(message.id, emoji);
    }
  };

  return (
    <div className={`flex gap-3 group ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
      {showAvatar && !isOwnMessage && (
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarImage src={message.sender_avatar} />
          <AvatarFallback>
            {message.sender_name?.charAt(0) || message.sender_email?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={`flex-1 max-w-[70%] ${isOwnMessage ? 'flex flex-col items-end' : ''}`}>
        {!isOwnMessage && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">{message.sender_name || 'Unknown User'}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
            </span>
          </div>
        )}
        
        <div
          className={`rounded-lg px-4 py-2 ${
            isOwnMessage
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
          }`}
        >
          {message.is_deleted ? (
            <p className="text-sm italic text-muted-foreground">Message deleted</p>
          ) : (
            <>
              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
              
              {message.is_edited && (
                <p className="text-xs opacity-70 mt-1">(edited)</p>
              )}
              
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-2 space-y-2">
                  {message.attachments.map((attachment) => (
                    <FileAttachment key={attachment.id} attachment={attachment} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        
        {!message.is_deleted && (
          <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {message.reactions && message.reactions.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {message.reactions.map((reaction, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleReactionClick(reaction.emoji)}
                    className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                  >
                    {reaction.emoji} {reaction.count}
                  </button>
                ))}
              </div>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isOwnMessage ? 'end' : 'start'}>
                {onReply && (
                  <DropdownMenuItem onClick={() => onReply(message)}>
                    <Reply className="w-4 h-4 mr-2" />
                    Reply
                  </DropdownMenuItem>
                )}
                {onPin && (
                  <DropdownMenuItem onClick={() => onPin(message)}>
                    <Pin className="w-4 h-4 mr-2" />
                    Pin
                  </DropdownMenuItem>
                )}
                {isOwnMessage && onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(message)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {isOwnMessage && onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(message)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
};
