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
      await expect(createInternalHubCA(ctx, caBody)).rejects.toBeInstanceOf(ValidationError);
    }, 15000);

    it('should create a CA', async () => {
      const result = await createInternalHubCA(ctx, ROOT_CA);
      expect(result.id).not.toBeNull();

      const newCa = await getHubCA(ctx);
      expect(newCa).not.toBeNull();
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
      await expect(createInternalHubCA(ctx, caBody)).rejects.toBeInstanceOf(ValidationError);
    }, 15000);

    it('should throw NotFoundError when getting a non-existent CA', async () => {
      await expect(getHubCA(ctx, 'non-existent-ca')).rejects.toBeInstanceOf(NotFoundError);
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
      expect(result).toHaveProperty('id');
      expect(result.id).not.toBeNull();
      const saved = await PkiService.getDFSPById(ctx, result.id);
      expect(saved.name).toBe(dfsp.name);
      const deleted = await PkiService.deleteDFSP(ctx, result.id);
      expect(deleted).toBe(1);
    });

    it('should create a DFSP with an space and use dashed for the security group', async () => {
      const dfsp = {
        dfspId: 'MTN CI',
        name: 'DFSP_B_description',
      };
      const result = await PkiService.createDFSP(ctx, dfsp);
      expect(result).toHaveProperty('id');
      expect(result.id).not.toBeNull();
      const saved = await PkiService.getDFSPById(ctx, result.id);
      expect(saved.name).toBe(dfsp.name);
      expect(saved.securityGroup).toBe('Application/DFSP:MTN-CI');
      const deleted = await PkiService.deleteDFSP(ctx, result.id);
      expect(deleted).toBe(1);
    });

    it('should create a DFSP with MZ', async () => {
      const dfsp = {
        dfspId: 'dfsp1',
        name: 'dfsp1',
        monetaryZoneId: 'EUR'
      };
      const result = await PkiService.createDFSP(ctx, dfsp);
      expect(result).toHaveProperty('id');
      expect(result.id).not.toBeNull();
      const saved = await PkiService.getDFSPById(ctx, result.id);
      expect(saved.name).toBe(dfsp.name);
      expect(saved.monetaryZoneId).toBe(dfsp.monetaryZoneId);
      const deleted = await PkiService.deleteDFSP(ctx, result.id);
      expect(deleted).toBe(1);
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
      expect(result.name).toBe(dfsp.name);
      expect(result.monetaryZoneId).toBe('MAD');

      const saved = await PkiService.getDFSPById(ctx, dfsp.dfspId);
      expect(saved.name).toBe(dfsp.name);
      expect(saved.monetaryZoneId).toBe('MAD');
      const deleted = await PkiService.deleteDFSP(ctx, dfsp.dfspId);
      expect(deleted).toBe(1);
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
      expect(result.name).toBe(dfsp.name);
      expect(result.monetaryZoneId).toBeNull();

      const saved = await PkiService.getDFSPById(ctx, dfsp.dfspId);
      expect(saved.name).toBe(dfsp.name);
      expect(saved.monetaryZoneId).toBeNull();

      const deleted = await PkiService.deleteDFSP(ctx, dfsp.dfspId);
      expect(deleted).toBe(1);
    });

    it('should throw NotFoundError when getting a non-existent DFSP', async () => {
      await expect(PkiService.getDFSPById(ctx, 'non-existent-dfsp')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw ValidationError when creating a DFSP with invalid data', async () => {
      const dfsp = {
        dfspId: null,
        name: 'Invalid DFSP'
      };
      await expect(PkiService.createDFSP(ctx, dfsp)).rejects.toBeInstanceOf(ValidationError);
    });

    it('should throw ValidationError when updating a DFSP with invalid data', async () => {
      const dfsp = {
        dfspId: 'dfsp1',
        name: 'dfsp1'
      };
      await PkiService.createDFSP(ctx, dfsp);

      const newDfsp = { dfspId: dfsp.dfspId, name: null };
      await expect(PkiService.updateDFSP(ctx, dfsp.dfspId, newDfsp)).rejects.toBeInstanceOf(ValidationError);
    });

    it('should throw NotFoundError when deleting a non-existent DFSP', async () => {
      await expect(PkiService.deleteDFSP(ctx, 'non-existent-dfsp')).rejects.toBeInstanceOf(NotFoundError);
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
      expect(Array.isArray(dfsps)).toBe(true);
      expect(dfsps).toHaveLength(2);
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
      expect(ca.rootCertificate).toBe('root-cert');
      expect(ca.intermediateChain).toBe('intermediate-cert');
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
      expect(ca.rootCertificate).toBeNull();
      expect(ca.intermediateChain).toBeNull();
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
      expect(Array.isArray(dfsps)).toBe(true);
      expect(dfsps).toHaveLength(1);
      expect(dfsps[0].monetaryZoneId).toBe('EUR');
    });

    it('should create a DFSP with CSR and delete it', async () => {
      const dfsp = {
        dfspId: 'DFSP_C',
        name: 'DFSP_C_description'
      };
      const result = await PkiService.createDFSPWithCSR(ctx, dfsp);
      expect(result).toHaveProperty('id');
      expect(result.id).not.toBeNull();
      const saved = await PkiService.getDFSPById(ctx, result.id);
      expect(saved.name).toBe(dfsp.name);
      const deleted = await PkiService.deleteDFSP(ctx, result.id);
      expect(deleted).toBe(1);
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

      await expect(PkiService.createDFSPWithCSR(ctx, dfsp)).rejects.toBeInstanceOf(InternalError);

      PkiService.__set__('createCSRAndDFSPOutboundEnrollment', createCSRAndDFSPOutboundEnrollment);
    });
  });
});
