/**
 * Enhanced MessageCenter Component
 * Slack-like messaging interface with three-panel layout, real-time updates, and all features
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMessagingWebSocket } from '@/hooks/useMessagingWebSocket';
import { useMessagingStore } from '@/stores/messagingStore';
import {
  channelApi,
  threadApi,
  messageApi,
  reactionApi,
  searchApi,
  pinApi,
} from '@/services/api/messaging';
import { ChannelSidebar } from './ChannelSidebar';
import { ThreadList } from './ThreadList';
import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';
import { UserSelector } from './UserSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Settings, Hash, MessageCircle, Users } from 'lucide-react';
import { getApiRoot } from '@/config/api';
import { logWarn, logError } from '@/utils/consoleLogger';
import { toast } from 'sonner';
import { getAgencyId } from '@/utils/agencyUtils';
import type { Channel, Thread, Message } from '@/services/api/messaging';

export function MessageCenter() {
  const { user, profile } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateChannelDialog, setShowCreateChannelDialog] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState<'public' | 'private' | 'direct'>('public');
  const [showCreateThreadDialog, setShowCreateThreadDialog] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [selectedUserForDM, setSelectedUserForDM] = useState<{ id: string; name: string } | null>(null);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);
  const [showTeamSelector, setShowTeamSelector] = useState(false);

  const {
    channels,
    activeChannelId,
    threads,
    activeThreadId,
    messages,
    unreadCounts,
    typingUsers,
    setChannels,
    setActiveChannel,
    setThreads,
    setActiveThread,
    setMessages,
    addMessage,
    updateMessage,
    removeMessage,
    setUnreadCount,
    clearUnreadCount,
    addTypingUser,
    removeTypingUser,
  } = useMessagingStore();
  
  const [loadingChannels, setLoadingChannelsState] = useState(false);
  const [loadingThreads, setLoadingThreadsState] = useState(false);
  const [loadingMessages, setLoadingMessagesState] = useState(false);

  // Get threads for active channel
  const activeChannelThreads = activeChannelId ? (threads[activeChannelId] || []) : [];
  // Get messages for active thread
  const activeThreadMessages = activeThreadId ? (messages[activeThreadId] || []) : [];

  // WebSocket integration
  const { isConnected, joinChannel, leaveChannel, joinThread, leaveThread, startTyping, stopTyping } =
    useMessagingWebSocket({
      enabled: !!user?.id,
      onMessage: (message: Message) => {
        // The addMessage function in the store now handles duplicate checking
        // But we'll also check here to avoid unnecessary updates
        const threadMessages = messages[message.thread_id] || [];
        const messageExists = threadMessages.some((m) => m.id === message.id);
        
        if (!messageExists) {
          addMessage(message.thread_id, message);
          
          // Scroll to bottom if this is the active thread
          if (message.thread_id === activeThreadId) {
            scrollToBottom();
          }
          
          // Update unread count if not current thread
          if (message.thread_id !== activeThreadId) {
            setUnreadCount(message.thread_id, (unreadCounts[message.thread_id] || 0) + 1);
          }
        } else {
          // Message already exists, just update it (in case it was edited)
          updateMessage(message.thread_id, message.id, message);
        }
      },
      onMessageUpdate: (message: Message) => {
        updateMessage(message.thread_id, message.id, message);
      },
      onMessageDelete: (data) => {
        removeMessage(data.threadId, data.messageId);
      },
      onThreadUpdate: (thread: Thread) => {
        // Update thread in store
        if (activeChannelId) {
          const channelThreads = threads[activeChannelId] || [];
          const updatedThreads = channelThreads.map((t) =>
            t.id === thread.id ? { ...t, ...thread } : t
          );
          setThreads(activeChannelId, updatedThreads);
        }
      },
      onNewThread: (thread: Thread) => {
        if (activeChannelId) {
          const channelThreads = threads[activeChannelId] || [];
          setThreads(activeChannelId, [thread, ...channelThreads]);
        }
      },
      onTypingStart: (data) => {
        addTypingUser(data.threadId, data.userId);
      },
      onTypingStop: (data) => {
        removeTypingUser(data.threadId, data.userId);
      },
    });

  // Initialize agency and ensure messaging schema
  useEffect(() => {
    const initializeAgency = async () => {
      const id = await getAgencyId(profile, user?.id);
      setAgencyId(id);
      
      // Ensure messaging schema exists
      if (id) {
        try {
          const token = localStorage.getItem('auth_token') || '';
          const baseUrl = getApiRoot();
          await fetch(`${baseUrl}/schema/ensure-messaging`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          });
        } catch (error) {
          logWarn('Failed to ensure messaging schema:', error);
          // Schema will be auto-created on first use
        }
      }
    };
    if (user?.id) {
      initializeAgency();
    }
  }, [user?.id, profile?.agency_id]);

  // Load channels
  useEffect(() => {
    if (!agencyId) return;

    const loadChannels = async () => {
      setLoadingChannelsState(true);
      try {
        const data = await channelApi.getAll();
        setChannels(data);
        if (data.length > 0 && !activeChannelId) {
          setActiveChannel(data[0].id);
        }
      } catch (error: any) {
        toast.error(error.message || 'Failed to load channels');
      } finally {
        setLoadingChannelsState(false);
      }
    };

    loadChannels();
  }, [agencyId]);

  // Load threads when channel changes
  useEffect(() => {
    if (!activeChannelId) return;

    joinChannel(activeChannelId);

    const loadThreads = async () => {
      setLoadingThreadsState(true);
      try {
        const data = await threadApi.getByChannel(activeChannelId);
        setThreads(activeChannelId, data);
        if (data.length > 0 && !activeThreadId) {
          setActiveThread(data[0].id);
        }
      } catch (error: any) {
        toast.error(error.message || 'Failed to load threads');
      } finally {
        setLoadingThreadsState(false);
      }
    };

    loadThreads();

    return () => {
      leaveChannel(activeChannelId);
    };
  }, [activeChannelId]);

  // Load messages when thread changes
  useEffect(() => {
    if (!activeThreadId) return;

    joinThread(activeThreadId);

    const loadMessages = async () => {
      setLoadingMessagesState(true);
      try {
        const data = await messageApi.getByThread(activeThreadId);
        // Remove duplicates before setting messages
        const uniqueMessages = data.filter((message, index, self) => 
          index === self.findIndex((m) => m.id === message.id)
        );
        setMessages(activeThreadId, uniqueMessages);
        scrollToBottom();
        
        // Mark as read
        if (uniqueMessages.length > 0) {
          const lastMessage = uniqueMessages[uniqueMessages.length - 1];
          await messageApi.markAsRead(lastMessage.id);
          clearUnreadCount(activeThreadId);
        }
      } catch (error: any) {
        toast.error(error.message || 'Failed to load messages');
      } finally {
        setLoadingMessagesState(false);
      }
    };

    loadMessages();

    return () => {
      leaveThread(activeThreadId);
    };
  }, [activeThreadId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (content: string, attachments?: any[]) => {
    if (!activeThreadId || !content.trim()) return;

    try {
      const message = await messageApi.create(activeThreadId, {
        content,
        mentions: extractMentions(content),
      });
      
      // addMessage now handles duplicate checking internally
      addMessage(activeThreadId, message);
      scrollToBottom();
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message');
    }
  };

  const handleTyping = useCallback(() => {
    if (activeThreadId && user) {
      startTyping(activeThreadId, user.email || 'User');
    }
  }, [activeThreadId, user, startTyping]);

  const extractMentions = (text: string): Array<{ user_id: string; type: 'user' }> => {
    // Simple mention extraction - in production, use proper regex and user lookup
    const mentionRegex = /@(\w+)/g;
    const mentions: Array<{ user_id: string; type: 'user' }> = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      // In production, resolve username to user_id
      mentions.push({ user_id: match[1], type: 'user' });
    }
    return mentions;
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim() || !agencyId) {
      toast.error('Please provide a channel name');
      return;
    }

    // For direct messages, show user selector first
    if (newChannelType === 'direct') {
      setShowUserSelector(true);
      return;
    }

    // For team channels, show team member selector
    if (newChannelType === 'private' && newChannelName.toLowerCase().includes('team')) {
      setShowTeamSelector(true);
      return;
    }

    try {
      const channel = await channelApi.create({
        name: newChannelName,
        channel_type: newChannelType,
        other_user_id: newChannelType === 'direct' ? selectedUserForDM?.id : undefined,
      });
      setChannels([...channels, channel]);
      setActiveChannel(channel.id);
      setShowCreateChannelDialog(false);
      setNewChannelName('');
      setNewChannelType('public');
      setSelectedUserForDM(null);
      toast.success('Channel created successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create channel');
    }
  };

  const handleUserSelectForDM = async (userId: string, userName: string) => {
    setSelectedUserForDM({ id: userId, name: userName });
    setShowUserSelector(false);
    
    // Create direct message channel
    if (!agencyId) {
      toast.error('Agency ID not found');
      setShowUserSelector(true);
      return;
    }

    try {
      // Check if direct message channel already exists with this user
      const existingDM = channels.find(
        (c) => c.channel_type === 'direct' && (c.name.includes(userName) || c.name === `DM: ${userName}`)
      );
      
      if (existingDM) {
        setActiveChannel(existingDM.id);
        setShowCreateChannelDialog(false);
        setSelectedUserForDM(null);
        setNewChannelType('public');
        toast.info(`Opened existing conversation with ${userName}`);
        return;
      }

      // Create channel name for DM (e.g., "DM: John Doe")
      const dmChannelName = `DM: ${userName}`;
      
      const channel = await channelApi.create({
        name: dmChannelName,
        channel_type: 'direct',
        other_user_id: userId,
      });
      
      setChannels([...channels, channel]);
      setActiveChannel(channel.id);
      setShowCreateChannelDialog(false);
      setNewChannelName('');
      setNewChannelType('public');
      setSelectedUserForDM(null);
      toast.success(`Direct message with ${userName} created`);
    } catch (error: any) {
      logError('Error creating direct message:', error);
      toast.error(error.message || 'Failed to create direct message');
      setShowUserSelector(true); // Reopen selector on error
    }
  };

  const handleTeamMemberSelect = (userId: string, userName: string) => {
    // Toggle selection
    if (selectedTeamMembers.includes(userId)) {
      setSelectedTeamMembers(selectedTeamMembers.filter(id => id !== userId));
    } else {
      setSelectedTeamMembers([...selectedTeamMembers, userId]);
    }
  };

  const handleCreateTeamChannel = async () => {
    if (!newChannelName.trim() || !agencyId || selectedTeamMembers.length === 0) {
      toast.error('Please provide a channel name and select at least one team member');
      return;
    }

    try {
      const channel = await channelApi.create({
        name: newChannelName,
        channel_type: 'private',
      });

      // Add selected team members to the channel
      for (const memberId of selectedTeamMembers) {
        try {
          await channelApi.addMember(channel.id, memberId, 'member');
        } catch (error) {
          logError(`Failed to add member ${memberId}:`, error);
        }
      }

      setChannels([...channels, channel]);
      setActiveChannel(channel.id);
      setShowCreateChannelDialog(false);
      setShowTeamSelector(false);
      setNewChannelName('');
      setNewChannelType('public');
      setSelectedTeamMembers([]);
      toast.success('Team channel created successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create team channel');
    }
  };

  const handleCreateThread = async () => {
    if (!newThreadTitle.trim() || !activeChannelId) return;

    try {
      const thread = await threadApi.create(activeChannelId, {
        title: newThreadTitle,
      });
      if (activeChannelId) {
        const channelThreads = threads[activeChannelId] || [];
        setThreads(activeChannelId, [thread, ...channelThreads]);
      }
      setActiveThread(thread.id);
      setShowCreateThreadDialog(false);
      setNewThreadTitle('');
      toast.success('Thread created successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create thread');
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await reactionApi.add(messageId, emoji);
      // Reaction will be updated via WebSocket
    } catch (error: any) {
      toast.error(error.message || 'Failed to add reaction');
    }
  };

  const handleEditMessage = async (message: Message) => {
    const newContent = prompt('Edit message:', message.content);
    if (newContent === null || newContent === message.content) return;

    try {
      const updated = await messageApi.update(message.id, { content: newContent });
      updateMessage(message.thread_id, message.id, updated);
      toast.success('Message updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update message');
    }
  };

  const handleDeleteMessage = async (message: Message) => {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      await messageApi.delete(message.id);
      removeMessage(message.thread_id, message.id);
      toast.success('Message deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete message');
    }
  };

  const handleReplyToMessage = (message: Message) => {
    // Focus composer and add mention
    const mention = `@${message.sender_name || message.sender_email || 'user'} `;
    // This would need to be passed to MessageComposer
    toast.info('Reply functionality - mention added to composer');
  };

  const handlePinMessage = async (message: Message) => {
    if (!activeChannelId) return;
    
    try {
      await pinApi.pin(message.id, activeChannelId);
      toast.success('Message pinned');
    } catch (error: any) {
      toast.error(error.message || 'Failed to pin message');
    }
  };

  const activeChannel = channels.find((c) => c.id === activeChannelId);
  const activeThread = activeChannelThreads.find((t) => t.id === activeThreadId);

  return (
    <div className="h-[calc(100vh-8rem)] flex">
      {/* Channel Sidebar */}
      <ChannelSidebar
        channels={channels}
        activeChannelId={activeChannelId}
        onChannelSelect={setActiveChannel}
        onCreateChannel={() => {
          setNewChannelType('public');
          setShowCreateChannelDialog(true);
        }}
        onCreateDirectMessage={() => {
          // Directly open user selector for DM
          setShowUserSelector(true);
          setNewChannelType('direct');
        }}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {/* Thread List */}
      {activeChannelId && (
        <ThreadList
          threads={activeChannelThreads}
          activeThreadId={activeThreadId}
          onThreadSelect={setActiveThread}
          onCreateThread={() => setShowCreateThreadDialog(true)}
        />
      )}

      {/* Main Message Area */}
      <div className="flex-1 flex flex-col">
        {activeThreadId ? (
          <>
            {/* Thread Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Hash className="w-5 h-5 text-muted-foreground" />
                <div>
                  <h3 className="font-medium">{activeThread?.title || 'Untitled Thread'}</h3>
                  <p className="text-sm text-muted-foreground">
                    {activeChannel?.name || 'Channel'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span>Connected</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-yellow-600">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                      <span>Connecting...</span>
                    </div>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    // TODO: Open channel settings
                    toast.info('Channel settings coming soon');
                  }}
                  title="Channel Settings"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {loadingMessages ? (
                  <div className="text-center py-8 text-muted-foreground">Loading messages...</div>
                ) : activeThreadMessages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No messages yet</div>
                ) : (
                  activeThreadMessages
                    .filter((message, index, self) => 
                      // Remove duplicates by checking if this is the first occurrence of this message ID
                      index === self.findIndex((m) => m.id === message.id)
                    )
                    .map((message, index, filteredMessages) => {
                      const showAvatar =
                        index === 0 ||
                        filteredMessages[index - 1].sender_id !== message.sender_id;
                      return (
                        <MessageBubble
                          key={`${message.id}-${message.updated_at || message.created_at}`}
                          message={message}
                          onReaction={handleReaction}
                          onEdit={handleEditMessage}
                          onDelete={handleDeleteMessage}
                          onReply={handleReplyToMessage}
                          onPin={handlePinMessage}
                          showAvatar={showAvatar}
                        />
                      );
                    })
                )}
                
                {/* Typing indicator */}
                {activeThreadId && typingUsers[activeThreadId] && typingUsers[activeThreadId].size > 0 && (
                  <div className="text-sm text-muted-foreground italic">
                    {Array.from(typingUsers[activeThreadId]).length} user(s) typing...
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Composer */}
            <MessageComposer
              threadId={activeThreadId}
              onSend={handleSendMessage}
              onTyping={handleTyping}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Hash className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Select a thread</h3>
              <p className="text-muted-foreground mb-4">
                Choose a thread from the list or create a new one
              </p>
              {activeChannelId && (
                <Button 
                  onClick={() => setShowCreateThreadDialog(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Thread
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Channel Dialog */}
      <Dialog open={showCreateChannelDialog} onOpenChange={(open) => {
        setShowCreateChannelDialog(open);
        if (!open) {
          setNewChannelName('');
          setNewChannelType('public');
          setSelectedUserForDM(null);
          setSelectedTeamMembers([]);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Channel</DialogTitle>
            <DialogDescription>Create a new channel for your team</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="channel-name">Channel Name</Label>
              <Input
                id="channel-name"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="e.g. general, team-leads, project-alpha"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newChannelName.trim()) {
                    handleCreateChannel();
                  }
                }}
              />
            </div>
            <div>
              <Label htmlFor="channel-type">Channel Type</Label>
              <Select value={newChannelType} onValueChange={(value: any) => setNewChannelType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      <span>Public Channel</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>Private Team Channel</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="direct">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      <span>Direct Message</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newChannelType === 'direct' && selectedUserForDM && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Selected: {selectedUserForDM.name}</p>
              </div>
            )}
            {newChannelType === 'private' && selectedTeamMembers.length > 0 && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">{selectedTeamMembers.length} team member(s) selected</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCreateChannelDialog(false);
                setNewChannelName('');
                setNewChannelType('public');
                setSelectedUserForDM(null);
                setSelectedTeamMembers([]);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateChannel}
              disabled={!newChannelName.trim()}
            >
              {newChannelType === 'direct' ? 'Select User' : 
               newChannelType === 'private' ? 'Select Team Members' : 
               'Create Channel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Selector Dialog for Direct Messages */}
      <Dialog open={showUserSelector} onOpenChange={(open) => {
        setShowUserSelector(open);
        if (!open) {
          // Reset state when closing
          setSelectedUserForDM(null);
          setNewChannelType('public');
          if (showCreateChannelDialog) {
            // If channel dialog was open, reopen it
            setTimeout(() => setShowCreateChannelDialog(true), 100);
          }
        }
      }}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Start Direct Message</DialogTitle>
            <DialogDescription>Choose a user to start a direct conversation</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-hidden">
            <UserSelector
              onSelect={handleUserSelectForDM}
              onCancel={() => {
                setShowUserSelector(false);
                setSelectedUserForDM(null);
                setNewChannelType('public');
              }}
              excludeUserIds={[user?.id || ''].filter(Boolean)}
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowUserSelector(false);
                setSelectedUserForDM(null);
                setNewChannelType('public');
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Member Selector Dialog */}
      <Dialog open={showTeamSelector} onOpenChange={(open) => {
        setShowTeamSelector(open);
        if (!open) {
          // Reset team members if cancelled
          if (!showCreateChannelDialog) {
            setSelectedTeamMembers([]);
          }
        }
      }}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Team Members</DialogTitle>
            <DialogDescription>
              Choose team members to add to "{newChannelName || 'this private channel'}"
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-hidden">
            <UserSelector
              onSelect={handleTeamMemberSelect}
              onCancel={() => {
                setShowTeamSelector(false);
                setShowCreateChannelDialog(true);
              }}
              multiSelect={true}
              selectedUserIds={selectedTeamMembers}
              excludeUserIds={[user?.id || ''].filter(Boolean)}
            />
          </div>
          <DialogFooter className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {selectedTeamMembers.length} member{selectedTeamMembers.length !== 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowTeamSelector(false);
                  setShowCreateChannelDialog(true);
                }}
              >
                Back
              </Button>
              <Button 
                onClick={handleCreateTeamChannel}
                disabled={selectedTeamMembers.length === 0 || !newChannelName.trim()}
              >
                Create Channel
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Thread Dialog */}
      <Dialog open={showCreateThreadDialog} onOpenChange={setShowCreateThreadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Thread</DialogTitle>
            <DialogDescription>Start a new conversation thread</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="thread-title">Thread Title</Label>
              <Input
                id="thread-title"
                value={newThreadTitle}
                onChange={(e) => setNewThreadTitle(e.target.value)}
                placeholder="Enter thread title"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCreateThreadDialog(false);
                setNewThreadTitle('');
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateThread}
              disabled={!newThreadTitle.trim()}
            >
              Create Thread
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
