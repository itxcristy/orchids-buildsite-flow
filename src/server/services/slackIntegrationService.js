/**
 * Slack Integration Service
 * Handles Slack workspace integration for isolated agencies
 * Provides secure OAuth, message syncing, and channel mapping
 */

const { WebClient } = require('@slack/web-api');
const { InstallProvider } = require('@slack/oauth');
const { getAgencyPool } = require('../config/database');
const { ensureSlackIntegrationSchema } = require('../utils/schema/slackIntegrationSchema');
const crypto = require('crypto');
const messagingService = require('./messagingService');

// Cache for schema initialization status per database
const schemaInitialized = new Set();
const schemaInitializing = new Set();

// Slack OAuth Install Provider (singleton)
let installProvider = null;

/**
 * Get agency database by Slack team ID
 */
async function getAgencyDatabaseBySlackTeamId(teamId) {
  // Search across all agency databases
  const { pool } = require('../config/database');
  const client = await pool.connect();
  try {
    // Get all agencies
    const agenciesResult = await client.query(
      'SELECT database_name FROM public.agencies WHERE is_active = true AND database_name IS NOT NULL'
    );
    
    for (const agency of agenciesResult.rows) {
      const agencyDb = agency.database_name;
      const agencyClient = await getAgencyConnection(agencyDb);
      try {
        const result = await agencyClient.query(
          'SELECT id FROM public.slack_integrations WHERE team_id = $1 AND is_active = true',
          [teamId]
        );
        if (result.rows.length > 0) {
          return agencyDb;
        }
      } catch (error) {
        // Continue searching
      } finally {
        agencyClient.release();
      }
    }
    return null;
  } finally {
    client.release();
  }
}

/**
 * Initialize Slack OAuth Install Provider
 */
function getInstallProvider() {
  if (!installProvider) {
    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;
    const stateSecret = process.env.SLACK_STATE_SECRET || crypto.randomBytes(32).toString('hex');
    const redirectUri = process.env.SLACK_REDIRECT_URI || `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/slack/oauth/callback`;

    if (!clientId || !clientSecret) {
      throw new Error('SLACK_CLIENT_ID and SLACK_CLIENT_SECRET must be set in environment variables');
    }

    installProvider = new InstallProvider({
      clientId,
      clientSecret,
      stateSecret,
      installationStore: {
        storeInstallation: async (installation) => {
          // Store installation in database (handled in OAuth callback)
          return installation;
        },
        fetchInstallation: async (installQuery) => {
          // Fetch from database
          const agencyDatabase = installQuery.teamId ? await getAgencyDatabaseBySlackTeamId(installQuery.teamId) : null;
          if (!agencyDatabase) {
            throw new Error('Installation not found');
          }
          const client = await getAgencyConnection(agencyDatabase);
          try {
            const result = await client.query(
              'SELECT * FROM public.slack_integrations WHERE team_id = $1 AND is_active = true',
              [installQuery.teamId]
            );
            if (result.rows.length === 0) {
              throw new Error('Installation not found');
            }
            const integration = result.rows[0];
            return {
              team: {
                id: integration.team_id,
                name: integration.workspace_name,
              },
              bot: {
                token: integration.bot_token,
                id: integration.bot_user_id,
                scopes: integration.bot_scopes || [],
              },
              user: {
                token: integration.access_token,
              },
            };
          } finally {
            client.release();
          }
        },
        deleteInstallation: async (installQuery) => {
          // Delete from database
          const agencyDatabase = installQuery.teamId ? await getAgencyDatabaseBySlackTeamId(installQuery.teamId) : null;
          if (agencyDatabase) {
            const client = await getAgencyConnection(agencyDatabase);
            try {
              await client.query(
                'UPDATE public.slack_integrations SET is_active = false WHERE team_id = $1',
                [installQuery.teamId]
              );
            } finally {
              client.release();
            }
          }
        },
      },
    });
  }
  return installProvider;
}

/**
 * Get agency database connection
 */
