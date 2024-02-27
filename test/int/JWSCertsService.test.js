/******************************************************************************
 *  Copyright 2019 ModusBox, Inc.                                             *
 *                                                                            *
 *  info@modusbox.com                                                         *
 *                                                                            *
 *  Licensed under the Apache License, Version 2.0 (the "License");           *
 *  you may not use this file except in compliance with the License.          *
 *  You may obtain a copy of the License at                                   *
 *  http://www.apache.org/licenses/LICENSE-2.0                                *
 *                                                                            *
 *  Unless required by applicable law or agreed to in writing, software       *
 *  distributed under the License is distributed on an "AS IS" BASIS,         *
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  *
 *  See the License for the specific language governing permissions and       *
 *  limitations under the License.                                            *
 ******************************************************************************/

const { assert } = require('chai');
const forge = require('node-forge');

const JWSCertsService = require('../../src/service/JWSCertsService');
const PkiService = require('../../src/service/PkiService');
const NotFoundError = require('../../src/errors/NotFoundError');
const ValidationCodes = require('../../src/pki_engine/ValidationCodes');
const DFSPModel = require('../../src/models/DFSPModel');
const { setupTestDB, tearDownTestDB } = require('./test-database');
const { createContext, destroyContext } = require('./context');

const SWITCH_ID = 'switch';

describe('JWSCertsService Tests', () => {
  let ctx;

  before(async () => {
    await setupTestDB();
    ctx = await createContext();
  });

  after(async () => {
    await tearDownTestDB();
    destroyContext(ctx);
  });

  describe('JWS Certificates', () => {
    let dfspId = null;

    const keypair = forge.rsa.generateKeyPair({ bits: 2048 });
    const publicKey = forge.pki.publicKeyToPem(keypair.publicKey, 72);

    it('should create a DfspJWSCerts entry', async () => {
      const body = { publicKey };
      const dfsp = {
        dfspId: 'DFSP_TEST',
        name: 'DFSP'
      };
      const resultDfsp = await PkiService.createDFSP(ctx, dfsp);
      dfspId = resultDfsp.id;
      const result = await JWSCertsService.createDfspJWSCerts(ctx, dfspId, body);
      assert.equal(publicKey, result.publicKey);
      const certs = await JWSCertsService.getAllDfspJWSCerts(ctx);
      console.log(certs);
      await PkiService.deleteDFSP(ctx, dfspId);
      const certs2 = await JWSCertsService.getAllDfspJWSCerts(ctx);
      console.log(certs2);
    }).timeout(30000);

    it('should set a hub JWSCerts', async () => {
      const body = { publicKey };
      const result = await JWSCertsService.setHubJWSCerts(ctx, body);
      assert.equal(publicKey, result.publicKey);
      const hubKeyData = await JWSCertsService.getHubJWSCerts(ctx);
      console.log(hubKeyData);
      assert.equal(hubKeyData.dfspId, SWITCH_ID);
      assert.equal(hubKeyData.validationState, 'VALID');

      const allKeysData = await JWSCertsService.getAllDfspJWSCerts(ctx);
      console.log(allKeysData);
      const hubKey = allKeysData.find(k => k.dfspId === SWITCH_ID);
      assert.exists(hubKey);

      await JWSCertsService.deleteDfspJWSCerts(ctx, SWITCH_ID);
      await DFSPModel.delete(SWITCH_ID);
    }).timeout(30000);

    it('should create and delete a DfspJWSCerts entry', async () => {
      const body = { publicKey };
      const dfsp = {
        dfspId: 'DFSP_TEST',
        name: 'DFSP'
      };
      const resultDfsp = await PkiService.createDFSP(ctx, dfsp);
      dfspId = resultDfsp.id;
      await JWSCertsService.createDfspJWSCerts(ctx, dfspId, body);
      await JWSCertsService.deleteDfspJWSCerts(ctx, dfspId);
      try {
        await JWSCertsService.getDfspJWSCerts(ctx, dfspId);
        assert.fail('Should have throw NotFoundError');
      } catch (error) {
        assert.instanceOf(error, NotFoundError);
      }
      await PkiService.deleteDFSP(ctx, dfspId);
    }).timeout(30000);

    it('should create and find several dfsps certs', async () => {
      const body = { publicKey };

      const N_DFSPS = 20;
      const dfspIds = [];
      for (let i = 0; i < N_DFSPS; i++) {
        const dfsp = {
          dfspId: 'DFSP_TEST' + i,
          name: 'DFSP'
        };
        await PkiService.createDFSP(ctx, dfsp);
        dfspIds.push(dfsp.dfspId);

        await JWSCertsService.createDfspJWSCerts(ctx, dfsp.dfspId, body);
      }

      const certs = await JWSCertsService.getAllDfspJWSCerts(ctx);
      certs.forEach(cert => {
        assert.equal(publicKey, cert.publicKey);
      });

      await Promise.all(dfspIds.map(id => PkiService.deleteDFSP(ctx, id)));
    }).timeout(30000);

    it('should create and find several dfsps certs and dfspId shouldnt be null', async () => {
      const body = { publicKey };

      const N_DFSPS = 20;
      const dfspIds = [];
      for (let i = 0; i < N_DFSPS; i++) {
        const dfsp = {
          dfspId: 'DFSP_TEST' + i,
          name: 'DFSP'
        };
        await PkiService.createDFSP(ctx, dfsp);
        dfspIds.push(dfsp.dfspId);

        await JWSCertsService.createDfspJWSCerts(ctx, dfsp.dfspId, body);
      }

      const certs = await JWSCertsService.getAllDfspJWSCerts(ctx);
      certs.forEach(cert => {
        assert.isNotNull(cert.dfspId);
        assert.include(dfspIds, cert.dfspId);
      });

      await Promise.all(dfspIds.map(id => PkiService.deleteDFSP(ctx, id)));
    }).timeout(30000);

    it('should throw an error with a wrong key size', async () => {
      const body = { publicKey: publicKey.replace('A', '') };
      const dfsp = {
        dfspId: 'DFSP_TEST',
        name: 'DFSP'
      };
      const resultDfsp = await PkiService.createDFSP(ctx, dfsp);
      dfspId = resultDfsp.id;
      const result = await JWSCertsService.createDfspJWSCerts(ctx, dfspId, body);
      assert.isNotNull(result.validations);
      assert.isNotNull(result.validationState);
      assert.strictEqual(result.validationState, ValidationCodes.VALID_STATES.INVALID);
      await PkiService.deleteDFSP(ctx, dfspId);
    }).timeout(30000);
  });
});
