# Mailtrap Email Service Setup Guide

## Overview

Mailtrap is an email delivery platform that provides SMTP-based email sending. This guide will help you set up Mailtrap with the BuildFlow email service.

## Step-by-Step Setup

### 1. Access Mailtrap Integrations

1. Log in to your Mailtrap account at [https://mailtrap.io](https://mailtrap.io)
2. Navigate to **Sending Domains** in the left sidebar
3. If you haven't added a domain yet, click **Add Domain** and follow the verification process

### 2. Select Your Domain and Stream

1. Click on your verified domain from the **Sending Domains** list
2. Go to the **Integration** tab
3. Choose your email stream:
   - **Transactional Stream** (Recommended) - For automated, non-promotional emails like:
     - Password resets
     - Order confirmations
     - Notifications
     - Reports
   - **Bulk Stream** - For mass marketing emails

### 3. Get SMTP Credentials

1. Click the **Integrate** button under your chosen stream
2. Switch to the **SMTP** tab (not API)
3. You'll see your SMTP credentials:
   - **Host**: Usually `smtp.mailtrap.io`
   - **Port**: Usually `2525` (or `465` for SSL)
   - **Username**: Your Mailtrap username
   - **Password**: Your Mailtrap password

### 4. Configure Your Application

Update your `.env` file with the Mailtrap SMTP credentials:

```bash
# Email Service Configuration
EMAIL_PROVIDER=smtp

# Mailtrap SMTP Configuration
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-mailtrap-username-here
SMTP_PASSWORD=your-mailtrap-password-here
SMTP_FROM=noreply@yourdomain.com
```

**Important Notes:**
- Replace `your-mailtrap-username-here` with your actual Mailtrap username
- Replace `your-mailtrap-password-here` with your actual Mailtrap password
- Replace `noreply@yourdomain.com` with your verified sender email address
- The `SMTP_FROM` email must be verified in your Mailtrap account

### 5. Test Your Configuration

1. Restart your server to load the new environment variables
2. Navigate to `/email-testing` in your application
3. Check that Mailtrap shows as the active provider (via SMTP)
4. Send a test email to verify everything works

## Mailtrap Features

### Transactional Stream
- **Best for**: Automated emails, notifications, reports
- **Features**: 
  - High deliverability
  - Email analytics
  - Bounce handling
  - Spam testing

### Bulk Stream
- **Best for**: Marketing campaigns, newsletters
- **Features**:
  - Mass email sending
  - Campaign analytics
  - List management

## Port Configuration

Mailtrap supports multiple ports:
- **2525** - Standard SMTP (TLS)
- **465** - SSL/TLS encrypted
- **587** - STARTTLS (alternative)

Use port **2525** for standard setup, or **465** if you prefer SSL.

## Troubleshooting

### Email Not Sending

1. **Verify Domain**: Ensure your sending domain is verified in Mailtrap
2. **Check Credentials**: Double-check username and password are correct
3. **Check Port**: Ensure you're using the correct port (2525 or 465)
4. **Verify Sender**: The `SMTP_FROM` email must be verified in Mailtrap

### Authentication Errors

- Verify your username and password are correct
- Check that you're using the credentials from the correct stream (Transactional vs Bulk)
- Ensure your account is active and not suspended

### Domain Verification Issues

- Add the required DNS records (SPF, DKIM, DMARC) as shown in Mailtrap
- Wait for DNS propagation (can take up to 48 hours)
- Verify records are correctly configured

## Security Best Practices

1. **Never commit credentials**: Keep your `.env` file in `.gitignore`
2. **Use environment variables**: Never hardcode credentials
3. **Rotate passwords**: Regularly update your Mailtrap password
4. **Monitor usage**: Check Mailtrap dashboard for unusual activity

## Next Steps

After setup:
1. Test email sending from your application
2. Monitor email delivery in Mailtrap dashboard
3. Set up email templates if needed
4. Configure bounce handling
5. Set up webhooks for delivery events (optional)

## Support

- Mailtrap Documentation: [https://help.mailtrap.io](https://help.mailtrap.io)
- Mailtrap Support: support@mailtrap.io
