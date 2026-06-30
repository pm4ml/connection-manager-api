/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 **/

const { createContext, destroyContext } = require('./context');
const PkiService = require('../../src/service/PkiService');
const HydraService = require('../../src/service/HydraService');
const KratosService = require('../../src/service/KratosService');
const CredentialsService = require('../../src/service/CredentialsService');
const KetoClient = require('../../src/utils/KetoClient');
const Constants = require('../../src/constants/Constants');
const { createUniqueDfsp } = require('./test-helpers');

const keto = new KetoClient(Constants.KETO.WRITE_URL, Constants.KETO.READ_URL, Constants.KETO.HUB_OBJECT);

const cleanup = async (ctx, dfsp) => {
  try { await PkiService.deleteDFSP(ctx, dfsp.dfspId); } catch (_) { /* ignore */ }
  try { await HydraService.deleteClient(dfsp.dfspId); } catch (_) { /* ignore */ }
  const ident = await KratosService.findIdentityByEmail(dfsp.email).catch(() => null);
  if (ident) {
    try { await KratosService.deleteIdentity(ident.id); } catch (_) { /* ignore */ }
  }
  try { await keto.deleteDfsp(dfsp.dfspId); } catch (_) { /* ignore */ }
  try { await ctx.pkiEngine.deleteSecret(`api-credentials/${dfsp.dfspId}`); } catch (_) { /* ignore */ }
};

