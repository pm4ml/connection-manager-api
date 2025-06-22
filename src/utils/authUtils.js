// Copyright 2025 ModusBox, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License").
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

// TODO: uncomment after TS migration
// const client = require('openid-client');
// const { jwtVerify, createRemoteJWKSet } = require('jose');
const Constants = require('../constants/Constants');

// TODO: remove after TS migration
const requireEsm = require('./requireEsm');

// Cache for the OpenID configuration
let oidcConfig = null;
let jwksVerifier = null;

/**
 * Initialize the OpenID configuration by performing discovery
 */
async function getOidcConfig() {
  if (oidcConfig) {
    return oidcConfig;
  }

  try {
    const client = await requireEsm('openid-client');
    oidcConfig = await client.discovery(
      URL.parse(Constants.OPENID.DISCOVERY_URL),
      Constants.OPENID.CLIENT_ID,
      Constants.OPENID.CLIENT_SECRET,
      undefined,
      {
        execute: Constants.OPENID.ALLOW_INSECURE ? [client.allowInsecureRequests] : [],
      }
    );

    return oidcConfig;
  } catch (error) {
    console.error('Failed to initialize OIDC configuration:', error);
    throw error;
  }
}

async function getJwtVerifier() {
  if (jwksVerifier) {
    return jwksVerifier;
  }
  const config = await getOidcConfig();
  const client = await requireEsm('openid-client');
  const { jwtVerify, createRemoteJWKSet } = await requireEsm('jose', false);
  const metadata = config.serverMetadata();
  jwksVerifier = createRemoteJWKSet(new URL(metadata.jwks_uri));
  return async (token) => {
    const { payload } = await jwtVerify(token, jwksVerifier, {
      issuer: metadata.issuer,
      audience: Constants.OPENID.AUDIENCE,
      clockTolerance: 60
    });
    return payload;
  };
}

/**
 * Generate authorization URL with PKCE
 */
async function getAuthorizationUrl() {
  const config = await getOidcConfig();
  const client = await requireEsm('openid-client');

  const codeVerifier = client.randomPKCECodeVerifier();
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);

  const state = client.randomState();
  const nonce = client.randomState();

  const authUrl = client.buildAuthorizationUrl(config, {
    client_id: Constants.OPENID.CLIENT_ID,
    redirect_uri: Constants.OPENID.CALLBACK,
    response_type: 'code',
    scope: 'openid profile email',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    nonce,
  });

  return {
    url: authUrl.toString(),
    codeVerifier,
    state,
    nonce
  };
}

/**
 * Handle the callback from the OpenID provider
 */
async function handleLoginCallback(req, state, codeVerifier, nonce) {
  const config = await getOidcConfig();
  const client = await requireEsm('openid-client');

  const currentUrl = new URL(
    `${req.protocol}://${req.get('host')}${req.originalUrl}`
  );

  // Exchange code for tokens
  const tokenSet = await client.authorizationCodeGrant(
    config,
    currentUrl,
    {
      redirectUri: Constants.OPENID.CALLBACK,
      pkceCodeVerifier: codeVerifier,
      expectedState: state,
      expectedNonce: nonce
    }
  );

  return {
    tokenSet,
    claims: tokenSet.claims(),
  };
}

/**
 * Initiates OIDC RP-Initiated Logout
 *
 * @param {string} idToken - The ID token from the current session
 * @param {string} returnTo
 * @returns {string} The logout URL
 */
async function getLogoutUrl(idToken, returnTo) {
  const config = await getOidcConfig();
  const client = await requireEsm('openid-client');

  const logoutUrl = client.buildEndSessionUrl(
    config,
    {
      id_token_hint: idToken,
      post_logout_redirect_uri: returnTo,
    }
  );

  return logoutUrl.toString();
}

/**
 * Extract roles from token claims
 */
function extractRoles(claims) {
  const {APPLICATION, MTA, PTA, DFSP, EVERYONE} = Constants.OPENID.GROUPS;
  const rolesMap = {
    [`${APPLICATION}/${MTA}`]: MTA.toLowerCase(),
    [`${APPLICATION}/${PTA}`]: PTA.toLowerCase(),
  };

  let isDfsp = false;
  const re = new RegExp(`^${APPLICATION}/${DFSP}:(.*)$`);

  const roles = claims.groups?.map(group => {
      // Convert group path to role name (e.g., "/admin" to "admin")
      const role = group.replace(/^\//, '');
      if (re.test(role)) {
        isDfsp = true;
        return role;
      } else if (rolesMap[role]) {
        return rolesMap[role];
      }
    })
      .filter(role => role);

  return [
    ...roles,
    ...(isDfsp ? [DFSP.toLowerCase()]: []),
    EVERYONE.toLowerCase()
  ];
}

/**
 * Validates a JWT access token against OIDC provider
 */
async function validateToken(token) {
  try {
    const jwtVerifier = await getJwtVerifier();
    const payload = await jwtVerifier(token);
    return {
      id: payload.sub,
      name: payload.name || payload.preferred_username,
      email: payload.email,
      roles: extractRoles(payload)
    };
  } catch (error) {
    console.error('Token validation failed:', error);
    throw error;
  }
}

module.exports = {
  getOidcConfig,
  getAuthorizationUrl,
  handleLoginCallback,
  getLogoutUrl,
  extractRoles,
  validateToken,
};
