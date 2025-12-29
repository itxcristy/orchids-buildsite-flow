/**
 * Slack Integration Routes
 * Handles Slack workspace integration for isolated agencies
 * Provides OAuth, channel mapping, message syncing, and webhook handling
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireAgencyContext } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');
const slackService = require('../services/slackIntegrationService');
const { createServer } = require('http');
const { createEventAdapter } = require('@slack/events-api');

// Slack Events API adapter
const slackEvents = createEventAdapter(process.env.SLACK_SIGNING_SECRET || '');

/**
 * GET /api/slack/oauth/start
 * Initiate Slack OAuth flow
 */
router.get('/oauth/start', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const agencyDatabase = req.headers['x-agency-database'];

  if (!agencyDatabase) {
    return res.status(400).json({
      success: false,
      error: 'Agency database context required',
      message: 'X-Agency-Database header is required'
    });
  }

  try {
    const installProvider = slackService.getInstallProvider();
    
    // Generate OAuth URL with state containing agency database info
    const state = Buffer.from(JSON.stringify({ 
      agencyDatabase, 
      userId,
      timestamp: Date.now() 
    })).toString('base64');

    const url = await installProvider.generateInstallUrl({
      scopes: [
        'channels:read',
        'channels:write',
        'chat:write',
        'chat:write.public',
        'users:read',
        'users:read.email',
        'groups:read',
        'im:read',
        'im:write',
      ],
      userScopes: ['chat:write'],
      metadata: state,
    });

    res.json({
      success: true,
      data: { url },
      message: 'OAuth URL generated successfully'
    });
  } catch (error) {
    console.error('[Slack] OAuth start error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to initiate Slack OAuth flow'
    });
  }
}));

/**
 * GET /api/slack/oauth/callback
 * Handle Slack OAuth callback
 */
router.get('/oauth/callback', asyncHandler(async (req, res) => {
  const { code, state } = req.query;

  if (!code || !state) {
    return res.status(400).json({
      success: false,
      error: 'Missing code or state parameter',
      message: 'OAuth callback requires code and state parameters'
    });
  }

  try {
    // Decode state to get agency database and user info
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const { agencyDatabase, userId } = stateData;

    if (!agencyDatabase) {
      throw new Error('Agency database not found in OAuth state');
    }

    const installProvider = slackService.getInstallProvider();
    
    // Handle OAuth callback
    const callbackResult = await installProvider.handleCallback(req, res, {
      success: async (installation, installOptions, req, res) => {
        // Save installation to database
        await slackService.saveInstallation(agencyDatabase, installation, userId);

        // Redirect to success page
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}/settings/integrations/slack?success=true`);
      },
      failure: (error, installOptions, req, res) => {
        console.error('[Slack] OAuth callback failure:', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}/settings/integrations/slack?error=${encodeURIComponent(error.message)}`);
      },
    });

    return callbackResult;
  } catch (error) {
    console.error('[Slack] OAuth callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/settings/integrations/slack?error=${encodeURIComponent(error.message)}`);
  }
}));

/**
 * GET /api/slack/integration
 * Get current Slack integration status
 */
router.get('/integration', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.headers['x-agency-database'];

  if (!agencyDatabase) {
    return res.status(400).json({
      success: false,
      error: 'Agency database context required',
      message: 'X-Agency-Database header is required'
    });
  }

  try {
    const integration = await slackService.getActiveIntegration(agencyDatabase);
    
    if (!integration) {
      return res.json({
        success: true,
        data: null,
        message: 'No active Slack integration found'
      });
    }

    // Don't expose sensitive tokens
    const safeIntegration = {
      id: integration.id,
      workspace_id: integration.workspace_id,
      workspace_name: integration.workspace_name,
      team_id: integration.team_id,
      bot_user_id: integration.bot_user_id,
      bot_scopes: integration.bot_scopes,
      is_active: integration.is_active,
      sync_enabled: integration.sync_enabled,
      sync_direction: integration.sync_direction,
      created_at: integration.created_at,
      updated_at: integration.updated_at,
      last_sync_at: integration.last_sync_at,
      settings: integration.settings,
    };

    res.json({
      success: true,
      data: safeIntegration,
      message: 'Slack integration retrieved successfully'
    });
  } catch (error) {
    console.error('[Slack] Get integration error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to retrieve Slack integration'
    });
  }
}));

/**
 * DELETE /api/slack/integration
 * Disconnect Slack integration
 */
router.delete('/integration', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.headers['x-agency-database'];

  if (!agencyDatabase) {
    return res.status(400).json({
      success: false,
      error: 'Agency database context required',
      message: 'X-Agency-Database header is required'
    });
  }

  try {
    await slackService.disconnectIntegration(agencyDatabase);

    res.json({
      success: true,
      message: 'Slack integration disconnected successfully'
    });
  } catch (error) {
    console.error('[Slack] Disconnect integration error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to disconnect Slack integration'
    });
  }
}));

/**
 * GET /api/slack/channels
 * Get available Slack channels
 */
