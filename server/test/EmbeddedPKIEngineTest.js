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

const ExternalProcessError = require('../src/errors/ExternalProcessError');
const ValidationError = require('../src/errors/ValidationError');

const fs = require('fs');
const path = require('path');
const assert = require('chai').assert;

describe('EmbeddedPKIEngine', () => {
  before(async () => {
    await setupTestDB();
  });

  after(async () => {
    await tearDownTestDB();
  });

  describe('verify CSRs', () => {
    it('should validate a CSR key length', async () => {
      let csr = fs.readFileSync(path.join(__dirname, 'resources/modusbox/hub-tls-client.csr'), 'utf8');
      let result = await EmbeddedPKIEngine.verifyCSRKeyLength(csr, 4096);
      assert.isTrue(result.valid);
    });

    it('should validate a CSR algorithm - 512', async () => {
      let csr = fs.readFileSync(path.join(__dirname, 'resources/modusbox/hub-tls-client.csr'), 'utf8');
      // cfssl generates CSRs with sha512
      let result = await EmbeddedPKIEngine.verifyCSRAlgorithm(csr, 'sha512WithRSAEncryption');
      assert.isTrue(result.valid, JSON.stringify(result));
    });

    it('should validate a CSR algorithm - 256', async () => {
      let csr = fs.readFileSync(path.join(__dirname, 'resources/modusbox/hub-tls-client.csr'), 'utf8');
      // cfssl generates CSRs with sha512
      let result = await EmbeddedPKIEngine.verifyCSRAlgorithm(csr, 'sha512WithRSAEncryption');
      assert.isTrue(result.valid, JSON.stringify(result));
    });

    it('should not validate a CSR with short key length', async () => {
      let csr = fs.readFileSync(path.join(__dirname, 'resources/modusbox/hub-tls-client.csr'), 'utf8');
      let result = await EmbeddedPKIEngine.verifyCSRKeyLength(csr, 4097);
      assert.isFalse(result.valid);
    });

    it('should not validate a CSR with a 2048 key length', async () => {
      let csr = fs.readFileSync(path.join(__dirname, 'resources/modusbox/hub-tls-client-2048.csr'), 'utf8');
      let result = await EmbeddedPKIEngine.verifyCSRKeyLength(csr, 4096);
      assert.isFalse(result.valid);
    });

    it('should fail when sent a cert instead of a CSR', async () => {
      let csr = fs.readFileSync(path.join(__dirname, 'resources/modusbox/hub-tls-client.pem'), 'utf8');
      try {
        await EmbeddedPKIEngine.verifyCSRKeyLength(csr, 4096);
        assert.fail('Should not be here');
      } catch (error) {
        assert.isTrue(error instanceof ExternalProcessError, error);
      }
    });

    it('should create a CSR from valid parameters', async () => {
      let csrParameters = {
        'subject': {
          'CN': 'dfspendpoint1.test.modusbox.com',
          'emailAddress': 'connection-manager@modusbox.com',
          'O': 'Modusbox',
          'OU': 'PKI'
        },
        'extensions': {
          'subjectAltName': {
            'dns': [
              'dfspendpoint1.test.modusbox.com',
              'dfspendpoint2.test.modusbox.com'
            ],
            'ips': [
              '163.10.5.24',
              '163.10.5.22'
            ]
          }
        }
      };
      let pkiEngine = new EmbeddedPKIEngine();
      let keyCSRPair = await pkiEngine.createCSR(csrParameters, 4096, 'rsa');
      assert.isNotNull(keyCSRPair.key);
      assert.isNotNull(keyCSRPair.csr);
    }).timeout(15000);

    it('should create parse a CSR and return its info', async () => {
      let csr = fs.readFileSync(path.join(__dirname, 'resources/modusbox/hub-tls-client.csr'), 'utf8');
      let csrInfo = await EmbeddedPKIEngine.getCSRInfo(csr);
      assert.equal('hub1.dev.modusbox.com', csrInfo.extensions.subjectAltName.dns[0]);
    }).timeout(15000);
  });

  describe('verify Certs', () => {
    it('should create parse a Cert and return its info', async () => {
      let cert = fs.readFileSync(path.join(__dirname, 'resources/modusbox/hub-tls-client.pem'), 'utf8');
      let certInfo = await EmbeddedPKIEngine.getCertInfo(cert);
      assert.equal('SHA256WithRSA', certInfo.signatureAlgorithm);
    }).timeout(15000);
  });

  describe('verify CAInitialInfo creation', () => {
    it('should fail on a CAInitialInfo with empty names', async () => {
      // This is valid according to the swagger spec:
      // A CSR for a CA doesn't need hosts or names entries to have values
      // Thinking about this, a CA doesn't need hosts nor names, so we could
      // change the swagger api definition to not require a host at all, or even remove these entries for a CA
      // Have to check with the product team before making this change
      let caOptionsDoc = {
        csr: {
          hosts: [],
          names: [],
          key: {
            size: 4096,
            algo: 'rsa'
          }
        }
      };

      let pkiEngine = new EmbeddedPKIEngine();
      try {
        await pkiEngine.createCA(caOptionsDoc);
      } catch (error) {
        assert.isTrue(error instanceof ValidationError, error);
      }
    }).timeout(15000);

    it('should fail on a CAInitialInfo with more than one name', async () => {
      // This is valid according to the swagger spec:
      // A CSR for a CA doesn't need hosts or names entries to have values
      // Thinking about this, a CA doesn't need hosts nor names, so we could
      // change the swagger api definition to not require a host at all, or even remove these entries for a CA
      // Have to check with the product team before making this change
      let caOptionsDoc = {
        csr: {
          hosts: [],
          names: [{ CN: 'test1', O: 'L' }, { CN: 'test2', O: 'L' }],
          key: {
            size: 4096,
            algo: 'rsa'
          }
        }
      };

      let pkiEngine = new EmbeddedPKIEngine();
      try {
        await pkiEngine.createCA(caOptionsDoc);
      } catch (error) {
        assert.isTrue(error instanceof ValidationError, error);
      }
    }).timeout(15000);

    it('should fail on a CAInitialInfo with no CN', async () => {
      // This is valid according to the swagger spec:
      // A CSR for a CA doesn't need hosts or names entries to have values
      // Thinking about this, a CA doesn't need hosts nor names, so we could
      // change the swagger api definition to not require a host at all, or even remove these entries for a CA
      // Have to check with the product team before making this change
      let caOptionsDoc = {
        csr: {
          hosts: [],
          names: [{ O: 'L' }],
          key: {
            size: 4096,
            algo: 'rsa'
          }
        }
      };

      let pkiEngine = new EmbeddedPKIEngine();
      try {
        await pkiEngine.createCA(caOptionsDoc);
      } catch (error) {
        assert.isTrue(error instanceof ValidationError, error);
      }
    }).timeout(15000);
  });
});
