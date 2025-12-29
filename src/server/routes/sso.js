/**
 * SSO (Single Sign-On) Routes
 * Handles OAuth 2.0 and SAML 2.0 authentication
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, requireAgencyContext } = require('../middleware/authMiddleware');
const ssoService = require('../services/ssoService');
const { generateToken, formatUserResponse } = require('../services/authService');
const { Pool } = require('pg');
const { parseDatabaseUrl } = require('../utils/poolManager');
const { getFrontendUrl } = require('../config/ports');

/**
 * GET /api/sso/providers
 * Get available SSO providers
 */
router.get('/providers', asyncHandler(async (req, res) => {
  const providers = Object.keys(ssoService.OAUTH_PROVIDERS).map(key => ({
    id: key,
    name: ssoService.OAUTH_PROVIDERS[key].name,
    type: 'oauth2',
  }));

  providers.push({
    id: 'saml2',
    name: 'SAML 2.0',
    type: 'saml2',
  });

  res.json({
    success: true,
    data: providers,
  });
}));

/**
 * GET /api/sso/config
 * Get SSO configuration for current agency
 * Requires authentication
 */
router.get('/config', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;

  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
  const agencyClient = await agencyPool.connect();

  try {
    const result = await agencyClient.query(
      `SELECT id, provider, provider_name, is_enabled, created_at, updated_at
       FROM public.sso_configurations
       ORDER BY provider_name`
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } finally {
    agencyClient.release();
    await agencyPool.end();
  }
}));

/**
 * POST /api/sso/config
 * Create or update SSO configuration
 * Requires authentication and admin role
 */
router.post('/config', authenticate, requireAgencyContext, asyncHandler(async (req, res) => {
  const agencyDatabase = req.user.agencyDatabase;
  const { provider, providerName, isEnabled, clientId, clientSecret, redirectUri, scopes, configData } = req.body;

  if (!provider || !providerName) {
    return res.status(400).json({
      success: false,
      error: 'Provider and provider name are required',
      message: 'Provider and provider name are required',
    });
  }

  const ssoConfig = {
    provider,
    providerName,
    isEnabled: isEnabled || false,
    clientId,
    clientSecret,
    redirectUri,
    scopes: Array.isArray(scopes) ? scopes : [],
    configData: configData || {},
  };

  const config = await ssoService.storeSSOConfig(agencyDatabase, ssoConfig);

  res.json({
    success: true,
    data: {
      id: config.id,
      provider: config.provider,
      providerName: config.provider_name,
      isEnabled: config.is_enabled,
    },
    message: 'SSO configuration saved successfully',
  });
}));

/**
 * GET /api/sso/oauth/:provider/authorize
 * Initiate OAuth 2.0 authorization flow
 */
router.get('/oauth/:provider/authorize', asyncHandler(async (req, res) => {
  const { provider } = req.params;
  const { agency_database, redirect_uri } = req.query;

  if (!agency_database) {
    return res.status(400).json({
      success: false,
      error: 'Agency database is required',
      message: 'Agency database parameter is required',
    });
  }

  // Get SSO configuration
  const ssoConfig = await ssoService.getSSOConfig(agency_database, 'oauth2', provider);
  if (!ssoConfig || !ssoConfig.is_enabled) {
    return res.status(404).json({
      success: false,
      error: 'SSO provider not configured or disabled',
      message: 'SSO provider is not configured for this agency',
    });
  }

  // Generate state token for CSRF protection
  const state = ssoService.generateStateToken();
  
  // Store state in session (in production, use Redis or secure session store)
  // For now, we'll include agency_database in state
  const stateData = {
    token: state,
    agencyDatabase: agency_database,
    redirectUri: redirect_uri || ssoConfig.redirect_uri,
    timestamp: Date.now(),
  };
  
  const encodedState = Buffer.from(JSON.stringify(stateData)).toString('base64');

  // Generate OAuth URL
  const authUrl = ssoService.generateOAuthUrl(
    provider,
    ssoConfig.client_id,
    ssoConfig.redirect_uri,
    encodedState,
    ssoConfig.scopes
  );

  res.json({
    success: true,
    data: {
      authUrl,
      state: encodedState,
    },
  });
}));

/**
 * GET /api/sso/oauth/:provider/callback
 * Handle OAuth 2.0 callback
 */
