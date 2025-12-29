/**
 * SSO (Single Sign-On) Service
 * Supports OAuth 2.0 and SAML 2.0 authentication
 */

const crypto = require('crypto');
const { Pool } = require('pg');
const { parseDatabaseUrl } = require('../utils/poolManager');

/**
 * OAuth 2.0 Provider Configuration
 */
const OAUTH_PROVIDERS = {
  google: {
    name: 'Google',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scopes: ['openid', 'email', 'profile'],
  },
  microsoft: {
    name: 'Microsoft',
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    scopes: ['openid', 'email', 'profile'],
  },
  github: {
    name: 'GitHub',
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    scopes: ['user:email'],
  },
};

/**
 * Generate OAuth 2.0 authorization URL
 * @param {string} provider - OAuth provider (google, microsoft, github)
 * @param {string} clientId - OAuth client ID
 * @param {string} redirectUri - Redirect URI after authorization
 * @param {string} state - CSRF protection state token
 * @param {string[]} scopes - Optional custom scopes
 * @returns {string} Authorization URL
 */
function generateOAuthUrl(provider, clientId, redirectUri, state, scopes = null) {
  const providerConfig = OAUTH_PROVIDERS[provider];
  if (!providerConfig) {
    throw new Error(`Unsupported OAuth provider: ${provider}`);
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: (scopes || providerConfig.scopes).join(' '),
    state: state,
    access_type: 'offline', // For refresh tokens
    prompt: 'consent', // Force consent screen
  });

  return `${providerConfig.authUrl}?${params.toString()}`;
}

/**
 * Exchange OAuth authorization code for access token
 * @param {string} provider - OAuth provider
 * @param {string} code - Authorization code
 * @param {string} clientId - OAuth client ID
 * @param {string} clientSecret - OAuth client secret
 * @param {string} redirectUri - Redirect URI
 * @returns {Promise<Object>} Token response with access_token, refresh_token, etc.
 */
async function exchangeOAuthCode(provider, code, clientId, clientSecret, redirectUri) {
  const providerConfig = OAUTH_PROVIDERS[provider];
  if (!providerConfig) {
    throw new Error(`Unsupported OAuth provider: ${provider}`);
  }

  const tokenParams = {
    client_id: clientId,
    client_secret: clientSecret,
    code: code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  };

  const response = await fetch(providerConfig.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams(tokenParams).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OAuth token exchange failed: ${error}`);
  }

  return await response.json();
}

/**
 * Get user information from OAuth provider
 * @param {string} provider - OAuth provider
 * @param {string} accessToken - OAuth access token
 * @returns {Promise<Object>} User information
 */
async function getOAuthUserInfo(provider, accessToken) {
  const providerConfig = OAUTH_PROVIDERS[provider];
  if (!providerConfig) {
    throw new Error(`Unsupported OAuth provider: ${provider}`);
  }

  const response = await fetch(providerConfig.userInfoUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user info from ${provider}`);
  }

  const userInfo = await response.json();

  // Normalize user info across providers
  return {
    email: userInfo.email || userInfo.userPrincipalName || userInfo.login,
    name: userInfo.name || userInfo.displayName || userInfo.login,
    picture: userInfo.picture || userInfo.avatar_url,
    provider: provider,
    providerId: userInfo.id || userInfo.sub,
    raw: userInfo,
  };
}

/**
 * Find or create user from SSO
 * @param {Object} userInfo - Normalized user info from OAuth provider
 * @param {string} agencyDatabase - Agency database name
 * @returns {Promise<Object>} User object with agency context
 */
