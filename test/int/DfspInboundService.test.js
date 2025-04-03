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
const DfspInboundService = require('../../src/service/DfspInboundService');
const { assert } = require('chai');
const ROOT_CA = require('./Root_CA');
const fs = require('fs');
const path = require('path');
const ValidationCodes = require('../../src/pki_engine/ValidationCodes');
const ValidationError = require('../../src/errors/ValidationError');
const { createInternalHubCA, deleteHubCA } = require('../../src/service/HubCAService');
const { createContext, destroyContext } = require('./context');
const sinon = require('sinon');

const TTL_FOR_CA = '200h';

describe('DfspInboundService', async function () {
  let ctx;
  before(async () => {
    ctx = await createContext();
    await setupTestDB();
  });

  after(async () => {
    await tearDownTestDB();
    destroyContext(ctx);
  });

  describe('DfspInboundService flow', async function () {
    let dfspId = null;
    let csr = null;
    const DFSP_TEST_INBOUND = 'dfsp.inbound.io';

    beforeEach('creating DFSP', async function () {
      this.timeout(30000);

      await createInternalHubCA(ctx, ROOT_CA, TTL_FOR_CA);

      const dfsp = {
        dfspId: DFSP_TEST_INBOUND,
        name: 'DFSP used to test inbound flow'
      };
      const resultDfsp = await PkiService.createDFSP(ctx, dfsp);
      dfspId = resultDfsp.id;
      /*
      cat hub-tls-client.csr | jq -Rs .
      */
      csr = '-----BEGIN CERTIFICATE REQUEST-----\nMIIFfzCCA2cCAQAwgbIxCzAJBgNVBAYTAlVTMQswCQYDVQQIEwJXQTEQMA4GA1UE\nBxMHU2VhdHRsZTERMA8GA1UEChMITW9kdXNib3gxFDASBgNVBAsTC0VuZ2luZWVy\naW5nMR0wGwYDVQQDExRodWIuZGV2Lm1vZHVzYm94LmNvbTE8MDoGCSqGSIb3DQEJ\nAQwtY29ubmVjdGlvbi1tYW5hZ2VyLWFkbWluQGh1Yi5kZXYubW9kdXNib3guY29t\nMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA9aGgGgJkvv2JfWzvaei4\n5+Vf7VicajqvEjqO/KjWQwZLUXRAq3shIm2onN67ftDWj5uo8k2CsR8l/bNPeML8\nTHyfq5OHrV1i/BX8V4/Dy82caOUnUoq0Rvl7daNSz7McrA+hvMjWD7r9FN8qO4o7\nnGxLmZ6AMlThVwTcr8UGR9Z5tKC4RjhHljH5NTSWchmLZj+kQohnK1Gz9zT3ZRhA\nynEkv7jH2oi4YCJNMu/yKgCaUSH11JU+eHJTXePNqKslMNyAPR71aAkGyqJaOPHo\ni833m9EkDTSPg+dJTzzW/y8/T7o+kvucFLoF+bpQ1LA8EgY4Z5jAxB9Hy7Nns+z+\nSw74S4+ad5KrXcqwdpHe+uhhRRBBC1bF4UHLQ5+kpvCY8is+KNUCcki8NFb0rh0L\nBNK3vbU/a5iUlKCDmebtmB20TEfrLqGdS2b+CvNPDzHDTBt6m61FiA8M1WoWvzgE\n8cjYyEG2/lZIQHJ6nzAJ0kFcal8mu7OibkQMEnxHQmsxMi4/NQ4i+SVSWqVb+n3o\nYMSLvfOxe8kXYpnOulbbG87ocFL6Y/6ceRYHo9vLVxSVmuS6UOTbMF2JAFWRbkqI\nRAOkEeipxvkHy6GLz9UhVMqxK4OmxQ1bLI/Gpk3ULPhBx1lXtyRFeBfk1YjGZlFp\nsT9ar3pGdPcRCa0feFkUzOMCAwEAAaCBhjCBgwYJKoZIhvcNAQkOMXYwdDByBgNV\nHREEazBpghVodWIxLmRldi5tb2R1c2JveC5jb22CFWh1YjIuZGV2Lm1vZHVzYm94\nLmNvbYEtY29ubmVjdGlvbi1tYW5hZ2VyLWFkbWluQGh1Yi5kZXYubW9kdXNib3gu\nY29thwSjCgUYhwSjCgUVMA0GCSqGSIb3DQEBDQUAA4ICAQDzGBiYTjwgXnu1+y7y\n8HRKLny0EYMpVOrAf/sSrVKsh2ExS3o10VzV+KyewPsSDfew/S7VDxWqZcJlZrEJ\nXW/ZgZGkDjsVTgCSMQ/IVPDXKyQIEzCWB8Ne5UnC9oIjUlB5l3Svld4Q0DtS6hE6\n3azz8TIYSivwIE8OG/TXQxqtjjJMC2sCcHA9KZsZZwes1vezXR3LIy4R8GBLYpVV\nDGiQnNsXnIqcx2nH3kP/l00PK9Kk/jOJxKGbQbs79ntaAJ9AXuQHYxg13q4ppGG+\nSCWkEx3LDQTPi+WWhlcETnpvkT1jAH1SWV3ld8c7TcXPpcj0DYTaBYovL6baeCCD\nPDObXFU4A0QFivwgvrKicc85JWtg4Y10UCcPRfAxpnT8afV9KY+sX6oZo1cKcCWL\n+SDc3Ikyd3Vf3nPvDy/ZqyGx/h5UpFKwgG9usYEzz57LVBxEnaOfRLN2E6sNvuse\nrr1yejFQXRqxBPj0PniiNyRy+dsFeCIflAa/cmzYch/lWgpM8pEj4XsYSu7lRMqx\nihmpmqpClZYx0Mu4CTaHW85S0aV6EhMOZgJmRnm+R+QNB4Q44ssnfyeb9TipKCE0\nkMCix1EqPoucgIekQzedwe32wDR0oGYMOdA1w44maDC9QaIKLjhu2f+8m+CqeD4Q\nvr97InCotkF5yL/eQtiSkUhUjg==\n-----END CERTIFICATE REQUEST-----\n';
    });

    afterEach('tearing down ENV and DFSP', async () => {
      await PkiService.deleteDFSP(ctx, dfspId);
    });

    it('should create an enrollment from a CSR', async () => {
      const enrollmentResult = await DfspInboundService.createDFSPInboundEnrollment(ctx, dfspId, { clientCSR: csr });
      assert.property(enrollmentResult, 'id');
      assert.isNotNull(enrollmentResult.id);
      const enrollmentId = enrollmentResult.id;

      const retrievedEnrollment = await DfspInboundService.getDFSPInboundEnrollment(ctx, dfspId, enrollmentId);
      assert.equal(retrievedEnrollment.id, enrollmentId);
      assert.equal(retrievedEnrollment.csr, csr);
      assert.equal(retrievedEnrollment.state, 'CSR_LOADED');

      const signResponse = await DfspInboundService.signDFSPInboundEnrollment(ctx, dfspId, enrollmentId);
      assert.equal(signResponse.state, 'CERT_SIGNED');

      const certifiedEnrollment = await DfspInboundService.getDFSPInboundEnrollment(ctx, dfspId, enrollmentId);
      assert.equal(certifiedEnrollment.id, enrollmentId);
      assert.isNotNull(certifiedEnrollment.cert);
      assert.equal(certifiedEnrollment.state, 'CERT_SIGNED');
    });

    it('should create an enrollment from a CSR with correct validations', async () => {
      const csr = fs.readFileSync(path.join(__dirname, 'resources/modusbox/hub-tls-client.csr'), 'utf8');
      const enrollmentResult = await DfspInboundService.createDFSPInboundEnrollment(ctx, dfspId, { clientCSR: csr });
      assert.property(enrollmentResult, 'id');
      assert.isNotNull(enrollmentResult.id);
      const enrollmentId = enrollmentResult.id;

      const retrievedEnrollment = await DfspInboundService.getDFSPInboundEnrollment(ctx, dfspId, enrollmentId);
      assert.equal(retrievedEnrollment.id, enrollmentId);
      assert.equal(retrievedEnrollment.csr, csr);
      assert.equal(retrievedEnrollment.state, 'CSR_LOADED');
      assert.equal(retrievedEnrollment.validationState, ValidationCodes.VALID_STATES.VALID);
    });

    it('should throw a ValidationError on an enrollment from a CSR with invalid content', async () => {
      const csr = fs.readFileSync(path.join(__dirname, 'resources/modusbox/some-serial.srl'), 'utf8');
      try {
        await DfspInboundService.createDFSPInboundEnrollment(ctx, dfspId, { clientCSR: csr });
        assert.fail('Should have throw ValidationError');
      } catch (error) {
        assert.instanceOf(error, ValidationError);
      }
    });
  });

  describe('DfspInboundService flow without CA', () => {
    let dfspId = null;
    let csr = null;
    const DFSP_TEST_INBOUND = 'dfsp.inbound.io';

    beforeEach('creating DFSP', async () => {
      const dfsp = {
        dfspId: DFSP_TEST_INBOUND,
        name: 'DFSP used to test inbound flow'
      };
      const resultDfsp = await PkiService.createDFSP(ctx, dfsp);
      dfspId = resultDfsp.id;
      csr = '-----BEGIN CERTIFICATE REQUEST-----\nMIIFfzCCA2cCAQAwgbIxCzAJBgNVBAYTAlVTMQswCQYDVQQIEwJXQTEQMA4GA1UE\nBxMHU2VhdHRsZTERMA8GA1UEChMITW9kdXNib3gxFDASBgNVBAsTC0VuZ2luZWVy\naW5nMR0wGwYDVQQDExRodWIuZGV2Lm1vZHVzYm94LmNvbTE8MDoGCSqGSIb3DQEJ\nAQwtY29ubmVjdGlvbi1tYW5hZ2VyLWFkbWluQGh1Yi5kZXYubW9kdXNib3guY29t\nMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA9aGgGgJkvv2JfWzvaei4\n5+Vf7VicajqvEjqO/KjWQwZLUXRAq3shIm2onN67ftDWj5uo8k2CsR8l/bNPeML8\nTHyfq5OHrV1i/BX8V4/Dy82caOUnUoq0Rvl7daNSz7McrA+hvMjWD7r9FN8qO4o7\nnGxLmZ6AMlThVwTcr8UGR9Z5tKC4RjhHljH5NTSWchmLZj+kQohnK1Gz9zT3ZRhA\nynEkv7jH2oi4YCJNMu/yKgCaUSH11JU+eHJTXePNqKslMNyAPR71aAkGyqJaOPHo\ni833m9EkDTSPg+dJTzzW/y8/T7o+kvucFLoF+bpQ1LA8EgY4Z5jAxB9Hy7Nns+z+\nSw74S4+ad5KrXcqwdpHe+uhhRRBBC1bF4UHLQ5+kpvCY8is+KNUCcki8NFb0rh0L\nBNK3vbU/a5iUlKCDmebtmB20TEfrLqGdS2b+CvNPDzHDTBt6m61FiA8M1WoWvzgE\n8cjYyEG2/lZIQHJ6nzAJ0kFcal8mu7OibkQMEnxHQmsxMi4/NQ4i+SVSWqVb+n3o\nYMSLvfOxe8kXYpnOulbbG87ocFL6Y/6ceRYHo9vLVxSVmuS6UOTbMF2JAFWRbkqI\nRAOkEeipxvkHy6GLz9UhVMqxK4OmxQ1bLI/Gpk3ULPhBx1lXtyRFeBfk1YjGZlFp\nsT9ar3pGdPcRCa0feFkUzOMCAwEAAaCBhjCBgwYJKoZIhvcNAQkOMXYwdDByBgNV\nHREEazBpghVodWIxLmRldi5tb2R1c2JveC5jb22CFWh1YjIuZGV2Lm1vZHVzYm94\nLmNvbYEtY29ubmVjdGlvbi1tYW5hZ2VyLWFkbWluQGh1Yi5kZXYubW9kdXNib3gu\nY29thwSjCgUYhwSjCgUVMA0GCSqGSIb3DQEBDQUAA4ICAQDzGBiYTjwgXnu1+y7y\n8HRKLny0EYMpVOrAf/sSrVKsh2ExS3o10VzV+KyewPsSDfew/S7VDxWqZcJlZrEJ\nXW/ZgZGkDjsVTgCSMQ/IVPDXKyQIEzCWB8Ne5UnC9oIjUlB5l3Svld4Q0DtS6hE6\n3azz8TIYSivwIE8OG/TXQxqtjjJMC2sCcHA9KZsZZwes1vezXR3LIy4R8GBLYpVV\nDGiQnNsXnIqcx2nH3kP/l00PK9Kk/jOJxKGbQbs79ntaAJ9AXuQHYxg13q4ppGG+\nSCWkEx3LDQTPi+WWhlcETnpvkT1jAH1SWV3ld8c7TcXPpcj0DYTaBYovL6baeCCD\nPDObXFU4A0QFivwgvrKicc85JWtg4Y10UCcPRfAxpnT8afV9KY+sX6oZo1cKcCWL\n+SDc3Ikyd3Vf3nPvDy/ZqyGx/h5UpFKwgG9usYEzz57LVBxEnaOfRLN2E6sNvuse\nrr1yejFQXRqxBPj0PniiNyRy+dsFeCIflAa/cmzYch/lWgpM8pEj4XsYSu7lRMqx\nihmpmqpClZYx0Mu4CTaHW85S0aV6EhMOZgJmRnm+R+QNB4Q44ssnfyeb9TipKCE0\nkMCix1EqPoucgIekQzedwe32wDR0oGYMOdA1w44maDC9QaIKLjhu2f+8m+CqeD4Q\nvr97InCotkF5yL/eQtiSkUhUjg==\n-----END CERTIFICATE REQUEST-----\n';

      await deleteHubCA(ctx);
    });

    afterEach('tearing down ENV and DFSP', async () => {
      await PkiService.deleteDFSP(ctx, dfspId);
    });

    it('should throw an error because there\'s no CA', async () => {
      const enrollmentResult = await DfspInboundService.createDFSPInboundEnrollment(ctx, dfspId, { clientCSR: csr });
      assert.property(enrollmentResult, 'id');
      assert.isNotNull(enrollmentResult.id);
      const enrollmentId = enrollmentResult.id;

      const retrievedEnrollment = await DfspInboundService.getDFSPInboundEnrollment(ctx, dfspId, enrollmentId);
      assert.equal(retrievedEnrollment.id, enrollmentId);
      assert.equal(retrievedEnrollment.csr, csr);
      assert.equal(retrievedEnrollment.state, 'CSR_LOADED');

      try {
        await DfspInboundService.signDFSPInboundEnrollment(ctx, dfspId, enrollmentId);
        assert.fail();
      } catch (error) {
        assert(error);
      }
    }).timeout(15000);
  }).timeout(15000);

  describe('verify certificate signing algorithm', () => {
    let dfspId = null;
    const DFSP_TEST_INBOUND = 'dfsp.inbound.io';

    beforeEach('creating DFSP', async function () {
      this.timeout(10000);

      const dfsp = {
        dfspId: DFSP_TEST_INBOUND,
        name: 'DFSP used to test inbound flow'
      };
      const resultDfsp = await PkiService.createDFSP(ctx, dfsp);
      dfspId = resultDfsp.id;
    });

    afterEach('tearing down ENV and DFSP', async () => {
      await PkiService.deleteDFSP(ctx, dfspId);
    });

    it('should create a cert with SHA256 if specified as the signature_algorithm on the ca_config for a 2048bits csr', async () => {
      const caBody = {
        CN: 'Mojaloop PKI',
        O: 'Mojaloop',
        OU: 'PKI'
      };
      await createInternalHubCA(ctx, caBody, TTL_FOR_CA);

      const csr = fs.readFileSync(path.join(__dirname, 'resources/signing_algo/sha256-2048bits.csr'), 'utf8');
      const enrollmentResult = await DfspInboundService.createDFSPInboundEnrollment(ctx, dfspId, { clientCSR: csr });
      assert.property(enrollmentResult, 'id');
      assert.isNotNull(enrollmentResult.id);
      const enrollmentId = enrollmentResult.id;

      const retrievedEnrollment = await DfspInboundService.getDFSPInboundEnrollment(ctx, dfspId, enrollmentId);
      assert.equal(retrievedEnrollment.id, enrollmentId);
      assert.equal(retrievedEnrollment.csr, csr);
      assert.equal(retrievedEnrollment.state, 'CSR_LOADED');

      const signResponse = await DfspInboundService.signDFSPInboundEnrollment(ctx, dfspId, enrollmentId);
      assert.equal(signResponse.state, 'CERT_SIGNED');

      const certifiedEnrollment = await DfspInboundService.getDFSPInboundEnrollment(ctx, dfspId, enrollmentId);
      assert.equal(certifiedEnrollment.id, enrollmentId);
      assert.isNotNull(certifiedEnrollment.cert);
      assert.equal(certifiedEnrollment.state, 'CERT_SIGNED');
      assert.equal(certifiedEnrollment.certInfo.signatureAlgorithm, 'sha256WithRSAEncryption');
      const validationSignatureAlgo = certifiedEnrollment.validations.find((element) =>
        element.validationCode === ValidationCodes.VALIDATION_CODES.CSR_SIGNATURE_ALGORITHM_SHA256_512.code
      );
      assert.isTrue(validationSignatureAlgo.message.includes('256'));
      assert.isFalse(validationSignatureAlgo.message.includes('512'));
    }).timeout(15000);

    it('should create a cert with SHA256 if specified as the signature_algorithm on the ca_config for a 4096bits csr', async () => {
      const caBody = {
        CN: 'Mojaloop PKI',
        O: 'Mojaloop',
        OU: 'PKI'
      };
      await createInternalHubCA(ctx, caBody, TTL_FOR_CA);

      const csr = fs.readFileSync(path.join(__dirname, 'resources/signing_algo/sha256-4096bits.csr'), 'utf8');
      const enrollmentResult = await DfspInboundService.createDFSPInboundEnrollment(ctx, dfspId, { clientCSR: csr });
      assert.property(enrollmentResult, 'id');
      assert.isNotNull(enrollmentResult.id);
      const enrollmentId = enrollmentResult.id;

      const retrievedEnrollment = await DfspInboundService.getDFSPInboundEnrollment(ctx, dfspId, enrollmentId);
      assert.equal(retrievedEnrollment.id, enrollmentId);
      assert.equal(retrievedEnrollment.csr, csr);
      assert.equal(retrievedEnrollment.state, 'CSR_LOADED');

      const signResponse = await DfspInboundService.signDFSPInboundEnrollment(ctx, dfspId, enrollmentId);
      assert.equal(signResponse.state, 'CERT_SIGNED');

      const certifiedEnrollment = await DfspInboundService.getDFSPInboundEnrollment(ctx, dfspId, enrollmentId);
      assert.equal(certifiedEnrollment.id, enrollmentId);
      assert.isNotNull(certifiedEnrollment.cert);
      assert.equal(certifiedEnrollment.state, 'CERT_SIGNED');
      assert.equal(certifiedEnrollment.certInfo.signatureAlgorithm, 'sha256WithRSAEncryption');

      const validationSignatureAlgo = certifiedEnrollment.validations.find((element) =>
        element.validationCode === ValidationCodes.VALIDATION_CODES.CSR_SIGNATURE_ALGORITHM_SHA256_512.code
      );
      assert.isTrue(validationSignatureAlgo.message.includes('256'));
      assert.isFalse(validationSignatureAlgo.message.includes('512'));
    }).timeout(15000);

    it('should create a cert with SHA512 if specified as the signature_algorithm on the ca_config', async () => {
      const caBody = {
        CN: 'Mojaloop PKI SHA512',
        O: 'Mojaloop',
        OU: 'PKI',
        signatureAlgorithm: 'sha512WithRSAEncryption'
      };
      await createInternalHubCA(ctx, caBody, TTL_FOR_CA);

      const csr = fs.readFileSync(path.join(__dirname, 'resources/signing_algo/sha512-4096bits.csr'), 'utf8');
      const enrollmentResult = await DfspInboundService.createDFSPInboundEnrollment(ctx, dfspId, { clientCSR: csr });
      assert.property(enrollmentResult, 'id');
      assert.isNotNull(enrollmentResult.id);
      const enrollmentId = enrollmentResult.id;

      const signedEnrollment = await DfspInboundService.signDFSPInboundEnrollment(ctx, dfspId, enrollmentId);
      assert.equal(signedEnrollment.state, 'CERT_SIGNED');
      assert.equal(signedEnrollment.certInfo.signatureAlgorithm, 'sha512WithRSAEncryption');

      const validationSignatureAlgo = signedEnrollment.validations.find((element) =>
        element.validationCode === ValidationCodes.VALIDATION_CODES.CSR_SIGNATURE_ALGORITHM_SHA256_512.code
      );
      assert.isTrue(validationSignatureAlgo.message.includes('512')); 
      assert.isFalse(validationSignatureAlgo.message.includes('256'));
    }).timeout(15000);

    it('should fail when creating enrollment with invalid CSR format', async () => {
      const invalidCsr = '-----BEGIN CERTIFICATE REQUEST-----\ninvalid content\n-----END CERTIFICATE REQUEST-----';
      
      try {
        await DfspInboundService.createDFSPInboundEnrollment(ctx, dfspId, { clientCSR: invalidCsr });
        assert.fail('Should throw ValidationError');
      } catch (err) {
        assert.instanceOf(err, ValidationError);
        assert.include(err.message, 'Could not parse the CSR content');
      }
    });

    it('should fail when signing enrollment with non-existent ID', async () => {
      const nonExistentId = 'non-existent-id';
      try {
        await DfspInboundService.signDFSPInboundEnrollment(ctx, dfspId, nonExistentId);
        assert.fail('Should throw error');
      } catch (err) {
        assert.include(err.message, 'Could not retrieve current CA');
      }
    });
  });
  describe('getDFSPInboundEnrollments', () => {
    let ctx;
    let dfspId;
    let dbDfspId;
    let enrollments;

    before(async () => {
      ctx = await createContext();
      await setupTestDB();
      dfspId = 'test-dfsp-id';
      dbDfspId = 'test-db-dfsp-id';
      enrollments = [
        { id: '1', state: 'CSR_LOADED' },
        { id: '2', state: 'CERT_SIGNED' },
        { id: '3', state: 'CSR_LOADED' }
      ];

      sinon.stub(PkiService, 'validateDfsp').resolves();
      sinon.stub(require('../../src/models/DFSPModel'), 'findIdByDfspId').resolves(dbDfspId);
      sinon.stub(ctx.pkiEngine, 'getDFSPInboundEnrollments').resolves(enrollments);
    });

    after(async () => {
      await tearDownTestDB();
      destroyContext(ctx);
      sinon.restore();
    });

    it('should return all enrollments when state is not provided', async () => {
      const result = await DfspInboundService.getDFSPInboundEnrollments(ctx, dfspId);
      assert.deepEqual(result, enrollments);
    });

    it('should return enrollments filtered by state', async () => {
      const state = 'CSR_LOADED';
      const result = await DfspInboundService.getDFSPInboundEnrollments(ctx, dfspId, state);
      assert.deepEqual(result, enrollments.filter(en => en.state === state));
    });

    it('should return an empty array if no enrollments match the state', async () => {
      const state = 'NON_EXISTENT_STATE';
      const result = await DfspInboundService.getDFSPInboundEnrollments(ctx, dfspId, state);
      assert.deepEqual(result, []);
    });

    it('should throw an error if validateDfsp fails', async () => {
      sinon.restore();
      sinon.stub(PkiService, 'validateDfsp').rejects(new Error('Validation failed'));
      try {
        await DfspInboundService.getDFSPInboundEnrollments(ctx, dfspId);
        assert.fail('Expected error not thrown');
      } catch (error) {
        assert.equal(error.message, 'Validation failed');
      }
    });

    it('should throw an error if getDFSPInboundEnrollments fails', async () => {
      sinon.restore();
      sinon.stub(PkiService, 'validateDfsp').resolves();
      sinon.stub(require('../../src/models/DFSPModel'), 'findIdByDfspId').resolves(dbDfspId);
      sinon.stub(ctx.pkiEngine, 'getDFSPInboundEnrollments').rejects(new Error('PKI error'));
      try {
        await DfspInboundService.getDFSPInboundEnrollments(ctx, dfspId);
        assert.fail('Expected error not thrown');
      } catch (error) {
        assert.equal(error.message, 'PKI error');
      }
    });
  });

  describe('signDFSPInboundEnrollment', () => {
    let ctx;
    let dfspId;
    let enId;
    let dbDfspId;
    let enrollment;
    let newCert;
    let certInfo;
    let validations;
    let validationState;

    beforeEach(async () => {
      ctx = await createContext();
      dfspId = 'test-dfsp-id';
      enId = 'test-enrollment-id';
      dbDfspId = 'test-db-dfsp-id';
      enrollment = { id: enId, csr: 'test-csr' };
      newCert = 'test-new-cert';
      certInfo = { subject: 'test-subject' };
      validations = [{ validationCode: 'VALID' }];
      validationState = 'VALID';

      sinon.stub(PkiService, 'validateDfsp').resolves();
      sinon.stub(require('../../src/models/DFSPModel'), 'findIdByDfspId').resolves(dbDfspId);
      sinon.stub(ctx.pkiEngine, 'getDFSPInboundEnrollment').resolves(enrollment);
      sinon.stub(ctx.pkiEngine, 'sign').resolves(newCert);
      sinon.stub(ctx.pkiEngine, 'getCertInfo').returns(certInfo);
      sinon.stub(ctx.pkiEngine, 'validateInboundEnrollment').resolves({ validations, validationState });
      sinon.stub(ctx.pkiEngine, 'setDFSPInboundEnrollment').resolves();
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should sign the CSR and update the enrollment state to CERT_SIGNED', async () => {
      const result = await DfspInboundService.signDFSPInboundEnrollment(ctx, dfspId, enId);

      assert.equal(result.state, 'CERT_SIGNED');
      assert.equal(result.certificate, newCert);
      assert.deepEqual(result.certInfo, certInfo);
      assert.deepEqual(result.validations, validations);
      assert.equal(result.validationState, validationState);
    });

    it('should throw an InvalidEntityError if the enrollment is not found', async () => {
      sinon.restore();
      sinon.stub(PkiService, 'validateDfsp').resolves();
      sinon.stub(require('../../src/models/DFSPModel'), 'findIdByDfspId').resolves(dbDfspId);
      sinon.stub(ctx.pkiEngine, 'getDFSPInboundEnrollment').resolves(null);

      try {
        await DfspInboundService.signDFSPInboundEnrollment(ctx, dfspId, enId);
        assert.fail('Expected error not thrown');
      } catch (error) {
        assert.instanceOf(error, InvalidEntityError);
        assert.equal(error.message, `Could not retrieve current CA for the endpoint ${enId}, dfsp id ${dfspId}`);
      }
    });

    it('should throw an error if validateDfsp fails', async () => {
      sinon.restore();
      sinon.stub(PkiService, 'validateDfsp').rejects(new Error('Validation failed'));

      try {
        await DfspInboundService.signDFSPInboundEnrollment(ctx, dfspId, enId);
        assert.fail('Expected error not thrown');
      } catch (error) {
        assert.equal(error.message, 'Validation failed');
      }
    });

    it('should throw an error if findIdByDfspId fails', async () => {
      sinon.restore();
      sinon.stub(PkiService, 'validateDfsp').resolves();
      sinon.stub(require('../../src/models/DFSPModel'), 'findIdByDfspId').rejects(new Error('DB error'));

      try {
        await DfspInboundService.signDFSPInboundEnrollment(ctx, dfspId, enId);
        assert.fail('Expected error not thrown');
      } catch (error) {
        assert.equal(error.message, 'DB error');
      }
    });

    it('should throw an error if sign fails', async () => {
      sinon.restore();
      sinon.stub(PkiService, 'validateDfsp').resolves();
      sinon.stub(require('../../src/models/DFSPModel'), 'findIdByDfspId').resolves(dbDfspId);
      sinon.stub(ctx.pkiEngine, 'getDFSPInboundEnrollment').resolves(enrollment);
      sinon.stub(ctx.pkiEngine, 'sign').rejects(new Error('Sign error'));

      try {
        await DfspInboundService.signDFSPInboundEnrollment(ctx, dfspId, enId);
        assert.fail('Expected error not thrown');
      } catch (error) {
        assert.equal(error.message, 'Sign error');
      }
    });

    it('should throw an error if validateInboundEnrollment fails', async () => {
      sinon.restore();
      sinon.stub(PkiService, 'validateDfsp').resolves();
      sinon.stub(require('../../src/models/DFSPModel'), 'findIdByDfspId').resolves(dbDfspId);
      sinon.stub(ctx.pkiEngine, 'getDFSPInboundEnrollment').resolves(enrollment);
      sinon.stub(ctx.pkiEngine, 'sign').resolves(newCert);
      sinon.stub(ctx.pkiEngine, 'getCertInfo').returns(certInfo);
      sinon.stub(ctx.pkiEngine, 'validateInboundEnrollment').rejects(new Error('Validation error'));

      try {
        await DfspInboundService.signDFSPInboundEnrollment(ctx, dfspId, enId);
        assert.fail('Expected error not thrown');
      } catch (error) {
        assert.equal(error.message, 'Validation error');
      }
    });

    it('should throw an error if setDFSPInboundEnrollment fails', async () => {
      sinon.restore();
      sinon.stub(PkiService, 'validateDfsp').resolves();
      sinon.stub(require('../../src/models/DFSPModel'), 'findIdByDfspId').resolves(dbDfspId);
      sinon.stub(ctx.pkiEngine, 'getDFSPInboundEnrollment').resolves(enrollment);
      sinon.stub(ctx.pkiEngine, 'sign').resolves(newCert);
      sinon.stub(ctx.pkiEngine, 'getCertInfo').returns(certInfo);
      sinon.stub(ctx.pkiEngine, 'validateInboundEnrollment').resolves({ validations, validationState });
      sinon.stub(ctx.pkiEngine, 'setDFSPInboundEnrollment').rejects(new Error('Set enrollment error'));

      try {
        await DfspInboundService.signDFSPInboundEnrollment(ctx, dfspId, enId);
        assert.fail('Expected error not thrown');
      } catch (error) {
        assert.equal(error.message, 'Set enrollment error');
      }
    });
  });
}).timeout(15000);
