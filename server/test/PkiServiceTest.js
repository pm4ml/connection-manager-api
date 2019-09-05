const { setupTestDB, tearDownTestDB } = require('./test-database');

const PkiService = require('../src/service/PkiService');
const assert = require('chai').assert;
const NotFoundError = require('../src/errors/NotFoundError');
const ValidationError = require('../src/errors/ValidationError');

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
      let env = {
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
      let result = await PkiService.createEnvironment(env);
      assert.property(result, 'id');
      assert.isNotNull(result.id);
      assert.equal(result.name, env.name);
      assert.equal(result.defaultDN.ST, env.defaultDN.ST);
      let savedEnv = await PkiService.getEnvironmentById(result.id);
      assert.equal(savedEnv.name, env.name);
      assert.equal(savedEnv.defaultDN.ST, env.defaultDN.ST);
      let deleted = await PkiService.deleteEnvironment(result.id);
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
      let env = {
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
      let result = await PkiService.createEnvironment(env);
      assert.property(result, 'id');
      assert.isNotNull(result.id);
      let allEnvs = await PkiService.getEnvironments();
      let found = allEnvs.find((elem) => elem.id === result.id);
      assert.isDefined(found);
      let deleted = await PkiService.deleteEnvironment(result.id);
      assert.equal(deleted.id, result.id);
    });
  });

  describe('CA', () => {
    let envId = null;

    beforeEach('creating hook Environment', async () => {
      let env = {
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
      let result = await PkiService.createEnvironment(env);
      assert.property(result, 'id');
      assert.isNotNull(result.id);
      envId = result.id;
    });

    afterEach('tearing down hook CA', async () => {
      await PkiService.deleteEnvironment(envId);
    });

    it('should throw ValidationError while creating a CA with bogus data', async () => {
      // Bad input
      let caBody = {
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
        await PkiService.createCA(envId, caBody);
        assert.fail();
      } catch (error) {
        assert.isTrue(error instanceof ValidationError);
      }
    }).timeout(15000);

    it('should create a CA', async () => {
      let caBody = ROOT_CA;
      let result = await PkiService.createCA(envId, caBody);
      assert.isNotNull(result.id);

      let newCa = await PkiService.getCurrentCARootCert(envId);
      assert.isNotNull(newCa);
    }).timeout(15000);

    it('should throw ValidationError when passing a CAInitialInfo without CSR', async () => {
      // Bad input
      let caBody = {
        defaults: {
          expiry: '87600h',
          usages: [
            'signing'
          ]
        }
      };
      try {
        await PkiService.createCA(envId, caBody);
        assert.fail();
      } catch (error) {
        assert.isTrue(error instanceof ValidationError);
      }
    }).timeout(15000);
  });

  describe('DFSP', () => {
    let envId = null;

    beforeEach('creating hook Environment', async () => {
      let env = {
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
      let result = await PkiService.createEnvironment(env);
      assert.property(result, 'id');
      assert.isNotNull(result.id);
      envId = result.id;
    });

    afterEach('tearing down hook CA', async () => {
      await PkiService.deleteEnvironment(envId);
    });

    it('should create a DFSP and delete it', async () => {
      let dfsp = {
        dfspId: 'DFSP_B',
        name: 'DFSP_B_description'
      };
      let result = await PkiService.createDFSP(envId, dfsp);
      assert.property(result, 'id');
      assert.isNotNull(result.id);
      let saved = await PkiService.getDFSPById(envId, result.id);
      assert.equal(saved.name, dfsp.name);
      let deleted = await PkiService.deleteDFSP(envId, result.id);
      assert.equal(deleted, 1);
    });

    it('should detect that a DFSP cann\'t be accesed from another Env than its own', async () => {
      let dfsp = {
        dfspId: 'DFSP_B',
        name: 'DFSP_B_description'
      };
      let result = await PkiService.createDFSP(envId, dfsp);
      assert.property(result, 'id');
      assert.isNotNull(result.id);
      try {
        await PkiService.getDFSPById(envId + 11, result.id);
        assert.fail();
      } catch (error) {
        assert(error instanceof NotFoundError, 'Error is: ' + error);
      } finally {
        let deleted = await PkiService.deleteDFSP(envId, result.id);
        assert.equal(deleted, 1);
      }
    });

    it('should not allow a DFSP to be created with an invalid envId', async () => {
      let dfsp = {
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
      let dfsp = {
        dfspId: 'MTN CI',
        name: 'DFSP_B_description'
      };
      let result = await PkiService.createDFSP(envId, dfsp);
      assert.property(result, 'id');
      assert.isNotNull(result.id);
      let saved = await PkiService.getDFSPById(envId, result.id);
      assert.equal(saved.name, dfsp.name);
      assert.equal(saved.securityGroup, 'Application/DFSP:MTN-CI');
      let deleted = await PkiService.deleteDFSP(envId, result.id);
      assert.equal(deleted, 1);
    });
  });
});
