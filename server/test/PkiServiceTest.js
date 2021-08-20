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

const PkiService = require('../src/service/PkiService');
const assert = require('chai').assert;
const NotFoundError = require('../src/errors/NotFoundError');
const ValidationError = require('../src/errors/ValidationError');
const { createHubCA, getHubCA } = require('../src/service/HubCAService');

const ROOT_CA = {
  csr: {
    hosts: [
      'root-ca.modusbox.com',
      'www.root-ca.modusbox.com'
    ],
    key: {
      algo: 'rsa',
      size: 4096
    },
    names: [
      {
        CN: 'hub.modusbox.org',
        O: 'Modusbox',
        OU: 'TSP',
        L: '-',
        ST: '-',
        C: '-'
      }
    ]
  },
  default: {
    expiry: '87600h',
    usages: [
      'signing'
    ]
  }
};

describe('PkiService', () => {
  before(async () => {
    await setupTestDB();
  });

  after(async () => {
    await tearDownTestDB();
  });

  describe('Environment', () => {
    it('should create an Environment and delete it', async () => {
      const env = {
        name: 'DEV_A',
        defaultDN: {
          ST: 'Street',
          C: 'Country',
          OU: 'Organizational Unit',
          CN: 'Common Name',
          L: 'Location',
          O: 'Organization'
        }
      };
      const result = await PkiService.createEnvironment(env);
      assert.property(result, 'id');
      assert.isNotNull(result.id);
      assert.equal(result.name, env.name);
      assert.equal(result.defaultDN.ST, env.defaultDN.ST);
      const savedEnv = await PkiService.getEnvironmentById(result.id);
      assert.equal(savedEnv.name, env.name);
      assert.equal(savedEnv.defaultDN.ST, env.defaultDN.ST);
      const deleted = await PkiService.deleteEnvironment(result.id);
      assert.equal(deleted.id, result.id);
    });

    it('should throw a 404 when trying to delete a non existent Environment', async () => {
      try {
        await PkiService.deleteEnvironment(-666);
        assert.fail('Should not happen');
      } catch (error) {
        assert(error instanceof NotFoundError);
      }
    });

    it('should find newly created environment in getEnvironments', async () => {
      const env = {
        name: 'DEV_A',
        defaultDN: {
          ST: 'Street',
          C: 'Country',
          OU: 'Organizational Unit',
          CN: 'Common Name',
          L: 'Location',
          O: 'Organization'
        }
      };
      const result = await PkiService.createEnvironment(env);
      assert.property(result, 'id');
      assert.isNotNull(result.id);
      const allEnvs = await PkiService.getEnvironments();
      const found = allEnvs.find((elem) => elem.id === result.id);
      assert.isDefined(found);
      const deleted = await PkiService.deleteEnvironment(result.id);
      assert.equal(deleted.id, result.id);
    });
  });

  describe('CA', () => {
    let envId = null;

    beforeEach('creating hook Environment', async () => {
      const env = {
        name: 'CA_TEST_ENV',
        defaultDN: {
          ST: 'Street',
          C: 'Country',
          OU: 'Organizational Unit',
          CN: 'Common Name',
          L: 'Location',
          O: 'Organization'
        }
      };
      const result = await PkiService.createEnvironment(env);
      assert.property(result, 'id');
      assert.isNotNull(result.id);
      envId = result.id;
    });

    afterEach('tearing down hook CA', async () => {
      await PkiService.deleteEnvironment(envId);
    });

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
        await createHubCA(caBody);
        assert.fail();
      } catch (error) {
        assert.isTrue(error instanceof ValidationError);
      }
    }).timeout(15000);

    it('should create a CA', async () => {
      const result = await createHubCA(ROOT_CA);
      assert.isNotNull(result.id);

      const newCa = await getHubCA();
      assert.isNotNull(newCa);
    }).timeout(15000);

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
        await createHubCA(caBody);
        assert.fail();
      } catch (error) {
        assert.isTrue(error instanceof ValidationError);
      }
    }).timeout(15000);
  });

  describe('DFSP', () => {
    let envId = null;

    beforeEach('creating hook Environment', async () => {
      const env = {
        name: 'DFSP_TEST_ENV',
        defaultDN: {
          ST: 'Street',
          C: 'Country',
          OU: 'Organizational Unit',
          CN: 'Common Name',
          L: 'Location',
          O: 'Organization'
        }
      };
      const result = await PkiService.createEnvironment(env);
      assert.property(result, 'id');
      assert.isNotNull(result.id);
      envId = result.id;
    });

    afterEach('tearing down hook CA', async () => {
      await PkiService.deleteEnvironment(envId);
    });

    it('should create a DFSP and delete it', async () => {
      const dfsp = {
        dfspId: 'DFSP_B',
        name: 'DFSP_B_description'
      };
      const result = await PkiService.createDFSP(envId, dfsp);
      assert.property(result, 'id');
      assert.isNotNull(result.id);
      const saved = await PkiService.getDFSPById(envId, result.id);
      assert.equal(saved.name, dfsp.name);
      const deleted = await PkiService.deleteDFSP(envId, result.id);
      assert.equal(deleted, 1);
    });

    it('should detect that a DFSP cann\'t be accesed from another Env than its own', async () => {
      const dfsp = {
        dfspId: 'DFSP_B',
        name: 'DFSP_B_description'
      };
      const result = await PkiService.createDFSP(envId, dfsp);
      assert.property(result, 'id');
      assert.isNotNull(result.id);
      try {
        await PkiService.getDFSPById(envId + 11, result.id);
        assert.fail();
      } catch (error) {
        assert(error instanceof NotFoundError, 'Error is: ' + error);
      } finally {
        const deleted = await PkiService.deleteDFSP(envId, result.id);
        assert.equal(deleted, 1);
      }
    });

    it('should not allow a DFSP to be created with an invalid envId', async () => {
      const dfsp = {
        dfspId: 'DFSP_C',
        name: 'DFSP_C_description'
      };
      try {
        await PkiService.createDFSP(-666, dfsp);
        assert.fail('Shouldn\'t have got here');
      } catch (error) {
        assert(error instanceof ValidationError, 'Error is: ' + error);
      }
    });

    it('should create a DFSP with an space and use dashed for the security group', async () => {
      const dfsp = {
        dfspId: 'MTN CI',
        name: 'DFSP_B_description'
      };
      const result = await PkiService.createDFSP(envId, dfsp);
      assert.property(result, 'id');
      assert.isNotNull(result.id);
      const saved = await PkiService.getDFSPById(envId, result.id);
      assert.equal(saved.name, dfsp.name);
      assert.equal(saved.securityGroup, 'Application/DFSP:MTN-CI');
      const deleted = await PkiService.deleteDFSP(envId, result.id);
      assert.equal(deleted, 1);
    });

    it('should create a DFSP with MZ', async () => {
      const dfsp = {
        dfspId: 'dfsp1',
        name: 'dfsp1',
        monetaryZoneId: 'EUR'

      };
      const result = await PkiService.createDFSP(envId, dfsp);
      assert.property(result, 'id');
      assert.isNotNull(result.id);
      const saved = await PkiService.getDFSPById(envId, result.id);
      assert.equal(saved.name, dfsp.name);
      assert.equal(saved.monetaryZoneId, dfsp.monetaryZoneId);
      const deleted = await PkiService.deleteDFSP(envId, result.id);
      assert.equal(deleted, 1);
    });

    it('should create a DFSP without MZ and then add it', async () => {
      const dfsp = {
        dfspId: 'dfsp1',
        name: 'dfsp1'
      };

      await PkiService.createDFSP(envId, dfsp);

      // remove the mz
      const newDfsp = { dfspId: dfsp.dfspId, monetaryZoneId: 'MAD' };
      const result = await PkiService.updateDFSP(envId, dfsp.dfspId, newDfsp);
      assert.equal(result.name, dfsp.name);
      assert.equal(result.monetaryZoneId, 'MAD');

      const saved = await PkiService.getDFSPById(envId, dfsp.dfspId);
      assert.equal(saved.name, dfsp.name);
      assert.equal(saved.monetaryZoneId, 'MAD');
      const deleted = await PkiService.deleteDFSP(envId, dfsp.dfspId);
      assert.equal(deleted, 1);
    });

    it('should create a DFSP with MZ and then remove it', async () => {
      const dfsp = {
        dfspId: 'dfsp1',
        name: 'dfsp1',
        monetaryZoneId: 'EUR'

      };
      await PkiService.createDFSP(envId, dfsp);

      // remove the mz
      const newDfsp = { ...dfsp, monetaryZoneId: null };
      const result = await PkiService.updateDFSP(envId, dfsp.dfspId, newDfsp);
      assert.equal(result.name, dfsp.name);
      assert.equal(result.monetaryZoneId, null);

      const saved = await PkiService.getDFSPById(envId, dfsp.dfspId);
      assert.equal(saved.name, dfsp.name);
      assert.equal(saved.monetaryZoneId, null);

      const deleted = await PkiService.deleteDFSP(envId, dfsp.dfspId);
      assert.equal(deleted, 1);
    });
  });
});
