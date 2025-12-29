# Mailtrap API Integration Guide

## Overview

This guide explains how to set up Mailtrap using their official Node.js SDK (API-based) instead of SMTP. The Mailtrap API provides better features like sandbox testing, templates, and analytics.

## Step-by-Step Setup

### 1. Get Your Mailtrap API Token

1. Log in to your Mailtrap account at [https://mailtrap.io](https://mailtrap.io)
2. Navigate to **Settings** → **API Tokens** (or go directly to [https://mailtrap.io/api-tokens](https://mailtrap.io/api-tokens))
3. Click **Create Token** or use an existing token
4. Copy your API token (you'll need this for configuration)

**Important:** 
- Keep your API token secure and never commit it to version control
- You can create separate tokens for different environments (development, production)
- Tokens can be revoked and regenerated if needed

### 2. Verify Your Sending Domain (For Production)

1. Go to **Sending Domains** in Mailtrap
2. Click **Add Domain** if you haven't added one yet
3. Follow the verification process by adding DNS records (SPF, DKIM, DMARC)
4. Wait for verification (can take up to 48 hours for DNS propagation)

**Note:** For sandbox/testing mode, domain verification is not required.

### 3. Configure Your Application

Update your `.env` file with Mailtrap API configuration:

```bash
# Email Service Configuration
EMAIL_PROVIDER=mailtrap

# Mailtrap API Configuration
MAILTRAP_API_TOKEN=your-api-token-here
MAILTRAP_FROM=noreply@yourdomain.com

# Optional: Sandbox Mode (for testing)
MAILTRAP_USE_SANDBOX=false
MAILTRAP_INBOX_ID=123456  # Only needed if using sandbox

# Optional: Bulk Stream (for marketing emails)
MAILTRAP_BULK=false
```

### 4. Understanding Mailtrap Modes

#### Production Mode (Default)
- **Use for**: Real email delivery
- **Configuration**: `MAILTRAP_USE_SANDBOX=false` or omit it
- **Requirements**: Verified sending domain
- **Streams**: 
  - Transactional Stream (default) - For automated emails
  - Bulk Stream (`MAILTRAP_BULK=true`) - For marketing emails

#### Sandbox Mode (Testing)
- **Use for**: Testing email functionality without sending real emails
- **Configuration**: `MAILTRAP_USE_SANDBOX=true`
- **Requirements**: Inbox ID (`MAILTRAP_INBOX_ID`)
- **Benefits**: 
  - Emails are captured in Mailtrap inbox
  - No real emails sent
  - Perfect for development and QA

### 5. Get Your Sandbox Inbox ID (For Testing)

If you want to use sandbox mode:

1. Go to **Email Testing** → **Inboxes** in Mailtrap
2. Create a new inbox or select an existing one
3. Copy the **Inbox ID** from the inbox settings
4. Add it to your `.env` file as `MAILTRAP_INBOX_ID`

### 6. Test Your Configuration

1. Restart your server to load new environment variables
2. Navigate to `/email-testing` in your application
3. Check that Mailtrap shows as the active provider
4. Send a test email

## Configuration Options

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MAILTRAP_API_TOKEN` | Yes | Your Mailtrap API token from [api-tokens](https://mailtrap.io/api-tokens) |
| `MAILTRAP_FROM` | Yes | Sender email address (must be verified in production) |
| `MAILTRAP_USE_SANDBOX` | No | Set to `true` for sandbox mode (default: `false`) |
| `MAILTRAP_INBOX_ID` | No | Inbox ID for sandbox mode (only needed if sandbox is enabled) |
| `MAILTRAP_BULK` | No | Set to `true` for Bulk Stream (default: `false` for Transactional) |

### Stream Types

#### Transactional Stream (Default)
- **Best for**: Automated, non-promotional emails
- **Examples**: 
  - Password resets
  - Order confirmations
  - Notifications
  - Reports
  - System alerts
- **Configuration**: `MAILTRAP_BULK=false` or omit it

#### Bulk Stream
- **Best for**: Marketing campaigns, newsletters
- **Examples**:
  - Newsletters
  - Promotional emails
  - Announcements
- **Configuration**: `MAILTRAP_BULK=true`

## Advanced Features

### Using Templates

Mailtrap supports email templates. You can use them in your code:

```javascript
const emailService = require('./services/emailService');

await emailService.sendEmail(
  'recipient@example.com',
  'Welcome!',
  '<h1>Welcome</h1>',
  'Welcome',
  [],
  {
    provider: 'mailtrap',
    config: {
      templateUuid: 'your-template-uuid',
      templateVariables: {
        user_name: 'John Doe',
        company_name: 'BuildFlow',
      },
    },
  }
);
```

### Custom Variables

Add custom variables for tracking:

```javascript
await emailService.sendEmail(
  'recipient@example.com',
  'Order Confirmation',
  '<h1>Your order</h1>',
  'Your order',
  [],
  {
    provider: 'mailtrap',
    config: {
      customVariables: {
        order_id: '12345',
        user_id: '67890',
      },
    },
  }
);
```

### Categories

Organize emails with categories:

```javascript
await emailService.sendEmail(
  'recipient@example.com',
  'Password Reset',
  '<h1>Reset your password</h1>',
  'Reset your password',
  [],
  {
    provider: 'mailtrap',
    config: {
      category: 'Security',
    },
  }
);
```

## Switching Between Sandbox and Production

### Development/Testing
```bash
MAILTRAP_USE_SANDBOX=true
MAILTRAP_INBOX_ID=123456
```

### Production
```bash
MAILTRAP_USE_SANDBOX=false
# Remove or comment out MAILTRAP_INBOX_ID
```

## Troubleshooting

### "Invalid API token" Error
- Verify your API token is correct
- Check that the token hasn't been revoked
- Ensure you're using the correct token for your environment

### "Domain not verified" Error
- Verify your sending domain in Mailtrap
- Check DNS records are correctly configured
- Wait for DNS propagation (up to 48 hours)

### Sandbox Not Working
- Ensure `MAILTRAP_USE_SANDBOX=true`
- Verify `MAILTRAP_INBOX_ID` is set and correct
- Check that the inbox ID exists in your Mailtrap account

### Emails Not Sending
- Check Mailtrap dashboard for delivery status
- Verify sender email is verified
- Check Mailtrap account limits/quota
- Review Mailtrap logs for errors

## Benefits of API vs SMTP

### API Advantages
- ✅ Sandbox mode for safe testing
- ✅ Email templates support
- ✅ Better analytics and tracking
- ✅ Custom variables
- ✅ Categories for organization
- ✅ Batch sending capabilities
- ✅ Template variables
- ✅ More reliable delivery

### When to Use SMTP
- Legacy system compatibility
- Simple setup without API tokens
- When you only need basic email sending

## Next Steps

1. **Test in Sandbox**: Start with sandbox mode to test your integration
2. **Verify Domain**: Set up domain verification for production
3. **Create Templates**: Build reusable email templates
4. **Monitor Analytics**: Use Mailtrap dashboard to track email performance
5. **Set Up Webhooks**: Configure webhooks for delivery events (optional)

## Resources

- [Mailtrap API Documentation](https://help.mailtrap.io/article/122-mailtrap-email-sending-smtp-integration)
- [Mailtrap Node.js SDK](https://github.com/mailtrap/mailtrap-nodejs)
- [API Tokens](https://mailtrap.io/api-tokens)
- [Sending Domains](https://mailtrap.io/sending-domains)

## Support

- Mailtrap Documentation: [https://help.mailtrap.io](https://help.mailtrap.io)
- Mailtrap Support: support@mailtrap.io
