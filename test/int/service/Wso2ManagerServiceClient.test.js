const sinon = require('sinon');
const soap = require('soap');
const path = require('path');
const Wso2ManagerServiceClient = require('../../../src/service/Wso2ManagerServiceClient');
const ExternalProcessError = require('../../../src/errors/ExternalProcessError');
const Constants = require('../../../src/constants/Constants');

describe('Wso2ManagerServiceClient', () => {
    let soapClientStub;

    beforeEach(() => {
        soapClientStub = sinon.stub(soap, 'createClient');
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('getUserClaimValue', () => {
        it('should return user claim value', async () => {
            const client = {
                setSecurity: sinon.stub(),
                setEndpoint: sinon.stub(),
                getUserClaimValue: sinon.stub().yields(null, { getUserClaimValueResponse: { return: 'claimValue' } })
            };
            soapClientStub.yields(null, client);

            const result = await Wso2ManagerServiceClient.getUserClaimValue('userName', 'claim');
            expect(result).toEqual('claimValue');
        });

        it('should throw ExternalProcessError when soap client creation fails', async () => {
            soapClientStub.yields(new Error('error creating WSDL Client'));

            try {
                await Wso2ManagerServiceClient.getUserClaimValue('userName', 'claim');
            } catch (err) {
                expect(err).toBeInstanceOf(ExternalProcessError);
                expect(err.message).toEqual('error creating WSDL Client');
            }
        });

        it('should throw ExternalProcessError when getUserClaimValue fails', async () => {
            const client = {
                setSecurity: sinon.stub(),
                setEndpoint: sinon.stub(),
                getUserClaimValue: sinon.stub().yields(new Error('error calling getUserClaimValue'))
            };
            soapClientStub.yields(null, client);

            try {
                await Wso2ManagerServiceClient.getUserClaimValue('userName', 'claim');
            } catch (err) {
                expect(err).toBeInstanceOf(ExternalProcessError);
                expect(err.message).toEqual('error calling getUserClaimValue');
            }
        });
    });

    describe('setUserClaimValue', () => {
        it('should set user claim value', async () => {
            const client = {
                setSecurity: sinon.stub(),
                setEndpoint: sinon.stub(),
                setUserClaimValue: sinon.stub().yields(null)
            };
            soapClientStub.yields(null, client);

            await Wso2ManagerServiceClient.setUserClaimValue('userName', 'claim', 'value');
        });

        it('should throw ExternalProcessError when soap client creation fails', async () => {
            soapClientStub.yields(new Error('error creating WSDL Client'));

            try {
                await Wso2ManagerServiceClient.setUserClaimValue('userName', 'claim', 'value');
            } catch (err) {
                expect(err).toBeInstanceOf(ExternalProcessError);
                expect(err.message).toEqual('error creating WSDL Client');
            }
        });

        it('should throw ExternalProcessError when setUserClaimValue fails', async () => {
            const client = {
                setSecurity: sinon.stub(),
                setEndpoint: sinon.stub(),
                setUserClaimValue: sinon.stub().yields(new Error('error calling setUserClaimValue'))
            };
            soapClientStub.yields(null, client);

            try {
                await Wso2ManagerServiceClient.setUserClaimValue('userName', 'claim', 'value');
            } catch (err) {
                expect(err).toBeInstanceOf(ExternalProcessError);
                expect(err.message).toBe('error calling setUserClaimValue');
            }
        });
    });
});
