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

const fs = require('fs');
const path = require('path');
const ServerCertsService = require('../src/service/ServerCertsService');
const PkiService = require('../src/service/PkiService');
const assert = require('chai').assert;
const NotFoundError = require('../src/errors/NotFoundError');

const AMAZON_ROOT_CA_PATH = 'resources/amazon.com/VeriSign-Class-3-Public-Primary-Certification-Authority-G5.pem';
const AMAZON_CHAIN_PATH = 'resources/amazon.com/amazon.chain.pem';
const AMAZON_SERVER_CERT_PATH = 'resources/amazon.com/www.amazon.com.pem';

const GOOGLE_CHAIN_PATH = 'resources/google.com/google.chain.pem';
const GOOGLE_SERVER_CERT_PATH = 'resources/google.com/google.com.pem';

describe('ServerCertsService', () => {
  before(async () => {
    await setupTestDB();
  });

  after(async () => {
    await tearDownTestDB();
  });

  describe('Hub Server Certificates', () => {
    let envId = null;

    beforeEach('creating hook Environment', async () => {
      let env = {
        name: 'HUB_TEST_ENV'
      };
      let result = await PkiService.createEnvironment(env);
      assert.property(result, 'id');
      assert.isNotNull(result.id);
      envId = result.id;
    });

    afterEach('tearing down hook CA', async () => {
      await PkiService.deleteEnvironment(envId);
    });

    it('should create a HubServerCerts entry', async () => {
      let body = {
        subject: {
          CN: 'example.com',
        },
      };
      let result = await ServerCertsService.createHubServerCerts(envId, body);
      assert.isNotNull(result.serverCertificate);
      assert.isNotNull(result.rootCertificate);
    }).timeout(30000);

    it('should create and delete a HubServerCerts entry', async () => {
      let body = {
        subject: {
          CN: 'example.com',
        },
      };
      let result = await ServerCertsService.createHubServerCerts(envId, body);
      assert.isNotNull(result.serverCertificate);
      await ServerCertsService.deleteHubServerCerts(envId);
      try {
        await ServerCertsService.getHubServerCerts(envId);
        assert.fail('Should have throw NotFoundError');
      } catch (error) {
        assert.instanceOf(error, NotFoundError);
      }
    }).timeout(30000);
  });

  describe('DFSP Server Certificates', () => {
    let envId = null;
    let dfspId = null;

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

    it('should create a DfspServerCerts entry', async () => {
      let body = {
        rootCertificate: null,
        intermediateChain: fs.readFileSync(path.join(__dirname, GOOGLE_CHAIN_PATH)).toString(),
        serverCertificate: fs.readFileSync(path.join(__dirname, GOOGLE_SERVER_CERT_PATH)).toString(),
      };
      let result = await ServerCertsService.createDfspServerCerts(envId, dfspId, body);
      assert.isNotNull(result.id);
      assert.equal(result.serverCertificateInfo.serialNumber, '18944596908869286147063540593588663900');
      assert.equal(result.intermediateChainInfo[0].notBefore, '2017-06-15T00:00:42Z');
    }).timeout(30000);

    it('should create and delete a DfspServerCerts entry', async () => {
      let body = {
        rootCertificate: null,
        intermediateChain: fs.readFileSync(path.join(__dirname, GOOGLE_CHAIN_PATH)).toString(),
        serverCertificate: fs.readFileSync(path.join(__dirname, GOOGLE_SERVER_CERT_PATH)).toString(),
      };
      let result = await ServerCertsService.createDfspServerCerts(envId, dfspId, body);
      assert.isNotNull(result.id);
      await await ServerCertsService.deleteDfspServerCerts(envId, dfspId);
      try {
        await ServerCertsService.getDfspServerCerts(envId, dfspId);
        assert.fail('Should have throw NotFoundError');
      } catch (error) {
        assert.instanceOf(error, NotFoundError);
      }
    }).timeout(30000);

    it('should update a DfspServerCerts entry', async () => {
      let body = {
        rootCertificate: null,
        intermediateChain: fs.readFileSync(path.join(__dirname, GOOGLE_CHAIN_PATH)).toString(),
        serverCertificate: fs.readFileSync(path.join(__dirname, GOOGLE_SERVER_CERT_PATH)).toString(),
      };
      let result = await ServerCertsService.createDfspServerCerts(envId, dfspId, body);
      assert.isNotNull(result.id);
      assert.equal(result.serverCertificateInfo.serialNumber, '18944596908869286147063540593588663900');
      assert.equal(result.intermediateChainInfo[0].notBefore, '2017-06-15T00:00:42Z');

      let newBody = {
        rootCertificate: fs.readFileSync(path.join(__dirname, AMAZON_ROOT_CA_PATH)).toString(),
        intermediateChain: fs.readFileSync(path.join(__dirname, AMAZON_CHAIN_PATH)).toString(),
        serverCertificate: fs.readFileSync(path.join(__dirname, AMAZON_SERVER_CERT_PATH)).toString(),
      };
      let resultAfter = await ServerCertsService.updateDfspServerCerts(envId, dfspId, newBody);
      assert.isNotNull(resultAfter.id);
      assert.equal('131718454893249650824332873540371544128', resultAfter.intermediateChainInfo[0].serialNumber);
    }).timeout(30000);

    it('should create and find several dfsps certs', async () => {
      let body = {
        rootCertificate: null,
        intermediateChain: fs.readFileSync(path.join(__dirname, GOOGLE_CHAIN_PATH)).toString(),
        serverCertificate: fs.readFileSync(path.join(__dirname, GOOGLE_SERVER_CERT_PATH)).toString(),
      };

      const N_DFSPS = 20;
      let dfspIds = [];
      for (let i = 0; i < N_DFSPS; i++) {
        let dfsp = {
          dfspId: 'DFSP_TEST' + i,
          name: 'DFSP'
        };
        let resultDfsp = await PkiService.createDFSP(envId, dfsp);
        let eachId = resultDfsp.id;
        dfspIds.push(eachId);

        let result = await ServerCertsService.createDfspServerCerts(envId, eachId, body);
        assert.isNotNull(result.id);
      }

      let certs = await ServerCertsService.getAllDfspServerCerts(envId);
      certs.forEach(cert => {
        assert.equal(cert.serverCertificateInfo.serialNumber, '18944596908869286147063540593588663900');
        assert.equal(cert.intermediateChainInfo[0].notBefore, '2017-06-15T00:00:42Z');
      });

      dfspIds.forEach(async id => {
        await PkiService.deleteDFSP(envId, id);
      });
    }).timeout(30000);

    it('should create and find several dfsps certs with dfsp_id not null', async () => {
      let body = {
        rootCertificate: null,
        intermediateChain: fs.readFileSync(path.join(__dirname, GOOGLE_CHAIN_PATH)).toString(),
        serverCertificate: fs.readFileSync(path.join(__dirname, GOOGLE_SERVER_CERT_PATH)).toString(),
      };

      const N_DFSPS = 20;
      let dfspIds = [];
      for (let i = 0; i < N_DFSPS; i++) {
        let dfsp = {
          dfspId: 'DFSP_TEST' + i,
          name: 'DFSP'
        };
        let resultDfsp = await PkiService.createDFSP(envId, dfsp);
        let eachId = resultDfsp.id;
        dfspIds.push(eachId);

        let result = await ServerCertsService.createDfspServerCerts(envId, eachId, body);
        assert.isNotNull(result.id);
      }

      let certs = await ServerCertsService.getAllDfspServerCerts(envId);

      certs.forEach(cert => {
        assert.isNotNull(cert.dfspId);
        assert.include(dfspIds, cert.dfspId);
      });

      dfspIds.forEach(async id => {
        await PkiService.deleteDFSP(envId, id);
      });
    }).timeout(30000);
  });
});