describe('DFSP IAM Integration Tests', () => {
  let context;
  let testDfsp;

  beforeAll(async () => {
    context = await createContext();
  });

  afterAll(async () => {
    if (context) {
      if (testDfsp) await cleanup(context, testDfsp);
      await destroyContext(context);
    }
  });

  beforeEach(async () => {
    testDfsp = createUniqueDfsp();
    await cleanup(context, testDfsp);
  });

  describe('DFSP Lifecycle Management', () => {
    it('creates a DFSP with a Hydra client, a Kratos identity, and Keto Dfsp tuples', async () => {
      await PkiService.createDFSP(context, testDfsp);

      const client = await HydraService.getClient(testDfsp.dfspId);
      expect(client).toBeTruthy();
      expect(client.client_id).toBe(testDfsp.dfspId);
      expect(client.grant_types).toContain('client_credentials');

      const identity = await KratosService.findIdentityByEmail(testDfsp.email);
      expect(identity).toBeTruthy();
      expect(identity.traits.email).toBe(testDfsp.email);
      expect(identity.metadata_public.dfspId).toBe(testDfsp.dfspId);

      // Dfsp:<id>#members holds the human identity and the machine client (client_id = dfspId)
      const members = await keto.listDfspMembers(testDfsp.dfspId);
      expect(members).toContain(identity.id);
      expect(members).toContain(testDfsp.dfspId);

      // Dfsp:<id>#parent@Hub:<hub>
      const parent = await keto.read.getRelationships({ namespace: 'Dfsp', object: testDfsp.dfspId, relation: 'parent' });
      const parentSets = parent.data.relation_tuples.map(t => t.subject_set);
      expect(parentSets).toContainEqual(expect.objectContaining({ namespace: 'Hub', object: Constants.KETO.HUB_OBJECT }));
    });

    it('rotates credentials via CredentialsService and keeps them retrievable from Vault', async () => {
      await PkiService.createDFSP(context, testDfsp);

      const first = await CredentialsService.createCredentials(context, testDfsp.dfspId);
      expect(first.status).toBe(201);
      expect(first.data.clientId).toBe(testDfsp.dfspId);

      const fetched = await CredentialsService.getCredentials(context, testDfsp.dfspId);
      expect(fetched.clientSecret).toBe(first.data.clientSecret);

      const second = await CredentialsService.createCredentials(context, testDfsp.dfspId);
      expect(second.data.clientSecret).not.toBe(first.data.clientSecret);

      const refetched = await CredentialsService.getCredentials(context, testDfsp.dfspId);
      expect(refetched.clientSecret).toBe(second.data.clientSecret);
    });

    it('issues a working JWT against Hydra using the stored credentials', async () => {
      await PkiService.createDFSP(context, testDfsp);
      const created = await CredentialsService.createCredentials(context, testDfsp.dfspId);

      const auth = Buffer.from(`${created.data.clientId}:${created.data.clientSecret}`).toString('base64');
      const res = await fetch(`${Constants.HYDRA.PUBLIC_URL}/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${auth}`,
        },
        body: new URLSearchParams({ grant_type: 'client_credentials', audience: Constants.HYDRA.AUDIENCE }),
      });
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(typeof json.access_token).toBe('string');
    });

    it('removes the Hydra client, the identity, and the Keto Dfsp tuples on delete', async () => {
      await PkiService.createDFSP(context, testDfsp);
      await CredentialsService.createCredentials(context, testDfsp.dfspId);
      expect(await HydraService.getClient(testDfsp.dfspId)).toBeTruthy();

      const identityBefore = await KratosService.findIdentityByEmail(testDfsp.email);
      expect(identityBefore).toBeTruthy();

      await PkiService.deleteDFSP(context, testDfsp.dfspId);

      expect(await HydraService.getClient(testDfsp.dfspId)).toBeNull();
      expect(await KratosService.findIdentityByEmail(testDfsp.email)).toBeNull();
      expect(await keto.listDfspMembers(testDfsp.dfspId)).toHaveLength(0);
    });

    it('retains a multi-DFSP identity when only one of its DFSPs is deleted', async () => {
      const secondDfsp = createUniqueDfsp({ email: testDfsp.email });
      try {
        await PkiService.createDFSP(context, testDfsp);
        await PkiService.createDFSP(context, secondDfsp);

        const identity = await KratosService.findIdentityByEmail(testDfsp.email);
        expect(identity).toBeTruthy();
        // the shared identity is a member of both DFSPs
        expect(await keto.listDfspMemberships(identity.id)).toEqual(
          expect.arrayContaining([testDfsp.dfspId, secondDfsp.dfspId])
        );

        await PkiService.deleteDFSP(context, testDfsp.dfspId);

        const stillThere = await KratosService.findIdentityByEmail(testDfsp.email);
        expect(stillThere).toBeTruthy();
        expect(stillThere.id).toBe(identity.id);
      } finally {
        await cleanup(context, secondDfsp);
      }
    });
  });

  describe('Error Recovery', () => {
    it('rolls back Hydra and Kratos resources when DFSPModel.create fails', async () => {
      const conflictDfsp = createUniqueDfsp();
      // Pre-create a conflicting Hydra client to force a downstream failure path
      // (this scenario also exercises the existing-client branch).
      await HydraService.createPM4MLClient(conflictDfsp.dfspId);

      const DFSPModel = require('../../src/models/DFSPModel');
      const originalCreate = DFSPModel.create;
      DFSPModel.create = jest.fn().mockRejectedValue(new Error('DB write failed'));

      try {
        await expect(PkiService.createDFSP(context, conflictDfsp)).rejects.toThrow('DB write failed');
      } finally {
        DFSPModel.create = originalCreate;
      }

      // Hydra client was deleted by rollback
      expect(await HydraService.getClient(conflictDfsp.dfspId)).toBeNull();
      // Identity was also deleted
      expect(await KratosService.findIdentityByEmail(conflictDfsp.email)).toBeNull();

      await cleanup(context, conflictDfsp);
    });
  });

  describe('Multi-DFSP Scenarios', () => {
    it('isolates Hydra clients, Kratos identities, and Keto tuples across DFSPs', async () => {
      const extra = [createUniqueDfsp(), createUniqueDfsp()];
      const all = [testDfsp, ...extra];

      try {
        await Promise.all(all.map(d => PkiService.createDFSP(context, d)));

        for (const d of all) {
          const client = await HydraService.getClient(d.dfspId);
          expect(client.client_id).toBe(d.dfspId);

          const identity = await KratosService.findIdentityByEmail(d.email);
          expect(identity.metadata_public.dfspId).toBe(d.dfspId);
        }

        const credSets = await Promise.all(all.map(d => CredentialsService.createCredentials(context, d.dfspId)));
        const secrets = credSets.map(c => c.data.clientSecret);
        expect(new Set(secrets).size).toBe(all.length);

        // Deleting one DFSP doesn't affect the others
        await PkiService.deleteDFSP(context, testDfsp.dfspId);
        expect(await HydraService.getClient(testDfsp.dfspId)).toBeNull();
        expect(await HydraService.getClient(extra[0].dfspId)).toBeTruthy();
        expect(await HydraService.getClient(extra[1].dfspId)).toBeTruthy();
      } finally {
        for (const d of extra) await cleanup(context, d);
      }
    });
  });
});
