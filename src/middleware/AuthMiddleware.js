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

const Constants = require('../constants/Constants');
const { validateToken } = require('../utils/authUtils');
const PkiService = require("../service/PkiService");

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

    if (user.roles.includes('pta')) {
      return true;
    }

    if (!scopes.some(role => user.roles.includes(role))) {
      console.log(`API defined scopes: user ${JSON.stringify(user)} does not have the required roles ${JSON.stringify(scopes)}`);
      error = new Error(`user does not have the required roles ${scopes}`);
      error.statusCode = 403;
      error.headers = { 'X-AUTH-ERROR': error.message };
      throw error;
    }

    if (/\/dfsps\/{dfspId}/.test(apiPath)) {
      const { dfspId } = req.openapi.pathParams;
      return PkiService.getDFSPById(req.context, dfspId)
        .then(dfsp => {
          if (!dfsp.securityGroup || user.roles.includes(dfsp.securityGroup)) {
            return true;
          } else {
            console.log(`DFSP specific scopes: user ${JSON.stringify(user)} does not have the required role ${dfsp.securityGroup}`);
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
