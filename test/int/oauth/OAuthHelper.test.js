const chai = require('chai');
const sinon = require('sinon');
const fs = require('fs');
const path = require('path');
const passport = require('passport');
const Cookies = require('cookies');
const PkiService = require('../../../src//service/PkiService');
const Constants = require('../../../src/constants/Constants');
const { createJwtStrategy, createOAuth2Handler } = require('../../../src/oauth/OAuthHelper');

const { expect } = chai;

describe('OAuthHelper', () => {
  let sandbox;
  const MOCK_CERT = '-----BEGIN CERTIFICATE-----\nMOCK_CERT\n-----END CERTIFICATE-----';

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    // Reset Constants to default test values
    Constants.OAUTH = {
      JWT_COOKIE_NAME: 'jwt_token',
      APP_OAUTH_CLIENT_KEY: 'test_client',
      OAUTH2_ISSUER: 'https://test.issuer',
      OAUTH2_TOKEN_ISS: 'https://test.token.issuer',
      MTA_ROLE: 'MTA_ROLE',
      PTA_ROLE: 'PTA_ROLE',
      EVERYONE_ROLE: 'EVERYONE_ROLE'
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('cookieExtractor', () => {
    it('should extract JWT token from cookies', () => {
      const mockReq = {};
      const mockToken = 'test.jwt.token';
      const getCookieStub = sandbox.stub().returns(mockToken);
      sandbox.stub(Cookies.prototype, 'get').callsFake(getCookieStub);

      const strategy = createJwtStrategy();
      const token = strategy._jwtFromRequest(mockReq);

      expect(token).to.equal(mockToken);
    });

    it('should return undefined when cookie is not present', () => {
      const mockReq = {};
      sandbox.stub(Cookies.prototype, 'get').returns(undefined);

      const strategy = createJwtStrategy();
      const token = strategy._jwtFromRequest(mockReq);

      expect(token).to.be.undefined;
    });
  });

  describe('createJwtStrategy', () => {
    it('should create strategy with embedded certificate', () => {
      Constants.OAUTH.EMBEDDED_CERTIFICATE = MOCK_CERT;
      const strategy = createJwtStrategy();

      expect(strategy).to.have.property('name', 'jwt');
      expect(strategy._secretOrKeyProvider).to.be.a('function');
    });

    it('should create strategy with certificate from file', () => {
      delete Constants.OAUTH.EMBEDDED_CERTIFICATE;
      Constants.OAUTH.CERTIFICATE_FILE_NAME = '/test/cert.pem';
      sandbox.stub(fs, 'readFileSync').returns(MOCK_CERT);

      const strategy = createJwtStrategy();

      expect(strategy).to.have.property('name', 'jwt');
      expect(fs.readFileSync.calledWith('/test/cert.pem')).to.be.true;
    });
  });

  describe('verifyCallback', () => {
    const validPayload = {
      sub: 'testUser',
      iss: Constants.OAUTH.OAUTH2_ISSUER,
      groups: ['MTA_ROLE', 'EVERYONE_ROLE']
    };

    it('should verify valid JWT payload', (done) => {
      const mockReq = {};
      const strategy = createJwtStrategy();

      strategy._verify(mockReq, validPayload, (err, client, authInfo) => {
        expect(err).to.be.null;
        expect(client).to.deep.equal({ name: 'testUser' });
        expect(authInfo.roles).to.have.property('mta', true);
        expect(authInfo.roles).to.have.property('everyone', true);
        done();
      });
    });

    it('should reject payload without sub', (done) => {
      const mockReq = {};
      const invalidPayload = { ...validPayload };
      delete invalidPayload.sub;
      
      const strategy = createJwtStrategy();

      strategy._verify(mockReq, invalidPayload, (err, client, info) => {
        expect(client).to.be.false;
        expect(info).to.contain('no sub');
        done();
      });
    });
  });

  describe('createOAuth2Handler', () => {
    let handler;
    let mockReq;

    beforeEach(() => {
      handler = createOAuth2Handler();
      mockReq = {
        user: { name: 'testUser' },
        openapi: {
          openApiRoute: '/api/test',
          pathParams: { dfspId: 'test-dfsp' }
        }
      };

      sandbox.stub(passport, 'authenticate').callsFake((strategy, options, callback) => {
        return (req) => callback(null, req.user, { roles: { pta: true } });
      });
    });

    it('should allow access for PTA role', async () => {
      const result = await handler(mockReq, ['PTA_ROLE'], {});
      expect(result).to.be.true;
    });

    it('should check DFSP permissions for specific paths', async () => {
      mockReq.openapi.openApiRoute = '/dfsps/{dfspId}';
      sandbox.stub(PkiService, 'getDFSPById').resolves({
        securityGroup: 'TEST_GROUP'
      });

      try {
        await handler(mockReq, ['MTA_ROLE'], {});
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err.statusCode).to.equal(403);
      }
    });

    it('should reject when user lacks required roles', async () => {
      sandbox.restore();
      sandbox.stub(passport, 'authenticate').callsFake((strategy, options, callback) => {
        return (req) => callback(null, req.user, { roles: { basic: true } });
      });

      try {
        await handler(mockReq, ['PTA_ROLE'], {});
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err.statusCode).to.equal(403);
      }
    });
  });
});
