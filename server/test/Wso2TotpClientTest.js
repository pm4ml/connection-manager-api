const Wso2TotpClient = require('../src/service/Wso2TotpClient');
const BadRequestError = require('../src/errors/BadRequestError');
const ValidationError = require('../src/errors/ValidationError');
const assert = require('chai').assert;
const rp = require('request-promise-native');
const sinon = require('sinon');
const xml2js = require('xml2js');

describe('TOTP admin server client', () => {
     it('should return a secret key when valid credentials', async () => {
        var obj = {
            'ns:retrieveSecretKeyResponse':
            {
                '$':
                    { 'xmlns:ns': 'http://services.totp.authenticator.application.identity.carbon.wso2.org' },
                'ns:return': ['XXX']
            }
        };
        var builder = new xml2js.Builder();
        var xml = builder.buildObject(obj);

        let stub = sinon.stub(rp, 'Request');
        stub.resolves(xml);
        var response = await Wso2TotpClient.retrieveSecretKey('validuser');
        assert.equal(response, 'XXX');

    });

});
