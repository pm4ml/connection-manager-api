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
const PkiService = require('../../src/service/PkiService');
const DfspOutboundService = require('../../src/service/DfspOutboundService');
const { assert } = require('chai');
const { expect } = require('chai');
const ROOT_CA = require('./Root_CA.js');
const DFSPModel = require('../../src/models/DFSPModel');
const forge = require('node-forge');
const sinon = require('sinon');
const ValidationCodes = require('../../src/pki_engine/ValidationCodes');
const { createInternalHubCA } = require('../../src/service/HubCAService');
const { createContext, destroyContext } = require('./context');

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
  if (csr.subject?.attributes) {
    cert.setSubject(csr.subject.attributes);
    // issuer from CA
    cert.setIssuer(caCert.subject.attributes);
    const ext = csr.getAttribute({ name: 'extensionRequest' })?.extensions;
    if (ext) {
      cert.setExtensions(ext);
    }
  }

  cert.publicKey = csr.publicKey;
  cert.sign(privateKey, forge.md.sha256.create());

  return forge.pki.certificateToPem(cert);
};

describe('DfspOutboundService', function () {
  let ctx;
  before(async () => {
    await setupTestDB();
    ctx = await createContext();
  });

  after(async () => {
    await tearDownTestDB();
    destroyContext(ctx);
  });

  describe('DfspOutboundService flow', function () {
    let dfspId = null;
    const DFSP_TEST_OUTBOUND = 'dfsp.outbound.io';
    beforeEach('creating DFSP', async function () {
      this.timeout(10000);

      await createInternalHubCA(ctx, ROOT_CA);

      const dfsp = {
        dfspId: DFSP_TEST_OUTBOUND,
        name: 'DFSP used to test outbound flow'
      };
      const resultDfsp = await PkiService.createDFSP(ctx, dfsp);
      dfspId = resultDfsp.id;

      const dbDfspId = await DFSPModel.findIdByDfspId(dfspId);
      try { await ctx.pkiEngine.deleteAllDFSPData(dbDfspId); } catch (e) { }
    });

    afterEach('tearing down ENV and DFSP', async () => {
      await PkiService.deleteDFSP(ctx, dfspId);
    });

    it('should get DFSP outbound enrollments', async () => {
      const enrollments = await DfspOutboundService.getDFSPOutboundEnrollments(ctx, dfspId);
      assert.isArray(enrollments);
    });
    
    it('should get DFSP outbound enrollments filtered by state', async () => {
      const state = 'CSR_LOADED';
      const enrollments = await DfspOutboundService.getDFSPOutboundEnrollments(ctx, dfspId, state);
      assert.isArray(enrollments);
      enrollments.forEach(enrollment => {
      assert.equal(enrollment.state, state);
      });
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
      const enrollmentResult = await DfspOutboundService.createCSRAndDFSPOutboundEnrollment(ctx, dfspId, body);
      assert.property(enrollmentResult, 'id');
      assert.isNotNull(enrollmentResult.id);
      const enrollmentId = enrollmentResult.id;

      const newEnrollment = await DfspOutboundService.getDFSPOutboundEnrollment(ctx, dfspId, enrollmentId);
      assert.equal(newEnrollment.id, enrollmentId);
      assert.equal(newEnrollment.state, 'CSR_LOADED');
      assert.notProperty(newEnrollment, 'key');

      const newCert = createCertFromCSR(newEnrollment.csr);

      // Now push the certificate to the Connection-Manager
      const certAddedEnrollment = await DfspOutboundService.addDFSPOutboundEnrollmentCertificate(ctx, dfspId, enrollmentId, { certificate: newCert });
      // Validate its state
      assert.equal(certAddedEnrollment.id, enrollmentId);
      assert.equal(certAddedEnrollment.certificate, newCert);
      assert.equal(certAddedEnrollment.state, 'CERT_SIGNED');

      // Validate its state again
      const afterCertAddedEnrollment = await DfspOutboundService.getDFSPOutboundEnrollment(ctx, dfspId, enrollmentId);
      assert.equal(afterCertAddedEnrollment.id, enrollmentId);
      assert.equal(afterCertAddedEnrollment.certificate, newCert);
      assert.equal(afterCertAddedEnrollment.state, 'CERT_SIGNED');

      // Now ask the TSP to validate the cert
      const afterCertValidatedEnrollment = await DfspOutboundService.validateDFSPOutboundEnrollmentCertificate(ctx, dfspId, enrollmentId);

      // Since I didn't upload the dfsp ca, it can't validate the cert
      assert.equal(afterCertValidatedEnrollment.validationState, 'VALID');
      const validationSignedByDFSPCA = afterCertValidatedEnrollment.validations.find((element) =>
        element.validationCode === ValidationCodes.VALIDATION_CODES.CERTIFICATE_SIGNED_BY_DFSP_CA.code
      );
      assert.equal(validationSignedByDFSPCA.result, 'NOT_AVAILABLE');

      // let's upload it
      await PkiService.setDFSPca(ctx, dfspId, {
        rootCertificate: fs.readFileSync(path.join(__dirname, 'resources/modusbox/ca.pem')).toString()
      });

      // Now ask the TSP to validate the cert, again
      const afterCertValidatedEnrollmentWithCA = await DfspOutboundService.validateDFSPOutboundEnrollmentCertificate(ctx, dfspId, enrollmentId);

      // Should be ok now
      assert.equal(afterCertValidatedEnrollmentWithCA.validationState, 'VALID', JSON.stringify(afterCertValidatedEnrollmentWithCA, null, 2));

      // 'VALID' key and signing 'VALID' should give a valid state
      assert.equal(afterCertValidatedEnrollmentWithCA.state, 'CERT_SIGNED', JSON.stringify(afterCertValidatedEnrollmentWithCA, null, 2));
    }).timeout(15000);
  }).timeout(30000);
}).timeout(45000);