async function findOrCreateSSOUser(userInfo, agencyDatabase) {
  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
  const agencyClient = await agencyPool.connect();

  try {
    // Check if user exists by email
    const userResult = await agencyClient.query(
      `SELECT id, email, is_active FROM public.users WHERE email = $1`,
      [userInfo.email]
    );

    if (userResult.rows.length > 0) {
      const existingUser = userResult.rows[0];
      
      // Update SSO provider info if needed
      await agencyClient.query(
        `UPDATE public.users 
         SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || $1::jsonb,
             last_sign_in_at = NOW()
         WHERE id = $2`,
        [JSON.stringify({ sso_provider: userInfo.provider, sso_id: userInfo.providerId }), existingUser.id]
      );

      return {
        id: existingUser.id,
        email: existingUser.email,
        isActive: existingUser.is_active,
        isNew: false,
      };
    }

    // Create new user
    const crypto = require('crypto');
    const userId = crypto.randomUUID();
    
    await agencyClient.query(
      `INSERT INTO public.users (id, email, password_hash, email_confirmed, is_active, raw_user_meta_data, created_at, updated_at)
       VALUES ($1, $2, $3, true, true, $4, NOW(), NOW())`,
      [
        userId,
        userInfo.email,
        crypto.randomBytes(32).toString('hex'), // Random password (SSO users don't need password)
        JSON.stringify({
          sso_provider: userInfo.provider,
          sso_id: userInfo.providerId,
          sso_name: userInfo.name,
          sso_picture: userInfo.picture,
        }),
      ]
    );

    // Create profile
    await agencyClient.query(
      `INSERT INTO public.profiles (user_id, full_name, avatar_url, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())`,
      [userId, userInfo.name, userInfo.picture]
    );

    return {
      id: userId,
      email: userInfo.email,
      isActive: true,
      isNew: true,
    };
  } finally {
    agencyClient.release();
    await agencyPool.end();
  }
}

/**
 * Generate SAML 2.0 authentication request
 * @param {Object} samlConfig - SAML configuration
 * @param {string} relayState - Relay state for redirect after auth
 * @returns {string} SAML AuthnRequest XML
 */
function generateSAMLRequest(samlConfig, relayState) {
  const saml = require('samlify');
  const { IdentityProvider, ServiceProvider } = saml;

  const sp = ServiceProvider({
    entityID: samlConfig.spEntityId,
    authnRequestsSigned: false,
    wantAssertionsSigned: true,
    wantMessageSigned: true,
    wantLogoutResponseSigned: true,
    wantLogoutRequestSigned: true,
    privateKey: samlConfig.spPrivateKey,
    privateKeyPass: samlConfig.spPrivateKeyPass,
    isAssertionEncrypted: false,
    assertionConsumerService: [{
      Binding: saml.Constants.namespace.binding.post,
      Location: samlConfig.acsUrl,
    }],
  });

  const idp = IdentityProvider({
    entityID: samlConfig.idpEntityId,
    loginUrl: samlConfig.idpLoginUrl,
    wantLogoutRequestSigned: true,
    wantLogoutResponseSigned: true,
    wantMessageSigned: true,
    signingCert: samlConfig.idpSigningCert,
  });

  const { context } = sp.createLoginRequest(idp, 'redirect');
  return {
    url: context,
    relayState: relayState,
  };
}

/**
 * Validate and parse SAML response
 * @param {Object} samlConfig - SAML configuration
 * @param {string} samlResponse - SAML response XML
 * @param {string} relayState - Original relay state
 * @returns {Promise<Object>} Parsed SAML attributes
 */
async function validateSAMLResponse(samlConfig, samlResponse, relayState) {
  const saml = require('samlify');
  const { IdentityProvider, ServiceProvider } = saml;

  const sp = ServiceProvider({
    entityID: samlConfig.spEntityId,
    authnRequestsSigned: false,
    wantAssertionsSigned: true,
    wantMessageSigned: true,
    wantLogoutResponseSigned: true,
    wantLogoutRequestSigned: true,
    privateKey: samlConfig.spPrivateKey,
    privateKeyPass: samlConfig.spPrivateKeyPass,
    isAssertionEncrypted: false,
    assertionConsumerService: [{
      Binding: saml.Constants.namespace.binding.post,
      Location: samlConfig.acsUrl,
    }],
  });

  const idp = IdentityProvider({
    entityID: samlConfig.idpEntityId,
    loginUrl: samlConfig.idpLoginUrl,
    wantLogoutRequestSigned: true,
    wantLogoutResponseSigned: true,
    wantMessageSigned: true,
    signingCert: samlConfig.idpSigningCert,
  });

  const { extract } = await sp.parseLoginResponse(idp, 'post', { SAMLResponse: samlResponse, RelayState: relayState });
  
  return {
    email: extract.attributes.email || extract.attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
    name: extract.attributes.name || extract.attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'],
    provider: 'saml',
    providerId: extract.attributes.nameID || extract.attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'],
    raw: extract.attributes,
  };
}

