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
const NotFoundError = require('../errors/NotFoundError');
const InternalError = require('../errors/InternalError');
const BadRequestError = require('../errors/BadRequestError');
const { getKeycloakAdminClient } = require('./KeycloakService');
const { logger } = require('../log/logger');

const VAULT_PATH_PREFIX = 'api-credentials';

const createCredentials = async (context, dfspId) => {
  try {
    const credentialsPath = `${VAULT_PATH_PREFIX}/${dfspId}`;
    
    const kcAdminClient = await getKeycloakAdminClient();
    const existingClients = await kcAdminClient.clients.find({ clientId: dfspId });

    if (!existingClients || existingClients.length === 0) {
      throw new NotFoundError(`Client not found for DFSP ${dfspId}`);
    }

    const existingClient = existingClients[0];
    const secretResponse = await kcAdminClient.clients.generateNewClientSecret({
      id: existingClient.id
    });

    // Store credentials in Vault (replacing any existing ones)
    const credentials = {
      client_id: dfspId,
      client_secret: secretResponse.value,
      keycloak_client_id: existingClient.id,
      created_at: new Date().toISOString(),
      dfsp_id: dfspId
    };

    await context.pkiEngine.setSecret(credentialsPath, credentials);

    logger.info('API credentials created', {
      dfspId,
      action: 'CREATE_CREDENTIALS'
    });

    return {
      data: {
        clientId: credentials.client_id,
        clientSecret: credentials.client_secret,
        createdAt: credentials.created_at
      },
      status: 201
    };

  } catch (error) {
    logger.error('Error creating API credentials:', {
      dfspId,
      error: error.message
    });
    throw error;
  }
};

const getCredentials = async (context, dfspId) => {
  try {
    const credentialsPath = `${VAULT_PATH_PREFIX}/${dfspId}`;
    const credentials = await context.pkiEngine.getSecret(credentialsPath);

    if (!credentials) {
      throw new NotFoundError('API credentials not found for this DFSP');
    }

    logger.info('API credentials retrieved', {
      dfspId,
      action: 'FETCH_CREDENTIALS'
    });

    return {
      clientId: credentials.client_id,
      clientSecret: credentials.client_secret,
      createdAt: credentials.created_at,
      updatedAt: credentials.updated_at
    };

  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error; // Re-throw NotFoundError as-is
    }
    
    // Check if this is a "not found" type error from Vault
    if (error.message && (error.message.includes('not found') || error.message.includes('does not exist'))) {
      throw new NotFoundError('API credentials not found for this DFSP');
    }
    
    logger.error('Error retrieving API credentials:', {
      dfspId,
      error: error.message
    });
    throw error;
  }
};

module.exports = {
  getCredentials,
  createCredentials
}; 