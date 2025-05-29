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

const { setupTestDB, tearDownTestDB } = require('../int/test-database');

const fs = require('fs');
const path = require('path');
const ServerCertsService = require('../../src/service/ServerCertsService');
const PkiService = require('../../src/service/PkiService');
const NotFoundError = require('../../src/errors/NotFoundError');
const ROOT_CA = require('../int/Root_CA');
const { createInternalHubCA, deleteHubCA } = require('../../src/service/HubCAService');
const { createContext, destroyContext } = require('../int/context');
const Constants = require('../../src/constants/Constants');

const AMAZON_ROOT_CA_PATH = 'resources/amazon.com/RootCA.pem';
const AMAZON_CHAIN_PATH = 'resources/amazon.com/amazon.chain.pem';
const AMAZON_SERVER_CERT_PATH = 'resources/amazon.com/www.amazon.com.pem';

const GOOGLE_CHAIN_PATH = 'resources/google.com/google.chain.pem';
const GOOGLE_SERVER_CERT_PATH = 'resources/google.com/google.com.pem';

const TTL_FOR_CA = '200h';

describe('ServerCertsService', () => {
  let ctx;
  beforeAll(async function () {
    await setupTestDB();
    ctx = await createContext();
    await createInternalHubCA(ctx, ROOT_CA, TTL_FOR_CA);
  });

  afterAll(async () => {
    await tearDownTestDB();
    await deleteHubCA(ctx);
    destroyContext(ctx);
  });

  describe('Hub Server Certificates', () => {
    it('should create a HubServerCerts entry', async () => {
      Constants.serverCsrParameters = {
        subject: {
          CN: 'example.com',
        },
      };
      const result = await ServerCertsService.createHubServerCerts(ctx);
      expect(result.serverCertificate).not.toBeNull();
      expect(result.rootCertificate).not.toBeNull();
    }, 30000);

    it('should create and delete a HubServerCerts entry', async () => {
      Constants.serverCsrParameters = {
        subject: {
          CN: 'example.com',
        },
      };
      const result = await ServerCertsService.createHubServerCerts(ctx);
      expect(result.serverCertificate).not.toBeNull();
      await ServerCertsService.deleteHubServerCerts(ctx);
      try {
        await ServerCertsService.getHubServerCerts(ctx);
        // Should not reach here
        throw new Error('Should have throw NotFoundError');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
      }
    }, 30000);
  }, 30000);

  describe('DFSP Server Certificates', () => {
    let dfspId = null;

    it('should create a DfspServerCerts entry', async () => {
      const body = {
        rootCertificate: null,
        intermediateChain: fs.readFileSync(path.join(__dirname, GOOGLE_CHAIN_PATH)).toString(),
        serverCertificate: fs.readFileSync(path.join(__dirname, GOOGLE_SERVER_CERT_PATH)).toString(),
      };
      const dfsp = {
        dfspId: 'DFSP_TEST',
        name: 'DFSP'
      };
      const resultDfsp = await PkiService.createDFSP(ctx, dfsp);
      dfspId = resultDfsp.id;
      const result = await ServerCertsService.createDfspServerCerts(ctx, dfspId, body);
      expect(result).not.toBeNull();
      expect(result.serverCertificateInfo.serialNumber).toBe('0e4098bddd80b0d3394a0e1487d7765c');
      expect(result.intermediateChainInfo[0].notBefore.toISOString()).toBe('2017-06-15T00:00:42.000Z');
      await PkiService.deleteDFSP(ctx, dfspId);
    }, 30000);

    it('should create and delete a DfspServerCerts entry', async () => {
      const body = {
        rootCertificate: null,
        intermediateChain: fs.readFileSync(path.join(__dirname, GOOGLE_CHAIN_PATH)).toString(),
        serverCertificate: fs.readFileSync(path.join(__dirname, GOOGLE_SERVER_CERT_PATH)).toString(),
      };
      const dfsp = {
        dfspId: 'DFSP_TEST',
        name: 'DFSP'
      };
      const resultDfsp = await PkiService.createDFSP(ctx, dfsp);
      dfspId = resultDfsp.id;
      const result = await ServerCertsService.createDfspServerCerts(ctx, dfspId, body);
      expect(result).not.toBeNull();
      await ServerCertsService.deleteDfspServerCerts(ctx, dfspId);
      try {
        await ServerCertsService.getDfspServerCerts(ctx, dfspId);
        throw new Error('Should have throw NotFoundError');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
      }
      await PkiService.deleteDFSP(ctx, dfspId);
    }, 30000);

    it('should update a DfspServerCerts entry', async () => {
      const body = {
        rootCertificate: null,
        intermediateChain: fs.readFileSync(path.join(__dirname, GOOGLE_CHAIN_PATH)).toString(),
        serverCertificate: fs.readFileSync(path.join(__dirname, GOOGLE_SERVER_CERT_PATH)).toString(),
      };
      const dfsp = {
        dfspId: 'DFSP_TEST',
        name: 'DFSP'
      };
      const resultDfsp = await PkiService.createDFSP(ctx, dfsp);
      dfspId = resultDfsp.id;
      const result = await ServerCertsService.createDfspServerCerts(ctx, dfspId, body);
      expect(result).not.toBeNull();
      expect(result.serverCertificateInfo.serialNumber).toBe('0e4098bddd80b0d3394a0e1487d7765c');
      expect(result.intermediateChainInfo[0].notBefore.toISOString()).toBe('2017-06-15T00:00:42.000Z');

      const newBody = {
        rootCertificate: fs.readFileSync(path.join(__dirname, AMAZON_ROOT_CA_PATH)).toString(),
        intermediateChain: fs.readFileSync(path.join(__dirname, AMAZON_CHAIN_PATH)).toString(),
        serverCertificate: fs.readFileSync(path.join(__dirname, AMAZON_SERVER_CERT_PATH)).toString(),
      };
      const resultAfter = await ServerCertsService.updateDfspServerCerts(ctx, dfspId, newBody);
      expect(resultAfter.id).not.toBeNull();
      expect(resultAfter.intermediateChainInfo[0].serialNumber).toBe('0c8ee0c90d6a89158804061ee241f9af');
      await PkiService.deleteDFSP(ctx, dfspId);
    }, 30000);

    it('should create and find several dfsps certs', async () => {
      const body = {
        rootCertificate: null,
        intermediateChain: fs.readFileSync(path.join(__dirname, GOOGLE_CHAIN_PATH)).toString(),
        serverCertificate: fs.readFileSync(path.join(__dirname, GOOGLE_SERVER_CERT_PATH)).toString(),
      };

      const N_DFSPS = 20;
      const dfspIds = [];
      for (let i = 0; i < N_DFSPS; i++) {
        const dfsp = {
          dfspId: 'DFSP_TEST' + i,
          name: 'DFSP'
        };
        const resultDfsp = await PkiService.createDFSP(ctx, dfsp);
        const eachId = resultDfsp.id;
        dfspIds.push(eachId);

        const result = await ServerCertsService.createDfspServerCerts(ctx, dfsp.dfspId, body);
        expect(result).not.toBeNull();
      }

      const certs = await ServerCertsService.getAllDfspServerCerts(ctx);
      certs.forEach(cert => {
        expect(cert.serverCertificateInfo.serialNumber).toBe('0e4098bddd80b0d3394a0e1487d7765c');
        expect(cert.intermediateChainInfo[0].notBefore).toBe('2017-06-15T00:00:42.000Z');
      });

      await Promise.all(dfspIds.map(id => PkiService.deleteDFSP(ctx, id)));
    }, 30000);

    it('should create and find several dfsps certs with dfsp_id not null', async () => {
      const body = {
        rootCertificate: null,
        intermediateChain: fs.readFileSync(path.join(__dirname, GOOGLE_CHAIN_PATH)).toString(),
        serverCertificate: fs.readFileSync(path.join(__dirname, GOOGLE_SERVER_CERT_PATH)).toString(),
      };

      const N_DFSPS = 20;
      const dfspIds = [];
      for (let i = 0; i < N_DFSPS; i++) {
        const dfsp = {
          dfspId: 'DFSP_TEST' + i,
          name: 'DFSP'
        };
        const resultDfsp = await PkiService.createDFSP(ctx, dfsp);
        const eachId = resultDfsp.id;
        dfspIds.push(eachId);

        const result = await ServerCertsService.createDfspServerCerts(ctx, eachId, body);
        expect(result).not.toBeNull();
      }

      const certs = await ServerCertsService.getAllDfspServerCerts(ctx);

      certs.forEach(cert => {
        expect(cert.dfspId).not.toBeNull();
        expect(dfspIds).toContain(cert.dfspId);
      });

      await Promise.all(dfspIds.map(id => PkiService.deleteDFSP(ctx, id)));
    }, 30000);
  }, 30000);
}, 30000);
