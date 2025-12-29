/**
 * Messaging Routes
 * Handles all messaging operations: channels, threads, messages, reactions, mentions, search, attachments
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireAgencyContext } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');
const messagingService = require('../services/messagingService');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Storage configuration - use same storage path as files.js
const STORAGE_BASE_PATH = process.env.FILE_STORAGE_PATH || path.join(__dirname, '../../storage');
const MESSAGING_STORAGE_PATH = path.join(STORAGE_BASE_PATH, 'messaging');

// Ensure messaging storage directory exists
async function ensureMessagingStorageDir() {
  try {
    await fs.mkdir(MESSAGING_STORAGE_PATH, { recursive: true });
  } catch (error) {
    console.warn('[Messaging] Could not create messaging storage directory:', error.message);
  }
}
ensureMessagingStorageDir();

// Configure multer for file uploads (use memory storage, save to storage directory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types
    cb(null, true);
  }
});

/**
 * Channel Routes
 */

/**
 * GET /api/messaging/channels
 * Get all channels for the agency
 */
router.get('/channels', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;

  const channels = await messagingService.getChannels(agencyDatabase, agencyId, userId);

  res.json({
    success: true,
    data: channels,
  });
}));

/**
 * POST /api/messaging/channels
 * Create a new channel
 */
router.post('/channels', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;

  const channel = await messagingService.createChannel(
    agencyDatabase,
    { ...req.body, agency_id: agencyId },
    userId
  );

  res.json({
    success: true,
    data: channel,
    message: 'Channel created successfully',
  });
}));

/**
 * GET /api/messaging/channels/:id
 * Get channel by ID
 */
router.get('/channels/:id', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;
  const channelId = req.params.id;

  const channel = await messagingService.getChannelById(agencyDatabase, channelId, userId);

  if (!channel) {
    return res.status(404).json({
      success: false,
      error: { code: 'CHANNEL_NOT_FOUND', message: 'Channel not found' },
      message: 'Channel not found',
    });
  }

  res.json({
    success: true,
    data: channel,
  });
}));

/**
 * PUT /api/messaging/channels/:id
 * Update channel
 */
router.put('/channels/:id', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;
  const channelId = req.params.id;

  const channel = await messagingService.updateChannel(agencyDatabase, channelId, req.body, userId);

  if (!channel) {
    return res.status(404).json({
      success: false,
      error: { code: 'CHANNEL_NOT_FOUND', message: 'Channel not found' },
      message: 'Channel not found',
    });
  }

  res.json({
    success: true,
    data: channel,
    message: 'Channel updated successfully',
  });
}));

/**
 * DELETE /api/messaging/channels/:id
 * Archive channel
 */
router.delete('/channels/:id', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;
  const channelId = req.params.id;

  const channel = await messagingService.archiveChannel(agencyDatabase, channelId, userId);

  if (!channel) {
    return res.status(404).json({
      success: false,
      error: { code: 'CHANNEL_NOT_FOUND', message: 'Channel not found' },
      message: 'Channel not found',
    });
  }

  res.json({
    success: true,
    data: channel,
    message: 'Channel archived successfully',
  });
}));

/**
 * POST /api/messaging/channels/:id/members
 * Add member to channel
 */
router.post('/channels/:id/members', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const channelId = req.params.id;
  const { user_id, role } = req.body;

  if (!user_id) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_USER_ID', message: 'user_id is required' },
      message: 'User ID is required',
    });
  }

  const member = await messagingService.addChannelMember(
    agencyDatabase,
    channelId,
    req.user.id,
    user_id,
    role || 'member'
  );

  res.json({
    success: true,
    data: member,
    message: 'Member added successfully',
  });
}));

/**
 * DELETE /api/messaging/channels/:id/members/:userId
 * Remove member from channel
 */
