/**
 * Enhanced Email Service
 * Flexible email service supporting multiple providers:
 * - SMTP (Gmail, Outlook, custom SMTP)
 * - SendGrid
 * - Mailgun
 * - AWS SES
 * - Resend
 * - Postmark
 * - Mailtrap (API)
 * 
 * Automatically selects provider based on configuration
 */

const nodemailer = require('nodemailer');

// Provider types
const PROVIDERS = {
  SMTP: 'smtp',
  SENDGRID: 'sendgrid',
  MAILGUN: 'mailgun',
  AWS_SES: 'aws_ses',
  RESEND: 'resend',
  POSTMARK: 'postmark',
  MAILTRAP: 'mailtrap',
};

// Get active provider from environment
function getActiveProvider() {
  // Priority order: explicit provider > Mailtrap > Postmark > SendGrid > Mailgun > AWS SES > Resend > SMTP
  if (process.env.EMAIL_PROVIDER) {
    return process.env.EMAIL_PROVIDER.toLowerCase();
  }
  if (process.env.MAILTRAP_API_TOKEN) {
    return PROVIDERS.MAILTRAP;
  }
  if (process.env.POSTMARK_API_TOKEN) {
    return PROVIDERS.POSTMARK;
  }
  if (process.env.SENDGRID_API_KEY) {
    return PROVIDERS.SENDGRID;
  }
  if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
    return PROVIDERS.MAILGUN;
  }
  if (process.env.AWS_SES_REGION && process.env.AWS_ACCESS_KEY_ID) {
    return PROVIDERS.AWS_SES;
  }
  if (process.env.RESEND_API_KEY) {
    return PROVIDERS.RESEND;
  }
  return PROVIDERS.SMTP; // Default fallback
}

// Create transporter based on provider
function createTransporter(config = {}) {
  const provider = config.provider || getActiveProvider();
  
  switch (provider) {
    case PROVIDERS.SENDGRID:
      return createSendGridTransporter(config);
    
    case PROVIDERS.MAILGUN:
      return createMailgunTransporter(config);
    
    case PROVIDERS.AWS_SES:
      return createSESTransporter(config);
    
    case PROVIDERS.RESEND:
      return createResendTransporter(config);
    
    case PROVIDERS.POSTMARK:
      return createPostmarkTransporter(config);
    
    case PROVIDERS.MAILTRAP:
      return createMailtrapTransporter(config);
    
    case PROVIDERS.SMTP:
    default:
      return createSMTPTransporter(config);
  }
}

// SMTP Transporter (Gmail, Outlook, Mailtrap, custom SMTP)
function createSMTPTransporter(config = {}) {
  const host = config.host || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(config.port || process.env.SMTP_PORT || '587', 10);
  const user = config.user || process.env.SMTP_USER || '';
  const password = config.password || process.env.SMTP_PASSWORD || '';
  const from = config.from || process.env.SMTP_FROM || user || 'noreply@buildflow.com';

  // Determine secure/SSL settings
  // Mailtrap sandbox uses STARTTLS on port 2525 (not SSL)
  // Port 465 = SSL, Port 587/2525 = STARTTLS
  let secure = config.secure;
  if (secure === undefined) {
    if (port === 465) {
      secure = true; // SSL
    } else if (host.includes('mailtrap.io')) {
      secure = false; // Mailtrap uses STARTTLS
    } else {
      secure = false; // Default to STARTTLS for other ports
    }
  }

  const transporterConfig = {
    host,
    port,
    secure, // true for SSL (465), false for STARTTLS (587, 2525)
    auth: user && password ? {
      user,
      pass: password,
    } : undefined,
  };

  // Add TLS options
  if (host.includes('mailtrap.io')) {
    // Mailtrap sandbox configuration
    transporterConfig.tls = {
      rejectUnauthorized: false, // Mailtrap sandbox may use self-signed certs
    };
  } else {
    transporterConfig.tls = {
      rejectUnauthorized: config.rejectUnauthorized !== false,
    };
  }

  return nodemailer.createTransport(transporterConfig);
}

