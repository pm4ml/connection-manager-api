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

const { setupTestDB, tearDownTestDB } = require('../int-failed/test-database');

const fs = require('fs');
const path = require('path');
const ValidationCodes = require('../../src/pki_engine/ValidationCodes');
const ValidationError = require('../../src/errors/ValidationError');
const moment = require('moment');
const { createContext, destroyContext } = require('../int-failed/context');

describe('ctx.pkiEngine', () => {
  let ctx;
  beforeAll(async () => {
    ctx = await createContext();
    await setupTestDB();
  });

  afterAll(async () => {
    await tearDownTestDB();
    destroyContext(ctx);
  });

  describe('Certificate validations', () => {
    it('should fail to validate a date-valid and usage-correct server certificate without its chain', async () => {
      const cert = fs.readFileSync(path.join(__dirname, 'resources/amazon.com/www.amazon.com.pem'), 'utf8');
      const { validationState } = ctx.pkiEngine.validateServerCertificate(cert);
      expect(validationState === ValidationCodes.VALID_STATES.INVALID).toBe(true);
    }, 15000);

    it.skip('should validate a server certificate with its chain and root', async () => {
      const cert = fs.readFileSync(path.join(__dirname, 'resources/amazon.com/www.amazon.com.pem'), 'utf8');
      const rootCert = fs.readFileSync(path.join(__dirname, 'resources/amazon.com/RootCA.pem'), 'utf8');
      const certChain = fs.readFileSync(path.join(__dirname, 'resources/amazon.com/amazon.chain.pem'), 'utf8');
      const validation = ctx.pkiEngine.validateCertificateChain(cert, certChain, rootCert);
      expect(validation.result === ValidationCodes.VALID_STATES.VALID).toBe(true);
    }, 15000);

    it.skip('should validate a server certificate with its chain if root is a globally trusted one', async () => {
      const cert = fs.readFileSync(path.join(__dirname, 'resources/amazon.com/www.amazon.com.pem'), 'utf8');
      const certChain = fs.readFileSync(path.join(__dirname, 'resources/amazon.com/amazon.chain.pem'), 'utf8');
      const validation = ctx.pkiEngine.validateCertificateChain(cert, certChain);
      expect(validation.result === ValidationCodes.VALID_STATES.VALID).toBe(true);
    }, 15000);

    it('should not validate an expired certificate', async () => {
      // Not Before: Jun  6 01:37:00 2019 GMT
      // Not After : Jun  6 02:37:00 2019 GMT
      if (moment().isBefore(moment('20190606T023700'))) {
        // ignore
        return;
      }
      if (moment().isAfter(moment('20190606T013700'))) {
        // ignore
        return;
      }

      const cert = fs.readFileSync(path.join(__dirname, 'resources/modusbox/expired/expired.pem'), 'utf8');
      const validation = ctx.pkiEngine.validateCertificateValidity(cert);
      console.log(validation);
      expect(validation.state === ValidationCodes.VALID_STATES.INVALID).toBe(true);
      expect(validation.message).toBe('Certificate is not valid for the current date.');
    }, 15000);

    it('should validate a server certificate usage', async () => {
      const cert = fs.readFileSync(path.join(__dirname, 'resources/amazon.com/www.amazon.com.pem'), 'utf8');
      const validation = ctx.pkiEngine.validateCertificateUsageServer(cert);
      expect(validation.result === ValidationCodes.VALID_STATES.VALID).toBe(true);
    }, 15000);

    it('should not validate a server certificate usage on a global root CA', async () => {
      const cert = fs.readFileSync(path.join(__dirname, 'resources/digicert/digicert.global.root.pem'), 'utf8');
      const validation = ctx.pkiEngine.validateCertificateUsageServer(cert);
      expect(validation.result === ValidationCodes.VALID_STATES.INVALID).toBe(true);
    }, 15000);

    it('should not validate a server certificate usage on a intermediate CA', async () => {
      const cert = fs.readFileSync(path.join(__dirname, 'resources/orange/Orange_Internal_G2-Server_CA.pem'), 'utf8');
      const validation = ctx.pkiEngine.validateCertificateUsageServer(cert);
      expect(validation.result === ValidationCodes.VALID_STATES.INVALID).toBe(true);
    }, 15000);

    it('should not validate an invalid CSR', async () => {
      const csr = fs.readFileSync(path.join(__dirname, 'resources/modusbox/some-serial.srl'), 'utf8');
      const validation = await ctx.pkiEngine.validateCsrSignatureValid(csr);
      expect(validation.result === ValidationCodes.VALID_STATES.INVALID).toBe(true);
    }, 15000);
  });

  describe('MP-1104 certificate validations', () => {
    it('verifyIntermediateChain for first cert in chain', async () => {
      const rootCert = fs.readFileSync(path.join(__dirname, 'resources/mp-1104/Root_CA_Cert.cer'), 'utf8');
      const certChain = fs.readFileSync(path.join(__dirname, 'resources/mp-1104/Combined_Intermediate_CA_certs.pem'), 'utf8');
      const validation = await ctx.pkiEngine.verifyIntermediateChain(rootCert, certChain, ValidationCodes.VALIDATION_CODES.VERIFY_CHAIN_CERTIFICATES.code);
      expect(validation.result === ValidationCodes.VALID_STATES.VALID).toBe(true);
    }, 15000);

    it('verifyIntermediateChain when there is only one certificate in chain', async () => {
      const rootCert = fs.readFileSync(path.join(__dirname, 'resources/mp-1104/Root_CA_Cert.cer'), 'utf8');
      const certChain = fs.readFileSync(path.join(__dirname, 'resources/mp-1104/Combined_Intermediate_CA_cert.pem'), 'utf8');
      const validation = ctx.pkiEngine.verifyIntermediateChain(rootCert, certChain, ValidationCodes.VALIDATION_CODES.VERIFY_CHAIN_CERTIFICATES.code);
      expect(validation.result === ValidationCodes.VALID_STATES.VALID).toBe(true);
    }, 15000);

    it('verifyIntermediateChain when there is more than two certificate in chain', async () => {
      const rootCert = fs.readFileSync(path.join(__dirname, 'resources/mp-1104/Root_CA_Cert.cer'), 'utf8');
      const certChain = fs.readFileSync(path.join(__dirname, 'resources/mp-1104/Combined_Intermediate_CA_certs_three.pem'), 'utf8');
      const validation = ctx.pkiEngine.verifyIntermediateChain(rootCert, certChain, ValidationCodes.VALIDATION_CODES.VERIFY_CHAIN_CERTIFICATES.code);
      expect(validation.result === ValidationCodes.VALID_STATES.VALID).toBe(true);
    }, 15000);

    it('AMAZON - verifyIntermediateChain for first cert in chain', async () => {
      const rootCert = null;
      const certChain = fs.readFileSync(path.join(__dirname, 'resources/amazon.com/amazon.chain.pem'), 'utf8');
      const validation = ctx.pkiEngine.verifyIntermediateChain(rootCert, certChain, ValidationCodes.VALIDATION_CODES.VERIFY_CHAIN_CERTIFICATES.code);
      expect(validation.result === ValidationCodes.VALID_STATES.VALID).toBe(true);
    }, 15000);

    // Test and business logic added during MP-1104 bug fix work, but there is no requirement for it. The business logic results in bug MP-2398
    // and therefore skipping test and commenting business logic.
    it.skip('verifyIntermediateChain for empty chain', async () => {
      const rootCert = fs.readFileSync(path.join(__dirname, 'resources/mp-1104/Root_CA_Cert.cer'), 'utf8');
      const certChain = fs.readFileSync(path.join(__dirname, 'resources/mp-1104/EmptyChain.pem'), 'utf8');
      try {
        ctx.pkiEngine.verifyIntermediateChain(rootCert, certChain, ValidationCodes.VALIDATION_CODES.VERIFY_CHAIN_CERTIFICATES.code);
        // Should not be here
        expect(true).toBe(false);
      } catch (error) {
        expect(error instanceof ValidationError).toBe(true);
      }
    }, 15000);
  });
});
