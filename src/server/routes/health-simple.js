/**
 * Simple Health Check Route
 * Returns 200 immediately - used for container health checks during startup
 */

const express = require('express');
const router = express.Router();

/**
 * GET /health
 * Simple health check - just confirms server is running
 * Always returns 200 to allow container to be marked healthy during startup
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Server is running',
  });
});

module.exports = router;

