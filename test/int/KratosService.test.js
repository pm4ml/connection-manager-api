/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 **/

const KratosService = require('../../src/service/KratosService');
const InternalError = require('../../src/errors/InternalError');
const Constants = require('../../src/constants/Constants');
const KetoClient = require('../../src/utils/KetoClient');
const { createUniqueDfsp } = require('./test-helpers');

describe('KratosService Integration Tests', () => {
  let testDfsp;
  let identityId;
  const keto = new KetoClient(Constants.KETO.WRITE_URL, Constants.KETO.READ_URL);

  beforeEach(() => {
    testDfsp = createUniqueDfsp();
    identityId = null;
  });

  afterEach(async () => {
    if (identityId) {
      try { await KratosService.deleteIdentity(identityId); } catch (_) { /* ignore */ }
    }
    if (testDfsp) {
      try { await KratosService.deleteDfspRole(testDfsp.dfspId); } catch (_) { /* ignore */ }
    }
  });

  describe('createIdentity', () => {
    it('creates an identity with email/dfspId/role traits and a verifiable email address', async () => {
      const result = await KratosService.createIdentity(testDfsp.email, testDfsp.dfspId, 'dfsp');
      identityId = result.identityId;

      expect(typeof identityId).toBe('string');
      expect(identityId).toMatch(/^[0-9a-f-]{36}$/i);

      const fetched = await KratosService.findIdentityByEmail(testDfsp.email);
      expect(fetched).toBeTruthy();
      expect(fetched.id).toBe(identityId);
      expect(fetched.traits.email).toBe(testDfsp.email);
      expect(fetched.traits.dfspId).toBe(testDfsp.dfspId);
      expect(fetched.traits.role).toBe('dfsp');
      expect(fetched.verifiable_addresses?.[0]?.value).toBe(testDfsp.email);
      expect(fetched.verifiable_addresses?.[0]?.verified).toBe(false);
    });

    it('returns the existing identity id when called twice for the same email', async () => {
      const first = await KratosService.createIdentity(testDfsp.email, testDfsp.dfspId, 'dfsp');
      identityId = first.identityId;
      const second = await KratosService.createIdentity(testDfsp.email, testDfsp.dfspId, 'dfsp');
      expect(second.identityId).toBe(first.identityId);
    });

    it('creates a hub admin (no dfspId trait)', async () => {
      const adminEmail = `admin-${Date.now()}@example.com`;
      const result = await KratosService.createIdentity(adminEmail, null, 'hub-admin');
      identityId = result.identityId;

      const fetched = await KratosService.findIdentityByEmail(adminEmail);
      expect(fetched.traits.email).toBe(adminEmail);
      expect(fetched.traits.dfspId).toBeUndefined();
      expect(fetched.traits.role).toBe('hub-admin');
    });
  });

  describe('findIdentityByEmail', () => {
    it('returns null for unknown email', async () => {
      const result = await KratosService.findIdentityByEmail(`unknown-${Date.now()}@example.com`);
      expect(result).toBeNull();
    });
  });

  describe('sendInvitationEmail', () => {
    it('triggers a Kratos recovery flow for the identity (Kratos courier dispatches the email)', async () => {
      const result = await KratosService.createIdentity(testDfsp.email, testDfsp.dfspId, 'dfsp');
      identityId = result.identityId;

      await expect(KratosService.sendInvitationEmail(testDfsp.email)).resolves.toBeUndefined();
    });

    it('is a no-op when called with no email', async () => {
      await expect(KratosService.sendInvitationEmail(undefined)).resolves.toBeUndefined();
    });
  });

  describe('deleteIdentity', () => {
    it('removes an existing identity', async () => {
      const result = await KratosService.createIdentity(testDfsp.email, testDfsp.dfspId, 'dfsp');
      const createdId = result.identityId;

      await KratosService.deleteIdentity(createdId);
      identityId = null;

      const fetched = await KratosService.findIdentityByEmail(testDfsp.email);
      expect(fetched).toBeNull();
    });

    it('is a no-op when the identity does not exist', async () => {
      await expect(KratosService.deleteIdentity('00000000-0000-0000-0000-000000000000'))
        .resolves.toBeUndefined();
    });
  });

  describe('assignDfspRole', () => {
    it('creates the dfsp:{id} role with hub-admin transitivity and binds the identity', async () => {
      const result = await KratosService.createIdentity(testDfsp.email, testDfsp.dfspId, 'dfsp');
      identityId = result.identityId;

      await KratosService.assignDfspRole(identityId, testDfsp.dfspId);

      const tuples = await keto.client.getRelationships({
        namespace: 'role',
        object: `dfsp:${testDfsp.dfspId}`,
        relation: 'member',
      });

      const subjects = tuples.data.relation_tuples.map(t => t.subject_id || t.subject_set);
      expect(subjects).toContainEqual(identityId);
      expect(subjects).toContainEqual(
        expect.objectContaining({ namespace: 'role', object: 'hub-admin', relation: 'member' })
      );
    });
  });

  describe('removeDfspRole', () => {
    it('removes the identity from the dfsp:{id} role', async () => {
      const result = await KratosService.createIdentity(testDfsp.email, testDfsp.dfspId, 'dfsp');
      identityId = result.identityId;
      await KratosService.assignDfspRole(identityId, testDfsp.dfspId);

      await KratosService.removeDfspRole(identityId, testDfsp.dfspId);

      const tuples = await keto.client.getRelationships({
        namespace: 'role',
        object: `dfsp:${testDfsp.dfspId}`,
        relation: 'member',
        subjectId: identityId,
      });
      expect(tuples.data.relation_tuples).toHaveLength(0);
    });
  });

  describe('connection failures', () => {
    it('wraps Kratos admin errors in InternalError', async () => {
      const original = Constants.KRATOS.ADMIN_URL;
      Constants.KRATOS.ADMIN_URL = 'http://invalid-kratos-host:4434';
      delete require.cache[require.resolve('../../src/service/KratosService')];
      const Fresh = require('../../src/service/KratosService');

      try {
        await expect(Fresh.createIdentity(`bad-${Date.now()}@example.com`, 'x', 'dfsp'))
          .rejects.toBeInstanceOf(InternalError);
      } finally {
        Constants.KRATOS.ADMIN_URL = original;
        delete require.cache[require.resolve('../../src/service/KratosService')];
      }
    });
  });
});
