/**
 * WebSocket Service
 * Handles real-time communication via Socket.io
 */

const { Server } = require('socket.io');
const { authenticate } = require('../middleware/authMiddleware');
const { buildCorsOrigins, PORTS } = require('../config/ports');

// Store active connections
const activeConnections = new Map(); // userId -> Set of socketIds
const socketToUser = new Map(); // socketId -> userId
const typingUsers = new Map(); // threadId -> Set of userIds

/**
 * Initialize WebSocket server
 */
function initializeWebSocket(server) {
  // Get frontend URL from environment
  // Parse CORS origins from environment variable (same as main CORS config)
  const isDevelopment = process.env.NODE_ENV !== 'production' || 
                        process.env.VITE_APP_ENVIRONMENT === 'development';
  
  // Build CORS origins dynamically from port configuration
  const dynamicOrigins = buildCorsOrigins(isDevelopment);
  
  // Common development origins (built from port configuration)
  const commonDevOrigins = [
    `http://localhost:${PORTS.FRONTEND_DEV}`,
    `http://localhost:${PORTS.FRONTEND_DEV + 1}`,
    `http://localhost:${PORTS.BACKEND}`,
    `http://127.0.0.1:${PORTS.FRONTEND_DEV}`,
    `http://127.0.0.1:${PORTS.FRONTEND_DEV + 1}`,
    `http://127.0.0.1:${PORTS.BACKEND}`,
  ];
  
  // Combine all allowed origins
  const allowedOrigins = [
    ...dynamicOrigins,
    ...commonDevOrigins,
    process.env.VITE_FRONTEND_URL,
    process.env.VITE_API_URL?.replace('/api', ''),
  ].filter(Boolean);
  
  // Helper to check if origin matches any allowed origin
  const isOriginAllowed = (origin) => {
    if (!origin) return true; // Allow requests with no origin
    
    try {
      const originUrl = new URL(origin);
      const originHost = originUrl.hostname.toLowerCase();
      const originPort = originUrl.port || (originUrl.protocol === 'https:' ? '443' : '80');
      
      for (const allowed of allowedOrigins) {
        try {
          const allowedUrl = new URL(allowed);
          const allowedHost = allowedUrl.hostname.toLowerCase();
          const allowedPort = allowedUrl.port || (allowedUrl.protocol === 'https:' ? '443' : '80');
          
          // Match hostname and port
          if (originHost === allowedHost && originPort === allowedPort) {
            return true;
          }
          // Also match without port (default ports)
          if (originHost === allowedHost && 
              ((originPort === '80' && !allowedUrl.port) || 
               (originPort === '443' && !allowedUrl.port))) {
            return true;
          }
          // Match www and non-www variants
          const originBaseHost = originHost.replace(/^www\./, '');
          const allowedBaseHost = allowedHost.replace(/^www\./, '');
          if (originBaseHost === allowedBaseHost) {
            return true;
          }
        } catch {
          // If allowed is not a full URL, try string matching
          if (origin.includes(allowed) || allowed.includes(origin)) {
            return true;
          }
        }
      }
    } catch {
      // If origin is not a valid URL, check string match
      return allowedOrigins.some(allowed => origin.includes(allowed) || allowed.includes(origin));
    }
    
    return false;
  };
  
  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
          callback(null, true);
        } else {
          console.warn('[WebSocket] CORS blocked origin:', origin);
          console.warn('[WebSocket] Allowed origins:', allowedOrigins);
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: ['GET', 'POST'],
      credentials: true
    },
    path: '/socket.io',
    allowEIO3: true, // Allow Engine.IO v3 clients
    transports: ['websocket', 'polling'], // Support both transports
  });

  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      // Try multiple ways to get the token
      const token = socket.handshake.auth?.token || 
                   socket.handshake.query?.token ||
                   socket.handshake.headers?.authorization?.replace('Bearer ', '');
      
      if (!token) {
        console.log('[WebSocket] No token provided in handshake');
        console.log('[WebSocket] Handshake auth:', socket.handshake.auth);
        console.log('[WebSocket] Handshake query:', socket.handshake.query);
        return next(new Error('Authentication error: No token provided'));
      }

      const user = await authenticateSocket(token);
      
      if (!user) {
        console.log('[WebSocket] Invalid token');
        return next(new Error('Authentication error: Invalid token'));
      }

      socket.userId = user.id;
      socket.agencyId = user.agencyId;
      socket.agencyDatabase = user.agencyDatabase;
      
      console.log(`[WebSocket] ✅ Authenticated user ${user.id} for agency ${user.agencyId}`);
      next();
    } catch (error) {
      console.error('[WebSocket] Auth error:', error);
      next(new Error('Authentication error: ' + error.message));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    const agencyId = socket.agencyId;

    console.log(`[WebSocket] User ${userId} connected (socket: ${socket.id})`);

    // Track connection
    if (!activeConnections.has(userId)) {
      activeConnections.set(userId, new Set());
    }
    activeConnections.get(userId).add(socket.id);
    socketToUser.set(socket.id, userId);

    // Join user's personal room
    socket.join(`user:${userId}`);
    
    // Join agency room
    if (agencyId) {
      socket.join(`agency:${agencyId}`);
    }

    // Emit online status to agency
    if (agencyId) {
      socket.to(`agency:${agencyId}`).emit('user:online', { userId });
    }

    /**
     * Join channel room
     */
    socket.on('channel:join', (data) => {
      const { channelId } = data;
      if (channelId) {
        socket.join(`channel:${channelId}`);
        console.log(`[WebSocket] User ${userId} joined channel ${channelId}`);
      }
    });

    /**
     * Leave channel room
     */
    socket.on('channel:leave', (data) => {
      const { channelId } = data;
      if (channelId) {
        socket.leave(`channel:${channelId}`);
        console.log(`[WebSocket] User ${userId} left channel ${channelId}`);
      }
    });

    /**
     * Join thread room
     */
    socket.on('thread:join', (data) => {
      const { threadId } = data;
      if (threadId) {
        socket.join(`thread:${threadId}`);
        console.log(`[WebSocket] User ${userId} joined thread ${threadId}`);
      }
    });

    /**
     * Leave thread room
     */
    socket.on('thread:leave', (data) => {
      const { threadId } = data;
      if (threadId) {
        socket.leave(`thread:${threadId}`);
        console.log(`[WebSocket] User ${userId} left thread ${threadId}`);
      }
    });

    /**
     * Typing indicator
     */
    socket.on('typing:start', (data) => {
      const { threadId } = data;
      if (!threadId) return;

      if (!typingUsers.has(threadId)) {
        typingUsers.set(threadId, new Set());
      }
      typingUsers.get(threadId).add(userId);

      // Emit to other users in thread
      socket.to(`thread:${threadId}`).emit('typing:start', {
        threadId,
        userId,
        userName: data.userName || 'User'
      });

      // Clear typing after 3 seconds
      setTimeout(() => {
        if (typingUsers.has(threadId)) {
          typingUsers.get(threadId).delete(userId);
          if (typingUsers.get(threadId).size === 0) {
            typingUsers.delete(threadId);
          }
        }
        socket.to(`thread:${threadId}`).emit('typing:stop', {
          threadId,
          userId
        });
      }, 3000);
    });

    /**
     * Stop typing indicator
     */
    socket.on('typing:stop', (data) => {
      const { threadId } = data;
      if (!threadId) return;

      if (typingUsers.has(threadId)) {
        typingUsers.get(threadId).delete(userId);
      }

      socket.to(`thread:${threadId}`).emit('typing:stop', {
        threadId,
        userId
      });
    });

    /**
     * Disconnect handler
     */
    socket.on('disconnect', () => {
      console.log(`[WebSocket] User ${userId} disconnected (socket: ${socket.id})`);

      // Remove from active connections
      if (activeConnections.has(userId)) {
        activeConnections.get(userId).delete(socket.id);
        if (activeConnections.get(userId).size === 0) {
          activeConnections.delete(userId);
          
          // Emit offline status
          if (agencyId) {
            io.to(`agency:${agencyId}`).emit('user:offline', { userId });
          }
        }
      }
      socketToUser.delete(socket.id);

      // Clean up typing indicators
      for (const [threadId, users] of typingUsers.entries()) {
        users.delete(userId);
        if (users.size === 0) {
          typingUsers.delete(threadId);
        } else {
          io.to(`thread:${threadId}`).emit('typing:stop', { threadId, userId });
        }
      }
    });
  });

  return io;
}

