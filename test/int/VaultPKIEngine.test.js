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

const ValidationError = require('../../src/errors/ValidationError');

const fs = require('fs');
const path = require('path');
const { assert } = require('chai');
const { createContext, destroyContext } = require('./context');

describe('PKIEngine', () => {
  let ctx;
  before(async () => {
    ctx = await createContext();
    await setupTestDB();
  });

  after(async () => {
    await tearDownTestDB();
    destroyContext(ctx);
  });

  describe('verify CSRs', () => {
    it('should validate a CSR key length', async () => {
      const csr = fs.readFileSync(path.join(__dirname, 'resources/modusbox/hub-tls-client.csr'), 'utf8');
      const result = ctx.pkiEngine.verifyCSRKeyLength(csr, 4096);
      assert.isTrue(result.valid);
    });

    it('should validate a CSR algorithm - 512', async () => {
      const csr = fs.readFileSync(path.join(__dirname, 'resources/modusbox/hub-tls-client.csr'), 'utf8');
      // cfssl generates CSRs with sha512
      const result = ctx.pkiEngine.verifyCSRAlgorithm(csr, 'sha512WithRSAEncryption');
      assert.isTrue(result.valid, JSON.stringify(result));
    });

    it('should validate a CSR algorithm - 256', async () => {
      const csr = fs.readFileSync(path.join(__dirname, 'resources/modusbox/hub-tls-client.csr'), 'utf8');
      // cfssl generates CSRs with sha512
      const result = ctx.pkiEngine.verifyCSRAlgorithm(csr, 'sha512WithRSAEncryption');
      assert.isTrue(result.valid, JSON.stringify(result));
    });

    it('should not validate a CSR with short key length', async () => {
      const csr = fs.readFileSync(path.join(__dirname, 'resources/modusbox/hub-tls-client.csr'), 'utf8');
      const result = ctx.pkiEngine.verifyCSRKeyLength(csr, 4097);
      assert.isFalse(result.valid);
    });

    it('should not validate a CSR with a 2048 key length', async () => {
      const csr = fs.readFileSync(path.join(__dirname, 'resources/modusbox/hub-tls-client-2048.csr'), 'utf8');
      const result = ctx.pkiEngine.verifyCSRKeyLength(csr, 4096);
      assert.isFalse(result.valid);
    });

    it('should fail when sent a cert instead of a CSR', async () => {
      const csr = fs.readFileSync(path.join(__dirname, 'resources/modusbox/hub-tls-client.pem'), 'utf8');
      try {
        ctx.pkiEngine.verifyCSRKeyLength(csr, 4096);
        assert.fail('Should not be here');
      } catch (error) {
        assert.isNotNull(error, error);
      }
    });

    it('should create a CSR from valid parameters', async () => {
      const csrParameters = {
        subject: {
          CN: 'dfspendpoint1.test.modusbox.com',
          E: 'connection-manager@modusbox.com',
          O: 'Modusbox',
          OU: 'PKI'
        },
        extensions: {
          subjectAltName: {
            dns: [
              'dfspendpoint1.test.modusbox.com',
              'dfspendpoint2.test.modusbox.com'
            ],
            ips: [
              '163.10.5.24',
              '163.10.5.22'
            ]
          }
        }
      };
      const keyCSRPair = await ctx.pkiEngine.createCSR(csrParameters);
      assert.isNotNull(keyCSRPair.key);
      assert.isNotNull(keyCSRPair.csr);
    }).timeout(15000);

    it('should create parse a CSR and return its info', async () => {
      const csr = fs.readFileSync(path.join(__dirname, 'resources/modusbox/hub-tls-client.csr'), 'utf8');
      const csrInfo = ctx.pkiEngine.getCSRInfo(csr);
      assert.equal('hub1.dev.modusbox.com', csrInfo.extensions.subjectAltName.dns[0]);
    }).timeout(15000);
  });

  describe('verify Certs', () => {
    it('should create parse a Cert and return its info', async () => {
      const cert = fs.readFileSync(path.join(__dirname, 'resources/modusbox/hub-tls-client.pem'), 'utf8');
      const certInfo = ctx.pkiEngine.getCertInfo(cert);
      assert.equal('sha256WithRSAEncryption', certInfo.signatureAlgorithm);
    }).timeout(15000);
  });

  describe('verify CAInitialInfo creation', () => {
    it('should fail on a CAInitialInfo with empty names', async () => {
      // This is valid according to the swagger spec:
      // A CSR for a CA doesn't need hosts or names entries to have values
      // Thinking about this, a CA doesn't need hosts nor names, so we could
      // change the swagger api definition to not require a host at all, or even remove these entries for a CA
      // Have to check with the product team before making this change
      const caOptionsDoc = {

      };

      try {
        await ctx.pkiEngine.createCA(caOptionsDoc);
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
      const caOptionsDoc = { O: 'L' };

      try {
        await ctx.pkiEngine.createCA(caOptionsDoc);
      } catch (error) {
        assert.isTrue(error instanceof ValidationError, error);
      }
    }).timeout(15000);

    it('should create CA with ttl passed', async () => {
      const caOptionsDoc = {
        CN: 'Test CA',
        O: 'L'
      };

      try {
        await ctx.pkiEngine.createCA(caOptionsDoc, '1h');
        assert.ok('Created CA with ttl');
      } catch (error) {
        assert.fail('Should not be here');
      }
    }).timeout(15000);
  });
});
