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
const { validateToken } = require('../utils/authUtils');
const PkiService = require("../service/PkiService");
const { logger } = require('../log/logger');

/**
 * Middleware to handle authentication for both browser and machine clients
 */
exports.createAuthMiddleware = () => {
  return async (req, res, next) => {
    if (!Constants.OPENID.ENABLED) {
      return next();
    }

    try {
      const authHeader = req.headers.authorization || '';

      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);

        try {
          req.user = await validateToken(token);
        } catch (tokenError) {
          console.error('Token validation error:', tokenError);
        }

        return next();
      } else if (req.session?.user) {
        req.user = req.session.user;
      }

      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      next(error);
    }
  };
};

/**
 * Creates an OAuth2 handler for use with oas3-tools security
 */
exports.createOAuth2Handler = () => {
  return async (req, scopes, schema) => {
    const { user } = req;
    const apiPath = req.openapi?.openApiRoute;
    let error = null;

    if (!user?.roles) {
      error = new Error('Authentication required');
      error.statusCode = 401;
      error.headers = { 'X-AUTH-ERROR': error.message };
      throw error;
    }

    if (!scopes.some(role => user.roles.includes(role))) {
      logger.info(`API defined scopes: user does not have the required roles (See object)`, { user, scopes});
      error = new Error(`user does not have the required roles ${scopes}`);
      error.statusCode = 403;
      error.headers = { 'X-AUTH-ERROR': error.message };
      throw error;
    }

    if (/\/dfsps\/{dfspId}/.test(apiPath)) {
      if (user.roles.includes('pta')) {
        return true;
      }

      const { dfspId } = req.openapi.pathParams;
      return PkiService.getDFSPById(req.context, dfspId)
        .then(dfsp => {
          if (!dfsp.securityGroup || user.roles.includes(dfsp.securityGroup)) {
            return true;
          } else {
            logger.info(`DFSP specific scopes: user does not have the required role`, { user, securityGroup: dfsp.securityGroup });
            error = new Error(`user does not have the required role ${dfsp.securityGroup}`);
            error.statusCode = 403;
            error.headers = { 'X-AUTH-ERROR': error.message };
            throw error;
          }
        })
        .catch(err => {
          error = new Error(err.message);
          error.statusCode = 500;
          error.headers = { 'X-AUTH-ERROR': error.message };
          throw error;
        });
    }
    return true;
  };
};
