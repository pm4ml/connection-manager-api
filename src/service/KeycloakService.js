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
const InternalError = require('../errors/InternalError');
const formatValidator = require('../utils/formatValidator');
const requireEsm = require('../utils/requireEsm');

const getKeycloakAdminClient = async () => {
  try {
    const { default: KcAdminClient } = await requireEsm('@keycloak/keycloak-admin-client');
    const kcAdminClient = new KcAdminClient({
      baseUrl: Constants.KEYCLOAK.BASE_URL,
      realmName: Constants.KEYCLOAK.DFSPS_REALM,
    });

    await kcAdminClient.auth({
      clientId: Constants.KEYCLOAK.ADMIN_CLIENT_ID,
      clientSecret: Constants.KEYCLOAK.ADMIN_CLIENT_SECRET,
      grantType: 'client_credentials',
    });

    return kcAdminClient;
  } catch (error) {
    console.error('Error creating Keycloak admin client:', error);
    throw new InternalError('Failed to connect to Keycloak server');
  }
};


const getDfspGroupName = (dfspId) => `${Constants.OPENID.GROUPS.DFSP}:${dfspId}`;


const findApplicationGroup = async (kcAdminClient) => {
  const groups = await kcAdminClient.groups.find();
  const applicationGroup = groups.find(g => g.name === Constants.OPENID.GROUPS.APPLICATION);

  if (!applicationGroup?.id) {
    throw new Error(`${Constants.OPENID.GROUPS.APPLICATION} group not found`);
  }

  return applicationGroup;
};


const createDfspGroup = async (kcAdminClient, dfspId) => {
  const applicationGroup = await findApplicationGroup(kcAdminClient);
  const dfspGroupName = getDfspGroupName(dfspId);

  const subGroups = await kcAdminClient.groups.listSubGroups({parentId: applicationGroup.id});
  let dfspGroup = subGroups.find(g => g.name === dfspGroupName);

  if (!dfspGroup) {
    dfspGroup = await kcAdminClient.groups.createChildGroup({id: applicationGroup.id}, {
      name: dfspGroupName,
    });
    dfspGroup.preExisting = false;
    console.log(`Created DFSP group ${dfspGroupName}`);
  } else {
    dfspGroup.preExisting = true;
  }

  return dfspGroup;
};


/**
 * @param {*} kcAdminClient
 * @param {string} entityId
 * @param {*} dfspId
 * @param entity
 */
const assignToGroups = async (kcAdminClient, entityId, dfspId, entity = 'user') => {
  try {
    const applicationGroup = await findApplicationGroup(kcAdminClient);
    const subGroups = await kcAdminClient.groups.listSubGroups({parentId: applicationGroup.id});
    const groupNames = [Constants.OPENID.GROUPS.MTA, getDfspGroupName(dfspId)];

    for (const name of groupNames) {
      const group = subGroups.find(g => g.name === name);
      if (!group) {
        throw new Error(`${name} group not found`);
      }
      await kcAdminClient.users.addToGroup({
        id: entityId,
        groupId: group.id
      });
    }
  } catch (error) {
    console.warn(`Warning: Could not assign groups to ${entity} ${entityId}: ${error.message}`);
    throw error;
  }
};


const createClientConfig = (dfspId) => {
  return {
    clientId: dfspId,
    name: `API Client for ${dfspId}`,
    description: `OAuth client for DFSP ${dfspId} API integration`,
    enabled: true,
    clientAuthenticatorType: 'client-secret',
    directAccessGrantsEnabled: false,
    redirectUris: ['*'],
    webOrigins: [],
    standardFlowEnabled: false,
    implicitFlowEnabled: false,
    directAccessGrantsEnabled: false,
    serviceAccountsEnabled: true,
    publicClient: false,
    protocol: 'openid-connect',
    attributes: {
      'dfsp.id': dfspId,
      'purpose': 'api-integration'
    },
    clientAuthenticatorType: 'client-secret',
    protocolMappers: [
      {
        name: 'audience-mapper',
        protocol: 'openid-connect',
        protocolMapper: 'oidc-audience-mapper',
        config: {
          'included.custom.audience': 'connection-manager-api',
          'id.token.claim': 'false',
          'access.token.claim': 'true'
        }
      },
      {
        name: 'groups-mapper',
        protocol: 'openid-connect',
        protocolMapper: 'oidc-group-membership-mapper',
        config: {
          'claim.name': 'groups',
          'full.path': 'true',
          'id.token.claim': 'false',
          'access.token.claim': 'true',
          'userinfo.token.claim': 'false'
        }
      }
    ]
  };
};


const createUserConfig = (dfspId, email) => {
  const userConfig = {
    username: dfspId,
    enabled: true,
    emailVerified: true,
  };

  if (email) {
    userConfig.email = email;
    userConfig.requiredActions = ['UPDATE_PASSWORD'];
  }

  if (Constants.OPENID.AUTH_2FA_ENABLED) {
    if (!userConfig.requiredActions) {
      userConfig.requiredActions = [];
    }

    if (!userConfig.requiredActions.includes('CONFIGURE_TOTP')) {
      userConfig.requiredActions.push('CONFIGURE_TOTP');
    }
  }

  return userConfig;
};


const sendInvitationEmail = async (kcAdminClient, userId, email) => {
  if (!email) return;

  await kcAdminClient.users.executeActionsEmail({
    id: userId,
    actions: ['UPDATE_PASSWORD'],
    clientId: Constants.OPENID.CLIENT_ID,
    redirectUri: Constants.CLIENT_URL,
  });

  console.log(`Sent invitation email to ${email}`);
};


