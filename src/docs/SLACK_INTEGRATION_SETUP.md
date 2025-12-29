# Slack Integration Setup Guide

## Overview

The Slack integration enables secure, professional communication for isolated agencies. It provides bidirectional message syncing between the internal messaging system and Slack workspaces, ensuring complete data isolation per agency.

## Features

- ✅ **Secure OAuth Flow** - Industry-standard OAuth 2.0 authentication
- ✅ **Bidirectional Message Sync** - Messages sync between internal system and Slack
- ✅ **Channel Mapping** - Map internal channels to Slack channels
- ✅ **Complete Isolation** - Each agency has its own isolated Slack integration
- ✅ **Webhook Support** - Real-time event handling from Slack
- ✅ **User Mapping** - Map internal users to Slack users
- ✅ **Flexible Sync Modes** - Bidirectional, to Slack only, from Slack only, or disabled

## Prerequisites

1. **Slack App Creation**
   - Go to [api.slack.com/apps](https://api.slack.com/apps)
   - Create a new Slack app
   - Note your Client ID and Client Secret

2. **Required Slack App Scopes**
   - `channels:read` - Read public channels
   - `channels:write` - Write to channels
   - `chat:write` - Send messages
   - `chat:write.public` - Send messages to public channels
   - `users:read` - Read user information
   - `users:read.email` - Read user email addresses
   - `groups:read` - Read private channels
   - `im:read` - Read direct messages
   - `im:write` - Send direct messages

3. **Slack App Configuration**
   - Set Redirect URL: `https://your-domain.com/api/slack/oauth/callback`
   - Enable Event Subscriptions
   - Set Request URL: `https://your-domain.com/api/slack/webhook`
   - Subscribe to `message.channels` event
   - Set Signing Secret (from App Credentials)

## Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Slack App Credentials
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_SIGNING_SECRET=your_slack_signing_secret
SLACK_STATE_SECRET=your_random_state_secret_32_chars_min

# OAuth Redirect URL (optional, defaults to API_BASE_URL + /api/slack/oauth/callback)
SLACK_REDIRECT_URI=https://your-domain.com/api/slack/oauth/callback

# Frontend URL for OAuth redirects (optional, defaults to http://localhost:5173)
FRONTEND_URL=https://your-domain.com

# API Base URL (optional, defaults to http://localhost:3001)
API_BASE_URL=https://your-domain.com
```

### Generating Secrets

Generate secure random secrets:

```bash
# Generate SLACK_STATE_SECRET (32+ characters)
openssl rand -base64 32
```

## Database Schema

The Slack integration automatically creates the following tables in each agency's isolated database:

- `slack_integrations` - Stores Slack workspace connections
- `slack_channel_mappings` - Maps internal channels to Slack channels
- `slack_message_sync` - Tracks synchronized messages
- `slack_user_mappings` - Maps internal users to Slack users

## API Endpoints

### OAuth Flow

#### 1. Start OAuth
```
GET /api/slack/oauth/start
Headers:
  Authorization: Bearer <token>
  X-Agency-Database: <agency_database_name>
```

Returns OAuth URL to redirect user to Slack.

#### 2. OAuth Callback
```
GET /api/slack/oauth/callback?code=<code>&state=<state>
```

Handles Slack OAuth callback and saves installation.

### Integration Management

#### Get Integration Status
```
GET /api/slack/integration
Headers:
  Authorization: Bearer <token>
  X-Agency-Database: <agency_database_name>
```

#### Disconnect Integration
```
DELETE /api/slack/integration
Headers:
  Authorization: Bearer <token>
  X-Agency-Database: <agency_database_name>
```

### Channel Management

#### Get Slack Channels
```
GET /api/slack/channels
Headers:
  Authorization: Bearer <token>
  X-Agency-Database: <agency_database_name>
```

#### Map Channel
```
POST /api/slack/channels/map
Headers:
  Authorization: Bearer <token>
  X-Agency-Database: <agency_database_name>
Body:
{
  "internal_channel_id": "uuid",
  "slack_channel_id": "C1234567890",
  "slack_channel_name": "general"
}
```

#### Get Channel Mappings
```
GET /api/slack/channels/mappings
Headers:
  Authorization: Bearer <token>
  X-Agency-Database: <agency_database_name>
```

### Sync Settings

#### Update Sync Settings
```
POST /api/slack/sync/settings
Headers:
  Authorization: Bearer <token>
  X-Agency-Database: <agency_database_name>
Body:
{
  "sync_enabled": true,
  "sync_direction": "bidirectional" // "bidirectional" | "to_slack" | "from_slack" | "disabled"
}
```

### Webhook

#### Slack Events Webhook
```
POST /api/slack/webhook
```

Handles Slack Events API webhooks (automatically verified by middleware).

## Usage Flow

### 1. Connect Slack Workspace

1. Navigate to Settings > Integrations > Slack
2. Click "Connect Slack Workspace"
3. Authorize the app in Slack
4. You'll be redirected back with the integration active

### 2. Map Channels

1. Go to Settings > Integrations > Slack > Channel Mappings
2. Select an internal channel
3. Select a Slack channel to map it to
4. Enable sync for the mapping

### 3. Configure Sync Settings

1. Go to Settings > Integrations > Slack > Settings
2. Choose sync direction:
   - **Bidirectional**: Messages sync both ways
   - **To Slack**: Only internal → Slack
   - **From Slack**: Only Slack → internal
   - **Disabled**: No syncing

### 4. Start Messaging

Once configured, messages in mapped channels will automatically sync based on your settings.

## Security Features

1. **Complete Isolation**: Each agency's Slack integration is stored in its isolated database
2. **Secure Token Storage**: Tokens are encrypted and stored securely
3. **OAuth 2.0**: Industry-standard authentication flow
4. **Webhook Verification**: All Slack webhooks are verified using signing secret
5. **Access Control**: Only authenticated users with agency context can manage integrations

## Troubleshooting

### OAuth Flow Fails

- Verify `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET` are correct
- Check redirect URL matches Slack app configuration
- Ensure `SLACK_REDIRECT_URI` environment variable is set correctly

### Messages Not Syncing

- Verify channel mapping is active and sync is enabled
- Check sync direction settings
- Ensure Slack bot has necessary permissions in the channel
- Check server logs for sync errors

### Webhook Not Receiving Events

- Verify `SLACK_SIGNING_SECRET` matches your app's signing secret
- Check webhook URL is accessible from Slack
- Ensure event subscriptions are enabled in Slack app settings

## Support

For issues or questions:
1. Check server logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure Slack app has all required scopes
4. Check database schema is initialized (runs automatically on first use)

