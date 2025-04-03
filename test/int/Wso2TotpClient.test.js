const Wso2TotpClient = require('../../src/service/Wso2TotpClient');
const { assert } = require('chai');
const rp = require('request-promise-native');
const sinon = require('sinon');
const xml2js = require('xml2js');
const UnauthorizedError = require('../../src/errors/UnauthorizedError');

describe('TOTP admin server client', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('should return a secret key when valid credentials', async () => {
    const obj = {
      'ns:retrieveSecretKeyResponse': {
        $: { 'xmlns:ns': 'http://services.totp.authenticator.application.identity.carbon.wso2.org' },
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

  it('should throw UnauthorizedError when XML parsing fails', async () => {
    const stub = sinon.stub(rp, 'Request');
    stub.resolves('<invalidxml>');

    try {
      await Wso2TotpClient.retrieveSecretKey('validuser');
      assert.fail('Expected error not thrown');
    } catch (err) {
      assert.instanceOf(err, UnauthorizedError);
      assert.equal(err.message, 'XML parse of the response failed');
    }
  });

  it('should throw UnauthorizedError when request fails', async () => {
    const stub = sinon.stub(rp, 'Request');
    stub.rejects(new Error('Request failed'));

    try {
      await Wso2TotpClient.retrieveSecretKey('validuser');
      assert.fail('Expected error not thrown');
    } catch (err) {
      assert.instanceOf(err, UnauthorizedError);
      assert.equal(err.message, 'Request failed');
    }
  });

  it('should validate TOTP when valid credentials and code', async () => {
    const obj = {
      'ns:validateTOTPResponse': {
        $: { 'xmlns:ns': 'http://services.totp.authenticator.application.identity.carbon.wso2.org' },
        'ns:return': ['true']
      }
    };
    const builder = new xml2js.Builder();
    const xml = builder.buildObject(obj);

    const stub = sinon.stub(rp, 'Request');
    stub.resolves(xml);
    const response = await Wso2TotpClient.validateTOTP('validuser', '123456');
    assert.equal(response, 'true');
  });

  it('should throw UnauthorizedError when TOTP validation fails', async () => {
    const obj = {
      'ns:validateTOTPResponse': {
        $: { 'xmlns:ns': 'http://services.totp.authenticator.application.identity.carbon.wso2.org' },
        'ns:return': ['false']
      }
    };
    const builder = new xml2js.Builder();
    const xml = builder.buildObject(obj);

    const stub = sinon.stub(rp, 'Request');
    stub.resolves(xml);

    try {
      await Wso2TotpClient.validateTOTP('validuser', '123456');
      assert.fail('Expected error not thrown');
    } catch (err) {
      assert.instanceOf(err, UnauthorizedError);
      assert.equal(err.message, 'Verification code not validated');
    }
  });

  it('should throw UnauthorizedError when TOTP validation XML parsing fails', async () => {
    const stub = sinon.stub(rp, 'Request');
    stub.resolves('<invalidxml>');

    try {
      await Wso2TotpClient.validateTOTP('validuser', '123456');
      assert.fail('Expected error not thrown');
    } catch (err) {
      assert.instanceOf(err, UnauthorizedError);
      assert.equal(err.message, 'XML parse of the response failed');
    }
  });
});