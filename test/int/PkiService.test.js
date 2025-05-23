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

const PkiService = require('../../src/service/PkiService');
const { assert } = require('chai');
const ValidationError = require('../../src/errors/ValidationError');
const NotFoundError = require('../../src/errors/NotFoundError');
const { createInternalHubCA, getHubCA } = require('../../src/service/HubCAService');
const { createContext, destroyContext } = require('./context');

const ROOT_CA = {
  CN: 'hub.modusbox.org',
  O: 'Modusbox',
  OU: 'TSP',
  L: '-',
  ST: '-',
  C: '-'
};

describe('PkiService', () => {
  let ctx;
  beforeAll(async () => {
    await setupTestDB();
    ctx = await createContext();
  });

  afterAll(async () => {
    await tearDownTestDB();
    destroyContext(ctx);
  });

  describe('CA', () => {
    it('should throw ValidationError while creating a CA with bogus data', async () => {
      // Bad input
      const caBody = {
        csr: {
          hosts: [
            'http://www.sun.com'
          ],
          dn: { // this one is bogus, it should be names and contain an array
            ST: 'Street',
            C: 'Country',
            OU: 'Organizational Unit',
            CN: 'Common Name',
            L: 'Location',
            O: 'Organization'
          },
          key: {
            size: 2048,
            algo: 'rsa'
          }
        },
        defaults: {
          expiry: '87600h',
          usages: [
            'signing'
          ]
        }
      };
      try {
        await createInternalHubCA(ctx, caBody);
        assert.fail();
      } catch (error) {
        assert.isTrue(error instanceof ValidationError);
      }
    }, 15000);

    it('should create a CA', async () => {
      const result = await createInternalHubCA(ctx, ROOT_CA);
      assert.isNotNull(result.id);

      const newCa = await getHubCA(ctx);
      assert.isNotNull(newCa);
    }, 15000);

    it('should throw ValidationError when passing a CAInitialInfo without CSR', async () => {
      // Bad input
      const caBody = {
        defaults: {
          expiry: '87600h',
          usages: [
            'signing'
          ]
        }
      };
      try {
        await createInternalHubCA(ctx, caBody);
        assert.fail();
      } catch (error) {
        assert.isTrue(error instanceof ValidationError);
      }
    }, 15000);

    it('should throw NotFoundError when getting a non-existent CA', async () => {
      try {
        await getHubCA(ctx, 'non-existent-ca');
        assert.fail();
      } catch (error) {
        assert.isTrue(error instanceof NotFoundError);
      }
    }, 15000);
  });

  describe('DFSP', () => {
    beforeEach(async () => {
    });

    afterEach(async () => {
    });

    it('should create a DFSP and delete it', async () => {
      const dfsp = {
        dfspId: 'DFSP_B',
        name: 'DFSP_B_description'
      };
      const result = await PkiService.createDFSP(ctx, dfsp);
      assert.property(result, 'id');
      assert.isNotNull(result.id);
      const saved = await PkiService.getDFSPById(ctx, result.id);
      assert.equal(saved.name, dfsp.name);
      const deleted = await PkiService.deleteDFSP(ctx, result.id);
      assert.equal(deleted, 1);
    });

    it('should create a DFSP with an space and use dashed for the security group', async () => {
      const dfsp = {
        dfspId: 'MTN CI',
        name: 'DFSP_B_description',
      };
      const result = await PkiService.createDFSP(ctx, dfsp);
      assert.property(result, 'id');
      assert.isNotNull(result.id);
      const saved = await PkiService.getDFSPById(ctx, result.id);
      assert.equal(saved.name, dfsp.name);
      assert.equal(saved.securityGroup, 'Application/DFSP:MTN-CI');
      const deleted = await PkiService.deleteDFSP(ctx, result.id);
      assert.equal(deleted, 1);
    });

    it('should create a DFSP with MZ', async () => {
      const dfsp = {
        dfspId: 'dfsp1',
        name: 'dfsp1',
        monetaryZoneId: 'EUR'
      };
      const result = await PkiService.createDFSP(ctx, dfsp);
      assert.property(result, 'id');
      assert.isNotNull(result.id);
      const saved = await PkiService.getDFSPById(ctx, result.id);
      assert.equal(saved.name, dfsp.name);
      assert.equal(saved.monetaryZoneId, dfsp.monetaryZoneId);
      const deleted = await PkiService.deleteDFSP(ctx, result.id);
      assert.equal(deleted, 1);
    });

    it('should create a DFSP without MZ and then add it', async () => {
      const dfsp = {
        dfspId: 'dfsp1',
        name: 'dfsp1'
      };

      await PkiService.createDFSP(ctx, dfsp);

      // remove the mz
      const newDfsp = { dfspId: dfsp.dfspId, monetaryZoneId: 'MAD' };
      const result = await PkiService.updateDFSP(ctx, dfsp.dfspId, newDfsp);
      assert.equal(result.name, dfsp.name);
      assert.equal(result.monetaryZoneId, 'MAD');

      const saved = await PkiService.getDFSPById(ctx, dfsp.dfspId);
      assert.equal(saved.name, dfsp.name);
      assert.equal(saved.monetaryZoneId, 'MAD');
      const deleted = await PkiService.deleteDFSP(ctx, dfsp.dfspId);
      assert.equal(deleted, 1);
    });

    it('should create a DFSP with MZ and then remove it', async () => {
      const dfsp = {
        dfspId: 'dfsp1',
        name: 'dfsp1',
        monetaryZoneId: 'EUR'
      };
      await PkiService.createDFSP(ctx, dfsp);

      // remove the mz
      const newDfsp = { ...dfsp, monetaryZoneId: null };
      const result = await PkiService.updateDFSP(ctx, dfsp.dfspId, newDfsp);
      assert.equal(result.name, dfsp.name);
      assert.equal(result.monetaryZoneId, null);

      const saved = await PkiService.getDFSPById(ctx, dfsp.dfspId);
      assert.equal(saved.name, dfsp.name);
      assert.equal(saved.monetaryZoneId, null);

      const deleted = await PkiService.deleteDFSP(ctx, dfsp.dfspId);
      assert.equal(deleted, 1);
    });

    it('should throw NotFoundError when getting a non-existent DFSP', async () => {
      try {
        await PkiService.getDFSPById(ctx, 'non-existent-dfsp');
        assert.fail();
      } catch (error) {
        assert.isTrue(error instanceof NotFoundError);
      }
    });

    it('should throw ValidationError when creating a DFSP with invalid data', async () => {
      const dfsp = {
        dfspId: null,
        name: 'Invalid DFSP'
      };
      try {
        await PkiService.createDFSP(ctx, dfsp);
        assert.fail();
      } catch (error) {
        assert.isTrue(error instanceof ValidationError);
      }
    });

    it('should throw ValidationError when updating a DFSP with invalid data', async () => {
      const dfsp = {
        dfspId: 'dfsp1',
        name: 'dfsp1'
      };
      await PkiService.createDFSP(ctx, dfsp);

      const newDfsp = { dfspId: dfsp.dfspId, name: null };
      try {
        await PkiService.updateDFSP(ctx, dfsp.dfspId, newDfsp);
        assert.fail();
      } catch (error) {
        assert.isTrue(error instanceof ValidationError);
      }
    });

    it('should throw NotFoundError when deleting a non-existent DFSP', async () => {
      try {
        await PkiService.deleteDFSP(ctx, 'non-existent-dfsp');
        assert.fail();
      } catch (error) {
        assert.isTrue(error instanceof NotFoundError);
      }
    });

    it('should get all DFSPs', async () => {
      const dfsp1 = {
        dfspId: 'dfsp1',
        name: 'dfsp1'
      };
      const dfsp2 = {
        dfspId: 'dfsp2',
        name: 'dfsp2'
      };

      await PkiService.createDFSP(ctx, dfsp1);
      await PkiService.createDFSP(ctx, dfsp2);

      const dfsps = await PkiService.getDFSPs(ctx);
      assert.isArray(dfsps);
      assert.lengthOf(dfsps, 2);
    });

    it('should set and get DFSP CA', async () => {
      const dfsp = {
        dfspId: 'dfsp1',
        name: 'dfsp1'
      };

      await PkiService.createDFSP(ctx, dfsp);

      const caBody = {
        rootCertificate: 'root-cert',
        intermediateChain: 'intermediate-cert'
      };

      await PkiService.setDFSPca(ctx, dfsp.dfspId, caBody);

      const ca = await PkiService.getDFSPca(ctx, dfsp.dfspId);
      assert.equal(ca.rootCertificate, 'root-cert');
      assert.equal(ca.intermediateChain, 'intermediate-cert');
    });

    it('should delete DFSP CA', async () => {
      const dfsp = {
        dfspId: 'dfsp1',
        name: 'dfsp1'
      };

      await PkiService.createDFSP(ctx, dfsp);

      const caBody = {
        rootCertificate: 'root-cert',
        intermediateChain: 'intermediate-cert'
      };

      await PkiService.setDFSPca(ctx, dfsp.dfspId, caBody);
      await PkiService.deleteDFSPca(ctx, dfsp.dfspId);

      const ca = await PkiService.getDFSPca(ctx, dfsp.dfspId);
      assert.isNull(ca.rootCertificate);
      assert.isNull(ca.intermediateChain);
    });

    it('should get DFSPs by monetary zone', async () => {
      const dfsp1 = {
        dfspId: 'dfsp1',
        name: 'dfsp1',
        monetaryZoneId: 'EUR'
      };
      const dfsp2 = {
        dfspId: 'dfsp2',
        name: 'dfsp2',
        monetaryZoneId: 'USD'
      };

      await PkiService.createDFSP(ctx, dfsp1);
      await PkiService.createDFSP(ctx, dfsp2);

      const dfsps = await PkiService.getDfspsByMonetaryZones(ctx, 'EUR');
      assert.isArray(dfsps);
      assert.lengthOf(dfsps, 1);
      assert.equal(dfsps[0].monetaryZoneId, 'EUR');
    });

    it('should create a DFSP with CSR and delete it', async () => {
      const dfsp = {
        dfspId: 'DFSP_C',
        name: 'DFSP_C_description'
      };
      const result = await PkiService.createDFSPWithCSR(ctx, dfsp);
      assert.property(result, 'id');
      assert.isNotNull(result.id);
      const saved = await PkiService.getDFSPById(ctx, result.id);
      assert.equal(saved.name, dfsp.name);
      const deleted = await PkiService.deleteDFSP(ctx, result.id);
      assert.equal(deleted, 1);
    });

    it('should throw InternalError when failing to create DFSP with CSR', async () => {
      const dfsp = {
        dfspId: 'DFSP_D',
        name: 'DFSP_D_description'
      };
      const createCSRAndDFSPOutboundEnrollment = PkiService.__get__('createCSRAndDFSPOutboundEnrollment');
      PkiService.__set__('createCSRAndDFSPOutboundEnrollment', async () => {
        throw new Error('Failed to create CSR');
      });

      try {
        await PkiService.createDFSPWithCSR(ctx, dfsp);
        assert.fail();
      } catch (error) {
        assert.isTrue(error instanceof InternalError);
      } finally {
        PkiService.__set__('createCSRAndDFSPOutboundEnrollment', createCSRAndDFSPOutboundEnrollment);
      }
    });
  });
});
