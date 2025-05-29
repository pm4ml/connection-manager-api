const Wso2TotpClient = require('../../src/service/Wso2TotpClient');
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
    expect(response).toBe('XXX');
  });

  it.skip('should throw UnauthorizedError when XML parsing fails', async () => {
    const stub = sinon.stub(rp, 'Request');
    stub.resolves('<invalidxml>');

    await expect(Wso2TotpClient.retrieveSecretKey('validuser'))
      .rejects.toThrowError(new UnauthorizedError('XML parse of the response failed'));
  });

  it('should throw UnauthorizedError when request fails', async () => {
    const stub = sinon.stub(rp, 'Request');
    stub.rejects(new Error('Request failed'));

    await expect(Wso2TotpClient.retrieveSecretKey('validuser'))
      .rejects.toThrowError(new UnauthorizedError('Request failed'));
  });

  it.skip('should validate TOTP when valid credentials and code', async () => {
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
    expect(response).toBe('true');
  });

  it.skip('should throw UnauthorizedError when TOTP validation fails', async () => {
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

    await expect(Wso2TotpClient.validateTOTP('validuser', '123456'))
      .rejects.toThrowError(new UnauthorizedError('Verification code not validated'));
  });

  it.skip('should throw UnauthorizedError when TOTP validation XML parsing fails', async () => {
    const stub = sinon.stub(rp, 'Request');
    stub.resolves('<invalidxml>');

    await expect(Wso2TotpClient.validateTOTP('validuser', '123456'))
      .rejects.toThrowError(new UnauthorizedError('XML parse of the response failed'));
  });
});
