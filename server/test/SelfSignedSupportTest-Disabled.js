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

const Constants = require('../src/constants/Constants');
const Wso2MSClient = require('../src/service/Wso2ManagerServiceClient');
const Wso2Client = require('../src/service/Wso2Client');
const ExternalProcessError = require('../src/errors/ExternalProcessError');
const { createContext, destroyContext } = require('./context');

const { assert } = require('chai');

describe('SelfSignedSupportTest - Disabled', () => {
  if (!process.env.TEST_START_SELF_SIGNED_SERVER) {
    console.log('Not running self-signed tests');
    xit('Not running self-signed tests', async () => {});
    return;
  }

  let server;

  before(() => {
    Constants.AUTH_2FA.WSO2_MANAGER_SERVICE_USER = 'user';
    Constants.AUTH_2FA.WSO2_MANAGER_SERVICE_PASSWORD = 'password';
    Constants.OAUTH.OAUTH2_ISSUER = 'https://localhost:6000';
    Constants.AUTH_2FA.WSO2_MANAGER_SERVICE_URL = 'https://localhost:6000';
    Constants.AUTH_2FA.TOTP_ADMIN_ISSUER = 'https://localhost:6000';
    Constants.OAUTH.RESET_PASSWORD_ISSUER = 'https://localhost:6000';
    Constants.OAUTH.APP_OAUTH_CLIENT_KEY = 'user';
    Constants.OAUTH.APP_OAUTH_CLIENT_SECRET = 'passwd';
    Constants.OAUTH.RESET_PASSWORD_AUTH_USER = 'user';
    Constants.OAUTH.RESET_PASSWORD_AUTH_PASSWORD = 'passwd';

    if (process.env.TEST_START_SELF_SIGNED_SERVER) {
      server = require('./selfSignedHttpsServer/selfSignedHttpsServer').server;
    }
  });

  beforeEach(() => {
  });

  afterEach(() => {
  });

  after(() => {
    if (process.env.TEST_START_SELF_SIGNED_SERVER && server) {
      // HACK not closing it here because it will be closed in the "Enabled" test. after doesn't work with "async" functions
      // server.close();
    }
  });

  it('should fail with SELF_SIGNED_CERT_IN_CHAIN when connecting to a Wso2MSClient self-signed server without a patch', async () => {
    try {
      await Wso2MSClient.getUserClaimValue('johndoe', 'admin');
      assert.fail('Should have raised an Error');
    } catch (error) {
      assert.instanceOf(error, ExternalProcessError);
      assert.equal(error.payload.rootError.code, 'SELF_SIGNED_CERT_IN_CHAIN');
    }
  });

  it('should fail with SELF_SIGNED_CERT_IN_CHAIN when connecting to a Wso2Client self-signed server - getToken', async () => {
    try {
      await Wso2Client.getToken('johndoe', 'admin');
      assert.fail('Should have raised an Error');
    } catch (error) {
      assert.equal(error.error.code, 'SELF_SIGNED_CERT_IN_CHAIN');
    }
  });

  it('should fail with SELF_SIGNED_CERT_IN_CHAIN when connecting to a Wso2Client self-signed server - resetPassword', async () => {
    try {
      await Wso2Client.resetPassword('johndoe', 'admin', '23');
      assert.fail('Should have raised an Error');
    } catch (error) {
      assert.equal(error.error.code, 'SELF_SIGNED_CERT_IN_CHAIN');
    }
  });
});