describe('getDFSPOutboundEnrollments', () => {
  let ctx;
  let validateDfspStub;
  let findIdByDfspIdStub;
  let getDFSPOutboundEnrollmentsStub;

  beforeEach(() => {
    ctx = { pkiEngine: { getDFSPOutboundEnrollments: sinon.stub() } };
    validateDfspStub = sinon.stub(PkiService, 'validateDfsp').resolves();
    findIdByDfspIdStub = sinon.stub(DFSPModel, 'findIdByDfspId').resolves(1);
    getDFSPOutboundEnrollmentsStub = ctx.pkiEngine.getDFSPOutboundEnrollments;
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return filtered enrollments when state is provided', async () => {
    const enrollments = [
      { key: 'key1', state: 'active' },
      { key: 'key2', state: 'inactive' },
    ];
    getDFSPOutboundEnrollmentsStub.resolves(enrollments);

    const result = await DfspOutboundService.getDFSPOutboundEnrollments(ctx, 'dfspId', 'active');
    expect(result).to.deep.equal([{ state: 'active' }]);
  });

  it('should return all enrollments when state is not provided', async () => {
    const enrollments = [
      { key: 'key1', state: 'active' },
      { key: 'key2', state: 'inactive' },
    ];
    getDFSPOutboundEnrollmentsStub.resolves(enrollments);

    const result = await DfspOutboundService.getDFSPOutboundEnrollments(ctx, 'dfspId');
    expect(result).to.deep.equal([{ state: 'active' }, { state: 'inactive' }]);
  });

  it('should handle different state values', async () => {
    const enrollments = [
      { key: 'key1', state: 'active' },
      { key: 'key2', state: 'inactive' },
    ];
    getDFSPOutboundEnrollmentsStub.resolves(enrollments);

    const result = await DfspOutboundService.getDFSPOutboundEnrollments(ctx, 'dfspId', 'inactive');
    expect(result).to.deep.equal([{ state: 'inactive' }]);
  });

  it('should handle no enrollments', async () => {
    getDFSPOutboundEnrollmentsStub.resolves([]);

    const result = await DfspOutboundService.getDFSPOutboundEnrollments(ctx, 'dfspId');
    expect(result).to.deep.equal([]);
  });
});