async function getAgencyConnection(agencyDatabase) {
  const pool = getAgencyPool(agencyDatabase);
  const client = await pool.connect();
  
  // Ensure Slack integration schema exists
  const dbKey = agencyDatabase || 'main';
  if (!schemaInitialized.has(dbKey) && !schemaInitializing.has(dbKey)) {
    schemaInitializing.add(dbKey);
    try {
      console.log(`[Slack] Ensuring Slack integration schema for database: ${dbKey}`);
      await ensureSlackIntegrationSchema(client);
      console.log(`[Slack] ✅ Schema ensured for database: ${dbKey}`);
      schemaInitialized.add(dbKey);
    } catch (error) {
      console.error(`[Slack] Error ensuring schema for ${dbKey}:`, error.message);
    } finally {
      schemaInitializing.delete(dbKey);
    }
  }
  
  return client;
}

/**
 * Get agency database by Slack team ID
 */
async function getAgencyDatabaseBySlackTeamId(teamId) {
  // Search across all agency databases
  const { pool } = require('../config/database');
  const client = await pool.connect();
  try {
    // Get all agencies
    const agenciesResult = await client.query(
      'SELECT database_name FROM public.agencies WHERE is_active = true AND database_name IS NOT NULL'
    );
    
    for (const agency of agenciesResult.rows) {
      const agencyDb = agency.database_name;
      const agencyClient = await getAgencyConnection(agencyDb);
      try {
        const result = await agencyClient.query(
          'SELECT id FROM public.slack_integrations WHERE team_id = $1 AND is_active = true',
          [teamId]
        );
        if (result.rows.length > 0) {
          return agencyDb;
        }
      } catch (error) {
        // Continue searching
      } finally {
        agencyClient.release();
      }
    }
    return null;
  } finally {
    client.release();
  }
}

/**
 * Get active Slack integration for an agency
 */
async function getActiveIntegration(agencyDatabase) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      'SELECT * FROM public.slack_integrations WHERE is_active = true ORDER BY created_at DESC LIMIT 1'
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * Save Slack installation to database
 */
async function saveInstallation(agencyDatabase, installation, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const team = installation.team;
    const bot = installation.bot;
    const user = installation.user;

    // Check if integration already exists
    const existingResult = await client.query(
      'SELECT id FROM public.slack_integrations WHERE team_id = $1',
      [team.id]
    );

    if (existingResult.rows.length > 0) {
      // Update existing integration
      await client.query(
        `UPDATE public.slack_integrations 
         SET workspace_id = $1, workspace_name = $2, bot_token = $3, bot_user_id = $4, 
             bot_scopes = $5, access_token = $6, updated_at = NOW(), is_active = true
         WHERE team_id = $7`,
        [
          team.id,
          team.name,
          bot.token,
          bot.id,
          bot.scopes || [],
          user?.token || null,
          team.id
        ]
      );
      return existingResult.rows[0].id;
    } else {
      // Insert new integration
      const result = await client.query(
        `INSERT INTO public.slack_integrations (
          id, workspace_id, workspace_name, team_id, bot_token, bot_user_id, 
          bot_scopes, access_token, created_by, created_at, updated_at, is_active
        ) VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW(), true)
        RETURNING id`,
        [
          team.id,
          team.name,
          team.id,
          bot.token,
          bot.id,
          bot.scopes || [],
          user?.token || null,
          userId
        ]
      );
      return result.rows[0].id;
    }
  } finally {
    client.release();
  }
}

/**
 * Get Slack WebClient for an agency
 */
async function getSlackClient(agencyDatabase) {
  const integration = await getActiveIntegration(agencyDatabase);
  if (!integration) {
    throw new Error('No active Slack integration found for this agency');
  }
  return new WebClient(integration.bot_token);
}

/**
 * Sync internal message to Slack
 */