// SendGrid Transporter
function createSendGridTransporter(config = {}) {
  const apiKey = config.apiKey || process.env.SENDGRID_API_KEY;
  
  if (!apiKey) {
    throw new Error('SendGrid API key is required. Set SENDGRID_API_KEY environment variable.');
  }

  return nodemailer.createTransport({
    service: 'SendGrid',
    auth: {
      user: 'apikey',
      pass: apiKey,
    },
  });
}

// Mailgun Transporter
function createMailgunTransporter(config = {}) {
  const apiKey = config.apiKey || process.env.MAILGUN_API_KEY;
  const domain = config.domain || process.env.MAILGUN_DOMAIN;
  
  if (!apiKey || !domain) {
    throw new Error('Mailgun API key and domain are required. Set MAILGUN_API_KEY and MAILGUN_DOMAIN environment variables.');
  }

  return nodemailer.createTransport({
    host: `smtp.mailgun.org`,
    port: 587,
    secure: false,
    auth: {
      user: `postmaster@${domain}`,
      pass: apiKey,
    },
  });
}

// AWS SES Transporter
function createSESTransporter(config = {}) {
  const region = config.region || process.env.AWS_SES_REGION || 'us-east-1';
  const accessKeyId = config.accessKeyId || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = config.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY;
  
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials are required. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.');
  }

  // For AWS SES, we use nodemailer with SES transport
  // Note: You may need to install @aws-sdk/client-ses for full SES support
  return nodemailer.createTransport({
    SES: {
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    },
  });
}

// Resend Transporter
function createResendTransporter(config = {}) {
  const apiKey = config.apiKey || process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    throw new Error('Resend API key is required. Set RESEND_API_KEY environment variable.');
  }

  // Resend uses HTTP API, not SMTP
  // We'll handle this in sendEmail function
  return null; // Special handling needed
}

// Postmark Transporter
function createPostmarkTransporter(config = {}) {
  const apiToken = config.apiToken || process.env.POSTMARK_API_TOKEN;
  
  if (!apiToken) {
    throw new Error('Postmark API token is required. Set POSTMARK_API_TOKEN environment variable.');
  }

  // Postmark uses HTTP API, not SMTP
  // We'll handle this in sendEmail function
  return null; // Special handling needed
}

// Mailtrap Transporter
function createMailtrapTransporter(config = {}) {
  const apiToken = config.apiToken || process.env.MAILTRAP_API_TOKEN;
  
  if (!apiToken) {
    throw new Error('Mailtrap API token is required. Set MAILTRAP_API_TOKEN environment variable.');
  }

  // Mailtrap uses HTTP API via official SDK, not SMTP
  // We'll handle this in sendEmail function
  return null; // Special handling needed
}

// Send email using Resend API (HTTP)
async function sendEmailViaResend(mailOptions, config = {}) {
  const apiKey = config.apiKey || process.env.RESEND_API_KEY;
  const from = mailOptions.from || process.env.RESEND_FROM || 'onboarding@resend.dev';
  
  // Use built-in fetch (Node.js 18+) or require node-fetch for older versions
  let fetch;
  try {
    // Try built-in fetch first (Node.js 18+)
    fetch = globalThis.fetch || require('node-fetch');
  } catch (e) {
    throw new Error('Resend requires Node.js 18+ with built-in fetch or node-fetch package');
  }
  
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(mailOptions.to) ? mailOptions.to : [mailOptions.to],
      subject: mailOptions.subject,
      html: mailOptions.html,
      text: mailOptions.text,
      attachments: mailOptions.attachments?.map(att => ({
        filename: att.filename,
        content: typeof att.content === 'string' ? att.content : att.content.toString('base64'),
      })),
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Failed to send email via Resend');
  }

  return {
    success: true,
    messageId: data.id,
    provider: 'resend',
  };
}

