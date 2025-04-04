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

const { Issuer } = require('openid-client');
const Constants = require('../constants/Constants');
const InternalError = require('../errors/InternalError');
const formatValidator = require('../utils/formatValidator');

/**
 * Creates a client for interacting with Keycloak via OpenID Connect
 */
const getIssuerClient = async () => {
  try {
    // Discover the OpenID Connect endpoints from Keycloak
    const issuer = await Issuer.discover(Constants.KEYCLOAK.DISCOVERY_URL);
    
    // Create a client to interact with the Keycloak server
    const client = new issuer.Client({
      client_id: Constants.KEYCLOAK.ADMIN_CLIENT_ID,
      client_secret: Constants.KEYCLOAK.ADMIN_CLIENT_SECRET
    });
    
    return client;
  } catch (error) {
    console.error('Error creating Keycloak OpenID client:', error);
    throw new InternalError('Failed to connect to Keycloak server');
  }
};

/**
 * Creates a user in Keycloak when a DFSP is created in MCM
 * 
 * @param {string} dfspId - The DFSP ID
 * @return {Object} The created user information
 */
exports.createDfspUser = async (dfspId) => { 
  try {
    // Validate dfspId length for Keycloak username requirements (3-255 characters)
    formatValidator.validateDfspIdForKeycloak(dfspId);
    
    // Get an access token for Keycloak Admin API
    const client = await getIssuerClient();
    const tokenSet = await client.grant({
      grant_type: 'client_credentials',
      scope: 'openid'
    });
    
    // Use the access token to interact with the Keycloak Admin REST API
    const accessToken = tokenSet.access_token;
    const baseUrl = Constants.KEYCLOAK.BASE_URL;
    const realm = Constants.KEYCLOAK.DFSPS_REALM;
    
    // User information to be created - use dfspId as username
    const userToCreate = {
      username: dfspId,
      enabled: true,
      emailVerified: true,
      attributes: {
        dfspId: [dfspId]
      }
    };
    
    // Create the user via Keycloak Admin REST API
    const userCreateResponse = await fetch(`${baseUrl}/admin/realms/${realm}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(userToCreate)
    });
    
    if (!userCreateResponse.ok) {
      const error = await userCreateResponse.text();
      throw new Error(`Failed to create user in Keycloak: ${error}`);
    }
    
    // Get the user ID from the Location header
    const locationHeader = userCreateResponse.headers.get('Location');
    const userId = locationHeader.substring(locationHeader.lastIndexOf('/') + 1);
    
    console.log(`Created Keycloak user for DFSP ${dfspId} with ID ${userId}`);

    return {
      userId: userId,
      dfspId: dfspId,
    };
  } catch (error) {
    console.error('Error creating Keycloak user for DFSP:', error);
    throw new InternalError(`Failed to create Keycloak user for DFSP ${dfspId}: ${error.message}`);
  }
};

/**
 * Creates a client in Keycloak when a DFSP is created in MCM
 * 
 * @param {string} dfspId - The DFSP ID
 * @return {Object} The created client information
 */
exports.createDfspClient = async (dfspId) => { 
  try {
    // Get an access token for Keycloak Admin API
    const client = await getIssuerClient();
    const tokenSet = await client.grant({
      grant_type: 'client_credentials',
      scope: 'openid'
    });

    const accessToken = tokenSet.access_token;
    const baseUrl = Constants.KEYCLOAK.BASE_URL;
    const realm = Constants.KEYCLOAK.DFSPS_REALM;
    
    // Client information to be created
    const clientToCreate = {
      clientId: dfspId,
      name: dfspId,
      enabled: true,
      clientAuthenticatorType: 'client-secret',
      redirectUris: ['*'],
      webOrigins: [],
      standardFlowEnabled: true,
      implicitFlowEnabled: false,
      directAccessGrantsEnabled: true,
      serviceAccountsEnabled: true,
      publicClient: false,
      protocol: 'openid-connect',
      attributes: {},
      fullScopeAllowed: true
    };
    
    // Create the client via Keycloak Admin REST API
    const clientCreateResponse = await fetch(`${baseUrl}/admin/realms/${realm}/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(clientToCreate)
    });
    
    if (!clientCreateResponse.ok) {
      const error = await clientCreateResponse.text();
      throw new Error(`Failed to create client in Keycloak: ${error}`);
    }
    
    // Get the client ID from the Location header
    const locationHeader = clientCreateResponse.headers.get('Location');
    const clientId = locationHeader.substring(locationHeader.lastIndexOf('/') + 1);
    
    console.log(`Created Keycloak client for DFSP ${dfspId} with ID ${clientId}`);

    return {
      clientId: clientId,
      dfspId: dfspId
    };
  } catch (error) {
    console.error('Error creating Keycloak client for DFSP:', error);
    throw new InternalError(`Failed to create Keycloak client for DFSP ${dfspId}: ${error.message}`);
  }
};

