/**
 * WebSocket Hook for Messaging
 * Manages Socket.io connection, events, and reconnection logic
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { useAuth } from './useAuth';
import { logDebug, logWarn, logError } from '@/utils/consoleLogger';
import { getApiBaseUrl } from '@/config/api';

interface UseMessagingWebSocketOptions {
  enabled?: boolean;
  onMessage?: (message: any) => void;
  onMessageUpdate?: (message: any) => void;
  onMessageDelete?: (data: { messageId: string; threadId: string }) => void;
  onReactionUpdate?: (reaction: any) => void;
  onReadReceipt?: (receipt: any) => void;
  onChannelUpdate?: (channel: any) => void;
  onThreadUpdate?: (thread: any) => void;
  onNewThread?: (thread: any) => void;
  onTypingStart?: (data: { threadId: string; userId: string; userName: string }) => void;
  onTypingStop?: (data: { threadId: string; userId: string }) => void;
  onUserOnline?: (data: { userId: string }) => void;
  onUserOffline?: (data: { userId: string }) => void;
}

export function useMessagingWebSocket(options: UseMessagingWebSocketOptions = {}) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const isConnectingRef = useRef(false);

  const {
    enabled = true,
    onMessage,
    onMessageUpdate,
    onMessageDelete,
    onReactionUpdate,
    onReadReceipt,
    onChannelUpdate,
    onThreadUpdate,
    onNewThread,
    onTypingStart,
    onTypingStop,
    onUserOnline,
    onUserOffline,
  } = options;

  // Store callbacks in refs to avoid recreating listeners
  const callbacksRef = useRef({
    onMessage,
    onMessageUpdate,
    onMessageDelete,
    onReactionUpdate,
    onReadReceipt,
    onChannelUpdate,
    onThreadUpdate,
    onNewThread,
    onTypingStart,
    onTypingStop,
    onUserOnline,
    onUserOffline,
  });

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = {
      onMessage,
      onMessageUpdate,
      onMessageDelete,
      onReactionUpdate,
      onReadReceipt,
      onChannelUpdate,
      onThreadUpdate,
      onNewThread,
      onTypingStart,
      onTypingStop,
      onUserOnline,
      onUserOffline,
    };
  }, [onMessage, onMessageUpdate, onMessageDelete, onReactionUpdate, onReadReceipt, onChannelUpdate, onThreadUpdate, onNewThread, onTypingStart, onTypingStop, onUserOnline, onUserOffline]);

  const connect = useCallback(async () => {
    if (!user?.id || !enabled) {
      return;
    }

    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current || (socketRef.current && socketRef.current.connected)) {
      return;
    }

    isConnectingRef.current = true;

    // Get auth token from localStorage
    const token = localStorage.getItem('auth_token') || '';
    if (!token) {
      logWarn('[WebSocket] No auth token found');
      isConnectingRef.current = false;
      return;
    }

    // WebSocket connects to base server URL (without /api)
    const apiUrl = getApiBaseUrl();

    // Disconnect existing connection if any
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Create new connection with improved reliability
    const socket = io(apiUrl, {
      path: '/socket.io',
      auth: {
        token,
        userId: user.id,
      },
      query: {
        token, // Also pass in query for compatibility
        userId: user.id,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity, // Keep trying to reconnect
      timeout: 20000,
      forceNew: false,
      upgrade: true,
      rememberUpgrade: true, // Remember websocket upgrade
      autoConnect: true,
      // Add ping/pong for connection health
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      logDebug('[WebSocket] Connected');
      setIsConnected(true);
      setConnectionError(null);
      reconnectAttemptsRef.current = 0;
      isConnectingRef.current = false;
    });

    socket.on('disconnect', (reason) => {
      logDebug('[WebSocket] Disconnected:', reason);
      setIsConnected(false);
      isConnectingRef.current = false;
      
      // Set connection error message based on reason
      if (reason === 'io server disconnect') {
        setConnectionError('Server disconnected. Reconnecting...');
      } else if (reason === 'transport close') {
        setConnectionError('Connection lost. Reconnecting...');
      } else if (reason === 'transport error') {
        setConnectionError('Connection error. Reconnecting...');
      } else {
        setConnectionError('Disconnected. Reconnecting...');
      }
      
      // Socket.io will handle reconnection automatically with our improved settings
    });

    socket.on('connect_error', (error) => {
      logError('[WebSocket] Connection error:', error);
      setConnectionError(`Connection failed: ${error.message}. Retrying...`);
      setIsConnected(false);
      isConnectingRef.current = false;
    });

    // Messaging events - use refs to access latest callbacks
    socket.on('message:new', (message) => {
      logDebug('[WebSocket] New message:', message);
      callbacksRef.current.onMessage?.(message);
    });

    socket.on('message:update', (message) => {
      logDebug('[WebSocket] Message updated:', message);
      callbacksRef.current.onMessageUpdate?.(message);
    });

    socket.on('message:delete', (data) => {
      logDebug('[WebSocket] Message deleted:', data);
      callbacksRef.current.onMessageDelete?.(data);
    });

    socket.on('reaction:update', (reaction) => {
      logDebug('[WebSocket] Reaction updated:', reaction);
      callbacksRef.current.onReactionUpdate?.(reaction);
    });

    socket.on('read:receipt', (receipt) => {
      logDebug('[WebSocket] Read receipt:', receipt);
      callbacksRef.current.onReadReceipt?.(receipt);
    });

    socket.on('channel:update', (channel) => {
      logDebug('[WebSocket] Channel updated:', channel);
      callbacksRef.current.onChannelUpdate?.(channel);
    });

    socket.on('thread:update', (thread) => {
      logDebug('[WebSocket] Thread updated:', thread);
      callbacksRef.current.onThreadUpdate?.(thread);
    });

    socket.on('thread:new', (thread) => {
      logDebug('[WebSocket] New thread:', thread);
      callbacksRef.current.onNewThread?.(thread);
    });

    socket.on('typing:start', (data) => {
      callbacksRef.current.onTypingStart?.(data);
    });

    socket.on('typing:stop', (data) => {
      callbacksRef.current.onTypingStop?.(data);
    });

    socket.on('user:online', (data) => {
      callbacksRef.current.onUserOnline?.(data);
    });

    socket.on('user:offline', (data) => {
      callbacksRef.current.onUserOffline?.(data);
    });
  }, [user?.id, enabled]);

  const disconnect = useCallback(() => {
    isConnectingRef.current = false;
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const joinChannel = useCallback((channelId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('channel:join', { channelId });
    }
  }, [isConnected]);

  const leaveChannel = useCallback((channelId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('channel:leave', { channelId });
    }
  }, [isConnected]);

  const joinThread = useCallback((threadId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('thread:join', { threadId });
    }
  }, [isConnected]);

  const leaveThread = useCallback((threadId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('thread:leave', { threadId });
    }
  }, [isConnected]);

  const startTyping = useCallback((threadId: string, userName: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('typing:start', { threadId, userName });
    }
  }, [isConnected]);

  const stopTyping = useCallback((threadId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('typing:stop', { threadId });
    }
  }, [isConnected]);

  useEffect(() => {
    if (enabled && user?.id) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, user?.id]);

  return {
    isConnected,
    connectionError,
    socket: socketRef.current,
    joinChannel,
    leaveChannel,
    joinThread,
    leaveThread,
    startTyping,
    stopTyping,
    disconnect,
    reconnect: connect,
  };
}
