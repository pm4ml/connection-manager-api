/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 **/

const HydraService = require('../../src/service/HydraService');
const InternalError = require('../../src/errors/InternalError');
const NotFoundError = require('../../src/errors/NotFoundError');
const Constants = require('../../src/constants/Constants');
const { createUniqueDfsp } = require('./test-helpers');

describe('HydraService Integration Tests', () => {
  let testDfsp;

  beforeEach(() => {
    testDfsp = createUniqueDfsp();
  });

  afterEach(async () => {
    if (testDfsp) {
      try { await HydraService.deleteClient(testDfsp.dfspId); } catch (_) { /* ignore */ }
    }
  });

  describe('createPM4MLClient', () => {
    it('creates an OAuth2 client with client_id == dfspId', async () => {
      const result = await HydraService.createPM4MLClient(testDfsp.dfspId);

      expect(result.clientId).toBe(testDfsp.dfspId);
      expect(typeof result.clientSecret).toBe('string');
      expect(result.clientSecret.length).toBeGreaterThanOrEqual(40);

      const client = await HydraService.getClient(testDfsp.dfspId);
      expect(client).toBeTruthy();
      expect(client.clientId).toBe(testDfsp.dfspId);
      expect(client.grantTypes).toContain('client_credentials');
      expect(client.tokenEndpointAuthMethod).toBe('client_secret_basic');
    });

    it('rotates the secret if the client already exists', async () => {
      const first = await HydraService.createPM4MLClient(testDfsp.dfspId);
      const second = await HydraService.createPM4MLClient(testDfsp.dfspId);

      expect(second.clientId).toBe(testDfsp.dfspId);
      expect(second.clientSecret).not.toBe(first.clientSecret);
    });

    it('issues working credentials usable against the Hydra token endpoint', async () => {
      const { clientId, clientSecret } = await HydraService.createPM4MLClient(testDfsp.dfspId);

      const body = new URLSearchParams({
        grant_type: 'client_credentials',
        audience: Constants.HYDRA.AUDIENCE,
      });
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const res = await fetch(`${Constants.HYDRA.PUBLIC_URL}/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${auth}`,
        },
        body,
      });
      const tokenJson = await res.json();
      expect(res.status).toBe(200);
      expect(typeof tokenJson.access_token).toBe('string');
      expect(tokenJson.token_type).toMatch(/bearer/i);
    });
  });

  describe('rotateClientSecret', () => {
    it('generates a new working secret and invalidates the old one', async () => {
      const first = await HydraService.createPM4MLClient(testDfsp.dfspId);
      const rotated = await HydraService.rotateClientSecret(testDfsp.dfspId);

      expect(rotated.clientSecret).not.toBe(first.clientSecret);

      const oldAuth = Buffer.from(`${first.clientId}:${first.clientSecret}`).toString('base64');
      const newAuth = Buffer.from(`${rotated.clientId}:${rotated.clientSecret}`).toString('base64');

      const failed = await fetch(`${Constants.HYDRA.PUBLIC_URL}/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${oldAuth}` },
        body: new URLSearchParams({ grant_type: 'client_credentials' }),
      });
      expect(failed.status).toBe(401);

      const ok = await fetch(`${Constants.HYDRA.PUBLIC_URL}/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${newAuth}` },
        body: new URLSearchParams({ grant_type: 'client_credentials' }),
      });
      expect(ok.status).toBe(200);
    });

    it('throws NotFoundError when rotating a non-existent client', async () => {
      await expect(HydraService.rotateClientSecret('does-not-exist-' + Date.now()))
        .rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('deleteClient', () => {
    it('removes an existing client', async () => {
      await HydraService.createPM4MLClient(testDfsp.dfspId);
      await HydraService.deleteClient(testDfsp.dfspId);
      expect(await HydraService.getClient(testDfsp.dfspId)).toBeNull();
    });

    it('is a no-op when the client does not exist', async () => {
      await expect(HydraService.deleteClient('does-not-exist-' + Date.now())).resolves.toBeUndefined();
    });
  });

  describe('connection failures', () => {
    it('wraps Hydra admin errors in InternalError', async () => {
      const original = Constants.HYDRA.ADMIN_URL;
      Constants.HYDRA.ADMIN_URL = 'http://invalid-hydra-host:4445';
      // Force the cached client to be rebuilt against the bad URL.
      delete require.cache[require.resolve('../../src/service/HydraService')];
      const Fresh = require('../../src/service/HydraService');

      try {
        await expect(Fresh.createPM4MLClient(testDfsp.dfspId)).rejects.toBeInstanceOf(InternalError);
      } finally {
        Constants.HYDRA.ADMIN_URL = original;
        delete require.cache[require.resolve('../../src/service/HydraService')];
      }
    });
  });
});
