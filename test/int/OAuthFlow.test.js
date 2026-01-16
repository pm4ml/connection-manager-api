/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 **/


const { createContext, destroyContext } = require('./context');
const { getAuthorizationUrl, getLogoutUrl, extractRoles } = require('../../src/utils/authUtils');
const { createSessionMiddleware, getSessionStore } = require('../../src/oauth/SessionConfig');
const Constants = require('../../src/constants/Constants');
const KeycloakService = require('../../src/service/KeycloakService');
const { createUniqueDfsp } = require('./test-helpers');

describe('OAuth Utilities Integration Tests', () => {
  let context;

  beforeAll(async () => {
    context = await createContext();
  });

  afterAll(async () => {
    if (context) {
      await destroyContext(context);
    }
  });

  describe('PKCE and URL Generation', () => {
    it('should generate secure PKCE parameters and authorization URLs', async () => {
      const results = await Promise.all(
        Array(5).fill(null).map(() => getAuthorizationUrl())
      );

      const codeVerifiers = results.map(r => r.codeVerifier);
      const states = results.map(r => r.state);
      const nonces = results.map(r => r.nonce);

      // Verify uniqueness
      expect(new Set(codeVerifiers).size).toBe(5);
      expect(new Set(states).size).toBe(5);
      expect(new Set(nonces).size).toBe(5);

      // Verify PKCE compliance
      codeVerifiers.forEach(verifier => {
        expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
        expect(verifier.length).toBeGreaterThanOrEqual(43);
        expect(verifier.length).toBeLessThanOrEqual(128);
      });

      // Verify URL structure
      results.forEach(result => {
        const url = new URL(result.url);
        expect(url.origin).toBe(Constants.KEYCLOAK.BASE_URL);
        expect(url.pathname).toBe(`/realms/${Constants.KEYCLOAK.DFSPS_REALM}/protocol/openid-connect/auth`);
        expect(url.searchParams.get('code_challenge_method')).toBe('S256');
        expect(url.searchParams.get('client_id')).toBe(Constants.OPENID.CLIENT_ID);
      });
    });

    it('should generate proper logout URLs with parameter handling', async () => {
      const logoutUrl = await getLogoutUrl('mock.token', 'http://localhost:3000');
      
      const url = new URL(logoutUrl);
      expect(url.origin).toBe(Constants.KEYCLOAK.BASE_URL);
      expect(url.pathname).toBe(`/realms/${Constants.KEYCLOAK.DFSPS_REALM}/protocol/openid-connect/logout`);
      expect(url.searchParams.get('id_token_hint')).toBe('mock.token');

      // Test URL encoding
      const encodedUrl = await getLogoutUrl(null, 'http://localhost:3000');
      expect(encodedUrl).toContain('post_logout_redirect_uri=http%3A%2F%2Flocalhost%3A3000');
    });
  });

  describe('Session Management', () => {
    it('should configure MySQL session store correctly', () => {
      const store = getSessionStore();
      const middleware = createSessionMiddleware();
      
      expect(store).toBeDefined();
      expect(store.options.host).toBe(Constants.DATABASE.DATABASE_HOST);
      expect(store.options.database).toBe(Constants.DATABASE.DATABASE_SCHEMA);
      expect(typeof middleware).toBe('function');

      const { sessionOptions } = require('../../src/oauth/SessionConfig');
      expect(sessionOptions.cookie.httpOnly).toBe(true);
      expect(sessionOptions.cookie.sameSite).toBe('Strict');
      expect(sessionOptions.rolling).toBe(true);
    });

    it('should handle session lifecycle operations', async () => {
      const store = getSessionStore();
      const testSessionId = `test_session_${Date.now()}`;
      const testData = { userId: 'test-user', timestamp: Date.now() };

      await new Promise((resolve, reject) => {
        store.set(testSessionId, testData, (err) => err ? reject(err) : resolve());
      });

      const retrievedData = await new Promise((resolve, reject) => {
        store.get(testSessionId, (err, data) => err ? reject(err) : resolve(data));
      });
      expect(retrievedData).toEqual(testData);

      await new Promise((resolve, reject) => {
        store.destroy(testSessionId, (err) => err ? reject(err) : resolve());
      });

      const deletedData = await new Promise((resolve, reject) => {
        store.get(testSessionId, (err, data) => err ? reject(err) : resolve(data));
      });
      expect(deletedData).toBeNull();
    });
  });

  describe('Role Extraction', () => {
    let testDfsp;

    beforeAll(async () => {
      testDfsp = createUniqueDfsp();
      await KeycloakService.createDfspResources(testDfsp.dfspId, testDfsp.email);
    });

    afterAll(async () => {
      await KeycloakService.deleteDfspResources(testDfsp.dfspId);
    });

    it('should extract roles from real Keycloak groups', async () => {
      const kcAdminClient = await KeycloakService.getKeycloakAdminClient();
      const allUsers = await kcAdminClient.users.find({ username: testDfsp.email });
      const users = allUsers.filter(u => !u.username.startsWith('service-account-'));
      
      const userGroups = await kcAdminClient.users.listGroups({ id: users[0].id });
      const groupPaths = userGroups.map(g => g.path);

      const claims = { groups: groupPaths };
      const roles = extractRoles(claims);

      expect(roles).toContain('dfsp');
    });

    it('should handle various group scenarios', () => {
      const multiDfspClaims = {
        groups: [
          '/Application/DFSP:BANK_ONE',
          '/Application/DFSP:BANK_TWO',
          '/Application/MTA',
          '/Application/PTA'
        ]
      };

      const roles = extractRoles(multiDfspClaims);
      expect(roles).toContain('dfsp');
      expect(roles).toContain('mta');
      expect(roles).toContain('pta');
      expect(roles).toContain('everyone');
    });
  });

  describe('Security Configuration', () => {
    it('should validate OAuth constants and environment settings', () => {
      expect(Constants.OPENID.CLIENT_ID).toBeDefined();
      expect(Constants.OPENID.CLIENT_SECRET).toBeDefined();
      expect(Constants.OPENID.CALLBACK).toBeDefined();
      expect(() => new URL(Constants.KEYCLOAK.BASE_URL)).not.toThrow();

      const originalEnv = process.env.NODE_ENV;
      delete require.cache[require.resolve('../../src/oauth/SessionConfig')];
      
      process.env.NODE_ENV = 'production';
      try {
        const { sessionOptions } = require('../../src/oauth/SessionConfig');
        expect(typeof sessionOptions.cookie.secure).toBe('boolean');
      } finally {
        process.env.NODE_ENV = originalEnv;
        delete require.cache[require.resolve('../../src/oauth/SessionConfig')];
      }
    });
  });
}); 