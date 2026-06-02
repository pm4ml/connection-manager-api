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

const parseRoles = (raw) => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return raw.split(',').map((r) => r.trim()).filter(Boolean);
  }
};

/**
 * Trusts request headers set by the upstream Oathkeeper gateway.
 * Authorization is enforced by Oathkeeper+Keto; this middleware only surfaces
 * the authenticated subject so controllers can audit-log who made a request.
 *
 *   X-User    — Kratos identity ID or Hydra client_id
 *   X-Email   — email from Kratos identity traits
 *   X-DFSP-ID — DFSP context (from Oathkeeper URL match)
 *   X-Roles   — Keto-derived roles (JSON array or comma-separated)
 */
exports.createHeaderTrustMiddleware = () => (req, res, next) => {
  try {
    const id = req.headers['x-user'];
    const email = req.headers['x-email'];
    const dfspId = req.headers['x-dfsp-id'];
    const roles = parseRoles(req.headers['x-roles']);

    if (id || email || dfspId || roles.length) {
      req.user = { id, email, dfspId, roles };
    }
  } catch (err) {
    logger.error('Header-trust middleware error:', err);
  }
  next();
};
