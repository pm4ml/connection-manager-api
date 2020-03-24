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

const EmbeddedPKIEngine = require('../src/pki_engine/EmbeddedPKIEngine');
const fs = require('fs');
const path = require('path');
const assert = require('chai').assert;
const ValidationCodes = require('../src/pki_engine/ValidationCodes');
const ValidationError = require('../src/errors/ValidationError');
const moment = require('moment');

describe('EmbeddedPKIEngine', () => {
  before(async () => {
    await setupTestDB();
  });

  after(async () => {
    await tearDownTestDB();
  });

  describe('Certificate validations', () => {
    it('should fail to validate a date-valid and usage-correct server certificate without its chain', async () => {
      let cert = fs.readFileSync(path.join(__dirname, 'resources/amazon.com/www.amazon.com.pem'), 'utf8');
      const pkiEngine = new EmbeddedPKIEngine();
      // eslint-disable-next-line no-unused-vars
      let { validations, validationState } = await pkiEngine.validateServerCertificate(cert);
      assert.isTrue(validationState === ValidationCodes.VALID_STATES.INVALID);
    }).timeout(15000);

    it('should validate a server certificate with its chain and root', async () => {
      let cert = fs.readFileSync(path.join(__dirname, 'resources/amazon.com/www.amazon.com.pem'), 'utf8');
      let rootCert = fs.readFileSync(path.join(__dirname, 'resources/amazon.com/VeriSign-Class-3-Public-Primary-Certification-Authority-G5.pem'), 'utf8');
      let certChain = fs.readFileSync(path.join(__dirname, 'resources/amazon.com/amazon.chain.pem'), 'utf8');
      const pkiEngine = new EmbeddedPKIEngine();
      let validation = await pkiEngine.validateCertificateChain(cert, certChain, rootCert);
      assert.isTrue(validation.result === ValidationCodes.VALID_STATES.VALID);
    }).timeout(15000);

    it('should validate a server certificate with its chain if root is a globally trusted one', async () => {
      let cert = fs.readFileSync(path.join(__dirname, 'resources/amazon.com/www.amazon.com.pem'), 'utf8');
      let certChain = fs.readFileSync(path.join(__dirname, 'resources/amazon.com/amazon.chain.pem'), 'utf8');
      const pkiEngine = new EmbeddedPKIEngine();
      let validation = await pkiEngine.validateCertificateChain(cert, certChain);
      assert.isTrue(validation.result === ValidationCodes.VALID_STATES.VALID);
    }).timeout(15000);

    it('should not validate an expired certificate', async () => {
      // Not Before: Jun  6 01:37:00 2019 GMT
      // Not After : Jun  6 02:37:00 2019 GMT
      if (moment().isBefore(moment('20190606T023700'))) {
        // ignore
        return;
      }
      let cert = fs.readFileSync(path.join(__dirname, 'resources/modusbox/expired/expired.pem'), 'utf8');
      const pkiEngine = new EmbeddedPKIEngine();
      let validation = await pkiEngine.validateCertificateValidity(cert);
      assert.isTrue(validation.result === ValidationCodes.VALID_STATES.INVALID);
    }).timeout(15000);

    it('should validate a server certificate usage', async () => {
      let cert = fs.readFileSync(path.join(__dirname, 'resources/amazon.com/www.amazon.com.pem'), 'utf8');
      const pkiEngine = new EmbeddedPKIEngine();
      let validation = await pkiEngine.validateCertificateUsageServer(cert);
      assert.isTrue(validation.result === ValidationCodes.VALID_STATES.VALID);
    }).timeout(15000);

    it('should not validate a server certificate usage on a global root CA', async () => {
      let cert = fs.readFileSync(path.join(__dirname, 'resources/digicert/digicert.global.root.pem'), 'utf8');
      const pkiEngine = new EmbeddedPKIEngine();
      let validation = await pkiEngine.validateCertificateUsageServer(cert);
      assert.isTrue(validation.result === ValidationCodes.VALID_STATES.INVALID);
    }).timeout(15000);

    it('should not validate a server certificate usage on a intermediate CA', async () => {
      let cert = fs.readFileSync(path.join(__dirname, 'resources/orange/Orange_Internal_G2-Server_CA.pem'), 'utf8');
      const pkiEngine = new EmbeddedPKIEngine();
      let validation = await pkiEngine.validateCertificateUsageServer(cert);
      assert.isTrue(validation.result === ValidationCodes.VALID_STATES.INVALID);
    }).timeout(15000);

    it('should not validate an invalid CSR', async () => {
      let csr = fs.readFileSync(path.join(__dirname, 'resources/modusbox/some-serial.srl'), 'utf8');
      const pkiEngine = new EmbeddedPKIEngine();
      let validation = await pkiEngine.validateCsrSignatureValid(csr);
      assert.isTrue(validation.result === ValidationCodes.VALID_STATES.INVALID);
    }).timeout(15000);
  });

  describe('MP-1104 certificate validations', () => {
    it('verifyIntermediateChain for first cert in chain', async () => {
      let rootCert = fs.readFileSync(path.join(__dirname, 'resources/mp-1104/Root_CA_Cert.cer'), 'utf8');
      let certChain = fs.readFileSync(path.join(__dirname, 'resources/mp-1104/Combined_Intermediate_CA_certs.pem'), 'utf8');
      const pkiEngine = new EmbeddedPKIEngine();
      let validation = await pkiEngine.verifyIntermediateChain(rootCert, certChain, ValidationCodes.VALIDATION_CODES.VERIFY_CHAIN_CERTIFICATES.code);
      assert.isTrue(validation.result === ValidationCodes.VALID_STATES.VALID);
    }).timeout(15000);

    it('verifyIntermediateChain when there is only one certificate in chain', async () => {
      let rootCert = fs.readFileSync(path.join(__dirname, 'resources/mp-1104/Root_CA_Cert.cer'), 'utf8');
      let certChain = fs.readFileSync(path.join(__dirname, 'resources/mp-1104/Combined_Intermediate_CA_cert.pem'), 'utf8');
      const pkiEngine = new EmbeddedPKIEngine();
      let validation = await pkiEngine.verifyIntermediateChain(rootCert, certChain, ValidationCodes.VALIDATION_CODES.VERIFY_CHAIN_CERTIFICATES.code);
      assert.isTrue(validation.result === ValidationCodes.VALID_STATES.VALID);
    }).timeout(15000);

    it('verifyIntermediateChain when there is more than two certificate in chain', async () => {
      let rootCert = fs.readFileSync(path.join(__dirname, 'resources/mp-1104/Root_CA_Cert.cer'), 'utf8');
      let certChain = fs.readFileSync(path.join(__dirname, 'resources/mp-1104/Combined_Intermediate_CA_certs_three.pem'), 'utf8');
      const pkiEngine = new EmbeddedPKIEngine();
      let validation = await pkiEngine.verifyIntermediateChain(rootCert, certChain, ValidationCodes.VALIDATION_CODES.VERIFY_CHAIN_CERTIFICATES.code);
      assert.isTrue(validation.result === ValidationCodes.VALID_STATES.VALID);
    }).timeout(15000);

    it('AMAZON - verifyIntermediateChain for first cert in chain', async () => {
      let rootCert = fs.readFileSync(path.join(__dirname, 'resources/amazon.com/www.amazon.com.pem'), 'utf8');
      let certChain = fs.readFileSync(path.join(__dirname, 'resources/amazon.com/amazon.chain.pem'), 'utf8');
      const pkiEngine = new EmbeddedPKIEngine();
      let validation = await pkiEngine.verifyIntermediateChain(rootCert, certChain, ValidationCodes.VALIDATION_CODES.VERIFY_CHAIN_CERTIFICATES.code);
      assert.isTrue(validation.result === ValidationCodes.VALID_STATES.VALID);
    }).timeout(15000);

    it('verifyIntermediateChain for empty chain', async () => {
      let rootCert = fs.readFileSync(path.join(__dirname, 'resources/mp-1104/Root_CA_Cert.cer'), 'utf8');
      let certChain = fs.readFileSync(path.join(__dirname, 'resources/mp-1104/EmptyChain.pem'), 'utf8');
      const pkiEngine = new EmbeddedPKIEngine();
      try {
        await pkiEngine.verifyIntermediateChain(rootCert, certChain, ValidationCodes.VALIDATION_CODES.VERIFY_CHAIN_CERTIFICATES.code);
        assert.fail('Should not be here');
      } catch (error) {
        assert.isTrue(error instanceof ValidationError, error);
      }
    }).timeout(15000);
  });
});