router.get('/oauth/:provider/callback', asyncHandler(async (req, res) => {
  const { provider } = req.params;
  const { code, state, error } = req.query;

  if (error) {
    return res.status(400).json({
      success: false,
      error: error,
      message: 'OAuth authorization failed',
    });
  }

  if (!code || !state) {
    return res.status(400).json({
      success: false,
      error: 'Missing authorization code or state',
      message: 'Authorization code and state are required',
    });
  }

  // Decode state
  let stateData;
  try {
    stateData = JSON.parse(Buffer.from(state, 'base64').toString());
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid state parameter',
      message: 'Invalid state parameter',
    });
  }

  const { agencyDatabase, redirectUri } = stateData;

  // Get SSO configuration
  const ssoConfig = await ssoService.getSSOConfig(agencyDatabase, 'oauth2', provider);
  if (!ssoConfig || !ssoConfig.is_enabled) {
    return res.status(404).json({
      success: false,
      error: 'SSO provider not configured',
      message: 'SSO provider is not configured for this agency',
    });
  }

  // Exchange code for token
  const tokenResponse = await ssoService.exchangeOAuthCode(
    provider,
    code,
    ssoConfig.client_id,
    ssoConfig.client_secret,
    ssoConfig.redirect_uri
  );

  // Get user info
  const userInfo = await ssoService.getOAuthUserInfo(provider, tokenResponse.access_token);

  // Find or create user
  const user = await ssoService.findOrCreateSSOUser(userInfo, agencyDatabase);

  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      error: 'User account is inactive',
      message: 'Your account has been deactivated',
    });
  }

  // Generate application token
  const { findUserAcrossAgencies } = require('../services/authService');
  const userData = await findUserAcrossAgencies(user.email, null); // SSO users don't need password check
  
  if (!userData) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
      message: 'User account not found',
    });
  }

  const token = generateToken(userData.user, userData.agency);
  const formattedUser = formatUserResponse(userData.user, userData.profile, userData.roles);

  // Redirect to frontend with token
  // Use FRONTEND_URL or build from port configuration
  const isDevelopment = process.env.NODE_ENV !== 'production' || 
                        process.env.VITE_APP_ENVIRONMENT === 'development';
  const defaultFrontendUrl = getFrontendUrl(isDevelopment);
  const frontendRedirect = redirectUri || `${process.env.FRONTEND_URL || defaultFrontendUrl}/auth/callback`;
  const redirectUrl = new URL(frontendRedirect);
  redirectUrl.searchParams.set('token', token);
  redirectUrl.searchParams.set('user', JSON.stringify(formattedUser));

  res.redirect(redirectUrl.toString());
}));

/**
 * POST /api/sso/saml/request
 * Generate SAML 2.0 authentication request
 */
router.post('/saml/request', asyncHandler(async (req, res) => {
  const { agency_database, provider_name } = req.body;

  if (!agency_database || !provider_name) {
    return res.status(400).json({
      success: false,
      error: 'Agency database and provider name are required',
      message: 'Agency database and provider name are required',
    });
  }

  // Get SAML configuration
  const samlConfig = await ssoService.getSSOConfig(agency_database, 'saml2', provider_name);
  if (!samlConfig || !samlConfig.is_enabled) {
    return res.status(404).json({
      success: false,
      error: 'SAML provider not configured',
      message: 'SAML provider is not configured for this agency',
    });
  }

  const relayState = ssoService.generateStateToken();
  const samlRequest = ssoService.generateSAMLRequest(
    {
      idpEntityId: samlConfig.idp_entity_id,
      idpLoginUrl: samlConfig.idp_login_url,
      idpSigningCert: samlConfig.idp_signing_cert,
      spEntityId: samlConfig.sp_entity_id,
      spPrivateKey: samlConfig.sp_private_key,
      spPrivateKeyPass: samlConfig.config_data?.sp_private_key_pass,
      acsUrl: samlConfig.acs_url,
    },
    relayState
  );

  res.json({
    success: true,
    data: {
      samlRequest: samlRequest.url,
      relayState: relayState,
    },
  });
}));

/**
 * POST /api/sso/saml/callback
 * Handle SAML 2.0 response
 */
router.post('/saml/callback', asyncHandler(async (req, res) => {
  const { SAMLResponse, RelayState, agency_database, provider_name } = req.body;

  if (!SAMLResponse || !RelayState || !agency_database || !provider_name) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters',
      message: 'SAML response, relay state, agency database, and provider name are required',
    });
  }

  // Get SAML configuration
  const samlConfig = await ssoService.getSSOConfig(agency_database, 'saml2', provider_name);
  if (!samlConfig || !samlConfig.is_enabled) {
    return res.status(404).json({
      success: false,
      error: 'SAML provider not configured',
      message: 'SAML provider is not configured for this agency',
    });
  }

  // Validate and parse SAML response
  const userInfo = await ssoService.validateSAMLResponse(
    {
      idpEntityId: samlConfig.idp_entity_id,
      idpLoginUrl: samlConfig.idp_login_url,
      idpSigningCert: samlConfig.idp_signing_cert,
      spEntityId: samlConfig.sp_entity_id,
      spPrivateKey: samlConfig.sp_private_key,
      spPrivateKeyPass: samlConfig.config_data?.sp_private_key_pass,
      acsUrl: samlConfig.acs_url,
    },
    SAMLResponse,
    RelayState
  );

  // Find or create user
  const user = await ssoService.findOrCreateSSOUser(userInfo, agency_database);

  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      error: 'User account is inactive',
      message: 'Your account has been deactivated',
    });
  }

  // Generate application token
  const { findUserAcrossAgencies } = require('../services/authService');
  const userData = await findUserAcrossAgencies(user.email, null);

  if (!userData) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
      message: 'User account not found',
    });
  }

  const token = generateToken(userData.user, userData.agency);
  const formattedUser = formatUserResponse(userData.user, userData.profile, userData.roles);

  res.json({
    success: true,
    data: {
      token,
      user: formattedUser,
    },
    message: 'SAML authentication successful',
  });
}));

module.exports = router;
