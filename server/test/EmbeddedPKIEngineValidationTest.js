const { setupTestDB, tearDownTestDB } = require('./test-database');

const EmbeddedPKIEngine = require('../src/pki_engine/EmbeddedPKIEngine');
const fs = require('fs');
const path = require('path');
const assert = require('chai').assert;
const ValidationCodes = require('../src/pki_engine/ValidationCodes');
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
});
