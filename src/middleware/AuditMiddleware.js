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
 * decker757

 --------------
 ******/


'use strict';

const AuditService = require('../service/AuditService');
const { logger } = require('../log/logger');

const AUDITED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

const METHOD_TO_ACTION = {
  GET: 'READ',
  POST: 'CREATE',
  PUT: 'UPDATE',
  PATCH: 'UPDATE',
  DELETE: 'DELETE',
};

// Have to clarify if we want to establish the endpoints from KeycloakService
const IAM_PATHS = new Set(['roles', 'permissions', 'members', 'membership', 'users', 'groups']);

/**
 * Extracts the entity type and ID from the request path.
 * e.g. /api/roles/123 → { entityType: 'roles', entityId: '123' }
 */
function extractEntity(path) {
  const segments = path.replace(/^\/+/, '').split('/').filter(Boolean);
  // Skip leading 'api' segment if present
  const start = segments[0] === 'api' ? 1 : 0;
  const entityType = segments[start] || null;
  const entityId = segments[start + 1] || null;
  return { entityType, entityId };
}

exports.createAuditMiddleware = () => {
  return async (req, res, next) => {
    try {
      if (!AUDITED_METHODS.has(req.method)) {
        return next();
      }

      const firstSegment = req.path.split('/').filter(Boolean)[0];
      if (!IAM_PATHS.has(firstSegment)) {
        return next();
      }

      const action = METHOD_TO_ACTION[req.method];
      const actor = req.user?.id || null;
      const { entityType, entityId } = extractEntity(req.path);
      const beforeState = req.body && Object.keys(req.body).length > 0 ? req.body : null;

      const originalJson = res.json.bind(res);
      res.json = function (body) {
        res.json = originalJson;

        const afterState = res.statusCode >= 200 && res.statusCode < 300 ? body : null;

        AuditService.createAuditEntry({
          actor,
          action,
          entityType,
          entityId,
          beforeState: action !== 'CREATE' ? beforeState : null,
          afterState,
        }).catch((err) => logger.error('Failed to write audit log entry:', err));

        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.error('Audit middleware error:', error);
      next(error);
    }
  };
};
