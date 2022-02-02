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

const Wso2TotpClient = require('../src/service/Wso2TotpClient');
const { assert } = require('chai');
const rp = require('request-promise-native');
const sinon = require('sinon');
const xml2js = require('xml2js');
const { createContext, destroyContext } = require('./context');

describe('TOTP admin server client', () => {
  it('should return a secret key when valid credentials', async () => {
    const obj = {
      'ns:retrieveSecretKeyResponse':
            {
              $:
                    { 'xmlns:ns': 'http://services.totp.authenticator.application.identity.carbon.wso2.org' },
              'ns:return': ['XXX']
            }
    };
    const builder = new xml2js.Builder();
    const xml = builder.buildObject(obj);

    const stub = sinon.stub(rp, 'Request');
    stub.resolves(xml);
    const response = await Wso2TotpClient.retrieveSecretKey('validuser');
    assert.equal(response, 'XXX');
  });
});
