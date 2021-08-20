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
const PkiService = require('../src/service/PkiService');
const DfspOutboundService = require('../src/service/DfspOutboundService');
const assert = require('chai').assert;
const ROOT_CA = require('./Root_CA.js');
const Constants = require('../src/constants/Constants');
const forge = require('node-forge');

const ValidationCodes = require('../src/pki_engine/ValidationCodes');
const { createHubCA } = require('../src/service/HubCAService');

// Sign CSR and return certificate ( what the DFSP would do )
const createCertFromCSR = (csrPem) => {
  const certPath = path.join(__dirname, 'resources/modusbox/ca.pem');
  const keyPath = path.join(__dirname, 'resources/modusbox/ca-key.pem');

  const caCert = forge.pki.certificateFromPem(fs.readFileSync(certPath));
  const privateKey = forge.pki.privateKeyFromPem(fs.readFileSync(keyPath));
  const csr = forge.pki.certificationRequestFromPem(csrPem);

  const cert = forge.pki.createCertificate();
  cert.serialNumber = '02';

  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

  // subject from CSR
  cert.setSubject(csr.subject.attributes);
  // issuer from CA
  cert.setIssuer(caCert.subject.attributes);
  cert.setExtensions(csr.getAttribute({ name: 'extensionRequest' }).extensions);

  cert.publicKey = csr.publicKey;
  cert.sign(privateKey, forge.md.sha256.create());

  return forge.pki.certificateToPem(cert);
};

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
      const env = {
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
      const result = await PkiService.createEnvironment(env);
      assert.property(result, 'id');
      assert.isNotNull(result.id);
      envId = result.id;

      await createHubCA(ROOT_CA);

      const dfsp = {
        dfspId: DFSP_TEST_OUTBOUND,
        name: 'DFSP used to test outbound flow'
      };
      const resultDfsp = await PkiService.createDFSP(envId, dfsp);
      dfspId = resultDfsp.id;
    });

    afterEach('tearing down ENV and DFSP', async () => {
      await PkiService.deleteDFSP(envId, dfspId);
      await PkiService.deleteEnvironment(envId);
    });

    it('should create an OutboundEnrollment and its CSR and get a VALIDATED when validating the signed certificate', async () => {
      const body = {
        subject: {
          CN: 'dfspendpoint1.test.modusbox.com',
          E: 'connection-manager@modusbox.com',
          O: 'Modusbox',
          OU: 'PKI',
          ST: 'XX',
          C: 'YY',
          L: 'ZZ'
        },
        extensions: {
          subjectAltName: {
            dns: [
              'dfspendpoint1.test.modusbox.com',
              'dfspendpoint2.test.modusbox.com'
            ],
            ips: [
              '163.10.5.1',
              '163.10.5.2'
            ]
          }
        }
      };
      const enrollmentResult = await DfspOutboundService.createCSRAndDFSPOutboundEnrollment(envId, dfspId, body);
      assert.property(enrollmentResult, 'id');
      assert.isNotNull(enrollmentResult.id);
      const enrollmentId = enrollmentResult.id;

      const newEnrollment = await DfspOutboundService.getDFSPOutboundEnrollment(envId, dfspId, enrollmentId);
      assert.equal(newEnrollment.id, enrollmentId);
      assert.equal(newEnrollment.state, 'CSR_LOADED');
      assert.notProperty(newEnrollment, 'key');

      const newCert = createCertFromCSR(newEnrollment.csr);

      // Now push the certificate to the Connection-Manager
      const certAddedEnrollment = await DfspOutboundService.addDFSPOutboundEnrollmentCertificate(envId, dfspId, enrollmentId, { certificate: newCert });
      // Validate its state
      assert.equal(certAddedEnrollment.id, enrollmentId);
      assert.equal(certAddedEnrollment.certificate, newCert);
      assert.equal(certAddedEnrollment.state, 'CERT_SIGNED');

      // Validate its state again
      const afterCertAddedEnrollment = await DfspOutboundService.getDFSPOutboundEnrollment(envId, dfspId, enrollmentId);
      assert.equal(afterCertAddedEnrollment.id, enrollmentId);
      assert.equal(afterCertAddedEnrollment.certificate, newCert);
      assert.equal(afterCertAddedEnrollment.state, 'CERT_SIGNED');

      // Now ask the TSP to validate the cert
      const afterCertValidatedEnrollment = await DfspOutboundService.validateDFSPOutboundEnrollmentCertificate(envId, dfspId, enrollmentId);

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
      const afterCertValidatedEnrollmentWithCA = await DfspOutboundService.validateDFSPOutboundEnrollmentCertificate(envId, dfspId, enrollmentId);

      // Should be ok now
      assert.equal(afterCertValidatedEnrollmentWithCA.validationState, 'VALID', JSON.stringify(afterCertValidatedEnrollmentWithCA, null, 2));

      // 'VALID' key and signing 'VALID' should give a valid state
      assert.equal(afterCertValidatedEnrollmentWithCA.state, 'CERT_SIGNED', JSON.stringify(afterCertValidatedEnrollmentWithCA, null, 2));
    }).timeout(15000);
  }).timeout(30000);
}).timeout(45000);
