/**
 * Messaging Schema
 * 
 * Manages:
 * - message_channels: Channel/workspace containers (public, private, direct)
 * - message_threads: Conversation threads within channels
 * - messages: Individual messages with content, metadata
 * - thread_participants: User participation tracking
 * - message_reactions: Emoji reactions on messages
 * - message_mentions: @mention tracking
 * - message_attachments: File attachments
 * - message_reads: Read receipt tracking
 * - channel_members: Channel membership and permissions
 * - message_thread_replies: Threaded replies to messages
 * - message_drafts: Draft message storage
 * - message_pins: Pinned messages in channels
 * 
 * Dependencies:
 * - users (for user_id references)
 * - profiles (for user information)
 * - agencies (for agency_id references)
 * - Requires update_updated_at_column() function (from sharedFunctions)
 */

/**
 * Ensure message_channels table exists
 */
async function ensureMessageChannelsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.message_channels (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      description TEXT,
      channel_type TEXT NOT NULL DEFAULT 'public' CHECK (channel_type IN ('public', 'private', 'direct')),
      agency_id UUID NOT NULL,
      created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      is_archived BOOLEAN NOT NULL DEFAULT false,
      is_pinned BOOLEAN NOT NULL DEFAULT false,
      settings JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      archived_at TIMESTAMP WITH TIME ZONE
    );
  `);

  // Create indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_message_channels_agency_id ON public.message_channels(agency_id);
    CREATE INDEX IF NOT EXISTS idx_message_channels_channel_type ON public.message_channels(channel_type);
    CREATE INDEX IF NOT EXISTS idx_message_channels_is_archived ON public.message_channels(is_archived);
    CREATE INDEX IF NOT EXISTS idx_message_channels_created_by ON public.message_channels(created_by);
    CREATE INDEX IF NOT EXISTS idx_message_channels_name ON public.message_channels(name);
  `);

  // Create updated_at trigger
  await client.query(`
    DROP TRIGGER IF EXISTS update_message_channels_updated_at ON public.message_channels;
    CREATE TRIGGER update_message_channels_updated_at
      BEFORE UPDATE ON public.message_channels
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  `);
}

/**
 * Ensure message_threads table exists
 */
async function ensureMessageThreadsTable(client) {
  // Check if old table structure exists and drop it if needed
  const oldTableCheck = await client.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'message_threads' 
    AND column_name IN ('thread_type', 'participants')
  `);
  
  if (oldTableCheck.rows.length > 0) {
    console.log('[SQL] Old message_threads table structure detected, dropping and recreating...');
    await client.query('DROP TABLE IF EXISTS public.message_threads CASCADE');
  }
  
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.message_threads (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      channel_id UUID NOT NULL REFERENCES public.message_channels(id) ON DELETE CASCADE,
      title TEXT,
      parent_message_id UUID,
      agency_id UUID NOT NULL,
      created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      last_message_at TIMESTAMP WITH TIME ZONE,
      message_count INTEGER NOT NULL DEFAULT 0,
      is_pinned BOOLEAN NOT NULL DEFAULT false,
      is_archived BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  // Create indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_message_threads_channel_id ON public.message_threads(channel_id);
    CREATE INDEX IF NOT EXISTS idx_message_threads_agency_id ON public.message_threads(agency_id);
    CREATE INDEX IF NOT EXISTS idx_message_threads_created_by ON public.message_threads(created_by);
    CREATE INDEX IF NOT EXISTS idx_message_threads_last_message_at ON public.message_threads(last_message_at DESC);
    CREATE INDEX IF NOT EXISTS idx_message_threads_parent_message_id ON public.message_threads(parent_message_id);
    CREATE INDEX IF NOT EXISTS idx_message_threads_is_archived ON public.message_threads(is_archived);
  `);

  // Create updated_at trigger
  await client.query(`
    DROP TRIGGER IF EXISTS update_message_threads_updated_at ON public.message_threads;
    CREATE TRIGGER update_message_threads_updated_at
      BEFORE UPDATE ON public.message_threads
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  `);
}

/**
 * Ensure messages table exists
 */
