/**
 * Messaging Service
 * Handles all messaging operations: channels, threads, messages, reactions, mentions, attachments
 */

const { getAgencyPool } = require('../config/database');
const { ensureMessagingSchema } = require('../utils/schema/messagingSchema');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;

// Cache for schema initialization status per database
const schemaInitialized = new Set();
const schemaInitializing = new Set();

// Generate UUID v4
function generateUUID() {
  return crypto.randomUUID();
}

/**
 * Get agency database connection
 */
async function getAgencyConnection(agencyDatabase) {
  const pool = getAgencyPool(agencyDatabase);
  const client = await pool.connect();
  
  // Ensure messaging schema exists (only once per database)
  const dbKey = agencyDatabase || 'main';
  if (!schemaInitialized.has(dbKey) && !schemaInitializing.has(dbKey)) {
    schemaInitializing.add(dbKey);
    try {
      // Always ensure schema (handles updates and missing tables)
      console.log(`[Messaging] Ensuring messaging schema for database: ${dbKey}`);
      await ensureMessagingSchema(client);
      console.log(`[Messaging] ✅ Schema ensured for database: ${dbKey}`);
      schemaInitialized.add(dbKey);
    } catch (error) {
      console.error(`[Messaging] Error ensuring schema for ${dbKey}:`, error.message);
      console.error(`[Messaging] Error stack:`, error.stack);
      // Don't throw - schema might already exist, will be retried on next call
    } finally {
      schemaInitializing.delete(dbKey);
    }
  }
  
  return client;
}

/**
 * Channel Management
 */

/**
 * Create a new channel
 */
async function createChannel(agencyDatabase, channelData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `INSERT INTO public.message_channels (
        id, name, description, channel_type, agency_id, created_by, settings, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *`,
      [
        generateUUID(),
        channelData.name,
        channelData.description || null,
        channelData.channel_type || 'public',
        channelData.agency_id,
        userId,
        JSON.stringify(channelData.settings || {})
      ]
    );

    const channel = result.rows[0];

    // Add creator as channel member with owner role
    await client.query(
      `INSERT INTO public.channel_members (id, channel_id, user_id, role, joined_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (channel_id, user_id) DO NOTHING`,
      [generateUUID(), channel.id, userId, 'owner']
    );

    // If it's a direct message, add the other user
    if (channelData.channel_type === 'direct' && channelData.other_user_id) {
      await client.query(
        `INSERT INTO public.channel_members (id, channel_id, user_id, role, joined_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (channel_id, user_id) DO NOTHING`,
        [generateUUID(), channel.id, channelData.other_user_id, 'member']
      );
    }

    // Emit WebSocket event for new channel
    if (global.io) {
      const { emitChannelUpdate } = require('./websocketService');
      emitChannelUpdate(global.io, channel.id, channel);
    }

    return channel;
  } finally {
    client.release();
  }
}

/**
 * Get all channels for an agency
 */
async function getChannels(agencyDatabase, agencyId, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `SELECT DISTINCT c.*,
        (SELECT COUNT(*) FROM public.channel_members cm WHERE cm.channel_id = c.id) as member_count,
        (SELECT COUNT(*) FROM public.message_threads mt WHERE mt.channel_id = c.id) as thread_count,
        EXISTS(SELECT 1 FROM public.channel_members cm WHERE cm.channel_id = c.id AND cm.user_id = $2) as is_member
       FROM public.message_channels c
       WHERE c.agency_id = $1
         AND c.is_archived = false
         AND (c.channel_type = 'public' OR EXISTS(SELECT 1 FROM public.channel_members cm WHERE cm.channel_id = c.id AND cm.user_id = $2))
       ORDER BY c.created_at DESC`,
      [agencyId, userId]
    );
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Get channel by ID
 */
