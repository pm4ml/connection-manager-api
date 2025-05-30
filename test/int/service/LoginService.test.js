
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
      jest.spyOn(Cookies.prototype, 'set').mockImplementation(jest.fn());
      jest.spyOn(jwt, 'decode').mockReturnValue(undefined);
      jest.spyOn(wso2Client, 'getToken').mockResolvedValue(undefined);
      jest.spyOn(wso2TotpClient, 'retrieveSecretKey').mockResolvedValue(undefined);
      jest.spyOn(wso2TotpClient, 'validateTOTP').mockResolvedValue(undefined);
      jest.spyOn(wso2ManagerServiceClient, 'setUserClaimValue').mockResolvedValue(undefined);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });


  describe('loginUser', () => {
    it('should successfully login without 2FA', async () => {
      Constants.OAUTH.AUTH_ENABLED = true;
      Constants.AUTH_2FA.AUTH_2FA_ENABLED = false;

      jwt.decode.mockReturnValue(sampleDecodedToken);
      wso2Client.getToken.mockResolvedValue(sampleToken);

      const result = await LoginService.loginUser(
        mockCtx,
        { username: 'test', password: 'pass' },
        mockReq,
        mockRes
      );
      expect(result.ok).toBe(true);
      expect(result.token.payload).toEqual(expect.objectContaining(sampleDecodedToken));
      expect(Cookies.prototype.set).toHaveBeenCalled();
    });

    it('should handle first login with password reset', async () => {
      const passwordResetToken = { ...sampleDecodedToken, askPassword: 'true', userguid: 'guid123' };
      jwt.decode.mockReturnValue(passwordResetToken);
      wso2Client.getToken.mockResolvedValue(sampleToken);

      const result = await LoginService.loginUser(
        mockCtx,
        { username: 'test', password: 'pass' },
        mockReq,
        mockRes
      );
      expect(result.askPassword).toBe(true);
      expect(result.userguid).toBe('guid123');
    });

    it('should handle 2FA enrolled user', async () => {
      Constants.AUTH_2FA.AUTH_2FA_ENABLED = true;
      const twoFAToken = { ...sampleDecodedToken, '2fa-enrolled': 'true' };
      jwt.decode.mockReturnValue(twoFAToken);
      wso2Client.getToken.mockResolvedValue(sampleToken);

      const result = await LoginService.loginUser(
        mockCtx,
        { username: 'test', password: 'pass' },
        mockReq,
        mockRes
      );
      expect(result.enrolled).toBe(true);
      expect(result['2faEnabled']).toBe(true);
    });

    it('should throw UnauthorizedError on authentication failure', async () => {
      wso2Client.getToken.mockRejectedValue({
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
        expect(error).toBeInstanceOf(UnauthorizedError);
      }
    });
  });

  describe('login2step', () => {
    it('should successfully complete 2FA login', async () => {
      Constants.AUTH_2FA.AUTH_2FA_ENABLED = true;
      const twoFAToken = { ...sampleDecodedToken, '2fa-enrolled': 'true' };
      jwt.decode.mockReturnValue(twoFAToken);
      wso2Client.getToken.mockResolvedValue(sampleToken);
      wso2TotpClient.validateTOTP.mockResolvedValue();

      const result = await LoginService.login2step(
        mockCtx,
        'test',
        'pass',
        '123456',
        mockReq,
        mockRes
      );
      expect(result.ok).toBe(true);
      expect(result.token.payload).toEqual(expect.objectContaining(twoFAToken));
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
        expect(error.message).toEqual('2FA is not enabled');
      }
    });
  });

  describe('logoutUser', () => {
    it('should clear the JWT cookie', async () => {
      await LoginService.logoutUser(mockCtx, mockReq, mockRes);
      expect(Cookies.prototype.set).toHaveBeenCalledWith(
        Constants.OAUTH.JWT_COOKIE_NAME
      ); });
  });

  describe('resetPassword', () => {
    it('should call wso2Client to reset password', async () => {
      jest.spyOn(wso2Client, 'resetPassword').mockResolvedValue();

      await LoginService.resetPassword(mockCtx, 'test', 'newpass', 'guid123');

      expect(wso2Client.resetPassword).toHaveBeenCalledWith('test', 'newpass', 'guid123');
    });
  });
});
