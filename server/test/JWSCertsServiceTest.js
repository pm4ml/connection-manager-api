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
    let envId = null;
    let dfspId = null;

    const keypair = forge.rsa.generateKeyPair({ bits: 2048 });
    const publicKey = forge.pki.publicKeyToPem(keypair.publicKey, 72);

    beforeEach('creating Environment and DFSP', async () => {
      let env = {
        name: 'DFSP_TEST_ENV'
      };
      let result = await PkiService.createEnvironment(env);
      assert.property(result, 'id');
      assert.isNotNull(result.id);
      envId = result.id;

      let dfsp = {
        dfspId: 'DFSP_TEST',
        name: 'DFSP'
      };
      let resultDfsp = await PkiService.createDFSP(envId, dfsp);
      dfspId = resultDfsp.id;
    });

    afterEach('tearing down ENV and DFSP', async () => {
      await PkiService.deleteDFSP(envId, dfspId);
      await PkiService.deleteEnvironment(envId);
    });

    it('should create a DfspJWSCerts entry', async () => {
      let body = { publicKey };
      let result = await JWSCertsService.createDfspJWSCerts(envId, dfspId, body);
      assert.equal(publicKey, result.publicKey);
    }).timeout(30000);

    it('should create and delete a DfspJWSCerts entry', async () => {
      let body = { publicKey };
      await JWSCertsService.createDfspJWSCerts(envId, dfspId, body);
      await JWSCertsService.deleteDfspJWSCerts(envId, dfspId);
      try {
        await JWSCertsService.getDfspJWSCerts(envId, dfspId);
        assert.fail('Should have throw NotFoundError');
      } catch (error) {
        assert.instanceOf(error, NotFoundError);
      }
    }).timeout(30000);

    it('should create and find several dfsps certs', async () => {
      let body = { publicKey };

      const N_DFSPS = 20;
      let dfspIds = [];
      for (let i = 0; i < N_DFSPS; i++) {
        let dfsp = {
          dfspId: 'DFSP_TEST' + i,
          name: 'DFSP'
        };
        await PkiService.createDFSP(envId, dfsp);
        dfspIds.push(dfsp.dfspId);

        await JWSCertsService.createDfspJWSCerts(envId, dfsp.dfspId, body);
      }

      let certs = await JWSCertsService.getAllDfspJWSCerts(envId);
      certs.forEach(cert => {
        assert.equal(publicKey, cert.publicKey);
      });

      dfspIds.forEach(async id => {
        await PkiService.deleteDFSP(envId, id);
      });
    }).timeout(30000);

    it('should create and find several dfsps certs and dfspId shouldnt be null', async () => {
      let body = { publicKey };

      const N_DFSPS = 20;
      let dfspIds = [];
      for (let i = 0; i < N_DFSPS; i++) {
        let dfsp = {
          dfspId: 'DFSP_TEST' + i,
          name: 'DFSP'
        };
        await PkiService.createDFSP(envId, dfsp);
        dfspIds.push(dfsp.dfspId);

        await JWSCertsService.createDfspJWSCerts(envId, dfsp.dfspId, body);
      }

      let certs = await JWSCertsService.getAllDfspJWSCerts(envId);
      certs.forEach(cert => {
        assert.isNotNull(cert.dfspId);
        assert.include(dfspIds, cert.dfspId);
      });

      dfspIds.forEach(async id => {
        await PkiService.deleteDFSP(envId, id);
      });
    }).timeout(30000);

    it('should throw an error with a wrong key size', async () => {
      let body = { publicKey: publicKey.replace('A', '') };
      let result = await JWSCertsService.createDfspJWSCerts(envId, dfspId, body);
      assert.isNotNull(result.validations);
      assert.isNotNull(result.validationState);
      assert.strictEqual(result.validationState, ValidationCodes.VALID_STATES.INVALID);
    }).timeout(30000);
  });
});
