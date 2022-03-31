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
const HubCAService = require('../src/service/HubCAService');
// const { assert } = require('chai');
// const ValidationError = require('../src/errors/ValidationError');
// const PkiService = require('../src/service/PkiService');
// const fs = require('fs');
// const path = require('path');
const { pki } = require('node-forge');
const { createContext, destroyContext } = require('./context');

/**
 * Leaving these here as they look useful
*/
// const rootCert = fs.readFileSync(path.join(__dirname, 'resources/google.com/google.com.pem'), 'utf8');
// const intermediateChain = fs.readFileSync(path.join(__dirname, 'resources/google.com/google.chain.pem'), 'utf8');
// const amazonRootCert = fs.readFileSync(path.join(__dirname, 'resources/amazon.com/RootCA.pem'), 'utf8');
// const amazonIntermediateChain = fs.readFileSync(path.join(__dirname, 'resources/amazon.com/amazon.chain.pem'), 'utf8');

const createSelfSignedCA = () => {
  const keys = pki.rsa.generateKeyPair(2048);
  const cert = pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
  const attrs = [{
    name: 'commonName',
    value: 'example.org'
  }, {
    name: 'countryName',
    value: 'US'
  }, {
    shortName: 'ST',
    value: 'Virginia'
  }, {
    name: 'localityName',
    value: 'Blacksburg'
  }, {
    name: 'organizationName',
    value: 'Test'
  }, {
    shortName: 'OU',
    value: 'Test'
  }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.setExtensions([{
    name: 'basicConstraints',
    cA: true
  }, {
    name: 'keyUsage',
    keyCertSign: true,
    digitalSignature: true,
    nonRepudiation: true,
    keyEncipherment: true,
    dataEncipherment: true
  }, {
    name: 'extKeyUsage',
    serverAuth: true,
    clientAuth: true,
    codeSigning: true,
    emailProtection: true,
    timeStamping: true
  }, {
    name: 'nsCertType',
    client: true,
    server: true,
    email: true,
    objsign: true,
    sslCA: true,
    emailCA: true,
    objCA: true
  }, {
    name: 'subjectAltName',
    altNames: [{
      type: 6, // URI
      value: 'http://example.org/webid#me'
    }, {
      type: 7, // IP
      ip: '127.0.0.1'
    }]
  }, {
    name: 'subjectKeyIdentifier'
  }]);

  // self-sign certificate
  cert.sign(keys.privateKey);

  return {
    cert: pki.certificateToPem(cert),
    key: pki.privateKeyToPem(keys.privateKey),
  };
};

describe('HubCAServiceTest', () => {
  let ctx;
  before(async () => {
    await setupTestDB();
    ctx = await createContext();
  });

  after(async () => {
    await tearDownTestDB();
    destroyContext(ctx);
  });

  describe('input parameters validation', () => {
    beforeEach('creating hook Environment', async () => {
    });

    afterEach('tearing down hook CA', async () => {
    });

    it('should create external CA', async () => {
      const { cert, key } = createSelfSignedCA();
      const body = {
        rootCertificate: cert,
        privateKey: key,
        type: 'EXTERNAL',
      };

      await HubCAService.createExternalHubCA(ctx, body);
    }).timeout(15000);

    it('should create internal CA', async () => {
      const body = {
        CN: 'Example CA',
        O: 'Example Company'
      };
      await HubCAService.createInternalHubCA(ctx, body);
    }).timeout(15000);
  });
});
