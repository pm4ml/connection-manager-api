/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 **/

// Load test environment configuration
require('./test-env-setup');

const { createContext, destroyContext } = require('./context');
const KeycloakService = require('../../src/service/KeycloakService');
const Constants = require('../../src/constants/Constants');
const InternalError = require('../../src/errors/InternalError');

describe('KeycloakService Integration Tests', () => {
  let context;
  let kcAdminClient;
  const testDfspId = 'TEST_DFSP_INT';
  const testEmail = 'test@example.com';

  beforeAll(async () => {
    context = await createContext();
    kcAdminClient = await KeycloakService.getKeycloakAdminClient();
  });

  afterAll(async () => {
    if (context) {
      await destroyContext(context);
    }
  });

  afterEach(async () => {
    if (kcAdminClient) {
      try {
        await KeycloakService.deleteDfspResources(testDfspId);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('getKeycloakAdminClient', () => {
    it('should successfully connect to Keycloak and return admin client', async () => {
      const client = await KeycloakService.getKeycloakAdminClient();
      expect(client).toBeDefined();
      expect(typeof client.auth).toBe('function');
      expect(typeof client.users).toBe('object');
      expect(typeof client.clients).toBe('object');
      expect(typeof client.groups).toBe('object');
    });

    it('should throw InternalError when cannot connect to Keycloak', async () => {
      const originalBaseUrl = Constants.KEYCLOAK.BASE_URL;
      Constants.KEYCLOAK.BASE_URL = 'http://invalid-keycloak-url:8080';

      try {
        await KeycloakService.getKeycloakAdminClient();
        fail('Should have thrown InternalError');
      } catch (error) {
        expect(error).toBeInstanceOf(InternalError);
        expect(error.message).toContain('Failed to connect to Keycloak server');
      } finally {
        Constants.KEYCLOAK.BASE_URL = originalBaseUrl;
      }
    });
  });

  describe('createDfspResources', () => {
    it('should create all DFSP resources in Keycloak without email', async () => {
      await KeycloakService.createDfspResources(testDfspId);

      // Verify client was created
      const clients = await kcAdminClient.clients.find({ clientId: testDfspId });
      expect(clients).toHaveLength(1);
      expect(clients[0].clientId).toBe(testDfspId);
      expect(clients[0].name).toBe(`API Client for ${testDfspId}`);
      expect(clients[0].serviceAccountsEnabled).toBe(true);

      // Verify user was created (filter out service account users)
      const allUsers = await kcAdminClient.users.find({ username: testDfspId.toLowerCase() });
      const users = allUsers.filter(u => !u.username.startsWith('service-account-'));
      expect(users).toHaveLength(1);
      expect(users[0].username).toBe(testDfspId.toLowerCase());
      expect(users[0].enabled).toBe(true);

      // Verify DFSP group was created
      const applicationGroups = await kcAdminClient.groups.find();
      const applicationGroup = applicationGroups.find(g => g.name === Constants.OPENID.GROUPS.APPLICATION);
      expect(applicationGroup).toBeDefined();

      const subGroups = await kcAdminClient.groups.listSubGroups({ parentId: applicationGroup.id });
      const dfspGroup = subGroups.find(g => g.name === `${Constants.OPENID.GROUPS.DFSP}:${testDfspId}`);
      expect(dfspGroup).toBeDefined();

      // Verify user is assigned to groups
      const userGroups = await kcAdminClient.users.listGroups({ id: users[0].id });
      const userGroupNames = userGroups.map(g => g.name);
      expect(userGroupNames).toContain(Constants.OPENID.GROUPS.MTA);
      expect(userGroupNames).toContain(`${Constants.OPENID.GROUPS.DFSP}:${testDfspId}`);
    });

    it('should create all DFSP resources in Keycloak with email', async () => {
      await KeycloakService.createDfspResources(testDfspId, testEmail);

      // Verify user was created with email (filter out service account users)
      const allUsers = await kcAdminClient.users.find({ username: testDfspId.toLowerCase() });
      const users = allUsers.filter(u => !u.username.startsWith('service-account-'));
      expect(users).toHaveLength(1);
      expect(users[0].email).toBe(testEmail);
      expect(users[0].emailVerified).toBe(true);
      expect(users[0].requiredActions).toContain('UPDATE_PASSWORD');
    });

    it('should configure 2FA when enabled', async () => {
      const original2FAEnabled = Constants.AUTH_2FA.AUTH_2FA_ENABLED;
      Constants.AUTH_2FA.AUTH_2FA_ENABLED = true;

      try {
        await KeycloakService.createDfspResources(testDfspId, testEmail);

        const allUsers = await kcAdminClient.users.find({ username: testDfspId.toLowerCase() });
        const users = allUsers.filter(u => !u.username.startsWith('service-account-'));
        expect(users[0].requiredActions).toContain('CONFIGURE_TOTP');
      } finally {
        Constants.AUTH_2FA.AUTH_2FA_ENABLED = original2FAEnabled;
      }
    });

    it('should handle existing DFSP group gracefully', async () => {
      // Use a different DFSP ID for this test to avoid conflicts
      const testDfspId2 = 'TEST_DFSP_INT_2';

      try {
        // Create resources first time
        await KeycloakService.createDfspResources(testDfspId2);
        
        // Clean up user and client but leave group
        const users = await kcAdminClient.users.find({ username: testDfspId2.toLowerCase() });
        for (const user of users) {
          await kcAdminClient.users.del({ id: user.id });
        }
        
        const clients = await kcAdminClient.clients.find({ clientId: testDfspId2 });
        for (const client of clients) {
          await kcAdminClient.clients.del({ id: client.id });
        }

        // Create resources again - should reuse existing group
        await KeycloakService.createDfspResources(testDfspId2);

        // Verify everything was created successfully
        const newUsers = await kcAdminClient.users.find({ username: testDfspId2.toLowerCase() });
        const filteredUsers = newUsers.filter(u => !u.username.startsWith('service-account-'));
        expect(filteredUsers).toHaveLength(1);
        
        const newClients = await kcAdminClient.clients.find({ clientId: testDfspId2 });
        expect(newClients).toHaveLength(1);
      } finally {
        // Cleanup test resources
        try {
          await KeycloakService.deleteDfspResources(testDfspId2);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should rollback on error', async () => {
      // Create a user with the same username to force a conflict
      await kcAdminClient.users.create({
        username: testDfspId.toLowerCase(),
        enabled: true
      });

      try {
        await KeycloakService.createDfspResources(testDfspId);
        fail('Should have thrown error due to username conflict');
      } catch (error) {
        expect(error).toBeInstanceOf(InternalError);
        
        // Verify rollback occurred - no client should exist
        const clients = await kcAdminClient.clients.find({ clientId: testDfspId });
        expect(clients).toHaveLength(0);
      }

      // Cleanup the conflicting user
      const users = await kcAdminClient.users.find({ username: testDfspId.toLowerCase() });
      if (users.length > 0) {
        await kcAdminClient.users.del({ id: users[0].id });
      }
    });

    it('should validate DFSP ID format', async () => {
      const invalidDfspId = 'invalid-dfsp-id-with-special-chars!@#';

      try {
        await KeycloakService.createDfspResources(invalidDfspId);
        fail('Should have thrown error for invalid DFSP ID');
      } catch (error) {
        expect(error.message).toContain('error-username-invalid-character');
      }
    });
  });

  describe('deleteDfspResources', () => {
    it('should delete all DFSP resources from Keycloak', async () => {
      // Create resources first
      await KeycloakService.createDfspResources(testDfspId);

      // Verify resources exist
      let clients = await kcAdminClient.clients.find({ clientId: testDfspId });
      expect(clients).toHaveLength(1);
      
      let allUsers = await kcAdminClient.users.find({ username: testDfspId.toLowerCase() });
      let users = allUsers.filter(u => !u.username.startsWith('service-account-'));
      expect(users).toHaveLength(1);

      // Delete resources
      await KeycloakService.deleteDfspResources(testDfspId);

      // Verify resources were deleted
      clients = await kcAdminClient.clients.find({ clientId: testDfspId });
      expect(clients).toHaveLength(0);
      
      users = await kcAdminClient.users.find({ username: testDfspId.toLowerCase() });
      expect(users).toHaveLength(0);

      // Verify DFSP group was deleted
      const applicationGroups = await kcAdminClient.groups.find();
      const applicationGroup = applicationGroups.find(g => g.name === Constants.OPENID.GROUPS.APPLICATION);
      const subGroups = await kcAdminClient.groups.listSubGroups({ parentId: applicationGroup.id });
      const dfspGroup = subGroups.find(g => g.name === `${Constants.OPENID.GROUPS.DFSP}:${testDfspId}`);
      expect(dfspGroup).toBeUndefined();
    });

    it('should handle non-existent resources gracefully', async () => {
      // Try to delete resources that don't exist
      await expect(KeycloakService.deleteDfspResources('NON_EXISTENT_DFSP')).resolves.not.toThrow();
    });

    it('should continue deletion even if some resources fail', async () => {
      // Create only user (no client)
      await kcAdminClient.users.create({
        username: testDfspId.toLowerCase(),
        enabled: true
      });

      // Delete should work even though client doesn't exist
      await expect(KeycloakService.deleteDfspResources(testDfspId)).resolves.not.toThrow();

      // Verify user was deleted
      const users = await kcAdminClient.users.find({ username: testDfspId.toLowerCase() });
      expect(users).toHaveLength(0);
    });
  });

  describe('Service Account Assignment', () => {
    it('should assign service account to groups', async () => {
      await KeycloakService.createDfspResources(testDfspId);

      // Get the client and its service account
      const clients = await kcAdminClient.clients.find({ clientId: testDfspId });
      const serviceAccount = await kcAdminClient.clients.getServiceAccountUser({
        id: clients[0].id
      });

      // Verify service account is assigned to groups
      const serviceAccountGroups = await kcAdminClient.users.listGroups({ id: serviceAccount.id });
      const groupNames = serviceAccountGroups.map(g => g.name);
      expect(groupNames).toContain(Constants.OPENID.GROUPS.MTA);
      expect(groupNames).toContain(`${Constants.OPENID.GROUPS.DFSP}:${testDfspId}`);
    });
  });

  describe('Client Configuration', () => {
    it('should configure client with proper protocol mappers', async () => {
      await KeycloakService.createDfspResources(testDfspId);

      const clients = await kcAdminClient.clients.find({ clientId: testDfspId });
      const clientId = clients[0].id;
      
      const protocolMappers = await kcAdminClient.clients.listProtocolMappers({ id: clientId });
      
      // Verify audience mapper exists
      const audienceMapper = protocolMappers.find(m => m.name === 'audience-mapper');
      expect(audienceMapper).toBeDefined();
      expect(audienceMapper.config['included.custom.audience']).toBe('connection-manager-api');

      // Verify groups mapper exists
      const groupsMapper = protocolMappers.find(m => m.name === 'groups-mapper');
      expect(groupsMapper).toBeDefined();
      expect(groupsMapper.config['claim.name']).toBe('groups');
    });

    it('should set client attributes correctly', async () => {
      await KeycloakService.createDfspResources(testDfspId);

      const clients = await kcAdminClient.clients.find({ clientId: testDfspId });
      const client = clients[0];
      
      expect(client.attributes['dfsp.id']).toBe(testDfspId);
      expect(client.attributes['purpose']).toBe('api-integration');
      expect(client.serviceAccountsEnabled).toBe(true);
      expect(client.publicClient).toBe(false);
      expect(client.standardFlowEnabled).toBe(false);
      expect(client.directAccessGrantsEnabled).toBe(false);
    });
  });
}); 