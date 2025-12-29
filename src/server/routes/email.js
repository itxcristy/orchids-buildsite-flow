/**
 * Email Service Routes
 * Handles email testing, configuration, and sending
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, requireAgencyContext } = require('../middleware/authMiddleware');
const emailService = require('../services/emailService');

/**
 * GET /api/email/status
 * Get email provider status and configuration
 */
router.get('/status', authenticate, asyncHandler(async (req, res) => {
  const status = emailService.getProviderStatus();
  
  res.json({
    success: true,
    data: status,
  });
}));

/**
 * POST /api/email/test
 * Test email configuration by sending a test email
 */
router.post('/test', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const { to, provider, config } = req.body;

  if (!to) {
    return res.status(400).json({
      success: false,
      error: 'Recipient email address is required',
      message: 'Please provide a "to" email address',
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid email address',
      message: 'Please provide a valid email address',
    });
  }

  const result = await emailService.testEmailConfiguration({
    testEmail: to,
    provider,
    config,
  });

  if (result.success) {
    res.json({
      success: true,
      data: result,
      message: `Test email sent successfully via ${result.provider}`,
    });
  } else {
    res.status(500).json({
      success: false,
      error: result.error,
      message: `Failed to send test email: ${result.error}`,
      data: result,
    });
  }
}));

/**
 * POST /api/email/send
 * Send a custom email
 */
router.post('/send', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const { to, subject, html, text, attachments, provider, config, from } = req.body;

  // Validation
  if (!to) {
    return res.status(400).json({
      success: false,
      error: 'Recipient email address is required',
    });
  }

  if (!subject) {
    return res.status(400).json({
      success: false,
      error: 'Email subject is required',
    });
  }

  if (!html && !text) {
    return res.status(400).json({
      success: false,
      error: 'Email content (html or text) is required',
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const recipients = Array.isArray(to) ? to : [to];
  for (const email of recipients) {
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: `Invalid email address: ${email}`,
      });
    }
  }

  const result = await emailService.sendEmail(
    to,
    subject,
    html || text,
    text,
    attachments || [],
    { provider, config, from }
  );

  if (result.success) {
    res.json({
      success: true,
      data: result,
      message: 'Email sent successfully',
    });
  } else {
    res.status(500).json({
      success: false,
      error: result.error,
      message: `Failed to send email: ${result.error}`,
      data: result,
    });
  }
}));

/**
 * POST /api/email/notification
 * Send a notification email
 */
router.post('/notification', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const { to, title, message, actionUrl, provider, config } = req.body;

  if (!to || !title || !message) {
    return res.status(400).json({
      success: false,
      error: 'to, title, and message are required',
    });
  }

  const result = await emailService.sendNotificationEmail(
    to,
    title,
    message,
    actionUrl,
    { provider, config }
  );

  if (result.success) {
    res.json({
      success: true,
      data: result,
      message: 'Notification email sent successfully',
    });
  } else {
    res.status(500).json({
      success: false,
      error: result.error,
      message: `Failed to send notification email: ${result.error}`,
      data: result,
    });
  }
}));

/**
 * POST /api/email/report
 * Send a report email with attachment
 */
router.post('/report', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const { recipients, reportData, reportName, format, provider, config } = req.body;

  if (!recipients || !reportName) {
    return res.status(400).json({
      success: false,
      error: 'recipients and reportName are required',
    });
  }

  const result = await emailService.sendReportEmail(
    recipients,
    reportData,
    reportName,
    format || 'pdf',
    { provider, config }
  );

  if (result.success) {
    res.json({
      success: true,
      data: result,
      message: 'Report email sent successfully',
    });
  } else {
    res.status(500).json({
      success: false,
      error: result.error,
      message: `Failed to send report email: ${result.error}`,
      data: result,
    });
  }
}));

module.exports = router;
