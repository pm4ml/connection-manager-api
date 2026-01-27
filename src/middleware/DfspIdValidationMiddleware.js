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

const { logger } = require('../log/logger');

/**
 * Middleware to validate that the dfspId in the path matches the x-client-id header
 * Similar to fspiop-source validation in central-services-shared
 */
exports.createDfspIdValidationMiddleware = () => {
  return (req, res, next) => {
    try {
      // Extract x-client-id from headers (case-insensitive)
      const clientId = req.headers['x-client-id'];

      // Skip validation if x-client-id is not present
      if (!clientId) {
        return next();
      }

      // Check if the request has a dfspId path parameter
      // This uses OpenAPI path parameter parsing, which automatically distinguishes
      // between DFSP-specific paths like /api/dfsps/{dfspId}/* and aggregate endpoints
      // like /api/dfsps/jwscerts (which don't have dfspId in their OpenAPI definition)
      const dfspIdFromPath = req.openapi?.pathParams?.dfspId;

      if (!dfspIdFromPath) {
        // Not a DFSP-specific path (either no openapi context yet, or no dfspId param)
        return next();
      }

      // Validate that dfspId matches x-client-id (case-sensitive comparison)
      if (dfspIdFromPath !== clientId) {
        logger.warn('DFSP ID validation failed', {
          path: req.path,
          dfspIdFromPath,
          clientId,
          method: req.method
        });

        return res.status(403).json({
          error: 'Forbidden',
          message: `DFSP ID in path (${dfspIdFromPath}) does not match x-client-id header (${clientId})`
        });
      }

      // Validation passed
      logger.debug('DFSP ID validation passed', {
        path: req.path,
        dfspId: dfspIdFromPath,
        clientId
      });

      next();
    } catch (error) {
      logger.error('DFSP ID validation middleware error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Error validating DFSP ID'
      });
    }
  };
};
