/**
 * Thread List Component
 * Displays list of threads with unread counts
 */

import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import type { Thread } from '@/services/api/messaging';

interface ThreadListProps {
  threads: Thread[];
  activeThreadId: string | null;
  onThreadSelect: (threadId: string) => void;
  onCreateThread?: () => void;
}

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const ThreadList: React.FC<ThreadListProps> = ({
  threads,
  activeThreadId,
  onThreadSelect,
  onCreateThread,
}) => {
  return (
    <div className="w-80 border-r flex flex-col h-full">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold">Threads</h2>
        {onCreateThread && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onCreateThread}
            title="Create Thread"
            className="hover:bg-muted"
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {threads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => onThreadSelect(thread.id)}
              className={`w-full flex flex-col gap-1 px-3 py-2 rounded-lg text-left transition-colors ${
                activeThreadId === thread.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm truncate">
                  {thread.title || 'Untitled Thread'}
                </span>
                {thread.unread_count && thread.unread_count > 0 && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {thread.unread_count}
                  </Badge>
                )}
              </div>
              
              {thread.last_message_content && (
                <p className={`text-xs truncate ${
                  activeThreadId === thread.id
                    ? 'text-primary-foreground/70'
                    : 'text-muted-foreground'
                }`}>
                  {thread.last_message_content}
                </p>
              )}
              
              <div className={`text-xs ${
                activeThreadId === thread.id
                  ? 'text-primary-foreground/70'
                  : 'text-muted-foreground'
              }`}>
                {thread.last_message_at
                  ? formatDistanceToNow(new Date(thread.last_message_at), { addSuffix: true })
                  : formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}
              </div>
            </button>
          ))}
          
          {threads.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No threads found
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
