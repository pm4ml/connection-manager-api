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

const request = require('supertest');
const express = require('express');
const axios = require('axios');
const { createContext, destroyContext } = require('./context');
const AuthController = require('../../src/controllers/AuthController');
const Constants = require('../../src/constants/Constants');
const { createSessionMiddleware } = require('../../src/oauth/SessionConfig');
const KeycloakService = require('../../src/service/KeycloakService');

describe('AuthController Integration Tests', () => {
  let app;
  let context;
  let agent;

  beforeAll(async () => {
    context = await createContext();
    
    // Create Express app for testing
    app = express();
    app.use(express.json());
    app.use(createSessionMiddleware());
    
    // Add routes
    app.get('/auth/login', AuthController.login);
    app.get('/auth/callback', AuthController.callback);
    app.get('/auth/logout', AuthController.logout);
    app.get('/auth/profile', AuthController.profile);
    
    // Create supertest agent to maintain session
    agent = request.agent(app);
  });

  afterAll(async () => {
    if (context) {
      await destroyContext(context);
    }
  });

  describe('Successful OAuth Initiation', () => {
    it('should successfully initiate OAuth login with proper parameters', async () => {
      const returnTo = 'http://localhost:3000/dashboard';
      
      const response = await agent
        .get('/auth/login')
        .query({ return_to: returnTo });

      expect(response.status).toBe(302);
      expect(response.headers.location).toBeDefined();
      
      const redirectUrl = new URL(response.headers.location);
      
      // Verify it redirects to the correct Keycloak realm
      expect(redirectUrl.origin).toBe(Constants.KEYCLOAK.BASE_URL);
      expect(redirectUrl.pathname).toContain(`/realms/${Constants.KEYCLOAK.DFSPS_REALM}/protocol/openid-connect/auth`);
      
      // Verify OAuth parameters
      expect(redirectUrl.searchParams.get('client_id')).toBe(Constants.OPENID.CLIENT_ID);
      expect(redirectUrl.searchParams.get('response_type')).toBe('code');
      expect(redirectUrl.searchParams.get('scope')).toBe('openid profile email');
      
      // Verify PKCE parameters are present
      expect(redirectUrl.searchParams.get('code_challenge')).toBeDefined();
      expect(redirectUrl.searchParams.get('code_challenge_method')).toBe('S256');
      expect(redirectUrl.searchParams.get('state')).toBeDefined();
      expect(redirectUrl.searchParams.get('nonce')).toBeDefined();
      
      // Verify redirect URI is properly encoded
      const redirectUri = redirectUrl.searchParams.get('redirect_uri');
      expect(redirectUri).toBeDefined();
      expect(redirectUri).toContain('/auth/callback');

      console.log('Successfully initiated OAuth login with all required parameters');
    });

    it('should handle multiple concurrent login initiations successfully', async () => {
      const returnTos = [
        'http://localhost:3000/app1',
        'http://localhost:3000/app2',
        'http://localhost:3000/app3'
      ];

      // Create multiple agents for concurrent testing
      const agents = Array(3).fill(null).map(() => request.agent(app));
      
      // Initiate concurrent logins
      const loginPromises = agents.map((testAgent, index) =>
        testAgent.get('/auth/login').query({ return_to: returnTos[index] })
      );

      const loginResponses = await Promise.all(loginPromises);
      
      // All should succeed with proper redirects
      loginResponses.forEach((response, index) => {
        expect(response.status).toBe(302);
        expect(response.headers.location).toContain(Constants.KEYCLOAK.BASE_URL);
        
        const redirectUrl = new URL(response.headers.location);
        expect(redirectUrl.searchParams.get('client_id')).toBe(Constants.OPENID.CLIENT_ID);
        expect(redirectUrl.searchParams.get('state')).toBeDefined();
        expect(redirectUrl.searchParams.get('code_challenge')).toBeDefined();
      });

      // Verify each has unique state parameter (no collision)
      const states = loginResponses.map(response => {
        const url = new URL(response.headers.location);
        return url.searchParams.get('state');
      });
      
      const uniqueStates = new Set(states);
      expect(uniqueStates.size).toBe(3); // All states should be unique

      console.log('Successfully handled concurrent OAuth login initiations');
    });

    it('should maintain session state for OAuth flow', async () => {
      // First login to establish session
      const loginResponse = await agent
        .get('/auth/login')
        .query({ return_to: 'http://localhost:3000/test' });

      expect(loginResponse.status).toBe(302);
      
      const loginUrl = new URL(loginResponse.headers.location);
      const originalState = loginUrl.searchParams.get('state');

      // Make another request with the same agent - should create new session state
      const secondLoginResponse = await agent
        .get('/auth/login')
        .query({ return_to: 'http://localhost:3000/test2' });

      expect(secondLoginResponse.status).toBe(302);
      
      const secondLoginUrl = new URL(secondLoginResponse.headers.location);
      const secondState = secondLoginUrl.searchParams.get('state');

      // States should be different (new session overwrites old)
      expect(originalState).not.toBe(secondState);
      expect(originalState).toBeDefined();
      expect(secondState).toBeDefined();

      console.log('Successfully verified OAuth session state management');
    });

    it('should generate secure PKCE parameters', async () => {
      const response = await agent
        .get('/auth/login')
        .query({ return_to: 'http://localhost:3000/secure' });

      expect(response.status).toBe(302);
      
      const redirectUrl = new URL(response.headers.location);
      
      const codeChallenge = redirectUrl.searchParams.get('code_challenge');
      const codeChallengeMethod = redirectUrl.searchParams.get('code_challenge_method');
      const state = redirectUrl.searchParams.get('state');
      const nonce = redirectUrl.searchParams.get('nonce');
      
      // Verify PKCE parameters meet security requirements
      expect(codeChallenge).toBeDefined();
      expect(codeChallenge.length).toBeGreaterThan(40); // Base64 encoded, should be substantial
      expect(codeChallengeMethod).toBe('S256'); // Must use SHA256
      
      // Verify state and nonce are sufficiently random
      expect(state).toBeDefined();
      expect(state.length).toBeGreaterThan(20);
      expect(nonce).toBeDefined();
      expect(nonce.length).toBeGreaterThan(20);
      
      // Verify they are URL-safe (no special characters that would break URLs)
      expect(codeChallenge).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(state).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(nonce).toMatch(/^[A-Za-z0-9_-]+$/);

      console.log('Successfully verified secure PKCE parameter generation');
    });
  });

  describe('Successful Logout Flow', () => {
    it('should successfully initiate logout without authenticated session', async () => {
      const returnTo = 'http://localhost:3000/goodbye';
      
      const response = await agent
        .get('/auth/logout')
        .query({ return_to: returnTo });

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe(returnTo);

      console.log('Successfully handled logout without session');
    });

    it('should handle logout with missing return_to parameter', async () => {
      const response = await agent.get('/auth/logout');

      expect(response.status).toBe(302);
      // Should have a default redirect location
      expect(response.headers.location).toBeDefined();

      console.log('Successfully handled logout with default redirect');
    });

    it('should clear session state on logout', async () => {
      // Establish session first
      await agent.get('/auth/login').query({ return_to: 'http://localhost:3000/app' });

      // Logout
      const logoutResponse = await agent
        .get('/auth/logout')
        .query({ return_to: 'http://localhost:3000/bye' });

      expect(logoutResponse.status).toBe(302);

      // Verify profile returns 401 (session cleared)
      const profileResponse = await agent.get('/auth/profile');
      expect(profileResponse.status).toBe(401);
      expect(profileResponse.body.error).toBe('Not authenticated');

      console.log('Successfully cleared session on logout');
    });
  });

  describe('Real Keycloak Integration', () => {
    const testDfspId = 'TEST_AUTH_SUCCESS_DFSP';
    const testPassword = 'TempPassword123!';

    beforeAll(async () => {
      const kcAdminClient = await KeycloakService.getKeycloakAdminClient();
      
      // Create a test OAuth client that allows direct access grants (password flow)
      const testClientConfig = {
        clientId: `test-client-${testDfspId.toLowerCase()}`,
        name: `Test OAuth Client for ${testDfspId}`,
        enabled: true,
        directAccessGrantsEnabled: true, // Enable password grant flow
        standardFlowEnabled: false,
        implicitFlowEnabled: false,
        serviceAccountsEnabled: false,
        publicClient: false,
        clientAuthenticatorType: 'client-secret',
        protocol: 'openid-connect'
      };
      
      const clientResult = await kcAdminClient.clients.create(testClientConfig);
      
      // Get the client secret
      const clients = await kcAdminClient.clients.find({ clientId: testClientConfig.clientId });
      if (clients.length > 0) {
        const clientSecret = await kcAdminClient.clients.getClientSecret({ id: clients[0].id });
        global.testClientId = testClientConfig.clientId;
        global.testClientSecret = clientSecret.value;
      }
      
      // Create user with password included in creation
      const testEmail = `${testDfspId.toLowerCase()}@example.com`;
      const userConfig = {
        username: testEmail,  // Use email as username
        enabled: true,
        emailVerified: true,
        email: testEmail,
        firstName: 'Test',
        lastName: 'User',
        credentials: [{
          type: 'password',
          value: testPassword,
          temporary: false
        }],
        requiredActions: []
      };
      
      const userResult = await kcAdminClient.users.create(userConfig);
      global.testUserId = typeof userResult === 'string' ? userResult : userResult.id;
      
      // Assign user to required groups (MTA and a DFSP group)
      const applicationGroups = await kcAdminClient.groups.find();
      const applicationGroup = applicationGroups.find(g => g.name === Constants.OPENID.GROUPS.APPLICATION);
      
      if (applicationGroup) {
        const subGroups = await kcAdminClient.groups.listSubGroups({parentId: applicationGroup.id});
        const mtaGroup = subGroups.find(g => g.name === Constants.OPENID.GROUPS.MTA);
        
        if (mtaGroup) {
          await kcAdminClient.users.addToGroup({
            id: global.testUserId,
            groupId: mtaGroup.id
          });
        }
      }
      
      console.log('Successfully created test client and user for real Keycloak integration');
    });

    afterAll(async () => {
      const kcAdminClient = await KeycloakService.getKeycloakAdminClient();
      
      // Clean up the test user
      if (global.testUserId) {
        await kcAdminClient.users.del({ id: global.testUserId });
      }
      
      // Clean up the test client
      const clients = await kcAdminClient.clients.find({ clientId: global.testClientId });
      if (clients.length > 0) {
        await kcAdminClient.clients.del({ id: clients[0].id });
      }
      
      console.log('Successfully cleaned up test user and client');
    });

    it('should successfully authenticate with real Keycloak via direct grant', async () => {
      const tokenUrl = `${Constants.KEYCLOAK.BASE_URL}/realms/${Constants.KEYCLOAK.DFSPS_REALM}/protocol/openid-connect/token`;
      
      const testEmail = `${testDfspId.toLowerCase()}@example.com`;
      
      const tokenResponse = await axios.post(tokenUrl, new URLSearchParams({
        grant_type: 'password',
        client_id: global.testClientId,
        client_secret: global.testClientSecret,
        username: testEmail,  // Use email as username
        password: testPassword,
        scope: 'openid profile email'
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      expect(tokenResponse.status).toBe(200);
      expect(tokenResponse.data.access_token).toBeDefined();
      expect(tokenResponse.data.id_token).toBeDefined();
      expect(tokenResponse.data.token_type).toBe('Bearer');
      expect(tokenResponse.data.expires_in).toBeGreaterThan(0);

      // Decode and verify ID token
      const idTokenPayload = JSON.parse(
        Buffer.from(tokenResponse.data.id_token.split('.')[1], 'base64').toString()
      );

      expect(idTokenPayload.sub).toBeDefined();
      expect(idTokenPayload.preferred_username).toBe(testEmail);
      expect(idTokenPayload.iss).toBe(`${Constants.KEYCLOAK.BASE_URL}/realms/${Constants.KEYCLOAK.DFSPS_REALM}`);
      expect(idTokenPayload.aud).toBe(global.testClientId);
      expect(idTokenPayload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));

      // Verify token can be used to access userinfo
      const userinfoUrl = `${Constants.KEYCLOAK.BASE_URL}/realms/${Constants.KEYCLOAK.DFSPS_REALM}/protocol/openid-connect/userinfo`;
      const userinfoResponse = await axios.get(userinfoUrl, {
        headers: {
          'Authorization': `Bearer ${tokenResponse.data.access_token}`
        }
      });

      expect(userinfoResponse.status).toBe(200);
      expect(userinfoResponse.data.sub).toBe(idTokenPayload.sub);
      expect(userinfoResponse.data.preferred_username).toBe(testEmail);

      console.log('Successfully authenticated with real Keycloak and verified token validity');
    });

    it('should validate Keycloak infrastructure is properly configured', async () => {
      // Test JWKS endpoint
      const jwksUrl = `${Constants.KEYCLOAK.BASE_URL}/realms/${Constants.KEYCLOAK.DFSPS_REALM}/protocol/openid-connect/certs`;
      const jwksResponse = await axios.get(jwksUrl);
      
      expect(jwksResponse.status).toBe(200);
      expect(jwksResponse.data.keys).toBeDefined();
      expect(Array.isArray(jwksResponse.data.keys)).toBe(true);
      expect(jwksResponse.data.keys.length).toBeGreaterThan(0);

      // Verify signing keys have required properties
      const signingKeys = jwksResponse.data.keys.filter(key => key.use === 'sig');
      expect(signingKeys.length).toBeGreaterThan(0);
      
      signingKeys.forEach(key => {
        expect(key.kty).toBe('RSA');
        expect(key.alg).toBeDefined();
        expect(key.kid).toBeDefined(); // Key ID for token verification
        expect(key.n).toBeDefined(); // RSA modulus
        expect(key.e).toBeDefined(); // RSA exponent
      });

      // Test OIDC discovery endpoint
      const discoveryUrl = `${Constants.KEYCLOAK.BASE_URL}/realms/${Constants.KEYCLOAK.DFSPS_REALM}/.well-known/openid-configuration`;
      const discoveryResponse = await axios.get(discoveryUrl);
      
      expect(discoveryResponse.status).toBe(200);
      expect(discoveryResponse.data.issuer).toBe(`${Constants.KEYCLOAK.BASE_URL}/realms/${Constants.KEYCLOAK.DFSPS_REALM}`);
      expect(discoveryResponse.data.authorization_endpoint).toBe(`${Constants.KEYCLOAK.BASE_URL}/realms/${Constants.KEYCLOAK.DFSPS_REALM}/protocol/openid-connect/auth`);
      expect(discoveryResponse.data.token_endpoint).toBe(`${Constants.KEYCLOAK.BASE_URL}/realms/${Constants.KEYCLOAK.DFSPS_REALM}/protocol/openid-connect/token`);
      expect(discoveryResponse.data.jwks_uri).toBe(jwksUrl);
      expect(discoveryResponse.data.userinfo_endpoint).toBeDefined();

      // Verify supported features
      expect(discoveryResponse.data.response_types_supported).toContain('code');
      expect(discoveryResponse.data.grant_types_supported).toContain('authorization_code');
      expect(discoveryResponse.data.code_challenge_methods_supported).toContain('S256');

      console.log('Keycloak infrastructure is properly configured and all endpoints accessible');
    });
  });

  describe('Essential Error Handling', () => {
    it('should return 401 when accessing profile without authentication', async () => {
      const response = await agent.get('/auth/profile');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Not authenticated');
    });

    it('should handle OAuth callback failures gracefully', async () => {
      // Attempt callback without establishing session first
      const invalidSessionResponse = await agent
        .get('/auth/callback')
        .query({ code: 'test-code', state: 'test-state' });

      expect(invalidSessionResponse.status).toBe(400);
      expect(invalidSessionResponse.body.error).toContain('Invalid session');
    });
  });
}); 