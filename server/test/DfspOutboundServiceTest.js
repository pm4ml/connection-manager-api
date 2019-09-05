const { setupTestDB, tearDownTestDB } = require('./test-database');

const fs = require('fs');
const path = require('path');
const PkiService = require('../src/service/PkiService');
const DfspOutboundService = require('../src/service/DfspOutboundService');
const assert = require('chai').assert;
const spawnProcess = require('../src/process/spawner');
const ROOT_CA = require('./Root_CA.js');

const ValidationCodes = require('../src/pki_engine/ValidationCodes');

describe('DfspOutboundService', function () {
  before(async () => {
    await setupTestDB();
  });

  after(async () => {
    await tearDownTestDB();
  });

  describe('DfspOutboundService flow', function () {
    let envId = null;
    let dfspId = null;
    const DFSP_TEST_OUTBOUND = 'dfsp.outbound.io';
    beforeEach('creating ENV and DFSP', async function () {
      this.timeout(10000);
      let env = {
        name: 'DFSP_TEST_ENV_OUTBOUND',
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

      let caBody = ROOT_CA;
      await PkiService.createCA(envId, caBody);

      let dfsp = {
        dfspId: DFSP_TEST_OUTBOUND,
        name: 'DFSP used to test outbound flow'
      };
      let resultDfsp = await PkiService.createDFSP(envId, dfsp);
      dfspId = resultDfsp.id;
    });

    afterEach('tearing down ENV and DFSP', async () => {
      await PkiService.deleteDFSP(envId, dfspId);
      await PkiService.deleteEnvironment(envId);
    });

    it('should create an OutboundEnrollment from an uploaded CSR and get a NO_KEY when validating the signed certificate', async () => {
      let hubCSR = fs.readFileSync(path.join(__dirname, 'resources/modusbox/hub-tls-client.csr'), 'utf8');

      let body = {
        hubCSR: hubCSR
      };
      let enrollmentResult = await DfspOutboundService.createDFSPOutboundEnrollment(envId, dfspId, body);
      assert.property(enrollmentResult, 'id');
      assert.isNotNull(enrollmentResult.id);
      let enrollmentId = enrollmentResult.id;

      let newEnrollment = await DfspOutboundService.getDFSPOutboundEnrollment(envId, dfspId, enrollmentId);
      assert.equal(newEnrollment.id, enrollmentId);
      assert.equal(newEnrollment.csr, body.hubCSR);
      assert.equal(newEnrollment.state, 'CSR_LOADED');

      let csr = newEnrollment.csr;

      // Let's sign the CSR ( what the DFSP would do )
      let certPath = path.join(__dirname, 'resources/modusbox/ca.pem');
      let keyPath = path.join(__dirname, 'resources/modusbox/ca-key.pem');
      const cfsslResult = await spawnProcess('cfssl', ['sign', '-loglevel', '1', '-ca', certPath, '-ca-key', keyPath, '-'], csr);

      let cfsslOutput = JSON.parse(cfsslResult.stdout);
      let { cert: newCert } = cfsslOutput;

      // Now push the certificate to the Connection-Manager
      let certAddedEnrollment = await DfspOutboundService.addDFSPOutboundEnrollmentCertificate(envId, dfspId, enrollmentId, { certificate: newCert });
      // Validate its state
      assert.equal(certAddedEnrollment.id, enrollmentId);
      assert.equal(certAddedEnrollment.certificate, newCert);
      assert.equal(certAddedEnrollment.state, 'CERT_SIGNED');

      // check its state again
      let afterCertAddedEnrollment = await DfspOutboundService.getDFSPOutboundEnrollment(envId, dfspId, enrollmentId);
      assert.equal(afterCertAddedEnrollment.id, enrollmentId);
      assert.equal(afterCertAddedEnrollment.certificate, newCert);
      assert.equal(afterCertAddedEnrollment.state, 'CERT_SIGNED');

      // Now ask the TSP to validate the cert
      let afterCertValidatedEnrollment = await DfspOutboundService.validateDFSPOutboundEnrollmentCertificate(envId, dfspId, enrollmentId);

      assert.equal(afterCertValidatedEnrollment.validationState, 'VALID');
      const validationSignedByDFSPCA = afterCertValidatedEnrollment.validations.find((element) =>
        element.validationCode === ValidationCodes.VALIDATION_CODES.CERTIFICATE_SIGNED_BY_DFSP_CA.code
      );

      // Since I didn't upload the dfsp ca, it can't validate the cert
      assert.equal(validationSignedByDFSPCA.result, 'NOT_AVAILABLE');

      // let's upload it
      await PkiService.setDFSPca(envId, dfspId, {
        rootCertificate: fs.readFileSync(path.join(__dirname, 'resources/modusbox/ca.pem')).toString()
      });

      // Now ask the TSP to validate the cert, again
      let afterCertValidatedEnrollmentWithCA = await DfspOutboundService.validateDFSPOutboundEnrollmentCertificate(envId, dfspId, enrollmentId);

      // Should be ok now
      assert.equal(afterCertValidatedEnrollmentWithCA.validationState, 'VALID');
    }).timeout(15000);

    it('should create an OutboundEnrollment and its CSR and get a VALIDATED when validating the signed certificate', async () => {
      let body = {
        'subject': {
          'CN': 'dfspendpoint1.test.modusbox.com',
          'emailAddress': 'connection-manager@modusbox.com',
          'O': 'Modusbox',
          'OU': 'PKI',
          'ST': 'XX',
          'C': 'YY',
          'L': 'ZZ'
        },
        'extensions': {
          'subjectAltName': {
            'dns': [
              'dfspendpoint1.test.modusbox.com',
              'dfspendpoint2.test.modusbox.com'
            ],
            'ips': [
              '163.10.5.1',
              '163.10.5.2'
            ]
          }
        }
      };
      let enrollmentResult = await DfspOutboundService.createCSRAndDFSPOutboundEnrollment(envId, dfspId, body);
      assert.property(enrollmentResult, 'id');
      assert.isNotNull(enrollmentResult.id);
      let enrollmentId = enrollmentResult.id;

      let newEnrollment = await DfspOutboundService.getDFSPOutboundEnrollment(envId, dfspId, enrollmentId);
      assert.equal(newEnrollment.id, enrollmentId);
      assert.equal(newEnrollment.state, 'CSR_LOADED');
      assert.notProperty(newEnrollment, 'key');

      let csr = newEnrollment.csr;

      // Let's sign the CSR ( what the DFSP would do )
      let certPath = path.join(__dirname, 'resources/modusbox//ca.pem');
      let keyPath = path.join(__dirname, 'resources/modusbox/ca-key.pem');
      const cfsslResult = await spawnProcess('cfssl', ['sign', '-loglevel', '1', '-ca', certPath, '-ca-key', keyPath, '-'], csr);

      let cfsslOutput = JSON.parse(cfsslResult.stdout);
      let { cert: newCert } = cfsslOutput;

      // Now push the certificate to the Connection-Manager
      let certAddedEnrollment = await DfspOutboundService.addDFSPOutboundEnrollmentCertificate(envId, dfspId, enrollmentId, { certificate: newCert });
      // Validate its state
      assert.equal(certAddedEnrollment.id, enrollmentId);
      assert.equal(certAddedEnrollment.certificate, newCert);
      assert.equal(certAddedEnrollment.state, 'CERT_SIGNED');

      // Validate its state again
      let afterCertAddedEnrollment = await DfspOutboundService.getDFSPOutboundEnrollment(envId, dfspId, enrollmentId);
      assert.equal(afterCertAddedEnrollment.id, enrollmentId);
      assert.equal(afterCertAddedEnrollment.certificate, newCert);
      assert.equal(afterCertAddedEnrollment.state, 'CERT_SIGNED');

      // Now ask the TSP to validate the cert
      let afterCertValidatedEnrollment = await DfspOutboundService.validateDFSPOutboundEnrollmentCertificate(envId, dfspId, enrollmentId);

      // Since I didn't upload the dfsp ca, it can't validate the cert
      assert.equal(afterCertValidatedEnrollment.validationState, 'VALID');
      const validationSignedByDFSPCA = afterCertValidatedEnrollment.validations.find((element) =>
        element.validationCode === ValidationCodes.VALIDATION_CODES.CERTIFICATE_SIGNED_BY_DFSP_CA.code
      );
      assert.equal(validationSignedByDFSPCA.result, 'NOT_AVAILABLE');

      // let's upload it
      await PkiService.setDFSPca(envId, dfspId, {
        rootCertificate: fs.readFileSync(path.join(__dirname, 'resources/modusbox/ca.pem')).toString()
      });

      // Now ask the TSP to validate the cert, again
      let afterCertValidatedEnrollmentWithCA = await DfspOutboundService.validateDFSPOutboundEnrollmentCertificate(envId, dfspId, enrollmentId);

      // Should be ok now
      assert.equal(afterCertValidatedEnrollmentWithCA.validationState, 'VALID', JSON.stringify(afterCertValidatedEnrollmentWithCA, null, 2));

      // 'VALID' key and signing 'VALID' should give a valid state
      assert.equal(afterCertValidatedEnrollmentWithCA.state, 'CERT_SIGNED', JSON.stringify(afterCertValidatedEnrollmentWithCA, null, 2));
    }).timeout(15000);
  }).timeout(30000);
}).timeout(45000);