// Rate limiting for error logging to prevent spam
const wsErrorLogCache = new Map();
const WS_ERROR_LOG_THROTTLE_MS = 5000;

/**
 * Check if token looks like valid base64
 */
function isValidBase64(str) {
  if (!str || typeof str !== 'string' || str.length < 10) {
    return false;
  }
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  return base64Regex.test(str);
}

/**
 * Decode token (same as authMiddleware)
 */
function decodeToken(token) {
  try {
    // Validate token format before attempting decode
    if (!token || typeof token !== 'string' || !isValidBase64(token)) {
      return null;
    }

    const json = Buffer.from(token, 'base64').toString('utf8');
    
    if (!json || json.trim().length === 0) {
      return null;
    }

    const payload = JSON.parse(json);

    if (!payload.exp || typeof payload.exp !== 'number') {
      return null;
    }

    const nowMs = Date.now();
    if (payload.exp * 1000 <= nowMs) {
      return null;
    }

    return payload;
  } catch (error) {
    // Throttle error logging to prevent spam
    const errorKey = `ws_decode_error_${error.message.substring(0, 50)}`;
    const lastLog = wsErrorLogCache.get(errorKey);
    const now = Date.now();
    
    if (!lastLog || (now - lastLog) > WS_ERROR_LOG_THROTTLE_MS) {
      console.warn('[WebSocket] Failed to decode auth token:', error.message);
      wsErrorLogCache.set(errorKey, now);
    }
    return null;
  }
}

