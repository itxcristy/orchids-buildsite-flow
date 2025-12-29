# Email Service Implementation

## Overview

A comprehensive, flexible email service has been implemented that supports multiple email providers with automatic provider selection and easy testing capabilities.

## Features

- **Multi-Provider Support**: Works with SMTP, SendGrid, Mailgun, AWS SES, and Resend
- **Automatic Provider Selection**: Automatically selects the best available provider based on configuration
- **Easy Testing**: Built-in test interface for testing email configuration
- **Flexible Configuration**: Support for per-request provider selection
- **Production Ready**: Includes error handling, logging, and status monitoring

## Supported Providers

1. **SMTP** (Gmail, Outlook, custom SMTP servers)
2. **SendGrid**
3. **Mailgun**
4. **AWS SES**
5. **Resend**

## Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
# Select provider (optional - auto-detected if not set)
EMAIL_PROVIDER=smtp

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@buildflow.com

# SendGrid
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM=noreply@buildflow.com

# Mailgun
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=mg.yourdomain.com

# AWS SES
AWS_SES_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key

# Resend
RESEND_API_KEY=your-resend-api-key
RESEND_FROM=onboarding@resend.dev

# Test Email
TEST_EMAIL=test@example.com
```

### Provider Priority

The service automatically selects a provider in this order:
1. Explicitly set `EMAIL_PROVIDER` environment variable
2. SendGrid (if `SENDGRID_API_KEY` is set)
3. Mailgun (if `MAILGUN_API_KEY` and `MAILGUN_DOMAIN` are set)
4. AWS SES (if AWS credentials are set)
5. Resend (if `RESEND_API_KEY` is set)
6. SMTP (default fallback)

## API Endpoints

### GET `/api/email/status`
Get email provider status and configuration.

**Response:**
```json
{
  "success": true,
  "data": {
    "active": "smtp",
    "providers": {
      "smtp": {
        "name": "SMTP",
        "available": true,
        "configured": true
      },
      "sendgrid": {
        "name": "SendGrid",
        "available": false,
        "configured": false
      }
    }
  }
}
```

### POST `/api/email/test`
Send a test email to verify configuration.

**Request:**
```json
{
  "to": "test@example.com",
  "provider": "smtp" // optional
}
```

### POST `/api/email/send`
Send a custom email.

**Request:**
```json
{
  "to": "recipient@example.com",
  "subject": "Email Subject",
  "html": "<h1>Hello</h1>",
  "text": "Hello", // optional
  "provider": "smtp", // optional
  "from": "custom@example.com" // optional
}
```

### POST `/api/email/notification`
Send a formatted notification email.

**Request:**
```json
{
  "to": "recipient@example.com",
  "title": "Notification Title",
  "message": "Notification message",
  "actionUrl": "https://example.com/action", // optional
  "provider": "smtp" // optional
}
```

### POST `/api/email/report`
Send a report email with attachment.

**Request:**
```json
{
  "recipients": "recipient@example.com",
  "reportData": "base64-encoded-report-data",
  "reportName": "Monthly Report",
  "format": "pdf",
  "provider": "smtp" // optional
}
```

## Frontend Usage

### Access the Email Testing Page

Navigate to `/email-testing` in your application (requires admin or super_admin role).

### Using the Email Service in Code

```typescript
import { sendEmail, testEmail, getEmailStatus } from '@/services/api/email-service';

// Get provider status
const status = await getEmailStatus();

// Send test email
await testEmail({
  to: 'test@example.com',
  provider: 'smtp' // optional
});

// Send custom email
await sendEmail({
  to: 'recipient@example.com',
  subject: 'Hello',
  html: '<h1>Hello World</h1>',
  text: 'Hello World'
});
```

## Backend Usage

```javascript
const emailService = require('./services/emailService');

// Send email
await emailService.sendEmail(
  'recipient@example.com',
  'Subject',
  '<h1>HTML Content</h1>',
  'Text Content',
  [], // attachments
  { provider: 'smtp' } // optional options
);

// Test configuration
await emailService.testEmailConfiguration({
  testEmail: 'test@example.com',
  provider: 'smtp'
});

// Get provider status
const status = emailService.getProviderStatus();
```

## Files Created/Modified

### Backend
- `server/services/emailService.js` - Enhanced email service with multi-provider support
- `server/routes/email.js` - Email API routes
- `server/index.js` - Added email routes registration
- `server/package.json` - Added nodemailer dependency

### Frontend
- `src/services/api/email-service.ts` - Frontend API client for email service
- `src/pages/EmailTesting.tsx` - Email testing interface
- `src/App.tsx` - Added EmailTesting route

### Configuration
- `.env.example` - Added email configuration examples

## Testing

1. **Configure Provider**: Set up at least one email provider in your `.env` file
2. **Access Testing Page**: Navigate to `/email-testing` in your application
3. **Check Status**: View provider status and configuration
4. **Send Test Email**: Use the test email form to verify configuration
5. **Test Custom Emails**: Try sending custom HTML/text emails
6. **Test Notifications**: Test formatted notification emails

## Provider-Specific Notes

### SMTP (Gmail)
- Use App Password, not regular password
- Enable "Less secure app access" or use OAuth2
- Port 587 for TLS, 465 for SSL

### SendGrid
- Get API key from SendGrid dashboard
- Verify sender domain for better deliverability

### Mailgun
- Requires API key and domain
- Domain must be verified in Mailgun dashboard

### AWS SES
- Requires AWS credentials with SES permissions
- May need to verify email addresses/domains
- Check AWS SES sandbox mode restrictions

### Resend
- Modern email API
- Requires API key from Resend dashboard
- Good for transactional emails

## Troubleshooting

1. **Provider not working**: Check environment variables are set correctly
2. **Test email not received**: Check spam folder, verify sender domain
3. **Authentication errors**: Verify credentials are correct
4. **Rate limiting**: Some providers have rate limits on free tiers

## Next Steps

- Add email templates system
- Implement email queue for bulk sending
- Add email delivery tracking
- Implement bounce/complaint handling
- Add email analytics
