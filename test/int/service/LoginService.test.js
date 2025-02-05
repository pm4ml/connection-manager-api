const { expect } = require('chai');
const sinon = require('sinon');
const jwt = require('jsonwebtoken');
const Cookies = require('cookies');
const LoginService = require('../../../src/service/LoginService');
const wso2Client = require('../../../src/service/Wso2Client');
const wso2TotpClient = require('../../../src/service/Wso2TotpClient');
const wso2ManagerServiceClient = require('../../../src/service/Wso2ManagerServiceClient');
const UnauthorizedError = require('../../../src/errors/UnauthorizedError');
const Constants = require('../../../src/constants/Constants');

describe('LoginService', () => {
  let sandbox;
  const mockReq = {};
  const mockRes = {};
  const mockCtx = {};

  const sampleToken = {
    id_token: 'sample.jwt.token',
    access_token: 'sample_access_token'
  };

  const sampleDecodedToken = {
    at_hash: 'hash',
    aud: 'audience',
    sub: 'subject',
    groups: ['Application/DFSP:testDFSP'],
    dfspId: null
  };

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(Cookies.prototype, 'set');
    sandbox.stub(jwt, 'decode');
    sandbox.stub(wso2Client, 'getToken');
    sandbox.stub(wso2TotpClient, 'retrieveSecretKey');
    sandbox.stub(wso2TotpClient, 'validateTOTP');
    sandbox.stub(wso2ManagerServiceClient, 'setUserClaimValue');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('loginUser', () => {
    it('should successfully login without 2FA', async () => {
      Constants.OAUTH.AUTH_ENABLED = true;
      Constants.AUTH_2FA.AUTH_2FA_ENABLED = false;
      
      jwt.decode.returns(sampleDecodedToken);
      wso2Client.getToken.resolves(sampleToken);

      const result = await LoginService.loginUser(
        mockCtx,
        { username: 'test', password: 'pass' },
        mockReq,
        mockRes
      );

      expect(result.ok).to.be.true;
      expect(result.token.payload).to.deep.include(sampleDecodedToken);
      expect(Cookies.prototype.set.calledOnce).to.be.true;
    });

    it('should handle first login with password reset', async () => {
      const passwordResetToken = { ...sampleDecodedToken, askPassword: 'true', userguid: 'guid123' };
      jwt.decode.returns(passwordResetToken);
      wso2Client.getToken.resolves(sampleToken);

      const result = await LoginService.loginUser(
        mockCtx,
        { username: 'test', password: 'pass' },
        mockReq,
        mockRes
      );

      expect(result.askPassword).to.be.true;
      expect(result.userguid).to.equal('guid123');
    });

    it('should handle 2FA enrolled user', async () => {
      Constants.AUTH_2FA.AUTH_2FA_ENABLED = true;
      const twoFAToken = { ...sampleDecodedToken, '2fa-enrolled': 'true' };
      jwt.decode.returns(twoFAToken);
      wso2Client.getToken.resolves(sampleToken);

      const result = await LoginService.loginUser(
        mockCtx,
        { username: 'test', password: 'pass' },
        mockReq,
        mockRes
      );

      expect(result.enrolled).to.be.true;
      expect(result['2faEnabled']).to.be.true;
    });

    it('should throw UnauthorizedError on authentication failure', async () => {
      wso2Client.getToken.rejects({ 
        statusCode: 400, 
        message: 'Authentication failed'
      });

      try {
        await LoginService.loginUser(
          mockCtx,
          { username: 'test', password: 'wrong' },
          mockReq,
          mockRes
        );
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).to.be.instanceOf(UnauthorizedError);
      }
    });
  });

  describe('login2step', () => {
    it('should successfully complete 2FA login', async () => {
      Constants.AUTH_2FA.AUTH_2FA_ENABLED = true;
      const twoFAToken = { ...sampleDecodedToken, '2fa-enrolled': 'true' };
      jwt.decode.returns(twoFAToken);
      wso2Client.getToken.resolves(sampleToken);
      wso2TotpClient.validateTOTP.resolves();

      const result = await LoginService.login2step(
        mockCtx,
        'test',
        'pass',
        '123456',
        mockReq,
        mockRes
      );

      expect(result.ok).to.be.true;
      expect(result.token.payload).to.deep.include(twoFAToken);
    });

    it('should throw error when 2FA is disabled', async () => {
      Constants.AUTH_2FA.AUTH_2FA_ENABLED = false;

      try {
        await LoginService.login2step(
          mockCtx,
          'test',
          'pass',
          '123456',
          mockReq,
          mockRes
        );
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.equal('2FA is not enabled');
      }
    });
  });

  describe('logoutUser', () => {
    it('should clear the JWT cookie', async () => {
      await LoginService.logoutUser(mockCtx, mockReq, mockRes);
      expect(Cookies.prototype.set.calledWith(Constants.OAUTH.JWT_COOKIE_NAME)).to.be.true;
    });
  });

  describe('resetPassword', () => {
    it('should call wso2Client to reset password', async () => {
      sandbox.stub(wso2Client, 'resetPassword').resolves();
      
      await LoginService.resetPassword(mockCtx, 'test', 'newpass', 'guid123');
      
      expect(wso2Client.resetPassword.calledWith('test', 'newpass', 'guid123')).to.be.true;
    });
  });
});