router.delete('/channels/:id/members/:userId', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const channelId = req.params.id;
  const memberUserId = req.params.userId;

  const member = await messagingService.removeChannelMember(agencyDatabase, channelId, memberUserId);

  if (!member) {
    return res.status(404).json({
      success: false,
      error: { code: 'MEMBER_NOT_FOUND', message: 'Member not found' },
      message: 'Member not found',
    });
  }

  res.json({
    success: true,
    data: member,
    message: 'Member removed successfully',
  });
}));

/**
 * Thread Routes
 */

/**
 * GET /api/messaging/channels/:channelId/threads
 * Get threads for a channel
 */
router.get('/channels/:channelId/threads', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;
  const channelId = req.params.channelId;
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  const threads = await messagingService.getThreads(agencyDatabase, channelId, userId, limit, offset);

  res.json({
    success: true,
    data: threads,
  });
}));

/**
 * POST /api/messaging/channels/:channelId/threads
 * Create a new thread
 */
router.post('/channels/:channelId/threads', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;
  const channelId = req.params.channelId;

  const thread = await messagingService.createThread(
    agencyDatabase,
    { ...req.body, channel_id: channelId, agency_id: agencyId },
    userId
  );

  res.json({
    success: true,
    data: thread,
    message: 'Thread created successfully',
  });
}));

/**
 * GET /api/messaging/threads/:id
 * Get thread by ID
 */
router.get('/threads/:id', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;
  const threadId = req.params.id;

  const thread = await messagingService.getThreadById(agencyDatabase, threadId, userId);

  if (!thread) {
    return res.status(404).json({
      success: false,
      error: { code: 'THREAD_NOT_FOUND', message: 'Thread not found' },
      message: 'Thread not found',
    });
  }

  res.json({
    success: true,
    data: thread,
  });
}));

/**
 * Message Routes
 */

/**
 * GET /api/messaging/threads/:threadId/messages
 * Get messages for a thread
 */
router.get('/threads/:threadId/messages', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;
  const threadId = req.params.threadId;
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  const messages = await messagingService.getMessages(agencyDatabase, threadId, userId, limit, offset);

  res.json({
    success: true,
    data: messages,
  });
}));

/**
 * POST /api/messaging/threads/:threadId/messages
 * Create a new message
 */
router.post('/threads/:threadId/messages', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;
  const threadId = req.params.threadId;

  const message = await messagingService.createMessage(
    agencyDatabase,
    { ...req.body, thread_id: threadId, agency_id: agencyId },
    userId
  );

  res.json({
    success: true,
    data: message,
    message: 'Message sent successfully',
  });
}));

/**
 * PUT /api/messaging/messages/:id
 * Update message
 */
router.put('/messages/:id', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;
  const messageId = req.params.id;

  const message = await messagingService.updateMessage(agencyDatabase, messageId, req.body, userId);

  if (!message) {
    return res.status(404).json({
      success: false,
      error: { code: 'MESSAGE_NOT_FOUND', message: 'Message not found or you do not have permission to edit it' },
      message: 'Message not found',
    });
  }

  res.json({
    success: true,
    data: message,
    message: 'Message updated successfully',
  });
}));

/**
 * DELETE /api/messaging/messages/:id
 * Delete message
 */
router.delete('/messages/:id', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;
  const messageId = req.params.id;

  const message = await messagingService.deleteMessage(agencyDatabase, messageId, userId);

  if (!message) {
    return res.status(404).json({
      success: false,
      error: { code: 'MESSAGE_NOT_FOUND', message: 'Message not found' },
      message: 'Message not found',
    });
  }

  res.json({
    success: true,
    data: message,
    message: 'Message deleted successfully',
  });
}));

/**
 * Reaction Routes
 */

/**
 * POST /api/messaging/messages/:id/reactions
 * Add reaction to message
 */
router.post('/messages/:id/reactions', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;
  const messageId = req.params.id;
  const { emoji } = req.body;

  if (!emoji) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_EMOJI', message: 'emoji is required' },
      message: 'Emoji is required',
    });
  }

  const reaction = await messagingService.addReaction(agencyDatabase, messageId, userId, emoji);

  res.json({
    success: true,
    data: reaction,
    message: 'Reaction added successfully',
  });
}));

