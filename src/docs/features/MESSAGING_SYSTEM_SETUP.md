# Messaging System Setup Guide

## Overview
A comprehensive Slack-like messaging system has been implemented with real-time communication, channels, threads, reactions, mentions, and file attachments.

## Installation

### 1. Install Dependencies

**Frontend (root directory):**
```bash
npm install socket.io-client
```

**Backend (server directory):**
```bash
cd server
npm install socket.io multer
```

### 2. Database Schema

The messaging schema will be automatically created when:
- A new agency is created (via `createAgencySchema`)
- The first messaging API call is made (auto-initialization in `messagingService.js`)
- Manual initialization via `/api/schema/ensure-messaging` endpoint

### 3. Manual Schema Initialization

If you need to manually initialize the schema for an existing agency:

**Option 1: Via API (recommended)**
```bash
POST /api/schema/ensure-messaging
Headers: Authorization: Bearer <token>
```

**Option 2: The schema will auto-create on first use**
The messaging service automatically ensures the schema exists before any operation.

## Features Implemented

### Core Features
- ✅ Channels (public, private, direct messages)
- ✅ Threads within channels
- ✅ Real-time messaging via WebSocket
- ✅ Message reactions (emoji)
- ✅ File attachments
- ✅ Read receipts
- ✅ Typing indicators
- ✅ Unread message counts
- ✅ Draft messages
- ✅ Message editing and deletion
- ✅ Pinned messages
- ✅ Full-text search
- ✅ @mentions

### Database Tables
- `message_channels` - Channel containers
- `message_threads` - Conversation threads
- `messages` - Individual messages
- `thread_participants` - User participation tracking
- `channel_members` - Channel membership
- `message_reactions` - Emoji reactions
- `message_mentions` - @mention tracking
- `message_attachments` - File attachments
- `message_reads` - Read receipt tracking
- `message_drafts` - Draft message storage
- `message_pins` - Pinned messages

## API Endpoints

### Channels
- `GET /api/messaging/channels` - List channels
- `POST /api/messaging/channels` - Create channel
- `GET /api/messaging/channels/:id` - Get channel
- `PUT /api/messaging/channels/:id` - Update channel
- `DELETE /api/messaging/channels/:id` - Archive channel
- `POST /api/messaging/channels/:id/members` - Add member
- `DELETE /api/messaging/channels/:id/members/:userId` - Remove member

### Threads
- `GET /api/messaging/channels/:channelId/threads` - List threads
- `POST /api/messaging/channels/:channelId/threads` - Create thread
- `GET /api/messaging/threads/:id` - Get thread

### Messages
- `GET /api/messaging/threads/:threadId/messages` - Get messages
- `POST /api/messaging/threads/:threadId/messages` - Send message
- `PUT /api/messaging/messages/:id` - Edit message
- `DELETE /api/messaging/messages/:id` - Delete message
- `POST /api/messaging/messages/:id/read` - Mark as read

### Reactions
- `POST /api/messaging/messages/:id/reactions` - Add reaction
- `DELETE /api/messaging/messages/:id/reactions/:emoji` - Remove reaction

### Search
- `GET /api/messaging/search?q=query` - Search messages

### Attachments
- `POST /api/messaging/attachments` - Upload file
- `GET /api/messaging/attachments/:id` - Get attachment

## WebSocket Events

### Client → Server
- `channel:join` - Join channel room
- `channel:leave` - Leave channel room
- `thread:join` - Join thread room
- `thread:leave` - Leave thread room
- `typing:start` - Start typing indicator
- `typing:stop` - Stop typing indicator

### Server → Client
- `message:new` - New message received
- `message:update` - Message updated
- `message:delete` - Message deleted
- `reaction:update` - Reaction added/removed
- `read:receipt` - Read receipt update
- `channel:update` - Channel updated
- `thread:update` - Thread updated
- `thread:new` - New thread created
- `typing:start` - User started typing
- `typing:stop` - User stopped typing
- `user:online` - User came online
- `user:offline` - User went offline

## Troubleshooting

### Schema Not Created
If you see errors like "relation 'message_threads' does not exist":

1. **Automatic**: The schema will auto-create on the first API call
2. **Manual**: Call `POST /api/schema/ensure-messaging` with authentication
3. **Check logs**: Look for `[Messaging] Schema ensured` in server logs

### WebSocket Connection Issues
- Ensure `socket.io` and `socket.io-client` are installed
- Check that the server is running on the correct port
- Verify `VITE_API_URL` environment variable is set correctly
- Check browser console for WebSocket connection errors

### Import Errors
If you see "Failed to resolve import 'socket.io-client'":
- Run `npm install socket.io-client` in the root directory
- Restart the Vite dev server

## File Structure

```
server/
  routes/
    messaging.js - API routes
  services/
    messagingService.js - Business logic
    websocketService.js - WebSocket server
  utils/schema/
    messagingSchema.js - Database schema

src/
  components/communication/
    MessageCenter.tsx - Main component
    MessageBubble.tsx - Message display
    MessageComposer.tsx - Message input
    FileAttachment.tsx - File display
    ChannelSidebar.tsx - Channel list
    ThreadList.tsx - Thread list
  hooks/
    useMessagingWebSocket.ts - WebSocket hook
  services/api/
    messaging.ts - API client
  stores/
    messagingStore.ts - State management
```

## Next Steps (Optional Enhancements)

1. Rich text editor with markdown support
2. Advanced file upload with drag-and-drop
3. Enhanced search with filters
4. Notification integration for @mentions
5. Performance optimizations (pagination, virtual scrolling)
