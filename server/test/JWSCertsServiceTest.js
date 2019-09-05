const { setupTestDB, tearDownTestDB } = require('./test-database');

const fs = require('fs');
const path = require('path');
const JWSCertsService = require('../src/service/JWSCertsService');
const PkiService = require('../src/service/PkiService');
const assert = require('chai').assert;
const NotFoundError = require('../src/errors/NotFoundError');
const ValidationCodes = require('../src/pki_engine/ValidationCodes');

const DFSP_JWS_ROOT_CERT_PATH = './resources/jws/ca.pem';
const DFSP_JWS_CERT_PATH = './resources/jws/dfsp1-jws.pem';
const DFSP_UPDATE_JWS_CERT_PATH = './resources/jws/dfsp1-update-jws.pem';
const DFSP_WRONG_ALGO_JWS_CERT_PATH = './resources/jws/dfsp-short-jws.pem';

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
      let body = {
        rootCertificate: fs.readFileSync(path.join(__dirname, DFSP_JWS_ROOT_CERT_PATH)).toString(),
        intermediateChain: null,
        jwsCertificate: fs.readFileSync(path.join(__dirname, DFSP_JWS_CERT_PATH)).toString(),
      };
      let result = await JWSCertsService.createDfspJWSCerts(envId, dfspId, body);
      assert.isNotNull(result.id);
      assert.equal('423194792965212014222460724964901821840176752000', result.jwsCertificateInfo.serialNumber);
    }).timeout(15000);

    it('should create and delete a DfspJWSCerts entry', async () => {
      let body = {
        rootCertificate: fs.readFileSync(path.join(__dirname, DFSP_JWS_ROOT_CERT_PATH)).toString(),
        intermediateChain: null,
        jwsCertificate: fs.readFileSync(path.join(__dirname, DFSP_JWS_CERT_PATH)).toString(),
      };
      let result = await JWSCertsService.createDfspJWSCerts(envId, dfspId, body);
      assert.isNotNull(result.id);
      await JWSCertsService.deleteDfspJWSCerts(envId, dfspId);
      try {
        await JWSCertsService.getDfspJWSCerts(envId, dfspId);
        assert.fail('Should have throw NotFoundError');
      } catch (error) {
        assert.instanceOf(error, NotFoundError);
      }
    }).timeout(15000);

    it('should update a DfspJWSCerts entry', async () => {
      let body = {
        rootCertificate: fs.readFileSync(path.join(__dirname, DFSP_JWS_ROOT_CERT_PATH)).toString(),
        intermediateChain: null,
        jwsCertificate: fs.readFileSync(path.join(__dirname, DFSP_JWS_CERT_PATH)).toString(),
      };
      let result = await JWSCertsService.createDfspJWSCerts(envId, dfspId, body);
      assert.isNotNull(result.id);
      assert.equal('423194792965212014222460724964901821840176752000', result.jwsCertificateInfo.serialNumber);

      let newBody = {
        rootCertificate: fs.readFileSync(path.join(__dirname, DFSP_JWS_ROOT_CERT_PATH)).toString(),
        intermediateChain: null,
        jwsCertificate: fs.readFileSync(path.join(__dirname, DFSP_UPDATE_JWS_CERT_PATH)).toString(),
      };
      let resultAfter = await JWSCertsService.updateDfspJWSCerts(envId, dfspId, newBody);
      assert.isNotNull(resultAfter.id);
      assert.equal('557705756627313016946929324774137869488341917432', resultAfter.jwsCertificateInfo.serialNumber);
    }).timeout(15000);

    it('should create and find several dfsps certs', async () => {
      let body = {
        rootCertificate: fs.readFileSync(path.join(__dirname, DFSP_JWS_ROOT_CERT_PATH)).toString(),
        intermediateChain: null,
        jwsCertificate: fs.readFileSync(path.join(__dirname, DFSP_JWS_CERT_PATH)).toString(),
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

        let result = await JWSCertsService.createDfspJWSCerts(envId, eachId, body);
        assert.isNotNull(result.id);
      }

      let certs = await JWSCertsService.getAllDfspJWSCerts(envId);
      certs.forEach(cert => {
        assert.equal('423194792965212014222460724964901821840176752000', cert.jwsCertificateInfo.serialNumber);
      });

      dfspIds.forEach(async id => {
        await PkiService.deleteDFSP(envId, id);
      });
    }).timeout(15000);

    it('should create and find several dfsps certs and dfspId shouldnt be null', async () => {
      let body = {
        rootCertificate: fs.readFileSync(path.join(__dirname, DFSP_JWS_ROOT_CERT_PATH)).toString(),
        intermediateChain: null,
        jwsCertificate: fs.readFileSync(path.join(__dirname, DFSP_JWS_CERT_PATH)).toString(),
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

        let result = await JWSCertsService.createDfspJWSCerts(envId, eachId, body);
        assert.isNotNull(result.id);
      }

      let certs = await JWSCertsService.getAllDfspJWSCerts(envId);
      certs.forEach(cert => {
        assert.isNotNull(cert.dfspId);
        assert.include(dfspIds, cert.dfspId);
      });

      dfspIds.forEach(async id => {
        await PkiService.deleteDFSP(envId, id);
      });
    }).timeout(15000);

    it('should throw an error with a wrong key size', async () => {
      let body = {
        rootCertificate: fs.readFileSync(path.join(__dirname, DFSP_JWS_ROOT_CERT_PATH)).toString(),
        intermediateChain: null,
        jwsCertificate: fs.readFileSync(path.join(__dirname, DFSP_WRONG_ALGO_JWS_CERT_PATH)).toString(),
      };
      let result = await JWSCertsService.createDfspJWSCerts(envId, dfspId, body);
      assert.isNotNull(result.validations);
      assert.isNotNull(result.validationState);
      assert.strictEqual(result.validationState, ValidationCodes.VALID_STATES.INVALID);
    }).timeout(15000);
  });
});