// Send email using Postmark API (HTTP)
async function sendEmailViaPostmark(mailOptions, config = {}) {
  const apiToken = config.apiToken || process.env.POSTMARK_API_TOKEN;
  const from = mailOptions.from || process.env.POSTMARK_FROM || 'noreply@buildflow.com';
  
  // Use built-in fetch (Node.js 18+) or require node-fetch for older versions
  let fetch;
  try {
    // Try built-in fetch first (Node.js 18+)
    fetch = globalThis.fetch || require('node-fetch');
  } catch (e) {
    throw new Error('Postmark requires Node.js 18+ with built-in fetch or node-fetch package');
  }
  
  // Postmark API endpoint
  const response = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      'X-Postmark-Server-Token': apiToken,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      From: from,
      To: Array.isArray(mailOptions.to) ? mailOptions.to.join(',') : mailOptions.to,
      Subject: mailOptions.subject,
      HtmlBody: mailOptions.html,
      TextBody: mailOptions.text || mailOptions.html.replace(/<[^>]*>/g, ''),
      Attachments: mailOptions.attachments?.map(att => {
        const content = typeof att.content === 'string' 
          ? att.content 
          : Buffer.from(att.content).toString('base64');
        return {
          Name: att.filename,
          Content: content,
          ContentType: att.contentType || 'application/octet-stream',
        };
      }) || [],
      TrackOpens: config.trackOpens !== false,
      TrackLinks: config.trackLinks || 'None',
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.Message || data.ErrorCode || 'Failed to send email via Postmark');
  }

  return {
    success: true,
    messageId: data.MessageID,
    provider: 'postmark',
  };
}

// Send email using Mailtrap API (Official SDK)
async function sendEmailViaMailtrap(mailOptions, config = {}) {
  const { MailtrapClient } = require('mailtrap');
  const apiToken = config.apiToken || process.env.MAILTRAP_API_TOKEN;
  const from = mailOptions.from || process.env.MAILTRAP_FROM || 'noreply@buildflow.com';
  const isSandbox = config.sandbox !== undefined ? config.sandbox : (process.env.MAILTRAP_USE_SANDBOX === 'true');
  const isBulk = config.bulk !== undefined ? config.bulk : (process.env.MAILTRAP_BULK === 'true');
  const testInboxId = config.testInboxId || (process.env.MAILTRAP_INBOX_ID ? Number(process.env.MAILTRAP_INBOX_ID) : undefined);

  // Initialize Mailtrap client
  const mailtrap = new MailtrapClient({
    token: apiToken,
    bulk: isBulk,
    sandbox: isSandbox,
    testInboxId: isSandbox ? testInboxId : undefined,
  });

  // Parse from address (can be string or object)
  let fromName = 'BuildFlow';
  let fromEmail = from;
  if (typeof from === 'string') {
    // Try to parse "Name <email@domain.com>" format
    const match = from.match(/^(.+?)\s*<(.+?)>$/);
    if (match) {
      fromName = match[1].trim();
      fromEmail = match[2].trim();
    }
  }

  // Prepare recipients
  const recipients = Array.isArray(mailOptions.to) ? mailOptions.to : [mailOptions.to];
  const to = recipients.map(recipient => {
    if (typeof recipient === 'string') {
      const match = recipient.match(/^(.+?)\s*<(.+?)>$/);
      if (match) {
        return { name: match[1].trim(), email: match[2].trim() };
      }
      return { email: recipient };
    }
    return recipient;
  });

  // Prepare email payload
  const emailPayload = {
    from: { name: fromName, email: fromEmail },
    to: to,
    subject: mailOptions.subject,
    text: mailOptions.text || mailOptions.html.replace(/<[^>]*>/g, ''),
    html: mailOptions.html,
  };

  // Add optional fields
  if (mailOptions.cc) {
    const ccRecipients = Array.isArray(mailOptions.cc) ? mailOptions.cc : [mailOptions.cc];
    emailPayload.cc = ccRecipients.map(recipient => {
      if (typeof recipient === 'string') {
        const match = recipient.match(/^(.+?)\s*<(.+?)>$/);
        if (match) {
          return { name: match[1].trim(), email: match[2].trim() };
        }
        return { email: recipient };
      }
      return recipient;
    });
  }

  if (mailOptions.bcc) {
    const bccRecipients = Array.isArray(mailOptions.bcc) ? mailOptions.bcc : [mailOptions.bcc];
    emailPayload.bcc = bccRecipients.map(recipient => {
      if (typeof recipient === 'string') {
        const match = recipient.match(/^(.+?)\s*<(.+?)>$/);
        if (match) {
          return { name: match[1].trim(), email: match[2].trim() };
        }
        return { email: recipient };
      }
      return recipient;
    });
  }

  if (mailOptions.replyTo) {
    emailPayload.reply_to = typeof mailOptions.replyTo === 'string' 
      ? { email: mailOptions.replyTo }
      : mailOptions.replyTo;
  }

  if (mailOptions.attachments && mailOptions.attachments.length > 0) {
    emailPayload.attachments = mailOptions.attachments.map(att => ({
      filename: att.filename,
      content: typeof att.content === 'string' 
        ? Buffer.from(att.content, 'base64')
        : Buffer.isBuffer(att.content) 
          ? att.content 
          : Buffer.from(att.content),
      content_id: att.contentId || att.filename,
      disposition: att.disposition || 'attachment',
    }));
  }

  // Add Mailtrap-specific options
  if (config.category) {
    emailPayload.category = config.category;
  }

  if (config.customVariables) {
    emailPayload.custom_variables = config.customVariables;
  }

  if (config.templateUuid) {
    emailPayload.template_uuid = config.templateUuid;
    if (config.templateVariables) {
      emailPayload.template_variables = config.templateVariables;
    }
  }

  if (config.headers) {
    emailPayload.headers = config.headers;
  }

  // Send email
  const result = await mailtrap.send(emailPayload);

  return {
    success: true,
    messageId: result.message_ids?.[0] || result.id || 'unknown',
    provider: 'mailtrap',
  };
}

