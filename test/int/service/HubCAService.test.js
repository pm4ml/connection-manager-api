const HubCAService = require('../../../src/service/HubCAService');
const ValidationError = require('../../../src/errors/ValidationError');
const ValidationCodes = require('../../../src/pki_engine/ValidationCodes');
const PkiService = require('../../../src/service/PkiService');

describe('HubCAService', () => {
    let ctx, pkiEngine, certManager;

    beforeEach(() => {
        pkiEngine = {
            createCA: jest.fn(),
            getCertInfo: jest.fn(),
            setHubCACertDetails: jest.fn(),
            validateCACertificate: jest.fn(),
            setHubCaCertChain: jest.fn(),
            getRootCaCert: jest.fn(),
            getHubCACertDetails: jest.fn(),
            deleteHubCACertDetails: jest.fn(),
            deleteCA: jest.fn(),
            splitChainIntermediateCertificateInfo: PkiService.splitChainIntermediateCertificateInfo,
            splitCertificateChain(chain) {
                const certificateEndDelimiter = '-----END CERTIFICATE-----';

                const beginCertRegex = /(?=-----BEGIN)/g;

                return chain.split(beginCertRegex)
                .filter(cert => cert.match(/BEGIN/g))
                .map(cert => cert.slice(0, cert.indexOf(certificateEndDelimiter)) + certificateEndDelimiter);
            }
        };
        certManager = {
            renewServerCert: jest.fn(),
        };
        ctx = { pkiEngine, certManager };
    });


    describe('createInternalHubCA', () => {
        it('should create an internal Hub CA and return the info', async () => {
            const body = { type: 'INTERNAL' };
            const ttl = 1000;
            const cert = 'cert';
            const certInfo = { info: 'certInfo' };

            pkiEngine.createCA.mockResolvedValue({ cert });
            pkiEngine.getCertInfo.mockReturnValue(certInfo);

            const result = await HubCAService.createInternalHubCA(ctx, body, ttl);

            expect(result).toEqual({
                type: 'INTERNAL',
                rootCertificate: cert,
                rootCertificateInfo: certInfo,
            });
            expect(pkiEngine.createCA).toHaveBeenCalledTimes(1);
            expect(pkiEngine.getCertInfo).toHaveBeenCalledTimes(1);
            expect(pkiEngine.setHubCACertDetails).toHaveBeenCalledTimes(1);
            expect(certManager.renewServerCert).toHaveBeenCalledTimes(1);
        });

        it('should handle errors during CA creation', async () => {
            const body = { type: 'INTERNAL' };
            const ttl = 1000;
            const error = new Error('CA creation failed');

            pkiEngine.createCA.mockRejectedValue(error);

            await expect(HubCAService.createInternalHubCA(ctx, body, ttl)).rejects.toBe(error);

            expect(pkiEngine.createCA).toHaveBeenCalledTimes(1);
            expect(pkiEngine.getCertInfo).not.toHaveBeenCalled();
            expect(pkiEngine.setHubCACertDetails).not.toHaveBeenCalled();
            expect(certManager.renewServerCert).not.toHaveBeenCalled();
        });
    });

    describe('createExternalHubCA', () => {
        it('should throw ValidationError if privateKey is missing', async () => {
            const body = { rootCertificate: 'rootCert', intermediateChain: 'intermediateChain' };

            await expect(HubCAService.createExternalHubCA(ctx, body)).rejects.toThrow(ValidationError);
            await expect(HubCAService.createExternalHubCA(ctx, body)).rejects.toThrow('Missing "privateKey" property');
        });

        it('should create an external Hub CA and return the info', async () => {
            const body = { type: 'EXTERNAL', rootCertificate: 'rootCert', intermediateChain: 'intermediateChain', privateKey: 'privateKey' };
            const validations = { valid: true };
            const validationState = ValidationCodes.VALID_STATES.VALID;

            pkiEngine.validateCACertificate.mockResolvedValue({ validations, validationState });
            pkiEngine.getCertInfo.mockReturnValue({ info: 'certInfo' });

            const result = await HubCAService.createExternalHubCA(ctx, body);

            expect(result).toEqual({
                type: 'EXTERNAL',
                rootCertificate: 'rootCert',
                rootCertificateInfo: { info: 'certInfo' },
                intermediateChain: 'intermediateChain',
                intermediateChainInfo: [],
                validations,
                validationState,
            });
            expect(pkiEngine.validateCACertificate).toHaveBeenCalledTimes(1);
            expect(pkiEngine.setHubCaCertChain).toHaveBeenCalledTimes(1);
            expect(pkiEngine.setHubCACertDetails).toHaveBeenCalledTimes(1);
            expect(certManager.renewServerCert).toHaveBeenCalledTimes(1);
        });

        it('should handle invalid CA certificate', async () => {
            const body = { type: 'EXTERNAL', rootCertificate: 'rootCert', intermediateChain: 'intermediateChain', privateKey: 'privateKey' };
            const validations = { valid: false };
            const validationState = ValidationCodes.VALID_STATES.INVALID;

            pkiEngine.validateCACertificate.mockResolvedValue({ validations, validationState });

            const result = await HubCAService.createExternalHubCA(ctx, body);

            expect(result).toEqual({
                type: 'EXTERNAL',
                rootCertificate: 'rootCert',
                rootCertificateInfo: undefined,
                intermediateChain: 'intermediateChain',
                intermediateChainInfo: [],
                validations,
                validationState,
            });
            expect(pkiEngine.validateCACertificate).toHaveBeenCalledTimes(1);
            expect(pkiEngine.setHubCaCertChain).not.toHaveBeenCalled();
            expect(pkiEngine.setHubCACertDetails).not.toHaveBeenCalled();
        });
    });

    describe('getHubCA', () => {
        it('should return the root CA certificate info', async () => {
            const ca = 'rootCert';
            pkiEngine.getRootCaCert.mockResolvedValue(ca);

            const result = await HubCAService.getHubCA(ctx);

            expect(result).toEqual({
                rootCertificate: ca,
                validationState: 'VALID',
                type: 'INTERNAL',
            });
            expect(pkiEngine.getRootCaCert).toHaveBeenCalledTimes(1);
        });

        it('should handle errors during root CA retrieval', async () => {
            const error = new Error('Failed to get root CA');
            pkiEngine.getRootCaCert.mockRejectedValue(error);

            await expect(HubCAService.getHubCA(ctx)).rejects.toBe(error);

            expect(pkiEngine.getRootCaCert).toHaveBeenCalledTimes(1);
        });
    });

    describe('getHubCAInfo', () => {
        it('should return the Hub CA certificate details', async () => {
            const details = { info: 'details' };
            pkiEngine.getHubCACertDetails.mockResolvedValue(details);

            const result = await HubCAService.getHubCAInfo(ctx);

            expect(result).toEqual(details);
            expect(pkiEngine.getHubCACertDetails).toHaveBeenCalledTimes(1);
        });

        it('should handle errors during Hub CA info retrieval', async () => {
            const error = new Error('Failed to get Hub CA details');
            pkiEngine.getHubCACertDetails.mockRejectedValue(error);

            await expect(HubCAService.getHubCAInfo(ctx)).rejects.toBe(error);

            expect(pkiEngine.getHubCACertDetails).toHaveBeenCalledTimes(1);
        });
    });

    describe('deleteHubCA', () => {
        it('should delete the Hub CA certificate details and CA', async () => {
            await HubCAService.deleteHubCA(ctx);

            expect(pkiEngine.deleteHubCACertDetails).toHaveBeenCalledTimes(1);
            expect(pkiEngine.deleteCA).toHaveBeenCalledTimes(1);
        });

        it('should handle errors during Hub CA deletion', async () => {
            const error = new Error('Failed to delete Hub CA');
            pkiEngine.deleteHubCACertDetails.mockRejectedValue(error);

            await expect(HubCAService.deleteHubCA(ctx)).rejects.toBe(error);

            expect(pkiEngine.deleteHubCACertDetails).toHaveBeenCalledTimes(1);
            expect(pkiEngine.deleteCA).not.toHaveBeenCalled();
        });
    });
});
