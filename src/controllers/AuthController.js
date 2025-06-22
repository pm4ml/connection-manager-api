/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Mojaloop Foundation

 --------------
 ******/

'use strict';

const Constants = require('../constants/Constants');
const { getAuthorizationUrl, handleLoginCallback, getLogoutUrl, extractRoles } = require('../utils/authUtils');

/**
 * Initiates the login process by redirecting to the OpenID provider
 */
exports.login = async (req, res) => {
  try {
    if (!Constants.OPENID.ENABLED) {
      return res.status(404).json({ error: 'Authentication not enabled' });
    }

    const { url, codeVerifier, state, nonce } = await getAuthorizationUrl();

    req.session.authParams = {
      codeVerifier,
      state,
      nonce
    };

    req.session.returnTo = req.query.return_to;

    res.redirect(url);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Handles the login callback from the OpenID provider
 */
exports.callback = async (req, res) => {
  try {
    if (!Constants.OPENID.ENABLED) {
      return res.status(404).json({ error: 'Authentication not enabled' });
    }

    if (!req.session.authParams) {
      return res.status(400).json({ error: 'Invalid session, please try logging in again' });
    }

    const { codeVerifier, state, nonce } = req.session.authParams;
    const returnTo = req.session.returnTo;

    delete req.session.authParams;
    delete req.session.returnTo;

    const tokenData = await handleLoginCallback(req, state, codeVerifier, nonce);

    // Store the token set in the session for logout
    req.session.tokenSet = tokenData.tokenSet;

    req.session.user = {
      id: tokenData.claims.sub,
      name: tokenData.claims.name || tokenData.claims.preferred_username,
      email: tokenData.claims.email,
      roles: extractRoles(tokenData.claims)
    };

    res.redirect(returnTo);
  } catch (error) {
    console.error('Callback error:', error);
    res.status(500).json({ error: 'Authentication callback failed: ' + error.message });
  }
};

/**
 * Logs out the user by clearing the session
 */
exports.logout = async (req, res) => {
  try {
    if (!Constants.OPENID.ENABLED) {
      return res.status(404).json({ error: 'Authentication not enabled' });
    }

    req.session.returnTo = req.query.return_to;

    if (!req.session.tokenSet?.id_token) {
      // If no ID token is available, just destroy the session and redirect
      req.session.destroy(() => {
        res.redirect(req.query.return_to);
      });
      return;
    }

    const logoutUrl = await getLogoutUrl(req.session.tokenSet.id_token, req.query.return_to);

    req.session.destroy(() => {
      res.redirect(logoutUrl);
    });
  } catch (error) {
    console.error('Logout error:', error);
    // If there's an error, just destroy the session and redirect
    req.session.destroy(() => {
      res.redirect(req.query.return_to);
    });
  }
};

/**
 * Returns user profile information from the session
 */
exports.profile = async (req, res) => {
  try {
    if (!Constants.OPENID.ENABLED) {
      return res.status(404).json({ error: 'Authentication not enabled' });
    }

    if (!req.session.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userProfile = {
      name: req.session.user.name,
      email: req.session.user.email,
      roles: req.session.user.roles,
    };

    return res.json(userProfile);
  } catch (error) {
    console.error('Profile error:', error);
    return res.status(500).json({ error: 'Failed to retrieve profile' });
  }
};
