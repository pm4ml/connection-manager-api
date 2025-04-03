const sinon = require('sinon');
const chai = require('chai');
const soap = require('soap');
const path = require('path');
const Wso2ManagerServiceClient = require('../../../src/service/Wso2ManagerServiceClient');
const ExternalProcessError = require('../../../src/errors/ExternalProcessError');
const Constants = require('../../../src/constants/Constants');

const expect = chai.expect;

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
            expect(result).to.equal('claimValue');
        });

        it('should throw ExternalProcessError when soap client creation fails', async () => {
            soapClientStub.yields(new Error('error creating WSDL Client'));

            try {
                await Wso2ManagerServiceClient.getUserClaimValue('userName', 'claim');
            } catch (err) {
                expect(err).to.be.instanceOf(ExternalProcessError);
                expect(err.message).to.equal('error creating WSDL Client');
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
                expect(err).to.be.instanceOf(ExternalProcessError);
                expect(err.message).to.equal('error calling getUserClaimValue');
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
                expect(err).to.be.instanceOf(ExternalProcessError);
                expect(err.message).to.equal('error creating WSDL Client');
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
                expect(err).to.be.instanceOf(ExternalProcessError);
                expect(err.message).to.equal('error calling setUserClaimValue');
            }
        });
    });
});