async function ensureMessagesTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.messages (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      thread_id UUID NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
      sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system', 'reply')),
      parent_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
      is_edited BOOLEAN NOT NULL DEFAULT false,
      edited_at TIMESTAMP WITH TIME ZONE,
      is_deleted BOOLEAN NOT NULL DEFAULT false,
      deleted_at TIMESTAMP WITH TIME ZONE,
      deleted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
      metadata JSONB DEFAULT '{}'::jsonb,
      agency_id UUID NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  // Create indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON public.messages(thread_id);
    CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
    CREATE INDEX IF NOT EXISTS idx_messages_agency_id ON public.messages(agency_id);
    CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_parent_message_id ON public.messages(parent_message_id);
    CREATE INDEX IF NOT EXISTS idx_messages_is_deleted ON public.messages(is_deleted);
    CREATE INDEX IF NOT EXISTS idx_messages_message_type ON public.messages(message_type);
  `);

  // Create full-text search index
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_messages_content_search ON public.messages USING gin(to_tsvector('english', content));
  `);

  // Create updated_at trigger
  await client.query(`
    DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
    CREATE TRIGGER update_messages_updated_at
      BEFORE UPDATE ON public.messages
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  `);
}

/**
 * Ensure thread_participants table exists
 */
async function ensureThreadParticipantsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.thread_participants (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      thread_id UUID NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      last_read_at TIMESTAMP WITH TIME ZONE,
      last_read_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
      unread_count INTEGER NOT NULL DEFAULT 0,
      is_muted BOOLEAN NOT NULL DEFAULT false,
      joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      left_at TIMESTAMP WITH TIME ZONE,
      UNIQUE(thread_id, user_id)
    );
  `);

  // Create indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_thread_participants_thread_id ON public.thread_participants(thread_id);
    CREATE INDEX IF NOT EXISTS idx_thread_participants_user_id ON public.thread_participants(user_id);
    CREATE INDEX IF NOT EXISTS idx_thread_participants_unread_count ON public.thread_participants(unread_count);
  `);
}

/**
 * Ensure channel_members table exists
 */
async function ensureChannelMembersTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.channel_members (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      channel_id UUID NOT NULL REFERENCES public.message_channels(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
      is_muted BOOLEAN NOT NULL DEFAULT false,
      notification_preferences JSONB DEFAULT '{"mentions": true, "all": true}'::jsonb,
      joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      left_at TIMESTAMP WITH TIME ZONE,
      UNIQUE(channel_id, user_id)
    );
  `);

  // Create indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_channel_members_channel_id ON public.channel_members(channel_id);
    CREATE INDEX IF NOT EXISTS idx_channel_members_user_id ON public.channel_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_channel_members_role ON public.channel_members(role);
  `);
}

/**
 * Ensure message_reactions table exists
 */
async function ensureMessageReactionsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.message_reactions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      emoji TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      UNIQUE(message_id, user_id, emoji)
    );
  `);

  // Create indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON public.message_reactions(message_id);
    CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON public.message_reactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_message_reactions_emoji ON public.message_reactions(emoji);
  `);
}

/**
 * Ensure message_mentions table exists
 */
async function ensureMessageMentionsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.message_mentions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
      mentioned_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      mention_type TEXT NOT NULL DEFAULT 'user' CHECK (mention_type IN ('user', 'channel', 'here', 'everyone')),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  // Create indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_message_mentions_message_id ON public.message_mentions(message_id);
    CREATE INDEX IF NOT EXISTS idx_message_mentions_mentioned_user_id ON public.message_mentions(mentioned_user_id);
    CREATE INDEX IF NOT EXISTS idx_message_mentions_mention_type ON public.message_mentions(mention_type);
  `);
}

/**
 * Ensure message_attachments table exists
 */
async function ensureMessageAttachmentsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.message_attachments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size BIGINT NOT NULL,
      mime_type TEXT NOT NULL,
      file_type TEXT,
      thumbnail_path TEXT,
      uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  // Create indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON public.message_attachments(message_id);
    CREATE INDEX IF NOT EXISTS idx_message_attachments_uploaded_by ON public.message_attachments(uploaded_by);
    CREATE INDEX IF NOT EXISTS idx_message_attachments_file_type ON public.message_attachments(file_type);
  `);
}

/**
 * Ensure message_reads table exists
 */
async function ensureMessageReadsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.message_reads (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      UNIQUE(message_id, user_id)
    );
  `);

  // Create indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_message_reads_message_id ON public.message_reads(message_id);
    CREATE INDEX IF NOT EXISTS idx_message_reads_user_id ON public.message_reads(user_id);
    CREATE INDEX IF NOT EXISTS idx_message_reads_read_at ON public.message_reads(read_at);
  `);
}

/**
 * Ensure message_drafts table exists
 */
