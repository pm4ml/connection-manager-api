const CSRInfo = require('../../../src/pki_engine/CSRInfo');

describe('CSRInfo', () => {
    describe('constructor', () => {
        it('should correctly initialize subject and extensions from the document', () => {
            const doc = {
                Subject: {
                    CommonName: 'example.com',
                    Names: [{ Type: [1, 2, 840, 113549, 1, 9, 1], Value: 'test@example.com' }],
                    Organization: 'Example Org',
                    OrganizationalUnit: 'IT',
                    Country: 'US',
                    Locality: 'New York',
                    Province: 'NY'
                },
                DNSNames: ['example.com'],
                IPAddresses: ['127.0.0.1'],
                EmailAddresses: ['admin@example.com'],
                URIs: ['http://example.com']
            };
            const csrInfo = new CSRInfo(doc);

            expect(csrInfo.subject).toEqual({
                CN: 'example.com',
                emailAddress: 'test@example.com',
                O: 'Example Org',
                OU: 'IT',
                C: 'US',
                L: 'New York',
                ST: 'NY',
                E: 'test@example.com'
            });
            expect(csrInfo.extensions.subjectAltName).toEqual({
                dns: ['example.com'],
                ips: ['127.0.0.1'],
                emailAddresses: ['admin@example.com'],
                uris: ['http://example.com']
            });
        });
    });

    describe('hasAllRequiredDistinguishedNames', () => {
        it('should return valid: true when all required distinguished names are present', () => {
            const doc = {
                Subject: {
                    CommonName: 'example.com',
                    Names: [{ Type: [1, 2, 840, 113549, 1, 9, 1], Value: 'test@example.com' }],
                    Organization: 'Example Org',
                    OrganizationalUnit: 'IT',
                    Country: 'US',
                    Locality: 'New York',
                    Province: 'NY',
                    Email: 'test@example.com'
                }
            };
            const csrInfo = new CSRInfo(doc);
            const result = csrInfo.hasAllRequiredDistinguishedNames();
            expect(result).toEqual({ valid: true });
        });

        it('should return valid: false with reason when a required distinguished name is missing', () => {
            const doc = {
                Subject: {
                    CommonName: 'example.com',
                    Names: [{ Type: [1, 2, 840, 113549, 1, 9, 1], Value: 'test@example.com' }],
                    Organization: 'Example Org',
                    OrganizationalUnit: 'IT',
                    Country: 'US',
                    Locality: 'New York'
                    // Missing Province
                }
            };
            const csrInfo = new CSRInfo(doc);
            const result = csrInfo.hasAllRequiredDistinguishedNames();
            expect(result).toEqual({ valid: false, reason: 'Missing: ST' });
        });
    });

    describe('getSubjectAlternativeNamesQuantity', () => {
        it('should return the correct quantity of subject alternative names', () => {
            const doc = {
                DNSNames: ['example.com'],
                IPAddresses: ['127.0.0.1'],
                EmailAddresses: ['admin@example.com'],
                URIs: ['http://example.com']
            };
            const csrInfo = new CSRInfo(doc);
            const result = csrInfo.getSubjectAlternativeNamesQuantity();
            expect(result).toBe(4);
        });
    });

    describe('getAllSubjectAltNameOneList', () => {
        it('should return all subject alternative names in one list', () => {
            const doc = {
                DNSNames: ['example.com'],
                IPAddresses: ['127.0.0.1'],
                EmailAddresses: ['admin@example.com'],
                URIs: ['http://example.com']
            };
            const csrInfo = new CSRInfo(doc);
            const result = csrInfo.getAllSubjectAltNameOneList();
            expect(result).toEqual(['example.com', '127.0.0.1', 'admin@example.com', 'http://example.com']);
        });
    });
});
