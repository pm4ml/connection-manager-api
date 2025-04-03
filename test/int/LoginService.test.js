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

const LoginService = require('../../src/service/LoginService');
const Constants = require('../../src/constants/Constants');
const Wso2TotpClient = require('../../src/service/Wso2TotpClient');
const Wso2MSClient = require('../../src/service/Wso2ManagerServiceClient');
const Wso2Client = require('../../src/service/Wso2Client');
const BadRequestError = require('../../src/errors/BadRequestError');
const UnauthorizedError = require('../../src/errors/UnauthorizedError');
const ExternalProcessError = require('../../src/errors/ExternalProcessError');
const { createContext, destroyContext } = require('./context');

const { assert } = require('chai');
const sinon = require('sinon');

describe('first login', () => {
  let wso2ClientTokenMock;
  let ctx;

  before(async () => {
    ctx = await createContext();
    wso2ClientTokenMock = sinon.stub(Wso2Client, 'getToken');
  });

  after(() => {
    destroyContext(ctx);
    wso2ClientTokenMock.restore();
  });

  it('should return first time login flag and userguid', async () => {
    const loginResponseObj = {
      access_token: 'XXXX',
      id_token: 'eyJ4NXQiOiJOVEF4Wm1NeE5ETXlaRGczTVRVMVpHTTBNekV6T0RKaFpXSTRORE5sWkRVMU9HRmtOakZpTVEiLCJraWQiOiJOVEF4Wm1NeE5ETXlaRGczTVRVMVpHTTBNekV6T0RKaFpXSTRORE5sWkRVMU9HRmtOakZpTVEiLCJhbGciOiJIUzUxMiJ9.eyJhdF9oYXNoIjoidFMzdkRvb1NkQmtaWkt1d2VCcGtGUSIsImFza1Bhc3N3b3JkIjoidHJ1ZSIsImF1ZCI6InBraV9hZG1pbl9wb3J0YWxfZGV2X3BraSIsInN1YiI6ImdyZWcxIiwidXNlcmd1aWQiOiI2MjQ5MWUxNi03ZDRiLTQ1MDQtOTc1YS0wMzEzYzEzMjA5NGYiLCJuYmYiOjE1Njc3Njc5OTQsImF6cCI6InBraV9hZG1pbl9wb3J0YWxfZGV2X3BraSIsImFtciI6WyJwYXNzd29yZCJdLCJpc3MiOiJodHRwczovL2RldmludDF3c28yaXNrbS5jYXNhaHViLmxpdmU6OTQ0My9vYXV0aDIvdG9rZW4iLCJncm91cHMiOiJJbnRlcm5hbC9ldmVyeW9uZSIsImV4cCI6MTU2Nzc3MTU5NCwiaWF0IjoxNTY3NzY3OTk0fQ._5bwdqhh07oyvw2gDDE8sFNbM7Gy6Cd0ohavWPUsGvIPxOcM_OcWWW0MjD59r15dtUwHlAAR8JqMjemjQ0SJxQ'
    };

    wso2ClientTokenMock.callsFake(() => loginResponseObj);

    Constants.OAUTH.AUTH_ENABLED = true;

    const response = await LoginService.loginUser(ctx, { username: 'user1', password: 'password1' });

    assert.strictEqual(response.askPassword, true, 'Returning first time flag');
  });

  it('should return JWT token payload when AUTH_ENABLED is false', async () => {
    Constants.OAUTH.AUTH_ENABLED = false;

    const response = await LoginService.loginUser(ctx, { username: 'user1', password: 'password1' });

    assert.strictEqual(response.ok, false);
    assert.isObject(response.token.payload);
  });

  it('should throw UnauthorizedError when getToken fails', async () => {
    Constants.OAUTH.AUTH_ENABLED = true;
    wso2ClientTokenMock.callsFake(() => { throw new UnauthorizedError(''); });

    try {
      await LoginService.loginUser(ctx, { username: 'user1', password: 'password1' });
      assert.fail('Should have thrown UnauthorizedError');
    } catch (error) {
      assert.instanceOf(error, UnauthorizedError);
    }
  });

  it('should return 2FA response when AUTH_2FA_ENABLED is true and user is enrolled', async () => {
    Constants.OAUTH.AUTH_ENABLED = true;
    Constants.AUTH_2FA.AUTH_2FA_ENABLED = true;
    const loginResponseObj = {
      access_token: 'XXXX',
      id_token: 'eyJ4NXQiOiJOVEF4Wm1NeE5ETXlaRGczTVRVMVpHTTBNekV6T0RKaFpXSTRORE5sWkRVMU9HRmtOakZpTVEiLCJraWQiOiJOVEF4Wm1NeE5ETXlaRGczTVRVMVpHTTBNekV6T0RKaFpXSTRORE5sWkRVMU9HRmtOakZpTVEiLCJhbGciOiJIUzUxMiJ9.eyJhdF9oYXNoIjoidFMzdkRvb1NkQmtaWkt1d2VCcGtGUSIsImVucm9sbGVkIjoiZmFsc2UiLCJhdWQiOiJwa2lfYWRtaW5fcG9ydGFsX2Rldl9wa2kiLCJzdWIiOiJncmVnMSIsInVzZXJndWlkIjoiNjI0OTFlMTYtN2Q0Yi00NTA0LTk3NWEtMDMxM2MxMzIwOTRmIiwibmJmIjoxNTY3NzY3OTk0LCJhenAiOiJwa2lfYWRtaW5fcG9ydGFsX2Rldl9wa2kiLCJhbXIiOlsicGFzc3dvcmQiXSwiaXNzIjoiaHR0cHM6Ly9kZXZpbnQxd3NvMmlza20uY2FzYWh1Yi5saXZlOjk0NDMvb2F1dGgyL3Rva2VuIiwiZ3JvdXBzIjoiSW50ZXJuYWwvZXZlcnlvbmUiLCJleHAiOjE1Njc3NzE1OTQsImlhdCI6MTU2Nzc2Nzk5NH0._5bwdqhh07oyvw2gDDE8sFNbM7Gy6Cd0ohavWPUsGvIPxOcM_OcWWW0MjD59r15dtUwHlAAR8JqMjemjQ0SJxQ'
    };
    wso2ClientTokenMock.callsFake(() => loginResponseObj);

    const response = await LoginService.loginUser(ctx, { username: 'user1', password: 'password1' });

    assert.strictEqual(response.enrolled, false);
    assert.strictEqual(response['2faEnabled'], true);
  });
});

