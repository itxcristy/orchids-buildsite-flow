/**
 * API Documentation Routes
 * Provides Swagger/OpenAPI documentation
 */

const express = require('express');
const router = express.Router();
const { getBackendUrl } = require('../config/ports');

/**
 * GET /api-docs
 * Serve API documentation (Swagger UI)
 */
router.get('/', (req, res) => {
  // In production, would serve Swagger UI
  // For now, return JSON schema
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'BuildFlow ERP API',
      version: '1.0.0',
      description: 'Comprehensive ERP API for BuildFlow Agency Management System',
    },
    servers: [
      {
        url: process.env.API_URL || getBackendUrl(process.env.NODE_ENV !== 'production'),
        description: 'API Server',
      },
    ],
    paths: {
      '/api/auth/login': {
        post: {
          summary: 'User Login',
          description: 'Authenticate user and get access token',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                    twoFactorToken: { type: 'string' },
                    recoveryCode: { type: 'string' },
                  },
                  required: ['email', 'password'],
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Login successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      token: { type: 'string' },
                      user: { type: 'object' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      // Add more endpoints as needed
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  });
});

module.exports = router;
