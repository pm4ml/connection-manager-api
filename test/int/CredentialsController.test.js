/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 **/


const { createContext, destroyContext } = require('./context');
const CredentialsService = require('../../src/service/CredentialsService');
const KeycloakService = require('../../src/service/KeycloakService');
const { createUniqueDfsp } = require('./test-helpers');

describe('Credentials Service Integration Tests', () => {
  let context;
  let testDfsp;

  beforeAll(async () => {
    context = await createContext();

    testDfsp = createUniqueDfsp();

    // Create test DFSP resources in Keycloak
    await KeycloakService.createDfspResources(testDfsp.dfspId, testDfsp.email);
  });

  afterAll(async () => {
    await KeycloakService.deleteDfspResources(testDfsp.dfspId);
    
    if (context) {
      await destroyContext(context);
    }
  });

  beforeEach(async () => {
    // Clean up any existing credentials before each test
    try {
      await context.pkiEngine.deleteSecret(`api-credentials/${testDfsp.dfspId}`);
    } catch (error) {
      // Ignore if doesn't exist
    }
  });

  describe('Core Functionality', () => {
    it('should create and retrieve API credentials', async () => {
      const createResponse = await CredentialsService.createCredentials(context, testDfsp.dfspId);

      expect(createResponse.status).toBe(201);
      expect(createResponse.data.clientId).toBe(testDfsp.dfspId);
      expect(createResponse.data.clientSecret).toBeDefined();
      expect(typeof createResponse.data.clientSecret).toBe('string');
      expect(createResponse.data.clientSecret.length).toBeGreaterThan(20);

      const retrievedCredentials = await CredentialsService.getCredentials(context, testDfsp.dfspId);
      expect(retrievedCredentials.clientId).toBe(testDfsp.dfspId);
      expect(retrievedCredentials.clientSecret).toBe(createResponse.data.clientSecret);
    });

    it('should rotate credentials successfully', async () => {
      const firstResponse = await CredentialsService.createCredentials(context, testDfsp.dfspId);
      await new Promise(resolve => setTimeout(resolve, 100));

      const secondResponse = await CredentialsService.createCredentials(context, testDfsp.dfspId);
      expect(secondResponse.data.clientSecret).not.toBe(firstResponse.data.clientSecret);

      const retrievedCredentials = await CredentialsService.getCredentials(context, testDfsp.dfspId);
      expect(retrievedCredentials.clientSecret).toBe(secondResponse.data.clientSecret);
    });

    it('should maintain consistency between Vault and Keycloak', async () => {
      const response = await CredentialsService.createCredentials(context, testDfsp.dfspId);

      const kcAdminClient = await KeycloakService.getKeycloakAdminClient();
      const clients = await kcAdminClient.clients.find({ clientId: testDfsp.dfspId });
      const keycloakSecret = await kcAdminClient.clients.getClientSecret({ id: clients[0].id });

      const vaultSecret = await context.pkiEngine.getSecret(`api-credentials/${testDfsp.dfspId}`);

      expect(keycloakSecret.value).toBe(response.data.clientSecret);
      expect(vaultSecret.client_secret).toBe(response.data.clientSecret);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent credential operations safely', async () => {
      await CredentialsService.createCredentials(context, testDfsp.dfspId);

      const operations = [
        CredentialsService.getCredentials(context, testDfsp.dfspId),
        CredentialsService.createCredentials(context, testDfsp.dfspId),
        CredentialsService.getCredentials(context, testDfsp.dfspId)
      ];

      const responses = await Promise.all(operations);

      responses.forEach((response, index) => {
        if (index % 2 === 0) {
          expect(response.clientSecret).toBeDefined();
        } else {
          expect(response.status).toBe(201);
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent credentials', async () => {
      try {
        await CredentialsService.getCredentials(context, testDfsp.dfspId);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle non-existent DFSP', async () => {
      try {
        await CredentialsService.createCredentials(context, 'NON_EXISTENT_DFSP');
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
}); 