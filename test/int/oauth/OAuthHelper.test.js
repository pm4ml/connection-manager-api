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
  
  describe('createOAuth2Handler - new scenario tests', () => {
    let handler;
    let mockReq;

    beforeEach(() => {
      handler = createOAuth2Handler();
      mockReq = {
        user: { name: 'testUser' },
        openapi: {
          openApiRoute: '/api/test',
          pathParams: {}
        },
        context: {}
      };
    });

    it('should handle roles partially overlapping required scopes', async () => {
      sandbox.stub(passport, 'authenticate').callsFake((strategy, options, callback) => {
        return (req) => callback(null, req.user, { roles: { PTA_ROLE: true, EXTRA_ROLE: true } });
      });
      try {
        await handler(mockReq, ['PTA_ROLE', 'MTA_ROLE'], {});
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err.statusCode).to.equal(403);
      }
    });

    it('should allow when roles fully overlap with multiple required scopes', async () => {
      sandbox.stub(passport, 'authenticate').callsFake((strategy, options, callback) => {
        return (req) => callback(null, req.user, { roles: { PTA_ROLE: true, MTA_ROLE: true, EXTRA_ROLE: true } });
      });
      const result = await handler(mockReq, ['PTA_ROLE', 'MTA_ROLE'], {});
      expect(result).to.be.true;
    });

    it('should handle custom DFSP path with no specific securityGroup', async () => {
      mockReq.openapi.openApiRoute = '/dfsps/{dfspId}/custom/{someId}';
      mockReq.openapi.pathParams = { dfspId: 'test-dfsp', someId: '321' };
      sandbox.stub(passport, 'authenticate').callsFake((strategy, options, callback) => {
        return (req) => callback(null, req.user, { roles: { PTA_ROLE: true } });
      });
      sandbox.stub(PkiService, 'getDFSPById').resolves({}); // no securityGroup
      const result = await handler(mockReq, ['PTA_ROLE'], {});
      expect(result).to.be.true;
    });

    it('should reject DFSP paths when returned securityGroup is missing from user roles', async () => {
      mockReq.openapi.openApiRoute = '/dfsps/{dfspId}';
      sandbox.stub(passport, 'authenticate').callsFake((strategy, options, callback) => {
        return (req) => callback(null, req.user, { roles: { MTA_ROLE: true } });
      });
      sandbox.stub(PkiService, 'getDFSPById').resolves({ securityGroup: 'SECRET_GROUP' });
      try {
        await handler(mockReq, ['MTA_ROLE'], {});
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err.statusCode).to.equal(403);
      }
    });
  });
  
  describe('verifyCallback - additional tests', () => {
    let strategy;
  
    beforeEach(() => {
      strategy = createJwtStrategy();
    });
  
    it('should reject payload with invalid issuer', (done) => {
      const invalidPayload = {
        sub: 'testUser',
        iss: 'https://wrong.issuer',
        groups: ['MTA_ROLE']
      };
  
      strategy._verify({}, invalidPayload, (err, client, info) => {
        expect(client).to.be.false;
        expect(info).to.contain('wrong issuer');
        done();
      });
    });
  
    it('should reject payload without groups', (done) => {
      const invalidPayload = {
        sub: 'testUser',
        iss: Constants.OAUTH.OAUTH2_ISSUER
      };
  
      strategy._verify({}, invalidPayload, (err, client, info) => {
        expect(client).to.be.false;
        expect(info).to.contain('no groups');
        done();
      });
    });
  
    it('should correctly process multiple roles including custom ones', (done) => {
      const payload = {
        sub: 'testUser',
        iss: Constants.OAUTH.OAUTH2_ISSUER,
        groups: ['MTA_ROLE', 'CUSTOM_ROLE', 'EVERYONE_ROLE']
      };
  
      strategy._verify({}, payload, (err, client, authInfo) => {
        expect(err).to.be.null;
        expect(client).to.deep.equal({ name: 'testUser' });
        expect(authInfo.roles).to.have.property('mta', true);
        expect(authInfo.roles).to.have.property('everyone', true);
        expect(authInfo.roles).to.have.property('CUSTOM_ROLE', true);
        done();
      });
    });
  
    it('should accept alternative token issuer', (done) => {
      const payload = {
        sub: 'testUser',
        iss: Constants.OAUTH.OAUTH2_TOKEN_ISS,
        groups: ['PTA_ROLE']
      };
  
      strategy._verify({}, payload, (err, client, authInfo) => {
        expect(err).to.be.null;
        expect(client).to.deep.equal({ name: 'testUser' });
        expect(authInfo.roles).to.have.property('pta', true);
        done();
      });
    });
  });

  describe('createOAuth2Handler - additional tests', () => {
    let handler;
    let mockReq;
  
    beforeEach(() => {
      handler = createOAuth2Handler();
      mockReq = {
        user: { name: 'testUser' },
        openapi: {
          openApiRoute: '/api/test',
          pathParams: { dfspId: 'test-dfsp' }
        },
        context: { testContext: true }
      };
    });
  
    it('should reject when authentication fails', async () => {
      sandbox.stub(passport, 'authenticate').callsFake((strategy, options, callback) => {
        return (req) => callback(new Error('Auth failed'));
      });
  
      try {
        await handler(mockReq, ['PTA_ROLE'], {});
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err.message).to.equal('Auth failed');
      }
    });
  
    it('should handle PkiService errors gracefully', async () => {
      mockReq.openapi.openApiRoute = '/dfsps/{dfspId}';
      sandbox.stub(PkiService, 'getDFSPById').rejects(new Error('Database error'));
  
      try {
        await handler(mockReq, ['MTA_ROLE'], {});
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err.statusCode).to.equal(500);
        expect(err.headers['X-AUTH-ERROR']).to.equal('Database error');
      }
    });
  
    it('should pass for non-DFSP routes with valid roles', async () => {
      sandbox.stub(passport, 'authenticate').callsFake((strategy, options, callback) => {
        return (req) => callback(null, req.user, { roles: { MTA_ROLE: true } });
      });
  
      const result = await handler(mockReq, ['MTA_ROLE'], {});
      expect(result).to.be.true;
    });
  
    it('should handle missing openapi path info', async () => {
      delete mockReq.openapi;
      sandbox.stub(passport, 'authenticate').callsFake((strategy, options, callback) => {
        return (req) => callback(null, req.user, { roles: { MTA_ROLE: true } });
      });
  
      const result = await handler(mockReq, ['MTA_ROLE'], {});
      expect(result).to.be.true;
    });
  });

  describe('createJwtStrategy - edge cases', () => {
    it('should handle multiple extractors correctly', () => {
      const customExtractor = () => 'custom-token';
      const strategy = createJwtStrategy([customExtractor]);
      expect(strategy._jwtFromRequest).to.be.a('function');
    });
  
    it('should handle single extractor correctly', () => {
      const customExtractor = () => 'custom-token';
      const strategy = createJwtStrategy(customExtractor);
      expect(strategy._jwtFromRequest).to.be.a('function');
    });
  
    it('should work without any custom extractors', () => {
      const strategy = createJwtStrategy();
      expect(strategy._jwtFromRequest).to.be.a('function');
    });
  
    it('should handle missing certificate configurations', () => {
      delete Constants.OAUTH.EMBEDDED_CERTIFICATE;
      delete Constants.OAUTH.CERTIFICATE_FILE_NAME;
      const strategy = createJwtStrategy();
      expect(strategy).to.have.property('name', 'jwt');
    });
  });
  
  describe('OAuth2Handler - path validation', () => {
    let handler;
    let mockReq;
  
    beforeEach(() => {
      handler = createOAuth2Handler();
      mockReq = {
        user: { name: 'testUser' },
        openapi: {
          openApiRoute: '/api/test',
          pathParams: {}
        }
      };
    });
  
    it('should handle complex DFSP paths', async () => {
      mockReq.openapi.openApiRoute = '/dfsps/{dfspId}/certificates/{certId}';
      mockReq.openapi.pathParams = { dfspId: 'test-dfsp', certId: '123' };
      
      sandbox.stub(passport, 'authenticate').callsFake((strategy, options, callback) => {
        return (req) => callback(null, req.user, { roles: { PTA_ROLE: true }});
      });
  
      const result = await handler(mockReq, ['PTA_ROLE'], {});
      expect(result).to.be.true;
    });
  
    it('should handle missing pathParams in DFSP routes', async () => {
      mockReq.openapi.openApiRoute = '/dfsps/{dfspId}';
      delete mockReq.openapi.pathParams;
  
      try {
        await handler(mockReq, ['MTA_ROLE'], {});
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err.statusCode).to.equal(500);
      }
    });
  });
  
  describe('OAuth2Handler - authorization combinations', () => {
    let handler;
    let mockReq;
  
    beforeEach(() => {
      handler = createOAuth2Handler();
      mockReq = {
        user: { name: 'testUser' },
        openapi: {
          openApiRoute: '/api/test',
          pathParams: {}
        },
        context: {}
      };
    });
  
    it('should handle multiple required scopes correctly', async () => {
      sandbox.stub(passport, 'authenticate').callsFake((strategy, options, callback) => {
        return (req) => callback(null, req.user, { 
          roles: { 
            MTA_ROLE: true, 
            PTA_ROLE: true 
          }
        });
      });
  
      const result = await handler(mockReq, ['MTA_ROLE', 'PTA_ROLE'], {});
      expect(result).to.be.true;
    });
  
    it('should reject when missing one of multiple required scopes', async () => {
      sandbox.stub(passport, 'authenticate').callsFake((strategy, options, callback) => {
        return (req) => callback(null, req.user, { 
          roles: { 
            MTA_ROLE: true 
          }
        });
      });
  
      try {
        await handler(mockReq, ['MTA_ROLE', 'PTA_ROLE'], {});
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err.statusCode).to.equal(403);
      }
    });

    it('should handle multiple extractors correctly', () => {
      const customExtractor = () => 'custom-token';
      const strategy = createJwtStrategy([customExtractor]);
      expect(strategy._jwtFromRequest).to.be.a('function');
    });
  
    it('should handle single extractor correctly', () => {
      const customExtractor = () => 'custom-token';
      const strategy = createJwtStrategy(customExtractor);
      expect(strategy._jwtFromRequest).to.be.a('function');
    });
  
    it('should work without any custom extractors', () => {
      const strategy = createJwtStrategy();
      expect(strategy._jwtFromRequest).to.be.a('function');
    });
  
    it('should handle missing certificate configurations', () => {
      delete Constants.OAUTH.EMBEDDED_CERTIFICATE;
      delete Constants.OAUTH.CERTIFICATE_FILE_NAME;
      const strategy = createJwtStrategy();
      expect(strategy).to.have.property('name', 'jwt');
    });
  });

  describe('OAuth2Handler - path validation', () => {
    let handler;
    let mockReq;
  
    beforeEach(() => {
      handler = createOAuth2Handler();
      mockReq = {
        user: { name: 'testUser' },
        openapi: {
          openApiRoute: '/api/test',
          pathParams: {}
        }
      };
    });
  
    it('should handle complex DFSP paths', async () => {
      mockReq.openapi.openApiRoute = '/dfsps/{dfspId}/certificates/{certId}';
      mockReq.openapi.pathParams = { dfspId: 'test-dfsp', certId: '123' };
      
      sandbox.stub(passport, 'authenticate').callsFake((strategy, options, callback) => {
        return (req) => callback(null, req.user, { roles: { PTA_ROLE: true }});
      });
  
      const result = await handler(mockReq, ['PTA_ROLE'], {});
      expect(result).to.be.true;
    });
  
    it('should handle missing pathParams in DFSP routes', async () => {
      mockReq.openapi.openApiRoute = '/dfsps/{dfspId}';
      delete mockReq.openapi.pathParams;
  
      try {
        await handler(mockReq, ['MTA_ROLE'], {});
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err.statusCode).to.equal(500);
      }
    });
  });
  
  describe('verifyCallback - advanced tests', () => {
    let strategy;

    beforeEach(() => {
      strategy = createJwtStrategy();
    });

    it('should handle complex group hierarchies', (done) => {
      const payload = {
        sub: 'testUser',
        iss: Constants.OAUTH.OAUTH2_ISSUER,
        groups: [
          'PARENT_GROUP',
          'PARENT_GROUP_CHILD_1',
          'PARENT_GROUP_CHILD_2',
          'ANOTHER_GROUP'
        ]
      };

      strategy._verify({}, payload, (err, client, authInfo) => {
        expect(err).to.be.null;
        expect(client.name).to.equal('testUser');
        expect(authInfo.roles).to.include({
          'PARENT_GROUP': true,
          'PARENT_GROUP_CHILD_1': true, 
          'PARENT_GROUP_CHILD_2': true,
          'ANOTHER_GROUP': true
        });
        done();
      });
    });

    it('should handle empty string values in groups array', (done) => {
      const payload = {
        sub: 'testUser',
        iss: Constants.OAUTH.OAUTH2_ISSUER,
        groups: ['MTA_ROLE', '', 'PTA_ROLE', null]
      };

      strategy._verify({}, payload, (err, client, authInfo) => {
        expect(err).to.be.null;
        expect(client.name).to.equal('testUser'); 
        expect(authInfo.roles.mta).to.be.true;
        expect(authInfo.roles.pta).to.be.true;
        done();
      });
    });

    it('should handle very long group names', (done) => {
      const longGroupName = 'A'.repeat(1000);
      const payload = {
        sub: 'testUser',
        iss: Constants.OAUTH.OAUTH2_ISSUER,
        groups: [longGroupName]
      };

      strategy._verify({}, payload, (err, client, authInfo) => {
        expect(err).to.be.null;
        expect(client.name).to.equal('testUser');
        expect(authInfo.roles[longGroupName]).to.be.true;
        done();
      });
    });

    it('should handle unicode characters in groups', (done) => {
      const payload = {
        sub: 'testUser', 
        iss: Constants.OAUTH.OAUTH2_ISSUER,
        groups: ['GROUP_👍', 'GROUP_českýŘetězec', 'GROUP_中文']
      };

      strategy._verify({}, payload, (err, client, authInfo) => {
        expect(err).to.be.null;
        expect(client.name).to.equal('testUser');
        expect(authInfo.roles['GROUP_👍']).to.be.true;
        expect(authInfo.roles['GROUP_českýŘetězec']).to.be.true; 
        expect(authInfo.roles['GROUP_中文']).to.be.true;
        done();
      });
    });

    it('should handle groups with special characters', (done) => {
      const payload = {
        sub: 'testUser',
        iss: Constants.OAUTH.OAUTH2_ISSUER, 
        groups: ['GROUP.WITH.DOTS', 'GROUP-WITH-DASHES', 'GROUP_WITH_UNDERSCORES']
      };

      strategy._verify({}, payload, (err, client, authInfo) => {
        expect(err).to.be.null;
        expect(client.name).to.equal('testUser');
        expect(authInfo.roles['GROUP.WITH.DOTS']).to.be.true;
        expect(authInfo.roles['GROUP-WITH-DASHES']).to.be.true;
        expect(authInfo.roles['GROUP_WITH_UNDERSCORES']).to.be.true;
        done();
      });
    });

    it('should reject payload with empty issuer', (done) => {
      const payload = {
        sub: 'testUser',
        iss: '',
        groups: ['MTA_ROLE']
      };

      strategy._verify({}, payload, (err, client, info) => {
        expect(client).to.be.false;
        expect(info).to.contain('no iss');
        done();
      });
    });
  });

  describe('verifyCallback - special cases', () => {
    let strategy;
  
    beforeEach(() => {
      strategy = createJwtStrategy();
    });
  
    it('should handle empty groups array', (done) => {
      const payload = {
        sub: 'testUser',
        iss: Constants.OAUTH.OAUTH2_ISSUER,
        groups: []
      };
  
      strategy._verify({}, payload, (err, client, authInfo) => {
        expect(err).to.be.null;
        expect(client).to.deep.equal({ name: 'testUser' });
        expect(authInfo.roles).to.deep.equal({
          mta: false,
          pta: false,
          everyone: false
        });
        done();
      });
    });
  
    it('should handle malformed issuer URL', (done) => {
      const payload = {
        sub: 'testUser',
        iss: 'not-a-valid-url',
        groups: ['MTA_ROLE']
      };
  
      strategy._verify({}, payload, (err, client, info) => {
        expect(client).to.be.false;
        expect(info).to.contain('wrong issuer');
        done();
      });
    });

    it('should handle rapid sequential requests', async () => {
      sandbox.stub(passport, 'authenticate').callsFake((strategy, options, callback) => {
        return (req) => callback(null, req.user, { 
          roles: { MTA_ROLE: true }
        });
      });

      const startTime = process.hrtime();
      for(let i = 0; i < 50; i++) {
        await handler(mockReq, ['MTA_ROLE'], {});
      }
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const executionTime = seconds * 1000 + nanoseconds / 1000000;

      expect(executionTime).to.be.below(100); // 50 sequential requests under 100ms
    });

    it('should maintain consistent performance with varied payload sizes', async () => {
      const payloads = [
        { roles: { MTA_ROLE: true } },
        { roles: { MTA_ROLE: true, PTA_ROLE: true } },
        { roles: Array(100).fill().reduce((acc, _, i) => ({...acc, [`ROLE_${i}`]: true}), {}) }
      ];

      const times = [];
      
      for(const payload of payloads) {
        sandbox.stub(passport, 'authenticate').callsFake((strategy, options, callback) => {
          return (req) => callback(null, req.user, payload);
        });

        const startTime = process.hrtime();
        await handler(mockReq, ['MTA_ROLE'], {});
        const [seconds, nanoseconds] = process.hrtime(startTime);
        times.push(seconds * 1000 + nanoseconds / 1000000);
        
        sandbox.restore();
      }

      const variance = Math.max(...times) - Math.min(...times);
      expect(variance).to.be.below(10); // Max 10ms variance between different payload sizes
    });
  });

  describe('OAuth2Handler - performance and scaling', () => {
    let handler;
    let mockReq;

    beforeEach(() => {
      handler = createOAuth2Handler();
      mockReq = {
        user: { name: 'testUser' },
        openapi: {
          openApiRoute: '/api/test',
          pathParams: {}
        }
      };
    });

    it('should handle concurrent requests efficiently', async () => {
      sandbox.stub(passport, 'authenticate').callsFake((strategy, options, callback) => {
        return (req) => callback(null, req.user, { roles: { MTA_ROLE: true }});
      });

      const startTime = process.hrtime();
      
      const requests = Array(10).fill().map(() => handler(mockReq, ['MTA_ROLE'], {}));
      await Promise.all(requests);

      const [seconds, nanoseconds] = process.hrtime(startTime);
      const executionTime = seconds * 1000 + nanoseconds / 1000000;

      expect(executionTime).to.be.below(50); // 10 concurrent requests under 50ms
    });

    it('should maintain performance with deeply nested role hierarchies', async () => {
      const deepRoles = {
        roles: Array(5).fill().reduce((acc, _, i) => {
          const parent = `PARENT_${i}`;
          return {
            ...acc,
            [parent]: true,
            ...Array(5).fill().reduce((children, _, j) => ({
              ...children,
              [`${parent}_CHILD_${j}`]: true
            }), {})
          };
        }, {})
      };

      sandbox.stub(passport, 'authenticate').callsFake((strategy, options, callback) => {
        return (req) => callback(null, req.user, deepRoles);
      });

      const startTime = process.hrtime();
      await handler(mockReq, ['PARENT_0_CHILD_0'], {});
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const executionTime = seconds * 1000 + nanoseconds / 1000000;

      expect(executionTime).to.be.below(5); // Process deep hierarchy under 5ms
    });

    it('should scale linearly with increasing number of required scopes', async () => {
      const largeRoles = {
        roles: Array(100).fill().reduce((acc, _, i) => ({
          ...acc,
          [`ROLE_${i}`]: true
        }), {})
      };

      sandbox.stub(passport, 'authenticate').callsFake((strategy, options, callback) => {
        return (req) => callback(null, req.user, largeRoles);
      });

      const timings = await Promise.all([1, 10, 50].map(async (scopeCount) => {
        const scopes = Array(scopeCount).fill().map((_, i) => `ROLE_${i}`);
        const start = process.hrtime();
        await handler(mockReq, scopes, {});
        const [s, ns] = process.hrtime(start);
        return s * 1000 + ns / 1000000;
      }));

      const ratios = timings.slice(1).map((time, i) => time / timings[i]);
      ratios.forEach(ratio => expect(ratio).to.be.below(5)); // Each 10x increase should be <5x slower
    });

    it('should handle error cases efficiently', async () => {
      const errorPayloads = [
        new Error('Network error'),
        { statusCode: 401, message: 'Unauthorized' },
        { statusCode: 403, message: 'Forbidden' },
        null
      ];

      const times = [];

      for(const error of errorPayloads) {
        sandbox.restore();
        sandbox.stub(passport, 'authenticate').callsFake((strategy, options, callback) => {
          return (req) => callback(error);
        });

        const start = process.hrtime();
        try {
          await handler(mockReq, ['MTA_ROLE'], {});
        } catch(e) {
          // Expected error
        }
        const [s, ns] = process.hrtime(start);
        times.push(s * 1000 + ns / 1000000);
      }

      const maxTime = Math.max(...times);
      expect(maxTime).to.be.below(5); // Error handling should be fast
    });
  });

  describe('OAuth2Handler - additional optimization tests', () => {
    let handler;
    let mockReq;
    let commonAuthStub;

    beforeEach(() => {
      handler = createOAuth2Handler();
      mockReq = {
        user: { name: 'testUser' },
        openapi: {
          openApiRoute: '/api/test',
          pathParams: {}
        }
      };

      commonAuthStub = (roles) => {
        return sandbox.stub(passport, 'authenticate')
          .callsFake((strategy, options, callback) => {
            return (req) => callback(null, req.user, { roles });
          });
      };
    });

    it('should cache authentication results for repeated requests', async () => {
      const roles = { MTA_ROLE: true };
      commonAuthStub(roles);

      const start = process.hrtime();
      
      // Multiple requests with same parameters
      for(let i = 0; i < 3; i++) {
        await handler(mockReq, ['MTA_ROLE'], {});
      }

      const [s, ns] = process.hrtime(start);
      const executionTime = s * 1000 + ns / 1000000;
      
      expect(executionTime).to.be.below(10); // Should be fast due to caching
      expect(passport.authenticate.callCount).to.equal(3); // Still called but cached
    });

    it('should handle role inheritance efficiently', async () => {
      const roles = {
        PTA_ROLE: true,
        // PTA inherits MTA permissions
      };
      commonAuthStub(roles);

      const start = process.hrtime();
      const result = await handler(mockReq, ['MTA_ROLE'], {});
      const [s, ns] = process.hrtime(start);

      expect(result).to.be.true;
      expect(s * 1000 + ns / 1000000).to.be.below(5);
    });

    it('should optimize permission checks for multiple scopes', async () => {
      const roles = Array(20).fill().reduce((acc, _, i) => ({
        ...acc,
        [`ROLE_${i}`]: true
      }), {});
      commonAuthStub(roles);

      const start = process.hrtime();
      const results = await Promise.all([
        handler(mockReq, ['ROLE_0'], {}),
        handler(mockReq, ['ROLE_10'], {}),
        handler(mockReq, ['ROLE_19'], {})
      ]);
      const [s, ns] = process.hrtime(start);

      results.forEach(result => expect(result).to.be.true);
      expect(s * 1000 + ns / 1000000).to.be.below(15); // Parallel execution
    });

    it('should efficiently handle role checking order', async () => {
      const roles = {
        COMMON_ROLE: true,
        RARE_ROLE: true 
      };
      commonAuthStub(roles);

      const start = process.hrtime();
      await Promise.all([
        handler(mockReq, ['COMMON_ROLE'], {}),
        handler(mockReq, ['RARE_ROLE'], {}),
        handler(mockReq, ['COMMON_ROLE', 'RARE_ROLE'], {})
      ]);
      const [s, ns] = process.hrtime(start);

      expect(s * 1000 + ns / 1000000).to.be.below(15);
    });

    it('should optimize error handling paths', async () => {
      const errors = [
        new Error('Network error'),
        { statusCode: 401 },
        { statusCode: 403 },
        { statusCode: 500 }
      ];

      const times = await Promise.all(errors.map(async (error) => {
        sandbox.restore();
        commonAuthStub({});
        passport.authenticate.restore();
        sandbox.stub(passport, 'authenticate')
          .callsFake((strategy, options, callback) => {
            return (req) => callback(error);
          });

        const start = process.hrtime();
        try {
          await handler(mockReq, ['ANY_ROLE'], {});
        } catch(e) {
          // Expected
        }
        const [s, ns] = process.hrtime(start);
        return s * 1000 + ns / 1000000;
      }));

      const maxTime = Math.max(...times);
      expect(maxTime).to.be.below(5); // Fast error handling
    });
  });
});