describe('2step', () => {
  let wso2ClientTokenMock;
  let wso2TotpClientMock;
  let wso2MSClientMock;
  let ctx;

  before(async () => {
    ctx = await createContext();
    wso2ClientTokenMock = sinon.stub(Wso2Client, 'getToken');
    wso2MSClientMock = sinon.stub(Wso2MSClient, 'setUserClaimValue');
    wso2TotpClientMock = sinon.stub(Wso2TotpClient, 'validateTOTP');
  });

  after(() => {
    wso2ClientTokenMock.restore();
    wso2MSClientMock.restore();
    wso2TotpClientMock.restore();
    sinon.restore();
    destroyContext(ctx);
  });

  it('should return a bad request error when AUTH_2FA_ENABLED is set to false', async () => {
    Constants.AUTH_2FA.AUTH_2FA_ENABLED = false;

    try {
      await LoginService.login2step(ctx, 'user1', 'pass1', 123456);
      assert.fail('Should have thrown BadRequestError');
    } catch (error) {
      assert.instanceOf(error, BadRequestError);
    }
  });

  it('should return an UnauthorizedError when retrieving token to WSO2 server gives an error', async () => {
    Constants.AUTH_2FA.AUTH_2FA_ENABLED = true;
    wso2ClientTokenMock.callsFake(() => { throw new UnauthorizedError(''); });

    try {
      await LoginService.login2step(ctx, 'user1', 'pass1', 123456);
      assert.fail('Should have thrown UnauthorizedError');
    } catch (error) {
      assert.instanceOf(error, UnauthorizedError);
    }
  });

  it('should return UnauthorizedError when trying to validateTotp with invalid parameters', async () => {
    Constants.AUTH_2FA.AUTH_2FA_ENABLED = true;
    const loginResponseObj = {
      access_token: 'XXXX',
      id_token: 'eyJ4NXQiOiJOVEF4Wm1NeE5ETXlaRGczTVRVMVpHTTBNekV6T0RKaFpXSTRORE5sWkRVMU9HRmtOakZpTVEiLCJhbGciOiJSUzI1NiJ9.eyJhdF9oYXNoIjoiWW91Y3c4dmpxdzFNeTdxb0d5dzd5QSIsImF1ZCI6InBraV9hZG1pbl9wb3J0YWxfZGV2X3BraSIsInN1YiI6Ik1UTkJNb2JpbGVNb25leV9hZG1pbiIsIm5iZiI6MTU2NTI5NDc5MSwiYXpwIjoicGtpX2FkbWluX3BvcnRhbF9kZXZfcGtpIiwiYW1yIjpbInBhc3N3b3JkIl0sImlzcyI6Imh0dHBzOlwvXC9kZXZpbnQxd3NvMmlza20uY2FzYWh1Yi5saXZlOjk0NDNcL29hdXRoMlwvdG9rZW4iLCJncm91cHMiOlsiQXBwbGljYXRpb25cL01UQSIsIkFwcGxpY2F0aW9uXC9ERlNQOk1UTkJNb2JpbGVNb25leSIsIkludGVybmFsXC9ldmVyeW9uZSJdLCJleHAiOjE1NjUyOTgzOTEsImlhdCI6MTU2NTI5NDc5MX0.c4ytKGi32h1fIHkuycr2-QQP5KEWX237SpHEixbtEzydW3LA0DTqoOwTWGV1sL9XnqrAMbR6wAONQiAVsmrzyyaLCyAFpA5waqztDsMMj-6UIHAWjea13SOTNTjjU6H8B6ooP1Q9RjGM_BP-s-vtN9BS_28HniGo7XOH0Z-uHy29U7xlzM7gq1w8mb3km40t7nnaIDnuCnmDqyvmPRUtVazPUJkRxHePUfunZo_u4XYcgv-8uIhJkcfIu0Rk-NIsqjFLxF5wcC3iusXlhpQmJwPJdXtS00NgzuHBh5L3CfEGCQlRHa-KZ7MYAlpq0WN9Ww_qCf-w6sMKgnYceipUmQ'
    };
    wso2ClientTokenMock.callsFake(() => loginResponseObj);
    wso2TotpClientMock.callsFake(() => { throw new UnauthorizedError(''); });

    try {
      await LoginService.login2step(ctx, 'user1', 'pass1', 123456);
      assert.fail('Should have thrown UnauthorizedError');
    } catch (error) {
      assert.instanceOf(error, UnauthorizedError);
    }
  });

  it('should return error when setEnrolled call to WSO2 server fails', async () => {
    Constants.AUTH_2FA.AUTH_2FA_ENABLED = true;
    const loginResponseObj = {
      access_token: 'XXXX',
      id_token: 'eyJ4NXQiOiJOVEF4Wm1NeE5ETXlaRGczTVRVMVpHTTBNekV6T0RKaFpXSTRORE5sWkRVMU9HRmtOakZpTVEiLCJhbGciOiJSUzI1NiJ9.eyJhdF9oYXNoIjoiWW91Y3c4dmpxdzFNeTdxb0d5dzd5QSIsImF1ZCI6InBraV9hZG1pbl9wb3J0YWxfZGV2X3BraSIsInN1YiI6Ik1UTkJNb2JpbGVNb25leV9hZG1pbiIsIm5iZiI6MTU2NTI5NDc5MSwiYXpwIjoicGtpX2FkbWluX3BvcnRhbF9kZXZfcGtpIiwiYW1yIjpbInBhc3N3b3JkIl0sImlzcyI6Imh0dHBzOlwvXC9kZXZpbnQxd3NvMmlza20uY2FzYWh1Yi5saXZlOjk0NDNcL29hdXRoMlwvdG9rZW4iLCJncm91cHMiOlsiQXBwbGljYXRpb25cL01UQSIsIkFwcGxpY2F0aW9uXC9ERlNQOk1UTkJNb2JpbGVNb25leSIsIkludGVybmFsXC9ldmVyeW9uZSJdLCJleHAiOjE1NjUyOTgzOTEsImlhdCI6MTU2NTI5NDc5MX0.c4ytKGi32h1fIHkuycr2-QQP5KEWX237SpHEixbtEzydW3LA0DTqoOwTWGV1sL9XnqrAMbR6wAONQiAVsmrzyyaLCyAFpA5waqztDsMMj-6UIHAWjea13SOTNTjjU6H8B6ooP1Q9RjGM_BP-s-vtN9BS_28HniGo7XOH0Z-uHy29U7xlzM7gq1w8mb3km40t7nnaIDnuCnmDqyvmPRUtVazPUJkRxHePUfunZo_u4XYcgv-8uIhJkcfIu0Rk-NIsqjFLxF5wcC3iusXlhpQmJwPJdXtS00NgzuHBh5L3CfEGCQlRHa-KZ7MYAlpq0WN9Ww_qCf-w6sMKgnYceipUmQ'
    };
    wso2ClientTokenMock.callsFake(() => loginResponseObj);
    wso2TotpClientMock.callsFake(() => true);
    wso2MSClientMock.callsFake(() => { throw new ExternalProcessError(''); });

    try {
      await LoginService.login2step(ctx, 'user1', 'pass1', 123456);
      assert.fail('Should have thrown ExternalProcessError');
    } catch (error) {
      assert.instanceOf(error, ExternalProcessError);
    }
  });
});

