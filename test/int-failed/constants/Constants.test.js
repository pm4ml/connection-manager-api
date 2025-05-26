const chai = require('chai');
const sinon = require('sinon');
const fs = require('fs');
const constants = require('../../../src/constants/Constants');

const { expect } = chai;

describe('Constants', () => {
  let sandbox;
  let originalEnv;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    sandbox.restore();
    process.env = originalEnv;
  });

  describe('getFileContent', () => {
    it('should throw error when file does not exist', () => {
      sandbox.stub(fs, 'existsSync').returns(false);

      expect(() => constants.getFileContent('nonexistent.txt'))
        .to.throw('File nonexistent.txt doesn\'t exist');
    });

    it('should return file content when file exists', () => {
      const expectedContent = 'test content';
      sandbox.stub(fs, 'existsSync').returns(true);
      sandbox.stub(fs, 'readFileSync').returns(expectedContent);

      const content = constants.getFileContent('test.txt');

      expect(content).to.equal(expectedContent);
    });
  });

  describe('vault configuration', () => {
    it('should configure K8S auth when VAULT_AUTH_METHOD is K8S', () => {
      process.env.VAULT_AUTH_METHOD = 'K8S';
      process.env.VAULT_K8S_ROLE = 'test-role';

      sandbox.stub(fs, 'existsSync').returns(true);
      sandbox.stub(fs, 'readFileSync').returns('test-token');


      expect(constants.vault.auth.k8s).to.exist;
      expect(constants.vault.auth.k8s.role).to.equal('test-role');
      expect(constants.vault.auth.k8s.token).to.equal('test-token');
    });

    it('should configure APP_ROLE auth when VAULT_AUTH_METHOD is APP_ROLE', () => {
      process.env.VAULT_AUTH_METHOD = 'APP_ROLE';

      sandbox.stub(fs, 'existsSync').returns(true);
      sandbox.stub(fs, 'readFileSync')
        .onFirstCall().returns('role-id-content')
        .onSecondCall().returns('secret-id-content');


      expect(constants.vault.auth.appRole).to.exist;
      expect(constants.vault.auth.appRole.roleId).to.equal('role-id-content');
      expect(constants.vault.auth.appRole.roleSecretId).to.equal('secret-id-content');
    });
  });

  describe('cert manager configuration', () => {
    it('should have default disabled state', () => {
      expect(constants.certManager.enabled).to.be.false;
    });

    it('should include secret configs when enabled', () => {
      process.env.CERT_MANAGER_ENABLED = 'true';
      process.env.CERT_MANAGER_SERVER_CERT_SECRET_NAME = 'test-secret';
      process.env.CERT_MANAGER_SERVER_CERT_SECRET_NAMESPACE = 'test-namespace';


      expect(constants.certManager.enabled).to.be.true;
      expect(constants.certManager.serverCertSecretName).to.equal('test-secret');
      expect(constants.certManager.serverCertSecretNamespace).to.equal('test-namespace');
    });
  });

  describe('server configuration', () => {
    it('should use default port when not specified', () => {
      delete process.env.PORT;
      expect(constants.SERVER.PORT).to.equal(3001);
    });

    it('should use specified port when provided', () => {
      process.env.PORT = '3002';
      expect(constants.SERVER.PORT).to.equal(3002);
    });
  });

  describe('database configuration', () => {
    it('should have correct default values', () => {

      expect(constants.DATABASE.DATABASE_HOST).to.equal('localhost');
      expect(constants.DATABASE.DATABASE_PORT).to.equal(3306);
      expect(constants.DATABASE.DATABASE_USER).to.equal('mcm');
      expect(constants.DATABASE.DATABASE_SCHEMA).to.equal('mcm');
      expect(constants.DATABASE.DB_RETRIES).to.equal(10);
    });

    it('should override defaults with environment variables', () => {
      process.env.DATABASE_HOST = 'testhost';
      process.env.DATABASE_PORT = '3307';
      process.env.DATABASE_USER = 'testuser';


      expect(constants.DATABASE.DATABASE_HOST).to.equal('testhost');
      expect(constants.DATABASE.DATABASE_PORT).to.equal(3307);
      expect(constants.DATABASE.DATABASE_USER).to.equal('testuser');
    });
  });

  describe('auth configuration', () => {
    it('should handle auth configuration correctly', () => {
      process.env.AUTH_ENABLED = 'true';
      process.env.AUTH_USER = 'testuser';
      process.env.AUTH_PASS = 'testpass';


      expect(constants.auth.enabled).to.be.true;
      expect(constants.auth.creds.user).to.equal('testuser');
      expect(constants.auth.creds.pass).to.equal('testpass');
    });
  });

  describe('env-var validation', () => {
    it('should throw error when required variable is missing', () => {
      delete process.env.SWITCH_ID;
      expect(() => require('../../../src/constants/Constants'))
        .to.throw('env-var: "SWITCH_ID" is a required variable');
    });

    it('should throw error for invalid port number', () => {
      process.env.PORT = 'invalid';
      expect(() => require('../../../src/constants/Constants'))
        .to.throw('env-var: "PORT" should be a port number');
    });

    it('should throw error for invalid vault auth method', () => {
      process.env.VAULT_AUTH_METHOD = 'INVALID';
      expect(() => require('../../../src/constants/Constants'))
        .to.throw('env-var: "VAULT_AUTH_METHOD" must be one of');
    });
  });

  describe('file handling', () => {
    it('should handle multiple file content requests', () => {
      sandbox.stub(fs, 'existsSync').returns(true);
      sandbox.stub(fs, 'readFileSync')
        .onFirstCall().returns('file1')
        .onSecondCall().returns('file2');

      const content = constants.getFileContent('file1.txt');
      const content2 = constants.getFileContent('file2.txt');

      expect(content).to.equal('file1');
      expect(content2).to.equal('file2');
    });

    it('should throw error when reading file fails', () => {
      sandbox.stub(fs, 'existsSync').returns(true);
      sandbox.stub(fs, 'readFileSync').throws(new Error('Read failed'));

      expect(() => constants.getFileContent('test.txt'))
        .to.throw('Read failed');
    });
  });

  describe('CSR parameters', () => {
    it('should throw error when CSR JSON is invalid', () => {
      process.env.CLIENT_CSR_PARAMETERS = 'invalid-json';
      sandbox.stub(fs, 'existsSync').returns(true);
      sandbox.stub(fs, 'readFileSync').returns('invalid-json');

      expect(() => require('../../../src/constants/Constants'))
        .to.throw(SyntaxError);
    });

    it('should load valid CSR JSON parameters', () => {
      const validJson = JSON.stringify({
        commonName: 'test.com',
        organization: 'Test Org'
      });
      process.env.CLIENT_CSR_PARAMETERS = 'csr.json';
      sandbox.stub(fs, 'existsSync').returns(true);
      sandbox.stub(fs, 'readFileSync').returns(validJson);

      expect(constants.clientCsrParameters).to.deep.equal({
        commonName: 'test.com',
        organization: 'Test Org'
      });
    });
  });

  describe('OAUTH configuration', () => {
    it('should have correct default values', () => {
      expect(constants.OAUTH.MTA_ROLE).to.equal('Application/MTA');
      expect(constants.OAUTH.PTA_ROLE).to.equal('Application/PTA');
      expect(constants.OAUTH.EVERYONE_ROLE).to.equal('Internal/everyone');
      expect(constants.OAUTH.JWT_COOKIE_NAME).to.equal('MCM-API_ACCESS_TOKEN');
    });

    it('should override defaults with environment variables', () => {
      process.env.MTA_ROLE = 'Custom/MTA';
      process.env.PTA_ROLE = 'Custom/PTA';
      process.env.OAUTH2_ISSUER = 'https://custom.auth.server';

      expect(constants.OAUTH.MTA_ROLE).to.equal('Custom/MTA');
      expect(constants.OAUTH.PTA_ROLE).to.equal('Custom/PTA');
      expect(constants.OAUTH.OAUTH2_ISSUER).to.equal('https://custom.auth.server');
    });
  });

  describe('TLS configuration', () => {
    it('should handle extra TLS certificate configuration', () => {
      process.env.EXTRA_CERTIFICATE_CHAIN_FILE_NAME = 'chain.pem';
      process.env.EXTRA_ROOT_CERT_FILE_NAME = 'root.pem';

      expect(constants.EXTRA_TLS.EXTRA_CERTIFICATE_CHAIN_FILE_NAME).to.equal('chain.pem');
      expect(constants.EXTRA_TLS.EXTRA_ROOT_CERT_FILE_NAME).to.equal('root.pem');
    });
  });

  describe('vault configuration validation', () => {
    it('should validate key length is positive', () => {
      process.env.PRIVATE_KEY_LENGTH = '-1';
      expect(() => require('../../../src/constants/Constants'))
        .to.throw('env-var: "PRIVATE_KEY_LENGTH" must be a positive integer');
    });

    it('should have correct default values for vault config', () => {
      expect(constants.vault.endpoint).to.equal('http://127.0.0.1:8233');
      expect(constants.vault.mounts.pki).to.equal('pki');
      expect(constants.vault.signExpiryHours).to.equal('43800');
      expect(constants.vault.keyLength).to.equal(4096);
      expect(constants.vault.keyAlgorithm).to.equal('rsa');
    });
  });

  describe('text file content handling', () => {
    it('should trim whitespace from text file content', () => {
      sandbox.stub(fs, 'existsSync').returns(true);
      sandbox.stub(fs, 'readFileSync').returns('  content with spaces  \n');

      process.env.TEST_TEXT_FILE = 'test.txt';
      const result = constants.getFileContent('test.txt').toString().trim();

      expect(result).to.equal('content with spaces');
    });

    it('should handle multiple lines in text files', () => {
      sandbox.stub(fs, 'existsSync').returns(true);
      sandbox.stub(fs, 'readFileSync').returns('line1\nline2\n');

      const result = constants.getFileContent('test.txt').toString().trim();
      expect(result).to.equal('line1\nline2');
    });
  });

  describe('switch configuration', () => {
    it('should use default FQDN when not specified', () => {
      delete process.env.SWITCH_FQDN;
      expect(constants.switchFQDN).to.equal('switch.example.com');
    });

    it('should use custom FQDN when specified', () => {
      process.env.SWITCH_FQDN = 'custom.switch.com';
      expect(constants.switchFQDN).to.equal('custom.switch.com');
    });
  });

  describe('vault intermediate PKI configuration', () => {
    it('should have correct default intermediate PKI mount', () => {
      delete process.env.VAULT_MOUNT_INTERMEDIATE_PKI;
      expect(constants.vault.mounts.intermediatePki).to.equal('pki_int');
    });

    it('should use custom intermediate PKI mount when specified', () => {
      process.env.VAULT_MOUNT_INTERMEDIATE_PKI = 'custom_pki_int';
      expect(constants.vault.mounts.intermediatePki).to.equal('custom_pki_int');
    });
  });

  describe('2FA configuration', () => {
    it('should have correct default values', () => {
      expect(constants.AUTH_2FA.AUTH_2FA_ENABLED).to.be.false;
      expect(constants.AUTH_2FA.TOTP_ISSUER).to.equal('MCM');
    });

    it('should use custom 2FA settings when provided', () => {
      process.env.AUTH_2FA_ENABLED = 'true';
      process.env.TOTP_ISSUER = 'CustomIssuer';
      process.env.TOTP_LABEL = 'CustomLabel';

      expect(constants.AUTH_2FA.AUTH_2FA_ENABLED).to.be.true;
      expect(constants.AUTH_2FA.TOTP_ISSUER).to.equal('CustomIssuer');
      expect(constants.AUTH_2FA.TOTP_LABEL).to.equal('CustomLabel');
    });
  });

  describe('WSO2 service configuration', () => {
    it('should handle WSO2 manager service settings', () => {
      process.env.WSO2_MANAGER_SERVICE_URL = 'https://wso2.test';
      process.env.WSO2_MANAGER_SERVICE_USER = 'admin';
      process.env.WSO2_MANAGER_SERVICE_PASSWORD = 'password';

      expect(constants.AUTH_2FA.WSO2_MANAGER_SERVICE_URL).to.equal('https://wso2.test');
      expect(constants.AUTH_2FA.WSO2_MANAGER_SERVICE_USER).to.equal('admin');
      expect(constants.AUTH_2FA.WSO2_MANAGER_SERVICE_PASSWORD).to.equal('password');
    });
  });

  describe('database retry configuration', () => {
    it('should have correct default retry values', () => {
      delete process.env.DB_CONNECTION_RETRY_WAIT_MILLISECONDS;

      expect(constants.DATABASE.DB_CONNECTION_RETRY_WAIT_MILLISECONDS).to.equal(1000);
      expect(constants.DATABASE.DB_RETRIES).to.equal(10);
    });

    it('should use custom retry settings when provided', () => {
      process.env.DB_CONNECTION_RETRY_WAIT_MILLISECONDS = '2000';
      process.env.DB_RETRIES = '5';

      expect(constants.DATABASE.DB_CONNECTION_RETRY_WAIT_MILLISECONDS).to.equal(2000);
      expect(constants.DATABASE.DB_RETRIES).to.equal(5);
    });
  });
});