async function getChannelById(agencyDatabase, channelId, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM public.channel_members cm WHERE cm.channel_id = c.id) as member_count,
        EXISTS(SELECT 1 FROM public.channel_members cm WHERE cm.channel_id = c.id AND cm.user_id = $2) as is_member
       FROM public.message_channels c
       WHERE c.id = $1`,
      [channelId, userId]
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * Update channel
 */
async function updateChannel(agencyDatabase, channelId, updates, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      setClause.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      setClause.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    if (updates.settings !== undefined) {
      setClause.push(`settings = $${paramIndex++}`);
      values.push(JSON.stringify(updates.settings));
    }
    if (updates.is_pinned !== undefined) {
      setClause.push(`is_pinned = $${paramIndex++}`);
      values.push(updates.is_pinned);
    }

    setClause.push(`updated_at = NOW()`);
    values.push(channelId);

    const result = await client.query(
      `UPDATE public.message_channels
       SET ${setClause.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    // Emit WebSocket event for channel update
    if (global.io && result.rows[0]) {
      const { emitChannelUpdate } = require('./websocketService');
      emitChannelUpdate(global.io, channelId, result.rows[0]);
    }

    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * Archive channel
 */
async function archiveChannel(agencyDatabase, channelId, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `UPDATE public.message_channels
       SET is_archived = true, archived_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [channelId]
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * Add member to channel
 */
async function addChannelMember(agencyDatabase, channelId, userId, memberUserId, role = 'member') {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `INSERT INTO public.channel_members (id, channel_id, user_id, role, joined_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (channel_id, user_id) DO UPDATE SET role = $4, left_at = NULL
       RETURNING *`,
      [generateUUID(), channelId, memberUserId, role]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}

/**
 * Remove member from channel
 */
async function removeChannelMember(agencyDatabase, channelId, memberUserId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `UPDATE public.channel_members
       SET left_at = NOW()
       WHERE channel_id = $1 AND user_id = $2
       RETURNING *`,
      [channelId, memberUserId]
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * Thread Management
 */

/**
 * Create a new thread
 */
async function createThread(agencyDatabase, threadData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `INSERT INTO public.message_threads (
        id, channel_id, title, parent_message_id, agency_id, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *`,
      [
        generateUUID(),
        threadData.channel_id,
        threadData.title || null,
        threadData.parent_message_id || null,
        threadData.agency_id,
        userId
      ]
    );

    const thread = result.rows[0];

    // Add creator as thread participant
    await client.query(
      `INSERT INTO public.thread_participants (id, thread_id, user_id, joined_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (thread_id, user_id) DO NOTHING`,
      [generateUUID(), thread.id, userId]
    );

    // Emit WebSocket event for new thread
    if (global.io) {
      const { emitNewThread } = require('./websocketService');
      emitNewThread(global.io, threadData.channel_id, thread);
    }

    return thread;
  } finally {
    client.release();
  }
}

/**
 * Get threads for a channel
 */
async function getThreads(agencyDatabase, channelId, userId, limit = 50, offset = 0) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `SELECT t.*,
        (SELECT COUNT(*) FROM public.messages m WHERE m.thread_id = t.id AND m.is_deleted = false) as message_count,
        (SELECT unread_count FROM public.thread_participants tp WHERE tp.thread_id = t.id AND tp.user_id = $2) as unread_count,
        (SELECT content FROM public.messages m WHERE m.thread_id = t.id AND m.is_deleted = false ORDER BY m.created_at DESC LIMIT 1) as last_message_content,
        (SELECT created_at FROM public.messages m WHERE m.thread_id = t.id AND m.is_deleted = false ORDER BY m.created_at DESC LIMIT 1) as last_message_at
       FROM public.message_threads t
       WHERE t.channel_id = $1 AND t.is_archived = false
       ORDER BY t.last_message_at DESC NULLS LAST, t.created_at DESC
       LIMIT $3 OFFSET $4`,
      [channelId, userId, limit, offset]
    );
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Get thread by ID
 */
async function getThreadById(agencyDatabase, threadId, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `SELECT t.*,
        (SELECT unread_count FROM public.thread_participants tp WHERE tp.thread_id = t.id AND tp.user_id = $2) as unread_count
       FROM public.message_threads t
       WHERE t.id = $1`,
      [threadId, userId]
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * Message Management
 */

/**
 * Create a new message
 */
async function createMessage(agencyDatabase, messageData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    await client.query('BEGIN');

    // Insert message
    const messageResult = await client.query(
      `INSERT INTO public.messages (
        id, thread_id, sender_id, content, message_type, parent_message_id, metadata, agency_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *`,
      [
        generateUUID(),
        messageData.thread_id,
        userId,
        messageData.content,
        messageData.message_type || 'text',
        messageData.parent_message_id || null,
        JSON.stringify(messageData.metadata || {}),
        messageData.agency_id
      ]
    );

    const message = messageResult.rows[0];

    // Add sender as thread participant if not already
    await client.query(
      `INSERT INTO public.thread_participants (id, thread_id, user_id, joined_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (thread_id, user_id) DO NOTHING`,
      [generateUUID(), messageData.thread_id, userId]
    );

    // Process mentions
    if (messageData.mentions && Array.isArray(messageData.mentions)) {
      for (const mention of messageData.mentions) {
        await client.query(
          `INSERT INTO public.message_mentions (id, message_id, mentioned_user_id, mention_type, created_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT DO NOTHING`,
          [generateUUID(), message.id, mention.user_id, mention.type || 'user']
        );
      }
    }

    // Mark message as read by sender
    await client.query(
      `INSERT INTO public.message_reads (id, message_id, user_id, read_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (message_id, user_id) DO NOTHING`,
      [generateUUID(), message.id, userId]
    );

    // Update thread participant's last_read
    await client.query(
      `UPDATE public.thread_participants
       SET last_read_at = NOW(), last_read_message_id = $1, unread_count = 0
       WHERE thread_id = $2 AND user_id = $3`,
      [message.id, messageData.thread_id, userId]
    );

    await client.query('COMMIT');
    
    // Fetch complete message with all relations for WebSocket
    const completeMessage = await client.query(
      `SELECT m.*,
        u.email as sender_email,
        p.full_name as sender_name,
        p.avatar_url as sender_avatar
       FROM public.messages m
       LEFT JOIN public.users u ON m.sender_id = u.id
       LEFT JOIN public.profiles p ON u.id = p.user_id
       WHERE m.id = $1`,
      [message.id]
    );
    
    const messageWithRelations = completeMessage.rows[0] || message;
    
    // Emit WebSocket event for new message
    if (global.io) {
      const { emitNewMessage } = require('./websocketService');
      emitNewMessage(global.io, messageData.thread_id, messageWithRelations);
    }

    // Sync to Slack if integration is active (async, don't wait)
    try {
      const slackService = require('./slackIntegrationService');
      // Get channel ID from thread
      const threadResult = await client.query(
        'SELECT channel_id FROM public.message_threads WHERE id = $1',
        [messageData.thread_id]
      );
      if (threadResult.rows.length > 0) {
        const channelId = threadResult.rows[0].channel_id;
        // Trigger sync asynchronously (don't block message creation)
        setImmediate(() => {
          slackService.syncMessageToSlack(agencyDatabase, message.id, channelId)
            .catch(err => console.error('[Messaging] Slack sync error:', err.message));
        });
      }
    } catch (error) {
      // Don't fail message creation if Slack sync fails
      console.warn('[Messaging] Failed to trigger Slack sync:', error.message);
    }
    
    return messageWithRelations;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get messages for a thread
 */
async function getMessages(agencyDatabase, threadId, userId, limit = 50, offset = 0) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `SELECT m.*,
        u.email as sender_email,
        p.full_name as sender_name,
        p.avatar_url as sender_avatar,
        (SELECT COUNT(*) FROM public.message_reactions mr WHERE mr.message_id = m.id) as reaction_count,
        (SELECT json_agg(json_build_object('emoji', emoji, 'count', count, 'users', users))
         FROM (
           SELECT emoji, COUNT(*) as count, json_agg(json_build_object('id', user_id, 'name', (SELECT full_name FROM profiles WHERE user_id = message_reactions.user_id))) as users
           FROM public.message_reactions
           WHERE message_id = m.id
           GROUP BY emoji
         ) reactions) as reactions,
        EXISTS(SELECT 1 FROM public.message_reads mr WHERE mr.message_id = m.id AND mr.user_id = $2) as is_read,
        (SELECT json_agg(json_build_object('id', id, 'file_name', file_name, 'file_path', file_path, 'mime_type', mime_type, 'file_size', file_size))
         FROM public.message_attachments
         WHERE message_id = m.id) as attachments
       FROM public.messages m
       LEFT JOIN public.users u ON m.sender_id = u.id
       LEFT JOIN public.profiles p ON u.id = p.user_id
       WHERE m.thread_id = $1 AND m.is_deleted = false
       ORDER BY m.created_at ASC
       LIMIT $3 OFFSET $4`,
      [threadId, userId, limit, offset]
    );
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Update message
 */
async function updateMessage(agencyDatabase, messageId, updates, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    if (updates.content !== undefined) {
      setClause.push(`content = $${paramIndex++}`);
      values.push(updates.content);
      setClause.push(`is_edited = true`);
      setClause.push(`edited_at = NOW()`);
    }
    if (updates.metadata !== undefined) {
      setClause.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(updates.metadata));
    }

    setClause.push(`updated_at = NOW()`);
    values.push(messageId, userId);

    // Get thread_id before updating
    const messageCheck = await client.query(
      'SELECT thread_id FROM public.messages WHERE id = $1',
      [messageId]
    );

    const result = await client.query(
      `UPDATE public.messages
       SET ${setClause.join(', ')}
       WHERE id = $${paramIndex} AND sender_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    // Emit WebSocket event for message update
    if (global.io && result.rows[0] && messageCheck.rows.length > 0) {
      const { emitMessageUpdate } = require('./websocketService');
      emitMessageUpdate(global.io, messageCheck.rows[0].thread_id, result.rows[0]);
    }

    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * Delete message (soft delete)
 */
async function deleteMessage(agencyDatabase, messageId, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    // Get thread_id before deleting
    const messageCheck = await client.query(
      'SELECT thread_id FROM public.messages WHERE id = $1',
      [messageId]
    );
    
    const result = await client.query(
      `UPDATE public.messages
       SET is_deleted = true, deleted_at = NOW(), deleted_by = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [messageId, userId]
    );
    
    // Emit WebSocket event for message deletion
    if (global.io && messageCheck.rows.length > 0) {
      const { emitMessageDelete } = require('./websocketService');
      emitMessageDelete(global.io, messageCheck.rows[0].thread_id, messageId);
    }
    
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * Reaction Management
 */

/**
 * Add reaction to message
 */
async function addReaction(agencyDatabase, messageId, userId, emoji) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    // Get thread_id for the message
    const messageCheck = await client.query(
      'SELECT thread_id FROM public.messages WHERE id = $1',
      [messageId]
    );
    
    const result = await client.query(
      `INSERT INTO public.message_reactions (id, message_id, user_id, emoji, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (message_id, user_id, emoji) DO NOTHING
       RETURNING *`,
      [generateUUID(), messageId, userId, emoji]
    );
    
    // Emit WebSocket event for reaction
    if (global.io && result.rows[0] && messageCheck.rows.length > 0) {
      const { emitReactionUpdate } = require('./websocketService');
      emitReactionUpdate(global.io, messageCheck.rows[0].thread_id, {
        message_id: messageId,
        emoji,
        user_id: userId,
        action: 'add'
      });
    }
    
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * Remove reaction from message
 */
async function removeReaction(agencyDatabase, messageId, userId, emoji) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    // Get thread_id for the message
    const messageCheck = await client.query(
      'SELECT thread_id FROM public.messages WHERE id = $1',
      [messageId]
    );
    
    const result = await client.query(
      `DELETE FROM public.message_reactions
       WHERE message_id = $1 AND user_id = $2 AND emoji = $3
       RETURNING *`,
      [messageId, userId, emoji]
    );
    
    // Emit WebSocket event for reaction removal
    if (global.io && result.rows[0] && messageCheck.rows.length > 0) {
      const { emitReactionUpdate } = require('./websocketService');
      emitReactionUpdate(global.io, messageCheck.rows[0].thread_id, {
        message_id: messageId,
        emoji,
        user_id: userId,
        action: 'remove'
      });
    }
    
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * Read Receipt Management
 */

/**
 * Mark message as read
 */
async function markMessageAsRead(agencyDatabase, messageId, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    // Get thread_id from message
    const messageResult = await client.query(
      'SELECT thread_id FROM public.messages WHERE id = $1',
      [messageId]
    );

    if (messageResult.rows.length === 0) {
      return null;
    }

    const threadId = messageResult.rows[0].thread_id;

    await client.query('BEGIN');

    // Insert or update read receipt
    await client.query(
      `INSERT INTO public.message_reads (id, message_id, user_id, read_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (message_id, user_id) DO UPDATE SET read_at = NOW()`,
      [generateUUID(), messageId, userId]
    );

    // Update thread participant's last_read
    await client.query(
      `UPDATE public.thread_participants
       SET last_read_at = NOW(), last_read_message_id = $1, unread_count = 0
       WHERE thread_id = $2 AND user_id = $3`,
      [messageId, threadId, userId]
    );

    await client.query('COMMIT');
    
    const readReceipt = { message_id: messageId, user_id: userId, read_at: new Date() };
    
    // Emit WebSocket event for read receipt
    if (global.io) {
      const { emitReadReceipt } = require('./websocketService');
      emitReadReceipt(global.io, threadId, readReceipt);
    }
    
    return readReceipt;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Search
 */

/**
 * Search messages
 */
async function searchMessages(agencyDatabase, agencyId, userId, query, filters = {}) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    let sql = `
      SELECT DISTINCT m.*,
        t.title as thread_title,
        c.name as channel_name,
        u.email as sender_email,
        p.full_name as sender_name,
        ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', $1)) as rank
      FROM public.messages m
      JOIN public.message_threads t ON m.thread_id = t.id
      JOIN public.message_channels c ON t.channel_id = c.id
      LEFT JOIN public.users u ON m.sender_id = u.id
      LEFT JOIN public.profiles p ON u.id = p.user_id
      WHERE m.agency_id = $2
        AND m.is_deleted = false
        AND to_tsvector('english', m.content) @@ plainto_tsquery('english', $1)
    `;

    const params = [query, agencyId];
    let paramIndex = 3;

    // Apply filters
    if (filters.channel_id) {
      sql += ` AND c.id = $${paramIndex++}`;
      params.push(filters.channel_id);
    }
    if (filters.thread_id) {
      sql += ` AND t.id = $${paramIndex++}`;
      params.push(filters.thread_id);
    }
    if (filters.sender_id) {
      sql += ` AND m.sender_id = $${paramIndex++}`;
      params.push(filters.sender_id);
    }
    if (filters.date_from) {
      sql += ` AND m.created_at >= $${paramIndex++}`;
      params.push(filters.date_from);
    }
    if (filters.date_to) {
      sql += ` AND m.created_at <= $${paramIndex++}`;
      params.push(filters.date_to);
    }

    // Only show messages from channels user has access to
    sql += ` AND (c.channel_type = 'public' OR EXISTS(SELECT 1 FROM public.channel_members cm WHERE cm.channel_id = c.id AND cm.user_id = $${paramIndex}))`;
    params.push(userId);

    sql += ` ORDER BY rank DESC, m.created_at DESC LIMIT $${paramIndex + 1}`;
    params.push(filters.limit || 50);

    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Attachment Management
 */

/**
 * Save attachment metadata
 */
async function saveAttachment(agencyDatabase, messageId, attachmentData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `INSERT INTO public.message_attachments (
        id, message_id, file_name, file_path, file_size, mime_type, file_type, thumbnail_path, uploaded_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *`,
      [
        generateUUID(),
        messageId,
        attachmentData.file_name,
        attachmentData.file_path,
        attachmentData.file_size,
        attachmentData.mime_type,
        attachmentData.file_type || null,
        attachmentData.thumbnail_path || null,
        userId
      ]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}

/**
 * Get attachment by ID
 */
async function getAttachmentById(agencyDatabase, attachmentId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      'SELECT * FROM public.message_attachments WHERE id = $1',
      [attachmentId]
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * Draft Management
 */

/**
 * Save draft
 */
async function saveDraft(agencyDatabase, threadId, userId, content, attachments = []) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `INSERT INTO public.message_drafts (id, thread_id, user_id, content, attachments, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (thread_id, user_id) DO UPDATE
       SET content = $4, attachments = $5, updated_at = NOW()
       RETURNING *`,
      [generateUUID(), threadId, userId, content, JSON.stringify(attachments)]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}

/**
 * Get draft
 */
async function getDraft(agencyDatabase, threadId, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      'SELECT * FROM public.message_drafts WHERE thread_id = $1 AND user_id = $2',
      [threadId, userId]
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * Delete draft
 */
async function deleteDraft(agencyDatabase, threadId, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    await client.query(
      'DELETE FROM public.message_drafts WHERE thread_id = $1 AND user_id = $2',
      [threadId, userId]
    );
    return { success: true };
  } finally {
    client.release();
  }
}

/**
 * Pin Management
 */

/**
 * Pin message
 */
async function pinMessage(agencyDatabase, messageId, channelId, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `INSERT INTO public.message_pins (id, message_id, channel_id, pinned_by, pinned_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (message_id, channel_id) DO NOTHING
       RETURNING *`,
      [generateUUID(), messageId, channelId, userId]
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * Unpin message
 */
async function unpinMessage(agencyDatabase, messageId, channelId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    await client.query(
      'DELETE FROM public.message_pins WHERE message_id = $1 AND channel_id = $2',
      [messageId, channelId]
    );
    return { success: true };
  } finally {
    client.release();
  }
}

/**
 * Get pinned messages for channel
 */
async function getPinnedMessages(agencyDatabase, channelId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `SELECT mp.*, m.*, u.email as sender_email, p.full_name as sender_name
       FROM public.message_pins mp
       JOIN public.messages m ON mp.message_id = m.id
       LEFT JOIN public.users u ON m.sender_id = u.id
       LEFT JOIN public.profiles p ON u.id = p.user_id
       WHERE mp.channel_id = $1
       ORDER BY mp.pinned_at DESC`,
      [channelId]
    );
    return result.rows;
  } finally {
    client.release();
  }
}

module.exports = {
  // Channels
  createChannel,
  getChannels,
  getChannelById,
  updateChannel,
  archiveChannel,
  addChannelMember,
  removeChannelMember,
  
  // Threads
  createThread,
  getThreads,
  getThreadById,
  
  // Messages
  createMessage,
  getMessages,
  updateMessage,
  deleteMessage,
  
  // Reactions
  addReaction,
  removeReaction,
  
  // Read receipts
  markMessageAsRead,
  
  // Search
  searchMessages,
  
  // Attachments
  saveAttachment,
  getAttachmentById,
  
  // Drafts
  saveDraft,
  getDraft,
  deleteDraft,
  
  // Pins
  pinMessage,
  unpinMessage,
  getPinnedMessages,
};