describe('change password', () => {
  const testUser = {
    username: 'username1',
    currentPassword: 'XXX',
    newPassword: 'ZZZ',
    userguid: '93f0b639-2d7e-4e99-84d0-eeff58c48283'
  };

  let ctx;

  before(async () => {
    ctx = await createContext();
  });

  after(() => {
    destroyContext(ctx);
  });

  it('should call WSO2 change password endpoint once', async () => {
    const wso2ClientPasswordMock = sinon.mock(Wso2Client)
      .expects('resetPassword')
      .withExactArgs(testUser.username, testUser.newPassword, testUser.userguid)
      .returns({});

    await LoginService.resetPassword(ctx, testUser.username, testUser.newPassword, testUser.userguid);

    wso2ClientPasswordMock.verify();
    sinon.restore();
  });

  it('should return error when WSO2 returns invalid password', async () => {
    try {
      sinon.mock(Wso2Client).expects('resetPassword').throws(new UnauthorizedError('Unauthorized'));

      await LoginService.resetPassword(ctx, testUser.username, testUser.newPassword, testUser.userguid);
      assert.fail('Should return an error from WSO2');
    } catch (error) {
      assert.instanceOf(error, UnauthorizedError);
      sinon.restore();
    }
  });
});

describe('logout', () => {
  let ctx;
  let req;
  let res;
  
  beforeEach(async () => {
    ctx = await createContext();
    req = {};
    res = {};
  });

  afterEach(() => {
    destroyContext(ctx);
  });

  it('should clear the JWT cookie', async () => {
    const cookiesStub = sinon.stub(Cookies.prototype, 'set');
    
    await LoginService.logoutUser(ctx, req, res);
    
    assert.isTrue(cookiesStub.calledOnce);
    assert.isTrue(cookiesStub.calledWith(Constants.OAUTH.JWT_COOKIE_NAME));
    
    cookiesStub.restore();
  });
});