/**
 * Authenticate socket connection
 */
async function authenticateSocket(token) {
  try {
    const payload = decodeToken(token);
    if (!payload || !payload.userId) {
      return null;
    }

    return {
      id: payload.userId,
      email: payload.email,
      agencyId: payload.agencyId,
      agencyDatabase: payload.agencyDatabase
    };
  } catch (error) {
    console.error('[WebSocket] Authentication error:', error);
    return null;
  }
}

/**
 * Emit new message to thread participants
 */
function emitNewMessage(io, threadId, message) {
  io.to(`thread:${threadId}`).emit('message:new', message);
}

/**
 * Emit message update
 */
function emitMessageUpdate(io, threadId, message) {
  io.to(`thread:${threadId}`).emit('message:update', message);
}

/**
 * Emit message deletion
 */
function emitMessageDelete(io, threadId, messageId) {
  io.to(`thread:${threadId}`).emit('message:delete', { messageId, threadId });
}

/**
 * Emit reaction update
 */
function emitReactionUpdate(io, threadId, reaction) {
  io.to(`thread:${threadId}`).emit('reaction:update', reaction);
}

/**
 * Emit read receipt
 */
function emitReadReceipt(io, threadId, readReceipt) {
  io.to(`thread:${threadId}`).emit('read:receipt', readReceipt);
}

/**
 * Emit channel update
 */
function emitChannelUpdate(io, channelId, channel) {
  io.to(`channel:${channelId}`).emit('channel:update', channel);
}

/**
 * Emit thread update
 */
function emitThreadUpdate(io, channelId, thread) {
  io.to(`channel:${channelId}`).emit('thread:update', thread);
}

/**
 * Emit new thread
 */
function emitNewThread(io, channelId, thread) {
  io.to(`channel:${channelId}`).emit('thread:new', thread);
}

/**
 * Get online users for agency
 */
function getOnlineUsers(agencyId) {
  // This would need to track which users are in which agency
  // For now, return all online users
  return Array.from(activeConnections.keys());
}

/**
 * Check if user is online
 */
function isUserOnline(userId) {
  return activeConnections.has(userId) && activeConnections.get(userId).size > 0;
}

module.exports = {
  initializeWebSocket,
  emitNewMessage,
  emitMessageUpdate,
  emitMessageDelete,
  emitReactionUpdate,
  emitReadReceipt,
  emitChannelUpdate,
  emitThreadUpdate,
  emitNewThread,
  getOnlineUsers,
  isUserOnline,
};
