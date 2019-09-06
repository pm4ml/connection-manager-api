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
const assert = require('chai').assert;
const ValidationError = require('../src/errors/ValidationError');
const PkiService = require('../src/service/PkiService');
const fs = require('fs');
const path = require('path');

const rootCert = fs.readFileSync(path.join(__dirname, 'resources/google.com/google.com.pem'), 'utf8');
const intermediateChain = fs.readFileSync(path.join(__dirname, 'resources/google.com/google.chain.pem'), 'utf8');
const amazonRootCert = fs.readFileSync(path.join(__dirname, 'resources/amazon.com/VeriSign-Class-3-Public-Primary-Certification-Authority-G5.pem'), 'utf8');
const amazonIntermediateChain = fs.readFileSync(path.join(__dirname, 'resources/amazon.com/amazon.chain.pem'), 'utf8');

describe('HubCAServiceTest', () => {
  before(async () => {
    await setupTestDB();
  });

  after(async () => {
    await tearDownTestDB();
  });

  describe('input parameters validation', () => {
    let envId = null;

    beforeEach('creating hook Environment', async () => {
      let env = {
        name: 'HUB_TEST_ENV'
      };
      let result = await PkiService.createEnvironment(env);
      assert.property(result, 'id');
      assert.isNotNull(result.id);
      envId = result.id;
    });

    afterEach('tearing down hook CA', async () => {
      await PkiService.deleteEnvironment(envId);
    });

    it('should accept a valid HubCAInput', async () => {
      let body = {
        'rootCertificate': amazonRootCert,
        'intermediateChain': amazonIntermediateChain,
        'name': 'string',
        'type': 'EXTERNAL'
      };
      await HubCAService.createHubCA(envId, body);
    }).timeout(15000);

    it('should not accept an HubCAInput with INTERNAL type', async () => {
      let body = {
        'rootCertificate': rootCert,
        'intermediateChain': intermediateChain,
        'name': 'string',
        'type': 'INTERNAL'
      };
      try {
        await HubCAService.createHubCA(envId, body);
        assert.fail('Should have throw NotFoundError');
      } catch (error) {
        assert.instanceOf(error, ValidationError);
      }
    }).timeout(15000);

    it('should not accept an HubCAInput with no name', async () => {
      let body = {
        'type': 'EXTERNAL'
      };
      try {
        await HubCAService.createHubCA(envId, body);
      } catch (error) {
        assert.instanceOf(error, ValidationError);
      }
    }).timeout(15000);


  });
});