// Main send email function
let cachedTransporter = null;
let cachedProvider = null;

async function sendEmail(to, subject, html, text = null, attachments = [], options = {}) {
  try {
    const provider = options.provider || getActiveProvider();
    const config = options.config || {};
    
    // Handle Resend separately (HTTP API)
    if (provider === PROVIDERS.RESEND) {
      const mailOptions = {
        from: options.from || process.env.RESEND_FROM || 'onboarding@resend.dev',
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
        attachments,
      };
      return await sendEmailViaResend(mailOptions, config);
    }

    // Handle Postmark separately (HTTP API)
    if (provider === PROVIDERS.POSTMARK) {
      const mailOptions = {
        from: options.from || process.env.POSTMARK_FROM || 'noreply@buildflow.com',
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
        attachments,
      };
      return await sendEmailViaPostmark(mailOptions, config);
    }

    // Handle Mailtrap separately (Official SDK)
    if (provider === PROVIDERS.MAILTRAP) {
      const mailOptions = {
        from: options.from || process.env.MAILTRAP_FROM || 'noreply@buildflow.com',
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
        attachments,
        cc: options.cc,
        bcc: options.bcc,
        replyTo: options.replyTo,
      };
      return await sendEmailViaMailtrap(mailOptions, config);
    }

    // For other providers, use nodemailer
    // Recreate transporter if provider changed or config provided
    if (!cachedTransporter || cachedProvider !== provider || Object.keys(config).length > 0) {
      cachedTransporter = createTransporter({ provider, ...config });
      cachedProvider = provider;
    }

    const from = options.from || 
                 config.from || 
                 process.env.SMTP_FROM || 
                 process.env.RESEND_FROM ||
                 process.env.SENDGRID_FROM ||
                 process.env.POSTMARK_FROM ||
                 process.env.MAILTRAP_FROM ||
                 'noreply@buildflow.com';

    const mailOptions = {
      from,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      html,
      attachments,
      ...options.mailOptions, // Allow additional mail options
    };

    const result = await cachedTransporter.sendMail(mailOptions);
    console.log(`[Email] ✅ Email sent via ${provider}:`, result.messageId);
    
    return {
      success: true,
      messageId: result.messageId,
      provider,
    };
  } catch (error) {
    console.error(`[Email] ❌ Failed to send email via ${getActiveProvider()}:`, error);
    return {
      success: false,
      error: error.message,
      provider: getActiveProvider(),
    };
  }
}

/**
 * Send report email
 */
async function sendReportEmail(recipients, reportData, reportName, format = 'pdf', options = {}) {
  const subject = `Report: ${reportName}`;
  const html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9fafb; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>${reportName}</h2>
          </div>
          <div class="content">
            <p>Please find the attached report.</p>
            <p><strong>Generated on:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <div class="footer">
            <p>This is an automated email from BuildFlow ERP System.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const attachments = [{
    filename: `${reportName}.${format}`,
    content: reportData,
  }];

  return await sendEmail(recipients, subject, html, null, attachments, options);
}