const handleKeycloakError = (error, dfspId, context = {}) => {
  const { operation = 'operation', resources = {} } = context;
  console.error(`Error during Keycloak ${operation} for DFSP ${dfspId}:`, error);

  // Re-throw with a consistent format
  throw new InternalError(`Failed to ${operation} for DFSP ${dfspId}: ${error.message}`);
};


const rollbackResources = async (kcAdminClient, dfspId, resources) => {
  const { clientId, userId, dfspGroup } = resources;
  let rollbackErrors = [];

  if (clientId) {
    try {
      await kcAdminClient.clients.del({ id: clientId });
      console.log(`Rolled back: Deleted client for DFSP ${dfspId}`);
    } catch (err) {
      rollbackErrors.push({ type: 'client', message: err.message });
    }
  }

  if (userId) {
    try {
      await kcAdminClient.users.del({ id: userId });
      console.log(`Rolled back: Deleted user for DFSP ${dfspId}`);
    } catch (err) {
      rollbackErrors.push({ type: 'user', message: err.message });
    }
  }

  // Only delete group if it was created in this session (not an existing one)
  if (dfspGroup && !dfspGroup.preExisting) {
    try {
      await kcAdminClient.groups.del({ id: dfspGroup.id });
      console.log(`Rolled back: Deleted group for DFSP ${dfspId}`);
    } catch (err) {
      rollbackErrors.push({ type: 'group', message: err.message });
    }
  }

  if (rollbackErrors.length > 0) {
    console.warn(`Encountered errors during rollback for DFSP ${dfspId}:`, rollbackErrors);
  }

  return rollbackErrors;
};


/**
 * Gets a Keycloak admin client instance
 * @returns {Promise<Object>} Authenticated Keycloak admin client
 */
exports.getKeycloakAdminClient = getKeycloakAdminClient;

/**
 * Creates all Keycloak resources for a DFSP
 *
 * @param {string} dfspId - The DFSP ID
 * @param {string} [email] - Optional DFSP admin/operator email
 * @return {Object} Created resources information
 */
exports.createDfspResources = async (dfspId, email) => {
  formatValidator.validateDfspIdForKeycloak(dfspId);
  const kcAdminClient = await getKeycloakAdminClient();

  let userId = null;
  let clientId = null;
  let dfspGroup = null;

  try {
    dfspGroup = await createDfspGroup(kcAdminClient, dfspId);

    const userToCreate = createUserConfig(dfspId, email);
    userId = await kcAdminClient.users.create(userToCreate);

    await assignToGroups(kcAdminClient, userId.id, dfspId, 'user');

    const clientToCreate = createClientConfig(dfspId);
    clientId = await kcAdminClient.clients.create(clientToCreate);

    const serviceAccount = await kcAdminClient.clients.getServiceAccountUser({
      id: clientId.id
    });

    if (serviceAccount?.id) {
      await assignToGroups(kcAdminClient, serviceAccount.id, dfspId, 'service account');
    }

    await sendInvitationEmail(kcAdminClient, userId.id, email);

    console.log(`Successfully created all Keycloak resources for DFSP ${dfspId}`);
  } catch (error) {
    console.error(`Error creating Keycloak resources for DFSP ${dfspId}:`, error);
    await rollbackResources(kcAdminClient, dfspId, { clientId, userId, dfspGroup });
    throw new InternalError(`Failed to create Keycloak resources for DFSP ${dfspId}: ${error.message}`);
  }
};

/**
 * Deletes all Keycloak resources associated with a DFSP atomically
 *
 * @param {string} dfspId - The DFSP ID
 * @return {Object} Status of deleted resources
 */
exports.deleteDfspResources = async (dfspId) => {
  const kcAdminClient = await getKeycloakAdminClient();

  try {
    const clients = await kcAdminClient.clients.find({
      clientId: dfspId,
      max: 1
    });

    if (clients?.length > 0) {
      const clientInternalId = clients[0].id;
      await kcAdminClient.clients.del({
        id: clientInternalId,
      });
      console.log(`Deleted Keycloak client for DFSP ${dfspId}`);
    } else {
      console.log(`No Keycloak client found for DFSP ${dfspId}`);
    }
  } catch (error) {
    console.error(`Error deleting Keycloak client for DFSP ${dfspId}:`, error);
    throw error;
  }

  try {
    const users = await kcAdminClient.users.find({
      username: dfspId,
      max: 1
    });

    if (users?.length > 0) {
      const userId = users[0].id;
      await kcAdminClient.users.del({
        id: userId
      });
      console.log(`Deleted Keycloak user for DFSP ${dfspId}`);
    } else {
      console.log(`No Keycloak user found for DFSP ${dfspId}`);
    }
  } catch (error) {
    console.error(`Error deleting Keycloak user for DFSP ${dfspId}:`, error);
    throw error;
  }

  try {
    const applicationGroup = await findApplicationGroup(kcAdminClient);
    const subGroups = await kcAdminClient.groups.listSubGroups({parentId: applicationGroup.id});
    const dfspGroup = subGroups.find(g => g.name === getDfspGroupName(dfspId));

    if (dfspGroup?.id) {
      await kcAdminClient.groups.del({
        id: dfspGroup.id
      });
      console.log(`Deleted Keycloak group for DFSP ${dfspId}`);
    } else {
      console.log(`No Keycloak group found for DFSP ${dfspId}`);
    }
  } catch (error) {
    console.error(`Error deleting Keycloak group for DFSP ${dfspId}:`, error);
    throw error;
  }
};
