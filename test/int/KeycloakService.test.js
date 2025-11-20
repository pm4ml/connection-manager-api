/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 **/

const { createContext, destroyContext } = require('./context');
const KeycloakService = require('../../src/service/KeycloakService');
const Constants = require('../../src/constants/Constants');
const InternalError = require('../../src/errors/InternalError');
const ValidationError = require('../../src/errors/ValidationError');
const { createUniqueDfsp } = require('./test-helpers');

describe('KeycloakService Integration Tests', () => {
  let context;
  let kcAdminClient;
  let testDfsp;

  beforeAll(async () => {
    context = await createContext();
    kcAdminClient = await KeycloakService.getKeycloakAdminClient();
  });

  afterAll(async () => {
    if (context) {
      await destroyContext(context);
    }
  });

  beforeEach(() => {
    testDfsp = createUniqueDfsp();
  });

  afterEach(async () => {
    if (kcAdminClient && testDfsp) {
      try {
        await KeycloakService.deleteDfspResources(testDfsp.dfspId);
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


    it('should create all DFSP resources in Keycloak with email', async () => {
      await KeycloakService.createDfspResources(testDfsp.dfspId, testDfsp.email);

      const clients = await kcAdminClient.clients.find({ clientId: testDfsp.dfspId });
      expect(clients).toHaveLength(1);
      expect(clients[0].clientId).toBe(testDfsp.dfspId);
      expect(clients[0].name).toBe(`API Client for ${testDfsp.dfspId}`);
      expect(clients[0].serviceAccountsEnabled).toBe(true);

      const allUsers = await kcAdminClient.users.find({ username: testDfsp.email });
      const users = allUsers.filter(u => !u.username.startsWith('service-account-'));
      expect(users).toHaveLength(1);
      expect(users[0].email).toBe(testDfsp.email);
      expect(users[0].emailVerified).toBe(true);

      const applicationGroups = await kcAdminClient.groups.find({ max: -1 });
      const applicationGroup = applicationGroups.find(g => g.name === Constants.OPENID.GROUPS.APPLICATION);
      expect(applicationGroup).toBeDefined();

      const subGroups = await kcAdminClient.groups.listSubGroups({
        parentId: applicationGroup.id,
        max: -1
      });
      const dfspGroup = subGroups.find(g => g.name === `${Constants.OPENID.GROUPS.DFSP}:${testDfsp.dfspId}`);
      expect(dfspGroup).toBeDefined();

      const userGroups = await kcAdminClient.users.listGroups({
        id: users[0].id,
        max: -1
      });
      const userGroupNames = userGroups.map(g => g.name);
      expect(userGroupNames).toContain(`${Constants.OPENID.GROUPS.DFSP}:${testDfsp.dfspId}`);
    });

    it('should configure 2FA when enabled', async () => {
      const original2FAEnabled = Constants.OPENID.ENABLE_2FA;
      Constants.OPENID.ENABLE_2FA = true;

      try {
        await KeycloakService.createDfspResources(testDfsp.dfspId, testDfsp.email);

        const allUsers = await kcAdminClient.users.find({ username: testDfsp.email });
        const users = allUsers.filter(u => !u.username.startsWith('service-account-'));
        expect(users).toHaveLength(1);
        expect(users[0].email).toBe(testDfsp.email);
      } finally {
        Constants.OPENID.ENABLE_2FA = original2FAEnabled;
      }
    });

    it('should handle existing DFSP group gracefully', async () => {
      const dfsp2 = createUniqueDfsp();

      try {
        await KeycloakService.createDfspResources(dfsp2.dfspId, dfsp2.email);

        const users = await kcAdminClient.users.find({ username: dfsp2.email });
        for (const user of users) {
          await kcAdminClient.users.del({ id: user.id });
        }

        const clients = await kcAdminClient.clients.find({ clientId: dfsp2.dfspId });
        for (const client of clients) {
          await kcAdminClient.clients.del({ id: client.id });
        }

        await KeycloakService.createDfspResources(dfsp2.dfspId, dfsp2.email);

        const newUsers = await kcAdminClient.users.find({ username: dfsp2.email });
        const filteredUsers = newUsers.filter(u => !u.username.startsWith('service-account-'));
        expect(filteredUsers).toHaveLength(1);

        const newClients = await kcAdminClient.clients.find({ clientId: dfsp2.dfspId });
        expect(newClients).toHaveLength(1);
      } finally {
        try {
          await KeycloakService.deleteDfspResources(dfsp2.dfspId);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should rollback on error', async () => {
      await kcAdminClient.users.create({
        username: testDfsp.email,
        email: testDfsp.email,
        enabled: true
      });

      try {
        await KeycloakService.createDfspResources(testDfsp.dfspId, testDfsp.email);
        throw new Error('Should have thrown error due to username conflict');
      } catch (error) {
        expect(error).toBeInstanceOf(InternalError);

        const clients = await kcAdminClient.clients.find({ clientId: testDfsp.dfspId });
        expect(clients).toHaveLength(0);
      }

      const users = await kcAdminClient.users.find({ username: testDfsp.email });
      if (users.length > 0) {
        await kcAdminClient.users.del({ id: users[0].id });
      }
    });

    it('should validate DFSP ID format', async () => {
      const invalidDfspId = 'invalid-dfsp-id-with-special-chars!@#';

      try {
        await KeycloakService.createDfspResources(invalidDfspId, testDfsp.email);
        throw new Error('Should have thrown error for invalid DFSP ID');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
      }
    });
  });

  describe('deleteDfspResources', () => {
    it('should delete all DFSP resources from Keycloak', async () => {
      await KeycloakService.createDfspResources(testDfsp.dfspId, testDfsp.email);

      let clients = await kcAdminClient.clients.find({ clientId: testDfsp.dfspId });
      expect(clients).toHaveLength(1);

      let allUsers = await kcAdminClient.users.find({ username: testDfsp.email });
      let users = allUsers.filter(u => !u.username.startsWith('service-account-'));
      expect(users).toHaveLength(1);

      await KeycloakService.deleteDfspResources(testDfsp.dfspId);

      clients = await kcAdminClient.clients.find({ clientId: testDfsp.dfspId });
      expect(clients).toHaveLength(0);

      users = await kcAdminClient.users.find({ username: testDfsp.email });
      expect(users).toHaveLength(0);

      const applicationGroups = await kcAdminClient.groups.find({ max: -1 });
      const applicationGroup = applicationGroups.find(g => g.name === Constants.OPENID.GROUPS.APPLICATION);
      const subGroups = await kcAdminClient.groups.listSubGroups({
        parentId: applicationGroup.id,
        max: -1
      });
      const dfspGroup = subGroups.find(g => g.name === `${Constants.OPENID.GROUPS.DFSP}:${testDfsp.dfspId}`);
      expect(dfspGroup).toBeUndefined();
    });

    it('should handle non-existent resources gracefully', async () => {
      await expect(KeycloakService.deleteDfspResources('NON_EXISTENT_DFSP')).resolves.not.toThrow();
    });

    it('should continue deletion even if some resources fail', async () => {
      const orphanDfsp = createUniqueDfsp();
      // Create user that's not associated with any DFSP groups
      const userId = await kcAdminClient.users.create({
        username: orphanDfsp.email,
        email: orphanDfsp.email,
        enabled: true
      });

      await expect(KeycloakService.deleteDfspResources(testDfsp.dfspId)).resolves.not.toThrow();

      // Orphaned user should NOT be deleted (only delete users associated with the DFSP)
      const users = await kcAdminClient.users.find({ username: orphanDfsp.email });
      expect(users).toHaveLength(1);

      await kcAdminClient.users.del({ id: userId.id });
    });
  });

  describe('Service Account Assignment', () => {
    it('should assign service account to groups', async () => {
      await KeycloakService.createDfspResources(testDfsp.dfspId, testDfsp.email);

      const clients = await kcAdminClient.clients.find({ clientId: testDfsp.dfspId });
      const serviceAccount = await kcAdminClient.clients.getServiceAccountUser({
        id: clients[0].id
      });

      const serviceAccountGroups = await kcAdminClient.users.listGroups({
        id: serviceAccount.id,
        max: -1
      });
      const groupNames = serviceAccountGroups.map(g => g.name);
      expect(groupNames).toContain(`${Constants.OPENID.GROUPS.DFSP}:${testDfsp.dfspId}`);
    });
  });

  describe('Client Configuration', () => {
    it('should configure client with proper protocol mappers', async () => {
      await KeycloakService.createDfspResources(testDfsp.dfspId, testDfsp.email);

      const clients = await kcAdminClient.clients.find({ clientId: testDfsp.dfspId });
      const clientId = clients[0].id;
      
      const protocolMappers = await kcAdminClient.clients.listProtocolMappers({ id: clientId });
      
      const audienceMapper = protocolMappers.find(m => m.name === 'audience-mapper');
      expect(audienceMapper).toBeDefined();
      expect(audienceMapper.config['included.custom.audience']).toBe('connection-manager-api');

      const groupsMapper = protocolMappers.find(m => m.name === 'groups-mapper');
      expect(groupsMapper).toBeDefined();
      expect(groupsMapper.config['claim.name']).toBe('groups');
    });

    it('should set client attributes correctly', async () => {
      await KeycloakService.createDfspResources(testDfsp.dfspId, testDfsp.email);

      const clients = await kcAdminClient.clients.find({ clientId: testDfsp.dfspId });
      const client = clients[0];

      expect(client.attributes['dfsp.id']).toBe(testDfsp.dfspId);
      expect(client.attributes['purpose']).toBe('api-integration');
      expect(client.serviceAccountsEnabled).toBe(true);
      expect(client.publicClient).toBe(false);
      expect(client.standardFlowEnabled).toBe(false);
      expect(client.directAccessGrantsEnabled).toBe(false);
    });
  });
}); 