/**
 * Send notification email
 */
async function sendNotificationEmail(to, title, message, actionUrl = null, options = {}) {
  const subject = title;
  const html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9fafb; }
          .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>${title}</h2>
          </div>
          <div class="content">
            <p>${message}</p>
            ${actionUrl ? `<p><a href="${actionUrl}" class="button">View Details</a></p>` : ''}
          </div>
          <div class="footer">
            <p>BuildFlow ERP System</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return await sendEmail(to, subject, html, null, [], options);
}

/**
 * Send 2FA setup email
 */
async function send2FASetupEmail(to, recoveryCodes, options = {}) {
  const subject = 'Two-Factor Authentication Enabled';
  const html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9fafb; }
          .codes { background-color: white; padding: 15px; border-radius: 4px; margin: 20px 0; }
          .code { font-family: monospace; font-size: 14px; padding: 5px; margin: 5px 0; }
          .warning { background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Two-Factor Authentication Enabled</h2>
          </div>
          <div class="content">
            <p>Two-factor authentication has been enabled for your account.</p>
            <h3>Recovery Codes</h3>
            <div class="codes">
              ${recoveryCodes.map(code => `<div class="code">${code}</div>`).join('')}
            </div>
            <div class="warning">
              <p><strong>Important:</strong> These codes are only shown once. Save them securely.</p>
            </div>
          </div>
          <div class="footer">
            <p>BuildFlow ERP System</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return await sendEmail(to, subject, html, null, [], options);
}

/**
 * Test email configuration
 */
async function testEmailConfiguration(options = {}) {
  const provider = options.provider || getActiveProvider();
  const config = options.config || {};
  const testEmail = options.testEmail || process.env.TEST_EMAIL || 'test@example.com';

  try {
    const result = await sendEmail(
      testEmail,
      'BuildFlow Email Service Test',
      `
        <html>
          <body>
            <h2>Email Service Test</h2>
            <p>This is a test email from BuildFlow email service.</p>
            <p><strong>Provider:</strong> ${provider}</p>
            <p><strong>Time:</strong> ${new Date().toISOString()}</p>
            <p>If you received this email, your email configuration is working correctly!</p>
          </body>
        </html>
      `,
      null,
      [],
      { provider, config }
    );

    return {
      success: result.success,
      provider,
      messageId: result.messageId,
      error: result.error,
    };
  } catch (error) {
    return {
      success: false,
      provider,
      error: error.message,
    };
  }
}

/**
 * Get available providers and their configuration status
 */
function getProviderStatus() {
  const providers = {
    smtp: {
      name: 'SMTP',
      available: !!(process.env.SMTP_HOST || process.env.SMTP_USER),
      configured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD),
    },
    sendgrid: {
      name: 'SendGrid',
      available: !!process.env.SENDGRID_API_KEY,
      configured: !!process.env.SENDGRID_API_KEY,
    },
    mailgun: {
      name: 'Mailgun',
      available: !!(process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN),
      configured: !!(process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN),
    },
    aws_ses: {
      name: 'AWS SES',
      available: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
      configured: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_SES_REGION),
    },
    resend: {
      name: 'Resend',
      available: !!process.env.RESEND_API_KEY,
      configured: !!process.env.RESEND_API_KEY,
    },
    postmark: {
      name: 'Postmark',
      available: !!process.env.POSTMARK_API_TOKEN,
      configured: !!process.env.POSTMARK_API_TOKEN,
    },
    mailtrap: {
      name: 'Mailtrap',
      available: !!process.env.MAILTRAP_API_TOKEN,
      configured: !!process.env.MAILTRAP_API_TOKEN,
    },
  };

  return {
    active: getActiveProvider(),
    providers,
  };
}

module.exports = {
  sendEmail,
  sendReportEmail,
  sendNotificationEmail,
  send2FASetupEmail,
  testEmailConfiguration,
  getProviderStatus,
  getActiveProvider,
  createTransporter,
  PROVIDERS,
};