router.get('/channels', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.headers['x-agency-database'];

  if (!agencyDatabase) {
    return res.status(400).json({
      success: false,
      error: 'Agency database context required',
      message: 'X-Agency-Database header is required'
    });
  }

  try {
    const channels = await slackService.getSlackChannels(agencyDatabase);

    res.json({
      success: true,
      data: channels,
      message: 'Slack channels retrieved successfully'
    });
  } catch (error) {
    console.error('[Slack] Get channels error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to retrieve Slack channels'
    });
  }
}));

/**
 * POST /api/slack/channels/map
 * Map internal channel to Slack channel
 */
router.post('/channels/map', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.headers['x-agency-database'];
  const { internal_channel_id, slack_channel_id, slack_channel_name } = req.body;

  if (!agencyDatabase) {
    return res.status(400).json({
      success: false,
      error: 'Agency database context required',
      message: 'X-Agency-Database header is required'
    });
  }

  if (!internal_channel_id || !slack_channel_id || !slack_channel_name) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      message: 'internal_channel_id, slack_channel_id, and slack_channel_name are required'
    });
  }

  try {
    const mapping = await slackService.mapChannel(
      agencyDatabase,
      internal_channel_id,
      slack_channel_id,
      slack_channel_name
    );

    res.json({
      success: true,
      data: mapping,
      message: 'Channel mapped successfully'
    });
  } catch (error) {
    console.error('[Slack] Map channel error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to map channel'
    });
  }
}));

/**
 * GET /api/slack/channels/mappings
 * Get all channel mappings
 */
router.get('/channels/mappings', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.headers['x-agency-database'];

  if (!agencyDatabase) {
    return res.status(400).json({
      success: false,
      error: 'Agency database context required',
      message: 'X-Agency-Database header is required'
    });
  }

  try {
    const client = await slackService.getAgencyConnection(agencyDatabase);
    try {
      const integration = await slackService.getActiveIntegration(agencyDatabase);
      if (!integration) {
        return res.json({
          success: true,
          data: [],
          message: 'No active integration found'
        });
      }

      const result = await client.query(
        `SELECT 
          scm.*,
          mc.name as internal_channel_name
         FROM public.slack_channel_mappings scm
         JOIN public.message_channels mc ON scm.internal_channel_id = mc.id
         WHERE scm.integration_id = $1 AND scm.is_active = true
         ORDER BY scm.created_at DESC`,
        [integration.id]
      );

      res.json({
        success: true,
        data: result.rows,
        message: 'Channel mappings retrieved successfully'
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Slack] Get mappings error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to retrieve channel mappings'
    });
  }
}));

/**
 * POST /api/slack/sync/settings
 * Update sync settings
 */
router.post('/sync/settings', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.headers['x-agency-database'];
  const { sync_enabled, sync_direction } = req.body;

  if (!agencyDatabase) {
    return res.status(400).json({
      success: false,
      error: 'Agency database context required',
      message: 'X-Agency-Database header is required'
    });
  }

  try {
    const client = await slackService.getAgencyConnection(agencyDatabase);
    try {
      const integration = await slackService.getActiveIntegration(agencyDatabase);
      if (!integration) {
        return res.status(404).json({
          success: false,
          error: 'No active integration found',
          message: 'Please connect a Slack workspace first'
        });
      }

      const updates = {};
      if (sync_enabled !== undefined) updates.sync_enabled = sync_enabled;
      if (sync_direction !== undefined) {
        if (!['bidirectional', 'to_slack', 'from_slack', 'disabled'].includes(sync_direction)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid sync_direction',
            message: 'sync_direction must be one of: bidirectional, to_slack, from_slack, disabled'
          });
        }
        updates.sync_direction = sync_direction;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No updates provided',
          message: 'Please provide sync_enabled or sync_direction'
        });
      }

      await client.query(
        `UPDATE public.slack_integrations 
         SET ${Object.keys(updates).map((key, i) => `${key} = $${i + 2}`).join(', ')}, updated_at = NOW()
         WHERE id = $1`,
        [integration.id, ...Object.values(updates)]
      );

      res.json({
        success: true,
        message: 'Sync settings updated successfully'
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Slack] Update sync settings error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to update sync settings'
    });
  }
}));

/**
 * POST /api/slack/webhook
 * Handle Slack Events API webhook
 */
router.post('/webhook', slackEvents.expressMiddleware(), asyncHandler(async (req, res) => {
  // Slack Events API middleware handles verification and parsing
  res.status(200).send();
}));

// Handle Slack events
slackEvents.on('message', async (event) => {
  try {
    // Find agency database by team ID
    const agencyDatabase = await slackService.getAgencyDatabaseBySlackTeamId(event.team);
    if (!agencyDatabase) {
      console.warn(`[Slack] No agency found for team ${event.team}`);
      return;
    }

    // Sync message from Slack
    await slackService.syncMessageFromSlack(agencyDatabase, event);
  } catch (error) {
    console.error('[Slack] Error handling message event:', error);
  }
});

slackEvents.on('error', (error) => {
  console.error('[Slack] Events API error:', error);
});

module.exports = router;