/**
 * Deletes a client in Keycloak when a DFSP is deleted in MCM
 * 
 * @param {string} dfspId - The DFSP ID
 * @return {boolean} Success indicator
 */
exports.deleteDfspClient = async (dfspId) => { 
  try {
    // Get an access token for Keycloak Admin API
    const client = await getIssuerClient();
    const tokenSet = await client.grant({
      grant_type: 'client_credentials',
      scope: 'openid'
    });
    

    const accessToken = tokenSet.access_token;
    const baseUrl = Constants.KEYCLOAK.BASE_URL;
    const realm = Constants.KEYCLOAK.DFSPS_REALM;
    
    // First, find the client by clientId (which is the dfspId)
    const clientsResponse = await fetch(`${baseUrl}/admin/realms/${realm}/clients?clientId=${dfspId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!clientsResponse.ok) {
      const error = await clientsResponse.text();
      throw new Error(`Failed to find client in Keycloak: ${error}`);
    }
    
    const clients = await clientsResponse.json();
    if (!clients || clients.length === 0) {
      console.log(`No Keycloak client found for DFSP ${dfspId}`);
      return false;
    }
    
    // Extract the internal client ID
    const clientInternalId = clients[0].id;
    
    // Delete the client using the internal ID
    const deleteResponse = await fetch(`${baseUrl}/admin/realms/${realm}/clients/${clientInternalId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!deleteResponse.ok) {
      const error = await deleteResponse.text();
      throw new Error(`Failed to delete client in Keycloak: ${error}`);
    }
    
    console.log(`Deleted Keycloak client for DFSP ${dfspId}`);
    return true;
  } catch (error) {
    console.error('Error deleting Keycloak client for DFSP:', error);
    throw new InternalError(`Failed to delete Keycloak client for DFSP ${dfspId}: ${error.message}`);
  }
};

/**
 * Deletes a user in Keycloak
 * 
 * @param {string} dfspId - The DFSP ID (username)
 * @param {string} userId - The Keycloak user ID (optional)
 * @return {boolean} Success indicator
 */
exports.deleteDfspUser = async (dfspId, userId = null) => { 
  try {
    // Get an access token for Keycloak Admin API
    const client = await getIssuerClient();
    const tokenSet = await client.grant({
      grant_type: 'client_credentials',
      scope: 'openid'
    });
    

    const accessToken = tokenSet.access_token;
    const baseUrl = Constants.KEYCLOAK.BASE_URL;
    const realm = Constants.KEYCLOAK.DFSPS_REALM;
    
    // If userId is not provided, find the user by username (dfspId)
    if (!userId) {
      const getUsersResponse = await fetch(`${baseUrl}/admin/realms/${realm}/users?username=${dfspId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (!getUsersResponse.ok) {
        const error = await getUsersResponse.text();
        throw new Error(`Failed to find user in Keycloak: ${error}`);
      }
      
      const users = await getUsersResponse.json();
      if (!users || users.length === 0) {
        console.log(`No Keycloak user found for DFSP ${dfspId}`);
        return false;
      }
      
      userId = users[0].id;
    }
    
    // Delete the user using the user ID
    const deleteResponse = await fetch(`${baseUrl}/admin/realms/${realm}/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!deleteResponse.ok) {
      const error = await deleteResponse.text();
      throw new Error(`Failed to delete user in Keycloak: ${error}`);
    }
    
    console.log(`Deleted Keycloak user for DFSP ${dfspId}`);
    return true;
  } catch (error) {
    console.error('Error deleting Keycloak user for DFSP:', error);
    throw new InternalError(`Failed to delete Keycloak user for DFSP ${dfspId}: ${error.message}`);
  }
}; 