/**
 * Store SSO configuration for an agency
 * @param {string} agencyDatabase - Agency database name
 * @param {Object} ssoConfig - SSO configuration
 * @returns {Promise<Object>} Stored configuration
 */
async function storeSSOConfig(agencyDatabase, ssoConfig) {
  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
  const agencyClient = await agencyPool.connect();

  try {
    // Check if SSO config table exists, create if not
    await agencyClient.query(`
      CREATE TABLE IF NOT EXISTS public.sso_configurations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        provider VARCHAR(50) NOT NULL, -- 'oauth2' or 'saml2'
        provider_name VARCHAR(100) NOT NULL, -- 'google', 'microsoft', 'okta', etc.
        is_enabled BOOLEAN DEFAULT false,
        client_id TEXT,
        client_secret TEXT, -- Encrypted
        redirect_uri TEXT,
        scopes TEXT[],
        idp_entity_id TEXT, -- For SAML
        idp_login_url TEXT, -- For SAML
        idp_signing_cert TEXT, -- For SAML
        sp_entity_id TEXT, -- For SAML
        sp_private_key TEXT, -- For SAML (encrypted)
        acs_url TEXT, -- Assertion Consumer Service URL for SAML
        metadata_url TEXT, -- For SAML metadata
        config_data JSONB, -- Additional provider-specific config
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(provider, provider_name)
      );
    `);

    // Insert or update configuration
    const result = await agencyClient.query(
      `INSERT INTO public.sso_configurations 
       (provider, provider_name, is_enabled, client_id, client_secret, redirect_uri, scopes, config_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (provider, provider_name) 
       DO UPDATE SET
         is_enabled = EXCLUDED.is_enabled,
         client_id = EXCLUDED.client_id,
         client_secret = EXCLUDED.client_secret,
         redirect_uri = EXCLUDED.redirect_uri,
         scopes = EXCLUDED.scopes,
         config_data = EXCLUDED.config_data,
         updated_at = NOW()
       RETURNING *`,
      [
        ssoConfig.provider,
        ssoConfig.providerName,
        ssoConfig.isEnabled || false,
        ssoConfig.clientId,
        ssoConfig.clientSecret, // Should be encrypted in production
        ssoConfig.redirectUri,
        ssoConfig.scopes || [],
        JSON.stringify(ssoConfig.configData || {}),
      ]
    );

    return result.rows[0];
  } finally {
    agencyClient.release();
    await agencyPool.end();
  }
}

/**
 * Get SSO configuration for an agency
 * @param {string} agencyDatabase - Agency database name
 * @param {string} provider - Provider type ('oauth2' or 'saml2')
 * @param {string} providerName - Provider name (e.g., 'google', 'okta')
 * @returns {Promise<Object|null>} SSO configuration
 */
async function getSSOConfig(agencyDatabase, provider, providerName) {
  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
  const agencyClient = await agencyPool.connect();

  try {
    const result = await agencyClient.query(
      `SELECT * FROM public.sso_configurations 
       WHERE provider = $1 AND provider_name = $2 AND is_enabled = true`,
      [provider, providerName]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  } finally {
    agencyClient.release();
    await agencyPool.end();
  }
}

/**
 * Generate secure state token for OAuth
 * @returns {string} State token
 */
function generateStateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Verify state token (CSRF protection)
 * @param {string} receivedState - State from OAuth callback
 * @param {string} originalState - Original state stored in session
 * @returns {boolean} True if valid
 */
function verifyStateToken(receivedState, originalState) {
  return crypto.timingSafeEqual(
    Buffer.from(receivedState),
    Buffer.from(originalState)
  );
}

module.exports = {
  generateOAuthUrl,
  exchangeOAuthCode,
  getOAuthUserInfo,
  findOrCreateSSOUser,
  generateSAMLRequest,
  validateSAMLResponse,
  storeSSOConfig,
  getSSOConfig,
  generateStateToken,
  verifyStateToken,
  OAUTH_PROVIDERS,
};