/**
 * DELETE /api/messaging/messages/:id/reactions/:emoji
 * Remove reaction from message
 */
router.delete('/messages/:id/reactions/:emoji', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;
  const messageId = req.params.id;
  const emoji = decodeURIComponent(req.params.emoji);

  const reaction = await messagingService.removeReaction(agencyDatabase, messageId, userId, emoji);

  if (!reaction) {
    return res.status(404).json({
      success: false,
      error: { code: 'REACTION_NOT_FOUND', message: 'Reaction not found' },
      message: 'Reaction not found',
    });
  }

  res.json({
    success: true,
    data: reaction,
    message: 'Reaction removed successfully',
  });
}));

/**
 * Read Receipt Routes
 */

/**
 * POST /api/messaging/messages/:id/read
 * Mark message as read
 */
router.post('/messages/:id/read', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;
  const messageId = req.params.id;

  const readReceipt = await messagingService.markMessageAsRead(agencyDatabase, messageId, userId);

  if (!readReceipt) {
    return res.status(404).json({
      success: false,
      error: { code: 'MESSAGE_NOT_FOUND', message: 'Message not found' },
      message: 'Message not found',
    });
  }

  res.json({
    success: true,
    data: readReceipt,
    message: 'Message marked as read',
  });
}));

/**
 * Search Routes
 */

/**
 * GET /api/messaging/search
 * Search messages
 */
router.get('/search', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyId = req.user.agencyId;
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_QUERY', message: 'Search query is required' },
      message: 'Search query is required',
    });
  }

  const filters = {
    channel_id: req.query.channel_id,
    thread_id: req.query.thread_id,
    sender_id: req.query.sender_id,
    date_from: req.query.date_from,
    date_to: req.query.date_to,
    limit: req.query.limit ? parseInt(req.query.limit) : 50,
  };

  const messages = await messagingService.searchMessages(agencyDatabase, agencyId, userId, query, filters);

  res.json({
    success: true,
    data: messages,
  });
}));

/**
 * Attachment Routes
 */

/**
 * POST /api/messaging/attachments
 * Upload attachment
 */
router.post('/attachments', authenticate, requireAgencyContext, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: { code: 'NO_FILE', message: 'No file uploaded' },
      message: 'No file uploaded',
    });
  }

  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;
  const messageId = req.body.message_id;

  if (!messageId) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_MESSAGE_ID', message: 'message_id is required' },
      message: 'Message ID is required',
    });
  }

  // Save file to storage directory
  const fileName = `${Date.now()}-${req.file.originalname}`;
  const filePath = path.join(MESSAGING_STORAGE_PATH, fileName);
  const relativePath = path.join('messaging', fileName);

  try {
    await fs.writeFile(filePath, req.file.buffer);
  } catch (error) {
    console.error('[Messaging] Error saving file:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'FILE_SAVE_ERROR', message: 'Failed to save file' },
      message: 'Failed to save file',
    });
  }

  // Determine file type
  const ext = path.extname(req.file.originalname).toLowerCase();
  const fileType = ext.slice(1); // Remove the dot

  const attachment = await messagingService.saveAttachment(
    agencyDatabase,
    messageId,
    {
      file_name: req.file.originalname,
      file_path: relativePath, // Store relative path
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      file_type: fileType,
    },
    userId
  );

  res.json({
    success: true,
    data: attachment,
    message: 'Attachment uploaded successfully',
  });
}));

/**
 * GET /api/messaging/attachments/:id
 * Get attachment metadata by ID
 */
router.get('/attachments/:id', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const attachmentId = req.params.id;

  const attachment = await messagingService.getAttachmentById(agencyDatabase, attachmentId);

  if (!attachment) {
    return res.status(404).json({
      success: false,
      error: { code: 'ATTACHMENT_NOT_FOUND', message: 'Attachment not found' },
      message: 'Attachment not found',
    });
  }

  res.json({
    success: true,
    data: attachment,
  });
}));

/**
 * GET /api/messaging/attachments/:id/download
 * Download/serve attachment file
 */