async function syncMessageToSlack(agencyDatabase, messageId, channelId) {
  try {
    const integration = await getActiveIntegration(agencyDatabase);
    if (!integration || !integration.sync_enabled || integration.sync_direction === 'from_slack') {
      return;
    }

    const client = await getAgencyConnection(agencyDatabase);
    try {
      // Get message details
      const messageResult = await client.query(
        `SELECT m.*, u.email, p.first_name, p.last_name 
         FROM public.messages m
         JOIN public.users u ON m.sender_id = u.id
         LEFT JOIN public.profiles p ON u.id = p.user_id
         WHERE m.id = $1`,
        [messageId]
      );

      if (messageResult.rows.length === 0) {
        return;
      }

      const message = messageResult.rows[0];
      
      // Get channel mapping
      const mappingResult = await client.query(
        `SELECT slack_channel_id FROM public.slack_channel_mappings 
         WHERE internal_channel_id = $1 AND integration_id = $2 AND is_active = true AND sync_enabled = true`,
        [channelId, integration.id]
      );

      if (mappingResult.rows.length === 0) {
        // No mapping exists, skip sync
        return;
      }

      const slackChannelId = mappingResult.rows[0].slack_channel_id;
      const slackClient = new WebClient(integration.bot_token);

      // Format message content
      const senderName = message.first_name && message.last_name 
        ? `${message.first_name} ${message.last_name}` 
        : message.email || 'Unknown User';
      
      const messageText = `*${senderName}*: ${message.content}`;

      // Send to Slack
      const slackResponse = await slackClient.chat.postMessage({
        channel: slackChannelId,
        text: messageText,
        username: 'BuildFlow',
        icon_emoji: ':building_construction:',
      });

      // Record sync
      await client.query(
        `INSERT INTO public.slack_message_sync (
          id, integration_id, internal_message_id, slack_message_ts, 
          slack_channel_id, sync_direction, synced_at
        ) VALUES (uuid_generate_v4(), $1, $2, $3, $4, 'to_slack', NOW())
        ON CONFLICT (integration_id, internal_message_id) DO NOTHING`,
        [
          integration.id,
          messageId,
          slackResponse.ts,
          slackChannelId
        ]
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Slack] Error syncing message to Slack:', error.message);
    // Don't throw - message sync failures shouldn't break the main flow
  }
}

/**
 * Sync Slack message to internal system
 */
async function syncMessageFromSlack(agencyDatabase, slackEvent) {
  try {
    const integration = await getActiveIntegration(agencyDatabase);
    if (!integration || !integration.sync_enabled || integration.sync_direction === 'to_slack') {
      return;
    }

    // Ignore bot messages to prevent loops
    if (slackEvent.bot_id || slackEvent.subtype === 'bot_message') {
      return;
    }

    const client = await getAgencyConnection(agencyDatabase);
    try {
      // Get channel mapping
      const mappingResult = await client.query(
        `SELECT internal_channel_id FROM public.slack_channel_mappings 
         WHERE slack_channel_id = $1 AND integration_id = $2 AND is_active = true AND sync_enabled = true`,
        [slackEvent.channel, integration.id]
      );

      if (mappingResult.rows.length === 0) {
        return;
      }

      const internalChannelId = mappingResult.rows[0].internal_channel_id;

      // Get or create user mapping
      const userMappingResult = await client.query(
        `SELECT internal_user_id FROM public.slack_user_mappings 
         WHERE slack_user_id = $1 AND integration_id = $2 AND is_active = true`,
        [slackEvent.user, integration.id]
      );

      let internalUserId;
      if (userMappingResult.rows.length > 0) {
        internalUserId = userMappingResult.rows[0].internal_user_id;
      } else {
        // Create a system user or use a default
        // For now, we'll skip messages from unmapped users
        console.warn(`[Slack] No user mapping found for Slack user ${slackEvent.user}`);
        return;
      }

      // Get thread for channel (or create default thread)
      const threadResult = await client.query(
        `SELECT id FROM public.message_threads 
         WHERE channel_id = $1 ORDER BY created_at ASC LIMIT 1`,
        [internalChannelId]
      );

      let threadId;
      if (threadResult.rows.length > 0) {
        threadId = threadResult.rows[0].id;
      } else {
        // Create default thread
        const newThreadResult = await client.query(
          `INSERT INTO public.message_threads (
            id, channel_id, title, agency_id, created_by, created_at, updated_at
          ) VALUES (uuid_generate_v4(), $1, 'General', $2, $3, NOW(), NOW())
          RETURNING id`,
          [internalChannelId, integration.workspace_id, internalUserId]
        );
        threadId = newThreadResult.rows[0].id;
      }

      // Check if message already synced
      const syncCheck = await client.query(
        `SELECT id FROM public.slack_message_sync 
         WHERE integration_id = $1 AND slack_message_ts = $2 AND slack_channel_id = $3`,
        [integration.id, slackEvent.ts, slackEvent.channel]
      );

      if (syncCheck.rows.length > 0) {
        return; // Already synced
      }

      // Create internal message
      const messageResult = await client.query(
        `INSERT INTO public.messages (
          id, thread_id, sender_id, content, message_type, agency_id, created_at, updated_at
        ) VALUES (uuid_generate_v4(), $1, $2, $3, 'text', $4, NOW(), NOW())
        RETURNING id`,
        [threadId, internalUserId, slackEvent.text, integration.workspace_id]
      );

      const messageId = messageResult.rows[0].id;

      // Record sync
      await client.query(
        `INSERT INTO public.slack_message_sync (
          id, integration_id, internal_message_id, slack_message_ts, 
          slack_channel_id, sync_direction, synced_at
        ) VALUES (uuid_generate_v4(), $1, $2, $3, $4, 'from_slack', NOW())`,
        [integration.id, messageId, slackEvent.ts, slackEvent.channel]
      );

      // Emit WebSocket event
      if (global.io) {
        const { emitMessageUpdate } = require('./websocketService');
        emitMessageUpdate(global.io, threadId, {
          id: messageId,
          thread_id: threadId,
          sender_id: internalUserId,
          content: slackEvent.text,
          created_at: new Date(),
        });
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Slack] Error syncing message from Slack:', error.message);
  }
}

/**
 * Map internal channel to Slack channel
 */
async function mapChannel(agencyDatabase, internalChannelId, slackChannelId, slackChannelName) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const integration = await getActiveIntegration(agencyDatabase);
    if (!integration) {
      throw new Error('No active Slack integration found');
    }

    const result = await client.query(
      `INSERT INTO public.slack_channel_mappings (
        id, integration_id, internal_channel_id, slack_channel_id, 
        slack_channel_name, is_active, sync_enabled, created_at, updated_at
      ) VALUES (uuid_generate_v4(), $1, $2, $3, $4, true, true, NOW(), NOW())
      ON CONFLICT (integration_id, internal_channel_id) 
      DO UPDATE SET slack_channel_id = $3, slack_channel_name = $4, updated_at = NOW()
      RETURNING *`,
      [integration.id, internalChannelId, slackChannelId, slackChannelName]
    );

    return result.rows[0];
  } finally {
    client.release();
  }
}

/**
 * Get Slack channels for an agency
 */
async function getSlackChannels(agencyDatabase) {
  const slackClient = await getSlackClient(agencyDatabase);
  const response = await slackClient.conversations.list({
    types: 'public_channel,private_channel',
    exclude_archived: true,
  });

  return response.channels || [];
}

/**
 * Disconnect Slack integration
 */
async function disconnectIntegration(agencyDatabase) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    await client.query(
      'UPDATE public.slack_integrations SET is_active = false, updated_at = NOW() WHERE is_active = true'
    );
  } finally {
    client.release();
  }
}

module.exports = {
  getInstallProvider,
  getAgencyConnection,
  getActiveIntegration,
  saveInstallation,
  getSlackClient,
  syncMessageToSlack,
  syncMessageFromSlack,
  mapChannel,
  getSlackChannels,
  disconnectIntegration,
  getAgencyDatabaseBySlackTeamId,
};

