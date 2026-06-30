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
const HydraService = require('./HydraService');
const KratosService = require('./KratosService');
const KetoClient = require('../utils/KetoClient');
const formatValidator = require('../utils/formatValidator');
const { logger } = require('../log/logger');

const log = logger.child({ component: 'DfspIamService' });

let ketoClientCache = null;
const getKetoClient = () => {
  if (!ketoClientCache) {
    ketoClientCache = new KetoClient(Constants.KETO.WRITE_URL, Constants.KETO.READ_URL, Constants.KETO.HUB_OBJECT);
  }
  return ketoClientCache;
};

/**
 * IAM provisioning facade. This is the only module that knows DFSP onboarding
 * spans Hydra (machine OAuth2 client), Kratos (admin identity) and Keto
 * (permission tuples). Runtime authorization is enforced entirely by the
 * Oathkeeper gateway against the OPL model in permissions/mcm.keto.ts; the
 * rest of the application never consults IAM.
 *
 * Tuples written per DFSP:
 *   Dfsp:<id>#parent@Hub:<hub>             (hub admins inherit access)
 *   Dfsp:<id>#members@<kratos identity id> (human admin)
 *   Dfsp:<id>#members@<hydra client_id>    (PM4ML machine client; client_id = dfspId)
 */

/**
 * Provisions all IAM resources for a new DFSP. Rolls everything back on
 * failure. No-op when IAM is disabled.
 *
 * @param {string} dfspId
 * @param {string} email  the DFSP admin's email; receives the invitation
 */
exports.provisionDfsp = async (dfspId, email) => {
  if (!Constants.IAM.ENABLED || !Constants.IAM.AUTO_CREATE_ACCOUNTS) return;

  formatValidator.validateDfspId(dfspId);
  formatValidator.validateEmail(email);

  const keto = getKetoClient();
  let clientCreated = false;
  let identityId = null;

  try {
    await HydraService.createPM4MLClient(dfspId);
    clientCreated = true;

    ({ identityId } = await KratosService.createIdentity(email, dfspId));

    await keto.createDfsp(dfspId);
    await keto.addDfspMember(identityId, dfspId);
    await keto.addDfspMember(dfspId, dfspId);

    await KratosService.sendInvitationEmail(email);
    log.info(`Provisioned IAM for DFSP ${dfspId}`, { identityId });
  } catch (err) {
    log.error(`IAM provisioning failed for DFSP ${dfspId}, rolling back`, { message: err.message });
    await keto.deleteDfsp(dfspId).catch((e) => log.warn('Keto rollback failed', { e: e.message }));
    if (identityId) {
      await KratosService.deleteIdentity(identityId).catch((e) => log.warn('Kratos rollback failed', { e: e.message }));
    }
    if (clientCreated) {
      await HydraService.deleteClient(dfspId).catch((e) => log.warn('Hydra rollback failed', { e: e.message }));
    }
    throw err;
  }
};

/**
 * Tears down all IAM resources of a DFSP: the human members' Kratos
 * identities (retained while they belong to another DFSP), the Hydra machine
 * client, and every Keto tuple of the DFSP. No-op when IAM is disabled.
 *
 * @param {string} dfspId
 */
exports.deprovisionDfsp = async (dfspId) => {
  if (!Constants.IAM.ENABLED) return;

  const keto = getKetoClient();
  const memberIds = await keto.listDfspMembers(dfspId);
  for (const subjectId of memberIds) {
    if (subjectId === dfspId) continue;
    const hasOthers = await keto.hasOtherDfspMemberships(subjectId, dfspId);
    if (!hasOthers) {
      await KratosService.deleteIdentity(subjectId);
    } else {
      log.info(`Identity ${subjectId} retained, still a member of other DFSPs`);
    }
  }

  await HydraService.deleteClient(dfspId);
  await keto.deleteDfsp(dfspId);
  log.info(`Deprovisioned IAM for DFSP ${dfspId}`);
};

/**
 * Returns fresh PM4ML credentials for the DFSP: rotates the machine client's
 * secret, creating the client if it doesn't exist yet.
 *
 * @param {string} dfspId
 * @returns {Promise<{clientId: string, clientSecret: string}>}
 */
exports.rotateDfspClientCredentials = async (dfspId) => {
  const existing = await HydraService.getClient(dfspId);
  return existing
    ? HydraService.rotateClientSecret(dfspId)
    : HydraService.createPM4MLClient(dfspId);
};
