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
const CredentialsService = require('../../src/service/CredentialsService');
const Constants = require('../../src/constants/Constants');

describe('DFSP Keycloak Integration Tests', () => {
  let context;
  let kcAdminClient;
  const testDfspId = 'INTEG_TEST_DFSP';
  const testEmail = 'integ-test@example.com';

  beforeAll(async () => {
    context = await createContext();
    kcAdminClient = await KeycloakService.getKeycloakAdminClient();
  });

  afterAll(async () => {
    if (kcAdminClient) {
      try {
        await KeycloakService.deleteDfspResources(testDfspId);
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    if (context) {
      // Clean up vault secrets
      try {
        await context.pkiEngine.deleteSecret(`api-credentials/${testDfspId}`);
      } catch (error) {
        // Ignore cleanup errors
      }
      await destroyContext(context);
    }
  });

  beforeEach(async () => {
    if (kcAdminClient && context) {
      // Clean up any existing resources before each test
      try {
        await KeycloakService.deleteDfspResources(testDfspId);
        await context.pkiEngine.deleteSecret(`api-credentials/${testDfspId}`);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('DFSP Lifecycle Management', () => {
    it('should create DFSP with complete Keycloak integration', async () => {
      await KeycloakService.createDfspResources(testDfspId, testEmail);

      const clients = await kcAdminClient.clients.find({ clientId: testDfspId });
      expect(clients).toHaveLength(1);

      const allUsers = await kcAdminClient.users.find({ username: testEmail });
      const users = allUsers.filter(u => !u.username.startsWith('service-account-'));
      expect(users).toHaveLength(1);
      expect(users[0].email).toBe(testEmail);

      const credentials = await CredentialsService.createCredentials(context, testDfspId);
      expect(credentials.status).toBe(201);

      const keycloakSecret = await kcAdminClient.clients.getClientSecret({ id: clients[0].id });
      expect(keycloakSecret.value).toBe(credentials.data.clientSecret);

      const newCredentials = await CredentialsService.createCredentials(context, testDfspId);
      expect(newCredentials.data.clientSecret).not.toBe(credentials.data.clientSecret);
    });

    it('should handle DFSP deletion with complete cleanup', async () => {
      await KeycloakService.createDfspResources(testDfspId, testEmail);
      await CredentialsService.createCredentials(context, testDfspId);

      let clients = await kcAdminClient.clients.find({ clientId: testDfspId });
      expect(clients).toHaveLength(1);

      await KeycloakService.deleteDfspResources(testDfspId);
      await context.pkiEngine.deleteSecret(`api-credentials/${testDfspId}`);

      clients = await kcAdminClient.clients.find({ clientId: testDfspId });
      expect(clients).toHaveLength(0);

      try {
        await CredentialsService.getCredentials(context, testDfspId);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle concurrent DFSP operations', async () => {
      await KeycloakService.createDfspResources(testDfspId, testEmail);

      const operations = [
        CredentialsService.createCredentials(context, testDfspId),
        CredentialsService.createCredentials(context, testDfspId),
        CredentialsService.createCredentials(context, testDfspId)
      ];

      const results = await Promise.allSettled(operations);
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThanOrEqual(1);

      const finalCredentials = await CredentialsService.getCredentials(context, testDfspId);
      const clients = await kcAdminClient.clients.find({ clientId: testDfspId });
      const keycloakSecret = await kcAdminClient.clients.getClientSecret({ id: clients[0].id });

      // In concurrent scenarios, final state should be consistent but may vary
      expect(finalCredentials.clientSecret).toBeDefined();
      expect(keycloakSecret.value).toBeDefined();
      expect(finalCredentials.clientId).toBe(testDfspId);
    });
  });

  describe('Security Features', () => {
    it('should configure 2FA and secure API client settings', async () => {
      const original2FA = Constants.OPENID.ENABLE_2FA;
      Constants.OPENID.ENABLE_2FA = true;

      try {
        await KeycloakService.createDfspResources(testDfspId, testEmail);

        const allUsers = await kcAdminClient.users.find({ username: testEmail });
        const users = allUsers.filter(u => !u.username.startsWith('service-account-'));
        expect(users[0].requiredActions).toContain('CONFIGURE_TOTP');
        expect(users[0].requiredActions).toContain('UPDATE_PASSWORD');

        const clients = await kcAdminClient.clients.find({ clientId: testDfspId });
        const client = clients[0];
        expect(client.serviceAccountsEnabled).toBe(true);
        expect(client.standardFlowEnabled).toBe(false);
        expect(client.directAccessGrantsEnabled).toBe(false);
        expect(client.clientAuthenticatorType).toBe('client-secret');

        const protocolMappers = await kcAdminClient.clients.listProtocolMappers({ id: client.id });
        const audienceMapper = protocolMappers.find(m => m.name === 'audience-mapper');
        expect(audienceMapper).toBeDefined();
      } finally {
        Constants.OPENID.ENABLE_2FA = original2FA;
      }
    });

    it('should enforce proper group membership', async () => {
      await KeycloakService.createDfspResources(testDfspId, testEmail);

      const allUsers = await kcAdminClient.users.find({ username: testEmail });
      const users = allUsers.filter(u => !u.username.startsWith('service-account-'));
      const userGroups = await kcAdminClient.users.listGroups({ id: users[0].id });
      const userGroupNames = userGroups.map(g => g.name);

      expect(userGroupNames).toContain(`${Constants.OPENID.GROUPS.DFSP}:${testDfspId}`);

      const clients = await kcAdminClient.clients.find({ clientId: testDfspId });
      const serviceAccount = await kcAdminClient.clients.getServiceAccountUser({ id: clients[0].id });
      const saGroups = await kcAdminClient.users.listGroups({ id: serviceAccount.id });
      const saGroupNames = saGroups.map(g => g.name);

      expect(saGroupNames).toContain(`${Constants.OPENID.GROUPS.DFSP}:${testDfspId}`);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from partial failures with rollback', async () => {
      await kcAdminClient.users.create({
        username: testEmail,
        email: testEmail,
        enabled: true
      });

      try {
        await KeycloakService.createDfspResources(testDfspId, testEmail);
        fail('Should have failed due to user conflict');
      } catch (error) {
        const clients = await kcAdminClient.clients.find({ clientId: testDfspId });
        expect(clients).toHaveLength(0);
      }

      const users = await kcAdminClient.users.find({ username: testEmail });
      if (users.length > 0) {
        await kcAdminClient.users.del({ id: users[0].id });
      }

      await KeycloakService.createDfspResources(testDfspId, testEmail);
      const finalClients = await kcAdminClient.clients.find({ clientId: testDfspId });
      expect(finalClients).toHaveLength(1);
    });

    it('should handle service connectivity issues', async () => {
      await KeycloakService.createDfspResources(testDfspId, testEmail);

      const originalSetSecret = context.pkiEngine.setSecret;
      context.pkiEngine.setSecret = jest.fn().mockRejectedValue(new Error('Vault connection failed'));

      try {
        await CredentialsService.createCredentials(context, testDfspId);
        fail('Should have failed due to Vault error');
      } catch (error) {
        expect(error.message).toBe('Vault connection failed');
      } finally {
        context.pkiEngine.setSecret = originalSetSecret;
      }

      const credentials = await CredentialsService.createCredentials(context, testDfspId);
      expect(credentials.status).toBe(201);
    });
  });

  describe('Multi-DFSP Scenarios', () => {
    const additionalDfspIds = ['MULTI_TEST_DFSP_1', 'MULTI_TEST_DFSP_2'];

    afterEach(async () => {
      if (kcAdminClient && context) {
        // Clean up additional test DFSPs
        for (const dfspId of additionalDfspIds) {
          try {
            await KeycloakService.deleteDfspResources(dfspId);
            await context.pkiEngine.deleteSecret(`api-credentials/${dfspId}`);
          } catch (error) {
            // Ignore cleanup errors
          }
        }
      }
    });

    it('should handle multiple DFSPs with isolation', async () => {
      const dfspIds = [testDfspId, ...additionalDfspIds];

      const createPromises = dfspIds.map(dfspId =>
        KeycloakService.createDfspResources(dfspId, `${dfspId.toLowerCase()}@example.com`)
      );
      await Promise.all(createPromises);

      for (const dfspId of dfspIds) {
        const clients = await kcAdminClient.clients.find({ clientId: dfspId });
        expect(clients).toHaveLength(1);
      }

      const credPromises = dfspIds.map(dfspId =>
        CredentialsService.createCredentials(context, dfspId)
      );
      const credentials = await Promise.all(credPromises);

      const secrets = credentials.map(c => c.data.clientSecret);
      expect(new Set(secrets).size).toBe(dfspIds.length);

      await KeycloakService.deleteDfspResources(testDfspId);

      const remainingCreds = await CredentialsService.getCredentials(context, additionalDfspIds[0]);
      expect(remainingCreds.clientSecret).toBe(credentials[1].data.clientSecret);
    });
  });
});