describe('loginUser additional scenarios', () => {
  let ctx;
  let req;
  let res;
  let wso2ClientTokenMock;

  beforeEach(async () => {
    ctx = await createContext();
    req = {};
    res = {};
    wso2ClientTokenMock = sinon.stub(Wso2Client, 'getToken');
  });

  afterEach(() => {
    destroyContext(ctx);
    wso2ClientTokenMock.restore();
    sinon.restore();
  });

  it('should handle 2FA enrolled user login correctly', async () => {
    Constants.OAUTH.AUTH_ENABLED = true;
    Constants.AUTH_2FA.AUTH_2FA_ENABLED = true;
    
    const loginResponseObj = {
      access_token: 'test-token',
      id_token: 'eyJ4NXQiOiJOVEF4Wm1NeE5ETXlaRGczTVRVMVpHTTBNekV6T0RKaFpXSTRORE5sWkRVMU9HRmtOakZpTVEiLCJraWQiOiJOVEF4Wm1NeE5ETXlaRGczTVRVMVpHTTBNekV6T0RKaFpXSTRORE5sWkRVMU9HRmtOakZpTVEiLCJhbGciOiJIUzUxMiJ9.eyJhdF9oYXNoIjoidFMzdkRvb1NkQmtaWkt1d2VCcGtGUSIsImVucm9sbGVkIjoiZmFsc2UiLCJhdWQiOiJwa2lfYWRtaW5fcG9ydGFsX2Rldl9wa2kiLCJzdWIiOiJncmVnMSIsInVzZXJndWlkIjoiNjI0OTFlMTYtN2Q0Yi00NTA0LTk3NWEtMDMxM2MxMzIwOTRmIiwibmJmIjoxNTY3NzY3OTk0LCJhenAiOiJwa2lfYWRtaW5fcG9ydGFsX2Rldl9wa2kiLCJhbXIiOlsicGFzc3dvcmQiXSwiaXNzIjoiaHR0cHM6Ly9kZXZpbnQxd3NvMmlza20uY2FzYWh1Yi5saXZlOjk0NDMvb2F1dGgyL3Rva2VuIiwiZ3JvdXBzIjoiSW50ZXJuYWwvZXZlcnlvbmUiLCJleHAiOjE1Njc3NzE1OTQsImlhdCI6MTU2Nzc2Nzk5NCwiMmZhLWVucm9sbGVkIjoidHJ1ZSJ9'
    };
    
    wso2ClientTokenMock.returns(loginResponseObj);
    
    const response = await LoginService.loginUser(ctx, { username: 'user1', password: 'pass1' }, req, res);
    
    assert.strictEqual(response.enrolled, true);
    assert.strictEqual(response['2faEnabled'], true);
  });

  it('should extract DFSP ID from groups when not directly provided', async () => {
    Constants.OAUTH.AUTH_ENABLED = true;
    Constants.AUTH_2FA.AUTH_2FA_ENABLED = false;
    
    const loginResponseObj = {
      access_token: 'test-token',
      id_token: 'eyJ4NXQiOiJOVEF4Wm1NeE5ETXlaRGczTVRVMVpHTTBNekV6T0RKaFpXSTRORE5sWkRVMU9HRmtOakZpTVEiLCJraWQiOiJOVEF4Wm1NeE5ETXlaRGczTVRVMVpHTTBNekV6T0RKaFpXSTRORE5sWkRVMU9HRmtOakZpTVEiLCJhbGciOiJIUzUxMiJ9.eyJhdF9oYXNoIjoidFMzdkRvb1NkQmtaWkt1d2VCcGtGUSIsImF1ZCI6InBraV9hZG1pbl9wb3J0YWxfZGV2X3BraSIsInN1YiI6ImdyZWcxIiwidXNlcmd1aWQiOiI2MjQ5MWUxNi03ZDRiLTQ1MDQtOTc1YS0wMzEzYzEzMjA5NGYiLCJuYmYiOjE1Njc3Njc5OTQsImF6cCI6InBraV9hZG1pbl9wb3J0YWxfZGV2X3BraSIsImFtciI6WyJwYXNzd29yZCJdLCJpc3MiOiJodHRwczovL2RldmludDF3c28yaXNrbS5jYXNhaHViLmxpdmU6OTQ0My9vYXV0aDIvdG9rZW4iLCJncm91cHMiOlsiQXBwbGljYXRpb24vREZTUDp0ZXN0REZTUCIsIkludGVybmFsL2V2ZXJ5b25lIl0sImV4cCI6MTU2Nzc3MTU5NCwiaWF0IjoxNTY3NzY3OTk0fQ'
    };
    
    wso2ClientTokenMock.returns(loginResponseObj);
    
    const cookiesStub = sinon.stub(Cookies.prototype, 'set');
    const response = await LoginService.loginUser(ctx, { username: 'user1', password: 'pass1' }, req, res);
    
    assert.strictEqual(response.token.payload.dfspId, 'testDFSP');
    assert.isTrue(cookiesStub.calledOnce);
    assert.isTrue(cookiesStub.calledWith(
      Constants.OAUTH.JWT_COOKIE_NAME,
      'test-token',
      { maxAge: 3600000, httpOnly: true, sameSite: 'strict' }
    ));
  });

  it('should handle non-enrolled 2FA user login correctly', async () => {
    Constants.OAUTH.AUTH_ENABLED = true;
    Constants.AUTH_2FA.AUTH_2FA_ENABLED = true;
    
    const sharedSecret = 'TEST_SECRET_KEY';
    const wso2TotpClientMock = sinon.stub(Wso2TotpClient, 'retrieveSecretKey').returns(sharedSecret);
    
    const loginResponseObj = {
      access_token: 'test-token',
      id_token: 'eyJ4NXQiOiJOVEF4Wm1NeE5ETXlaRGczTVRVMVpHTTBNekV6T0RKaFpXSTRORE5sWkRVMU9HRmtOakZpTVEiLCJraWQiOiJOVEF4Wm1NeE5ETXlaRGczTVRVMVpHTTBNekV6T0RKaFpXSTRORE5sWkRVMU9HRmtOakZpTVEiLCJhbGciOiJIUzUxMiJ9.eyJhdF9oYXNoIjoidFMzdkRvb1NkQmtaWkt1d2VCcGtGUSIsImF1ZCI6InBraV9hZG1pbl9wb3J0YWxfZGV2X3BraSIsInN1YiI6ImdyZWcxIiwidXNlcmd1aWQiOiI2MjQ5MWUxNi03ZDRiLTQ1MDQtOTc1YS0wMzEzYzEzMjA5NGYiLCJuYmYiOjE1Njc3Njc5OTQsImF6cCI6InBraV9hZG1pbl9wb3J0YWxfZGV2X3BraSIsImFtciI6WyJwYXNzd29yZCJdLCJpc3MiOiJodHRwczovL2RldmludDF3c28yaXNrbS5jYXNhaHViLmxpdmU6OTQ0My9vYXV0aDIvdG9rZW4iLCJncm91cHMiOiJJbnRlcm5hbC9ldmVyeW9uZSIsImV4cCI6MTU2Nzc3MTU5NCwiaWF0IjoxNTY3NzY3OTk0LCIyZmEtZW5yb2xsZWQiOiJmYWxzZSJ9'
    };
    
    wso2ClientTokenMock.returns(loginResponseObj);
    
    const response = await LoginService.loginUser(ctx, { username: 'user1', password: 'pass1' }, req, res);
    
    assert.strictEqual(response.enrolled, false);
    assert.strictEqual(response['2faEnabled'], true);
    assert.strictEqual(response.sharedSecret, sharedSecret);
    assert.strictEqual(response.issuer, Constants.AUTH_2FA.TOTP_ISSUER);
    assert.strictEqual(response.label, Constants.AUTH_2FA.TOTP_LABEL);
    
    wso2TotpClientMock.restore();
  });

  it('should handle multiple DFSP groups and use the first one', async () => {
    Constants.OAUTH.AUTH_ENABLED = true;
    Constants.AUTH_2FA.AUTH_2FA_ENABLED = false;
    
    const loginResponseObj = {
      access_token: 'test-token',
      id_token: 'eyJ4NXQiOiJOVEF4Wm1NeE5ETXlaRGczTVRVMVpHTTBNekV6T0RKaFpXSTRORE5sWkRVMU9HRmtOakZpTVEiLCJraWQiOiJOVEF4Wm1NeE5ETXlaRGczTVRVMVpHTTBNekV6T0RKaFpXSTRORE5sWkRVMU9HRmtOakZpTVEiLCJhbGciOiJIUzUxMiJ9.eyJhdF9oYXNoIjoidFMzdkRvb1NkQmtaWkt1d2VCcGtGUSIsImF1ZCI6InBraV9hZG1pbl9wb3J0YWxfZGV2X3BraSIsInN1YiI6ImdyZWcxIiwidXNlcmd1aWQiOiI2MjQ5MWUxNi03ZDRiLTQ1MDQtOTc1YS0wMzEzYzEzMjA5NGYiLCJuYmYiOjE1Njc3Njc5OTQsImF6cCI6InBraV9hZG1pbl9wb3J0YWxfZGV2X3BraSIsImFtciI6WyJwYXNzd29yZCJdLCJpc3MiOiJodHRwczovL2RldmludDF3c28yaXNrbS5jYXNhaHViLmxpdmU6OTQ0My9vYXV0aDIvdG9rZW4iLCJncm91cHMiOlsiQXBwbGljYXRpb24vREZTUDpmaXJzdERGU1AiLCJBcHBsaWNhdGlvbi9ERlNQOnNlY29uZERGU1AiLCJJbnRlcm5hbC9ldmVyeW9uZSJdLCJleHAiOjE1Njc3NzE1OTQsImlhdCI6MTU2Nzc2Nzk5NH0'
    };
    
    wso2ClientTokenMock.returns(loginResponseObj);
    
    const cookiesStub = sinon.stub(Cookies.prototype, 'set');
    const response = await LoginService.loginUser(ctx, { username: 'user1', password: 'pass1' }, req, res);
    
    assert.strictEqual(response.token.payload.dfspId, 'firstDFSP');
    cookiesStub.restore();
  });

  it('should handle direct dfspId in token payload', async () => {
    Constants.OAUTH.AUTH_ENABLED = true;
    Constants.AUTH_2FA.AUTH_2FA_ENABLED = false;
    
    const loginResponseObj = {
      access_token: 'test-token',
      id_token: 'eyJ4NXQiOiJOVEF4Wm1NeE5ETXlaRGczTVRVMVpHTTBNekV6T0RKaFpXSTRORE5sWkRVMU9HRmtOakZpTVEiLCJraWQiOiJOVEF4Wm1NeE5ETXlaRGczTVRVMVpHTTBNekV6T0RKaFpXSTRORE5sWkRVMU9HRmtOakZpTVEiLCJhbGciOiJIUzUxMiJ9.eyJhdF9oYXNoIjoidFMzdkRvb1NkQmtaWkt1d2VCcGtGUSIsImF1ZCI6InBraV9hZG1pbl9wb3J0YWxfZGV2X3BraSIsInN1YiI6ImdyZWcxIiwidXNlcmd1aWQiOiI2MjQ5MWUxNi03ZDRiLTQ1MDQtOTc1YS0wMzEzYzEzMjA5NGYiLCJuYmYiOjE1Njc3Njc5OTQsImF6cCI6InBraV9hZG1pbl9wb3J0YWxfZGV2X3BraSIsImFtciI6WyJwYXNzd29yZCJdLCJpc3MiOiJodHRwczovL2RldmludDF3c28yaXNrbS5jYXNhaHViLmxpdmU6OTQ0My9vYXV0aDIvdG9rZW4iLCJncm91cHMiOlsiSW50ZXJuYWwvZXZlcnlvbmUiXSwiZGZzcElkIjoiZGlyZWN0REZTUCIsImV4cCI6MTU2Nzc3MTU5NCwiaWF0IjoxNTY3NzY3OTk0fQ'
    };
    
    wso2ClientTokenMock.returns(loginResponseObj);
    
    const cookiesStub = sinon.stub(Cookies.prototype, 'set');
    const response = await LoginService.loginUser(ctx, { username: 'user1', password: 'pass1' }, req, res);
    
    assert.strictEqual(response.token.payload.dfspId, 'directDFSP');
    cookiesStub.restore();
  });
});
