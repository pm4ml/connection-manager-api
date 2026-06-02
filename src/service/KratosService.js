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

const { Configuration, IdentityApi, FrontendApi } = require('@ory/kratos-client');
const Constants = require('../constants/Constants');
const InternalError = require('../errors/InternalError');
const NotFoundError = require('../errors/NotFoundError');
const KetoClient = require('../utils/KetoClient');
const { logger } = require('../log/logger');

const log = logger.child({ component: 'KratosService' });

let identityApiCache = null;
const getIdentityApi = () => {
  if (!identityApiCache) {
    identityApiCache = new IdentityApi(new Configuration({ basePath: Constants.KRATOS.ADMIN_URL }));
  }
  return identityApiCache;
};

let frontendApiCache = null;
const getFrontendApi = () => {
  if (!frontendApiCache) {
    frontendApiCache = new FrontendApi(new Configuration({ basePath: Constants.KRATOS.PUBLIC_URL }));
  }
  return frontendApiCache;
};

let ketoClientCache = null;
const getKetoClient = () => {
  if (!ketoClientCache) {
    ketoClientCache = new KetoClient(Constants.KETO.WRITE_URL, Constants.KETO.READ_URL);
  }
  return ketoClientCache;
};

const handleApiError = (error, operation, ctx = {}) => {
  const status = error?.response?.status;
  const body = error?.response?.data;
  log.error(`Kratos ${operation} failed`, { status, body, ctx, message: error.message });
  if (status === 404) {
    throw new NotFoundError(`Kratos resource not found for ${operation}`);
  }
  throw new InternalError(`Failed to ${operation}: ${error.message}`);
};

/**
 * Creates a Kratos identity with traits {email, dfspId, role}.
 * The identity has an unverified email; password is set later via recovery flow.
 *
 * @param {string} email
 * @param {string} dfspId  (optional — undefined for hub admins)
 * @param {string} role    (e.g. "dfsp", "pta", "mta")
 * @returns {Promise<{identityId: string}>}
 */
exports.createIdentity = async (email, dfspId, role) => {
  const api = getIdentityApi();
  const traits = { email };
  if (dfspId) traits.dfspId = dfspId;
  if (role) traits.role = role;

  try {
    const { data } = await api.createIdentity({
      createIdentityBody: {
        schema_id: Constants.KRATOS.IDENTITY_SCHEMA_ID,
        traits,
        verifiable_addresses: [{ value: email, via: 'email', verified: false, status: 'pending' }],
      },
    });
    log.info(`Created Kratos identity ${data.id} for ${email}`, { dfspId, role });
    return { identityId: data.id };
  } catch (error) {
    if (error?.response?.status === 409) {
      log.info(`Kratos identity already exists for ${email}, returning existing`);
      const existing = await exports.findIdentityByEmail(email);
      if (existing) return { identityId: existing.id };
    }
    handleApiError(error, 'createIdentity', { email });
  }
};

/**
 * Looks up an identity by email trait. Returns null if not found.
 *
 * @param {string} email
 */
exports.findIdentityByEmail = async (email) => {
  const api = getIdentityApi();
  try {
    const { data } = await api.listIdentities({ credentialsIdentifier: email });
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  } catch (error) {
    handleApiError(error, 'findIdentityByEmail', { email });
  }
};

/**
 * Triggers a Kratos recovery flow for the given identity's email. Kratos's
 * configured courier dispatches the recovery email (containing a one-time code
 * or link) so the user can complete the invitation by setting a password.
 *
 * @param {string} email
 */
exports.sendInvitationEmail = async (email) => {
  if (!email) {
    log.warn('No email provided, skipping invitation');
    return;
  }
  const api = getFrontendApi();
  try {
    const { data: flow } = await api.createNativeRecoveryFlow();
    await api.updateRecoveryFlow({
      flow: flow.id,
      updateRecoveryFlowBody: { method: 'code', email },
    });
    log.info(`Triggered Kratos recovery flow (invitation) for ${email}`);
  } catch (error) {
    handleApiError(error, 'sendInvitationEmail', { email });
  }
};

/**
 * Deletes a Kratos identity. Returns silently if the identity doesn't exist.
 *
 * @param {string} identityId
 */
exports.deleteIdentity = async (identityId) => {
  const api = getIdentityApi();
  try {
    await api.deleteIdentity({ id: identityId });
    log.info(`Deleted Kratos identity ${identityId}`);
  } catch (error) {
    if (error?.response?.status === 404) {
      log.info(`No Kratos identity to delete: ${identityId}`);
      return;
    }
    handleApiError(error, 'deleteIdentity', { identityId });
  }
};

/**
 * Assigns a role to an identity via Keto relation tuples.
 *
 * @param {string} identityId  Kratos identity ID
 * @param {string} dfspId      DFSP scope (omit for non-DFSP roles)
 */
exports.assignDfspRole = async (identityId, dfspId) => {
  const keto = getKetoClient();
  await keto.createDfspRole(dfspId);
  await keto.assignUserToDfspRole(identityId, dfspId);
  log.info(`Assigned identity ${identityId} to DFSP role ${dfspId}`);
};

/**
 * Removes an identity from a DFSP role.
 */
exports.removeDfspRole = async (identityId, dfspId) => {
  const keto = getKetoClient();
  await keto.removeUserFromDfspRole(identityId, dfspId);
  log.info(`Removed identity ${identityId} from DFSP role ${dfspId}`);
};

/**
 * Deletes the DFSP role itself (after all members removed).
 */
exports.deleteDfspRole = async (dfspId) => {
  const keto = getKetoClient();
  await keto.deleteDfspRole(dfspId);
  log.info(`Deleted Keto DFSP role ${dfspId}`);
};

/**
 * Removes every direct Kratos-identity member from the dfsp:{dfspId} Keto role,
 * and deletes any identity that ends up with no remaining dfsp:* memberships.
 * The Hydra machine subject (subject_id === dfspId) is left alone — the Hydra
 * client itself is torn down separately.
 *
 * @param {string} dfspId
 */
exports.cleanupDfspIdentities = async (dfspId) => {
  const keto = getKetoClient();
  const memberIds = await keto.listDfspRoleMemberIds(dfspId);
  for (const subjectId of memberIds) {
    if (subjectId === dfspId) continue;
    await keto.removeUserFromDfspRole(subjectId, dfspId);
    const hasOthers = await keto.hasOtherDfspMemberships(subjectId, dfspId);
    if (!hasOthers) {
      await exports.deleteIdentity(subjectId);
    } else {
      log.info(`Identity ${subjectId} retained — still a member of other DFSP roles`);
    }
  }
};