router.get('/attachments/:id/download', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const attachmentId = req.params.id;

  const attachment = await messagingService.getAttachmentById(agencyDatabase, attachmentId);

  if (!attachment) {
    return res.status(404).json({
      success: false,
      error: { code: 'ATTACHMENT_NOT_FOUND', message: 'Attachment not found' },
      message: 'Attachment not found',
    });
  }

  // Construct full file path
  const fullPath = path.join(STORAGE_BASE_PATH, attachment.file_path);
  
  // Security: Ensure path is within storage directory
  const normalizedPath = path.normalize(fullPath);
  const storageBase = path.normalize(STORAGE_BASE_PATH);
  if (!normalizedPath.startsWith(storageBase)) {
    return res.status(403).json({
      success: false,
      error: { code: 'ACCESS_DENIED', message: 'Access denied' },
      message: 'Access denied',
    });
  }

  // Check if file exists
  try {
    await fs.access(normalizedPath);
  } catch (error) {
    return res.status(404).json({
      success: false,
      error: { code: 'FILE_NOT_FOUND', message: 'File not found on disk' },
      message: 'File not found',
    });
  }

  // Set headers and send file
  res.setHeader('Content-Type', attachment.mime_type || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${attachment.file_name}"`);
  res.setHeader('Content-Length', attachment.file_size);

  const fileStream = require('fs').createReadStream(normalizedPath);
  fileStream.pipe(res);
}));

/**
 * Draft Routes
 */

/**
 * GET /api/messaging/threads/:threadId/draft
 * Get draft for thread
 */
router.get('/threads/:threadId/draft', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;
  const threadId = req.params.threadId;

  const draft = await messagingService.getDraft(agencyDatabase, threadId, userId);

  res.json({
    success: true,
    data: draft,
  });
}));

/**
 * POST /api/messaging/threads/:threadId/draft
 * Save draft
 */
router.post('/threads/:threadId/draft', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;
  const threadId = req.params.threadId;
  const { content, attachments } = req.body;

  const draft = await messagingService.saveDraft(agencyDatabase, threadId, userId, content, attachments);

  res.json({
    success: true,
    data: draft,
    message: 'Draft saved successfully',
  });
}));

/**
 * DELETE /api/messaging/threads/:threadId/draft
 * Delete draft
 */
router.delete('/threads/:threadId/draft', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;
  const threadId = req.params.threadId;

  await messagingService.deleteDraft(agencyDatabase, threadId, userId);

  res.json({
    success: true,
    message: 'Draft deleted successfully',
  });
}));

/**
 * Pin Routes
 */

/**
 * POST /api/messaging/messages/:id/pin
 * Pin message
 */
router.post('/messages/:id/pin', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const userId = req.user.id;
  const messageId = req.params.id;
  const { channel_id } = req.body;

  if (!channel_id) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_CHANNEL_ID', message: 'channel_id is required' },
      message: 'Channel ID is required',
    });
  }

  const pin = await messagingService.pinMessage(agencyDatabase, messageId, channel_id, userId);

  res.json({
    success: true,
    data: pin,
    message: 'Message pinned successfully',
  });
}));

/**
 * DELETE /api/messaging/messages/:id/pin
 * Unpin message
 */
router.delete('/messages/:id/pin', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const messageId = req.params.id;
  const { channel_id } = req.body;

  if (!channel_id) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_CHANNEL_ID', message: 'channel_id is required' },
      message: 'Channel ID is required',
    });
  }

  await messagingService.unpinMessage(agencyDatabase, messageId, channel_id);

  res.json({
    success: true,
    message: 'Message unpinned successfully',
  });
}));

/**
 * GET /api/messaging/channels/:channelId/pins
 * Get pinned messages for channel
 */
router.get('/channels/:channelId/pins', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const channelId = req.params.channelId;

  const pins = await messagingService.getPinnedMessages(agencyDatabase, channelId);

  res.json({
    success: true,
    data: pins,
  });
}));

module.exports = router;