async function ensureMessageDraftsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.message_drafts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      thread_id UUID REFERENCES public.message_threads(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      attachments JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      UNIQUE(thread_id, user_id)
    );
  `);

  // Create indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_message_drafts_thread_id ON public.message_drafts(thread_id);
    CREATE INDEX IF NOT EXISTS idx_message_drafts_user_id ON public.message_drafts(user_id);
  `);

  // Create updated_at trigger
  await client.query(`
    DROP TRIGGER IF EXISTS update_message_drafts_updated_at ON public.message_drafts;
    CREATE TRIGGER update_message_drafts_updated_at
      BEFORE UPDATE ON public.message_drafts
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  `);
}

/**
 * Ensure message_pins table exists
 */
async function ensureMessagePinsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.message_pins (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
      channel_id UUID NOT NULL REFERENCES public.message_channels(id) ON DELETE CASCADE,
      pinned_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      pinned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      UNIQUE(message_id, channel_id)
    );
  `);

  // Create indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_message_pins_message_id ON public.message_pins(message_id);
    CREATE INDEX IF NOT EXISTS idx_message_pins_channel_id ON public.message_pins(channel_id);
    CREATE INDEX IF NOT EXISTS idx_message_pins_pinned_at ON public.message_pins(pinned_at DESC);
  `);
}

/**
 * Create database functions for messaging
 */
async function ensureMessagingFunctions(client) {
  // Function to update thread's last_message_at and message_count
  await client.query(`
    CREATE OR REPLACE FUNCTION public.update_thread_message_stats()
    RETURNS TRIGGER AS $$
    BEGIN
      IF TG_OP = 'INSERT' THEN
        UPDATE public.message_threads
        SET 
          last_message_at = NEW.created_at,
          message_count = message_count + 1,
          updated_at = NOW()
        WHERE id = NEW.thread_id;
      ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.message_threads
        SET 
          message_count = GREATEST(0, message_count - 1),
          updated_at = NOW()
        WHERE id = OLD.thread_id;
      END IF;
      RETURN COALESCE(NEW, OLD);
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Trigger to update thread stats when messages are inserted/deleted
  await client.query(`
    DROP TRIGGER IF EXISTS trigger_update_thread_message_stats ON public.messages;
    CREATE TRIGGER trigger_update_thread_message_stats
      AFTER INSERT OR DELETE ON public.messages
      FOR EACH ROW
      EXECUTE FUNCTION public.update_thread_message_stats();
  `);

  // Function to increment unread count for thread participants
  await client.query(`
    CREATE OR REPLACE FUNCTION public.increment_thread_unread_count()
    RETURNS TRIGGER AS $$
    BEGIN
      IF TG_OP = 'INSERT' THEN
        UPDATE public.thread_participants
        SET unread_count = unread_count + 1
        WHERE thread_id = NEW.thread_id
          AND user_id != NEW.sender_id
          AND (last_read_at IS NULL OR last_read_at < NEW.created_at);
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Trigger to increment unread count
  await client.query(`
    DROP TRIGGER IF EXISTS trigger_increment_thread_unread_count ON public.messages;
    CREATE TRIGGER trigger_increment_thread_unread_count
      AFTER INSERT ON public.messages
      FOR EACH ROW
      EXECUTE FUNCTION public.increment_thread_unread_count();
  `);
}

/**
 * Ensure all messaging tables
 */
async function ensureMessagingSchema(client) {
  console.log('[SQL] Ensuring messaging schema...');
  
  await ensureMessageChannelsTable(client);
  await ensureMessageThreadsTable(client);
  await ensureMessagesTable(client);
  await ensureThreadParticipantsTable(client);
  await ensureChannelMembersTable(client);
  await ensureMessageReactionsTable(client);
  await ensureMessageMentionsTable(client);
  await ensureMessageAttachmentsTable(client);
  await ensureMessageReadsTable(client);
  await ensureMessageDraftsTable(client);
  await ensureMessagePinsTable(client);
  await ensureMessagingFunctions(client);
  
  console.log('[SQL] ✅ Messaging schema ensured');
}

module.exports = {
  ensureMessagingSchema,
  ensureMessageChannelsTable,
  ensureMessageThreadsTable,
  ensureMessagesTable,
  ensureThreadParticipantsTable,
  ensureChannelMembersTable,
  ensureMessageReactionsTable,
  ensureMessageMentionsTable,
  ensureMessageAttachmentsTable,
  ensureMessageReadsTable,
  ensureMessageDraftsTable,
  ensureMessagePinsTable,
};
