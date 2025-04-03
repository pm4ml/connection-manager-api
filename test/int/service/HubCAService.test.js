const chai = require('chai');
const sinon = require('sinon');
const HubCAService = require('../../../src/service/HubCAService');
const ValidationError = require('../../../src/errors/ValidationError');
const ValidationCodes = require('../../../src/pki_engine/ValidationCodes');

const { expect } = chai;

describe('HubCAService', () => {
  let ctx, pkiEngine, certManager;

  beforeEach(() => {
    pkiEngine = {
      createCA: sinon.stub(),
      getCertInfo: sinon.stub(),
      setHubCACertDetails: sinon.stub(),
      validateCACertificate: sinon.stub(),
      setHubCaCertChain: sinon.stub(),
      getRootCaCert: sinon.stub(),
      getHubCACertDetails: sinon.stub(),
      deleteHubCACertDetails: sinon.stub(),
      deleteCA: sinon.stub(),
    };
    certManager = {
      renewServerCert: sinon.stub(),
    };
    ctx = { pkiEngine, certManager };
  });

const { expect } = chai;

describe('HubCAService', () => {
    let ctx, pkiEngine, certManager;

    beforeEach(() => {
        pkiEngine = {
            createCA: sinon.stub(),
            getCertInfo: sinon.stub(),
            setHubCACertDetails: sinon.stub(),
            validateCACertificate: sinon.stub(),
            setHubCaCertChain: sinon.stub(),
            getRootCaCert: sinon.stub(),
            getHubCACertDetails: sinon.stub(),
            deleteHubCACertDetails: sinon.stub(),
            deleteCA: sinon.stub(),
        };
        certManager = {
            renewServerCert: sinon.stub(),
        };
        ctx = { pkiEngine, certManager };
    });

    describe('createInternalHubCA', () => {
        it('should create an internal Hub CA and return the info', async () => {
            const body = { type: 'INTERNAL' };
            const ttl = 1000;
            const cert = 'cert';
            const certInfo = { info: 'certInfo' };

            pkiEngine.createCA.resolves({ cert });
            pkiEngine.getCertInfo.returns(certInfo);

            const result = await HubCAService.createInternalHubCA(ctx, body, ttl);

            expect(result).to.deep.equal({
                type: 'INTERNAL',
                rootCertificate: cert,
                rootCertificateInfo: certInfo,
            });
            sinon.assert.calledOnce(pkiEngine.createCA);
            sinon.assert.calledOnce(pkiEngine.getCertInfo);
            sinon.assert.calledOnce(pkiEngine.setHubCACertDetails);
            sinon.assert.calledOnce(certManager.renewServerCert);
        });

        it('should handle errors during CA creation', async () => {
            const body = { type: 'INTERNAL' };
            const ttl = 1000;
            const error = new Error('CA creation failed');

            pkiEngine.createCA.rejects(error);

            try {
                await HubCAService.createInternalHubCA(ctx, body, ttl);
            } catch (err) {
                expect(err).to.equal(error);
            }
            sinon.assert.calledOnce(pkiEngine.createCA);
            sinon.assert.notCalled(pkiEngine.getCertInfo);
            sinon.assert.notCalled(pkiEngine.setHubCACertDetails);
            sinon.assert.notCalled(certManager.renewServerCert);
        });
    });

    describe('createExternalHubCA', () => {
        it('should throw ValidationError if privateKey is missing', async () => {
            const body = { rootCertificate: 'rootCert', intermediateChain: 'intermediateChain' };

            try {
                await HubCAService.createExternalHubCA(ctx, body);
            } catch (err) {
                expect(err).to.be.instanceOf(ValidationError);
                expect(err.message).to.equal('Missing "privateKey" property');
            }
        });

        it('should create an external Hub CA and return the info', async () => {
            const body = { rootCertificate: 'rootCert', intermediateChain: 'intermediateChain', privateKey: 'privateKey' };
            const validations = { valid: true };
            const validationState = ValidationCodes.VALID_STATES.VALID;

            pkiEngine.validateCACertificate.resolves({ validations, validationState });
            pkiEngine.getCertInfo.returns({ info: 'certInfo' });

            const result = await HubCAService.createExternalHubCA(ctx, body);

            expect(result).to.deep.equal({
                type: 'EXTERNAL',
                rootCertificate: 'rootCert',
                rootCertificateInfo: { info: 'certInfo' },
                intermediateChain: 'intermediateChain',
                intermediateChainInfo: undefined,
                validations,
                validationState,
            });
            sinon.assert.calledOnce(pkiEngine.validateCACertificate);
            sinon.assert.calledOnce(pkiEngine.setHubCaCertChain);
            sinon.assert.calledOnce(pkiEngine.setHubCACertDetails);
            sinon.assert.calledOnce(certManager.renewServerCert);
        });

        it('should handle invalid CA certificate', async () => {
            const body = { rootCertificate: 'rootCert', intermediateChain: 'intermediateChain', privateKey: 'privateKey' };
            const validations = { valid: false };
            const validationState = ValidationCodes.VALID_STATES.INVALID;

            pkiEngine.validateCACertificate.resolves({ validations, validationState });

            const result = await HubCAService.createExternalHubCA(ctx, body);

            expect(result).to.deep.equal({
                type: 'EXTERNAL',
                rootCertificate: 'rootCert',
                rootCertificateInfo: undefined,
                intermediateChain: 'intermediateChain',
                intermediateChainInfo: undefined,
                validations,
                validationState,
            });
            sinon.assert.calledOnce(pkiEngine.validateCACertificate);
            sinon.assert.notCalled(pkiEngine.setHubCaCertChain);
            sinon.assert.notCalled(pkiEngine.setHubCACertDetails);
            sinon.assert.notCalled(certManager.renewServerCert);
        });
    });

    describe('getHubCA', () => {
        it('should return the root CA certificate info', async () => {
            const ca = 'rootCert';
            pkiEngine.getRootCaCert.resolves(ca);

            const result = await HubCAService.getHubCA(ctx);

            expect(result).to.deep.equal({
                rootCertificate: ca,
                validationState: 'VALID',
                type: 'INTERNAL',
            });
            sinon.assert.calledOnce(pkiEngine.getRootCaCert);
        });

        it('should handle errors during root CA retrieval', async () => {
            const error = new Error('Failed to get root CA');
            pkiEngine.getRootCaCert.rejects(error);

            try {
                await HubCAService.getHubCA(ctx);
            } catch (err) {
                expect(err).to.equal(error);
            }
            sinon.assert.calledOnce(pkiEngine.getRootCaCert);
        });
    });

    describe('getHubCAInfo', () => {
        it('should return the Hub CA certificate details', async () => {
            const details = { info: 'details' };
            pkiEngine.getHubCACertDetails.resolves(details);

            const result = await HubCAService.getHubCAInfo(ctx);

            expect(result).to.deep.equal(details);
            sinon.assert.calledOnce(pkiEngine.getHubCACertDetails);
        });

        it('should handle errors during Hub CA info retrieval', async () => {
            const error = new Error('Failed to get Hub CA details');
            pkiEngine.getHubCACertDetails.rejects(error);

            try {
                await HubCAService.getHubCAInfo(ctx);
            } catch (err) {
                expect(err).to.equal(error);
            }
            sinon.assert.calledOnce(pkiEngine.getHubCACertDetails);
        });
    });

    describe('deleteHubCA', () => {
        it('should delete the Hub CA certificate details and CA', async () => {
            await HubCAService.deleteHubCA(ctx);

            sinon.assert.calledOnce(pkiEngine.deleteHubCACertDetails);
            sinon.assert.calledOnce(pkiEngine.deleteCA);
        });

        it('should handle errors during Hub CA deletion', async () => {
            const error = new Error('Failed to delete Hub CA');
            pkiEngine.deleteHubCACertDetails.rejects(error);

            try {
                await HubCAService.deleteHubCA(ctx);
            } catch (err) {
                expect(err).to.equal(error);
            }
            sinon.assert.calledOnce(pkiEngine.deleteHubCACertDetails);
            sinon.assert.notCalled(pkiEngine.deleteCA);
        });
    });
});
});
