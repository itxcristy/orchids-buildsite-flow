/**
 * Channel Sidebar Component
 * Displays list of channels with unread counts
 */

import { Hash, Lock, MessageCircle, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { Channel } from '@/services/api/messaging';

interface ChannelSidebarProps {
  channels: Channel[];
  activeChannelId: string | null;
  onChannelSelect: (channelId: string) => void;
  onCreateChannel?: () => void;
  onCreateDirectMessage?: () => void;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
}

const getChannelIcon = (type: string) => {
  switch (type) {
    case 'private':
      return Lock;
    case 'direct':
      return MessageCircle;
    default:
      return Hash;
  }
};

export const ChannelSidebar: React.FC<ChannelSidebarProps> = ({
  channels,
  activeChannelId,
  onChannelSelect,
  onCreateChannel,
  onCreateDirectMessage,
  searchTerm = '',
  onSearchChange,
}) => {
  const filteredChannels = channels.filter((channel) =>
    channel.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedChannels = {
    public: filteredChannels.filter((c) => c.channel_type === 'public'),
    private: filteredChannels.filter((c) => c.channel_type === 'private'),
    direct: filteredChannels.filter((c) => c.channel_type === 'direct'),
  };

  return (
    <div className="w-64 border-r flex flex-col h-full">
      <div className="p-4 border-b space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Channels</h2>
          <div className="flex items-center gap-1">
            {onCreateDirectMessage && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onCreateDirectMessage}
                title="Start Direct Message"
                className="hover:bg-muted"
              >
                <MessageCircle className="w-4 h-4" />
              </Button>
            )}
            {onCreateChannel && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onCreateChannel}
                title="Create Channel"
                className="hover:bg-muted"
              >
                <Plus className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        
        {onSearchChange && (
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search channels..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8"
            />
          </div>
        )}
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-4">
          {groupedChannels.public.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase px-2 mb-2">
                Public Channels
              </h3>
              {groupedChannels.public.map((channel) => {
                const Icon = getChannelIcon(channel.channel_type);
                return (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => onChannelSelect(channel.id)}
                    className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors ${
                      activeChannelId === channel.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1 text-left truncate">{channel.name}</span>
                    {channel.member_count !== undefined && channel.member_count > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {channel.member_count}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          
          {groupedChannels.private.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase px-2 mb-2">
                Private Channels
              </h3>
              {groupedChannels.private.map((channel) => {
                const Icon = getChannelIcon(channel.channel_type);
                return (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => onChannelSelect(channel.id)}
                    className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors ${
                      activeChannelId === channel.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1 text-left truncate">{channel.name}</span>
                  </button>
                );
              })}
            </div>
          )}
          
          {groupedChannels.direct.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase px-2 mb-2">
                Direct Messages
              </h3>
              {groupedChannels.direct.map((channel) => {
                const Icon = getChannelIcon(channel.channel_type);
                return (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => onChannelSelect(channel.id)}
                    className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors ${
                      activeChannelId === channel.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1 text-left truncate">{channel.name}</span>
                  </button>
                );
              })}
            </div>
          )}
          
          {filteredChannels.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No channels found
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
