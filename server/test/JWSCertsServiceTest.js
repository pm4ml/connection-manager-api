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

const { setupTestDB, tearDownTestDB } = require('./test-database');

const JWSCertsService = require('../src/service/JWSCertsService');
const PkiService = require('../src/service/PkiService');
const assert = require('chai').assert;
const NotFoundError = require('../src/errors/NotFoundError');
const ValidationCodes = require('../src/pki_engine/ValidationCodes');
const forge = require('node-forge');

describe('JWSCertsService', () => {
  before(async () => {
    await setupTestDB();
  });

  after(async () => {
    await tearDownTestDB();
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
      const resultDfsp = await PkiService.createDFSP(dfsp);
      dfspId = resultDfsp.id;
      const result = await JWSCertsService.createDfspJWSCerts(dfspId, body);
      assert.equal(publicKey, result.publicKey);
      const certs = await JWSCertsService.getAllDfspJWSCerts();
      console.log(certs);
      await PkiService.deleteDFSP(dfspId);
      const certs2 = await JWSCertsService.getAllDfspJWSCerts();
      console.log(certs2);
    }).timeout(30000);

    it('should create and delete a DfspJWSCerts entry', async () => {
      const body = { publicKey };
      const dfsp = {
        dfspId: 'DFSP_TEST',
        name: 'DFSP'
      };
      const resultDfsp = await PkiService.createDFSP(dfsp);
      dfspId = resultDfsp.id;
      await JWSCertsService.createDfspJWSCerts(dfspId, body);
      await JWSCertsService.deleteDfspJWSCerts(dfspId);
      try {
        await JWSCertsService.getDfspJWSCerts(dfspId);
        assert.fail('Should have throw NotFoundError');
      } catch (error) {
        assert.instanceOf(error, NotFoundError);
      }
      await PkiService.deleteDFSP(dfspId);
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
        await PkiService.createDFSP(dfsp);
        dfspIds.push(dfsp.dfspId);

        await JWSCertsService.createDfspJWSCerts(dfsp.dfspId, body);
      }

      const certs = await JWSCertsService.getAllDfspJWSCerts();
      certs.forEach(cert => {
        assert.equal(publicKey, cert.publicKey);
      });

      await Promise.all(dfspIds.map(id => PkiService.deleteDFSP(id)));
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
        await PkiService.createDFSP(dfsp);
        dfspIds.push(dfsp.dfspId);

        await JWSCertsService.createDfspJWSCerts(dfsp.dfspId, body);
      }

      const certs = await JWSCertsService.getAllDfspJWSCerts();
      certs.forEach(cert => {
        assert.isNotNull(cert.dfspId);
        assert.include(dfspIds, cert.dfspId);
      });

      await Promise.all(dfspIds.map(id => PkiService.deleteDFSP(id)));
    }).timeout(30000);

    it('should throw an error with a wrong key size', async () => {
      const body = { publicKey: publicKey.replace('A', '') };
      const dfsp = {
        dfspId: 'DFSP_TEST',
        name: 'DFSP'
      };
      const resultDfsp = await PkiService.createDFSP(dfsp);
      dfspId = resultDfsp.id;
      const result = await JWSCertsService.createDfspJWSCerts(dfspId, body);
      assert.isNotNull(result.validations);
      assert.isNotNull(result.validationState);
      assert.strictEqual(result.validationState, ValidationCodes.VALID_STATES.INVALID);
      await PkiService.deleteDFSP(dfspId);
    }).timeout(30000);
  });
});
