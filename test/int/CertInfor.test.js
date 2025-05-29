const CertInfo = require('../../src/pki_engine/CertInfo');

// FILE: src/pki_engine/CertInfo.test.js


describe('CertInfo', () => {
  const CFSL_CERT_INFO = {
    subject: {
      common_name: 'example.com',
      organization: 'Example Org',
      organizational_unit: 'IT',
      country: 'US',
      locality: 'Some City',
      email_address: 'test@example.com',
      province: 'Some State',
      names: ['test@example.com']
    },
    issuer: {
      common_name: 'CA',
      organization: 'CA Org',
      organizational_unit: 'CA Unit',
      country: 'US',
      locality: 'CA City',
      email_address: 'ca@example.com',
      province: 'CA State'
    },
    serial_number: '1234567890',
    not_before: '2021-01-01T00:00:00Z',
    not_after: '2022-01-01T00:00:00Z',
    sigalg: 'SHA256withRSA',
    sans: ['example.com', 'www.example.com'],
    SubjectSANs: {
      DNSNames: ['example.com', 'www.example.com'],
      IPAddresses: ['192.168.1.1'],
      EmailAddresses: ['test@example.com'],
      URIs: ['http://example.com']
    }
  };

  it('should correctly initialize properties from the document', () => {
    const certInfo = new CertInfo(CFSL_CERT_INFO);
    expect(certInfo.subject.CN).toBe('example.com');
    expect(certInfo.subject.O).toBe('Example Org');
    expect(certInfo.subject.OU).toBe('IT');
    expect(certInfo.subject.C).toBe('US');
    expect(certInfo.subject.L).toBe('Some City');
    expect(certInfo.subject.emailAddress).toBe('test@example.com');
    expect(certInfo.subject.ST).toBe('Some State');

    expect(certInfo.issuer.CN).toBe('CA');
    expect(certInfo.issuer.O).toBe('CA Org');
    expect(certInfo.issuer.OU).toBe('CA Unit');
    expect(certInfo.issuer.C).toBe('US');
    expect(certInfo.issuer.L).toBe('CA City');
    expect(certInfo.issuer.emailAddress).toBe('ca@example.com');
    expect(certInfo.issuer.ST).toBe('CA State');

    expect(certInfo.serialNumber).toBe('1234567890');
    expect(certInfo.notBefore).toBe('2021-01-01T00:00:00Z');
    expect(certInfo.notAfter).toBe('2022-01-01T00:00:00Z');
    expect(certInfo.signatureAlgorithm).toBe('SHA256withRSA');
    expect(certInfo.subjectAlternativeNames).toEqual(['example.com', 'www.example.com']);
    expect(certInfo.extensions.subjectAltName.dns).toEqual(['example.com', 'www.example.com']);
    expect(certInfo.extensions.subjectAltName.ips).toEqual(['192.168.1.1']);
    expect(certInfo.extensions.subjectAltName.emailAddresses).toEqual(['test@example.com']);
    expect(certInfo.extensions.subjectAltName.uris).toEqual(['http://example.com']);
  });

  it('should correctly set email address from names array', () => {
    const certInfo = new CertInfo(CFSL_CERT_INFO);
    certInfo.tryToGetEmailSubject(CFSL_CERT_INFO);
    expect(certInfo.subject.emailAddress).toEqual('test@example.com');
  });

  it('should return the correct number of subject alternative names', () => {
    const certInfo = new CertInfo(CFSL_CERT_INFO);
    expect(certInfo.getSubjectAlternativeNamesQuantity()).toEqual(2);
  });

  it('should handle missing subject alternative names gracefully', () => {
    const certInfo = new CertInfo({});
    expect(certInfo.getSubjectAlternativeNamesQuantity()).toEqual(0);
  });

  //31/01/2025
  it('should handle missing fields gracefully', () => {
    const doc = {};
    const certInfo = new CertInfo(doc);

    expect(certInfo.subject.CN).toBeNull();
    expect(certInfo.subject.O).toBeNull();
    expect(certInfo.subject.OU).toBeNull();
    expect(certInfo.subject.C).toBeNull();
    expect(certInfo.subject.L).toBeNull();
    expect(certInfo.subject.emailAddress).toBeNull();
    expect(certInfo.subject.ST).toBeNull();

    expect(certInfo.issuer.CN).toBeNull();
    expect(certInfo.issuer.O).toBeNull();
    expect(certInfo.issuer.OU).toBeNull();
    expect(certInfo.issuer.C).toBeNull();
    expect(certInfo.issuer.L).toBeNull();
    expect(certInfo.issuer.emailAddress).toBeNull();
    expect(certInfo.issuer.ST).toBeNull();

    expect(certInfo.serialNumber).toBeNull();
    expect(certInfo.notBefore).toBeNull();
    expect(certInfo.notAfter).toBeNull();
    expect(certInfo.signatureAlgorithm).toBeNull();
    expect(certInfo.subjectAlternativeNames).toBeNull();
    expect(certInfo.extensions.subjectAltName.dns).toEqual([]);
    expect(certInfo.extensions.subjectAltName.ips).toEqual([]);
    expect(certInfo.extensions.subjectAltName.emailAddresses).toEqual([]);
    expect(certInfo.extensions.subjectAltName.uris).toEqual([]);
  });

  it('should handle array fields correctly', () => {
    const doc = {
      subject: {
        common_name: ['example.com'],
        organization: ['Example Org'],
        organizational_unit: ['IT'],
        country: ['US'],
        locality: ['Some City'],
        email_address: ['test@example.com'],
        province: ['Some State']
      },
      issuer: {
        common_name: ['CA'],
        organization: ['CA Org'],
        organizational_unit: ['CA Unit'],
        country: ['US'],
        locality: ['CA City'],
        email_address: ['ca@example.com'],
        province: ['CA State']
      },
      SubjectSANs: {
        DNSNames: ['example.com', 'www.example.com'],
        IPAddresses: ['192.168.1.1'],
        EmailAddresses: ['test@example.com'],
        URIs: ['http://example.com']
      }
    };

    const certInfo = new CertInfo(doc);
    expect(certInfo.subject.CN).toEqual('example.com');
    expect(certInfo.subject.O).toEqual('Example Org');
    expect(certInfo.subject.OU).toEqual('IT');
    expect(certInfo.subject.C).toEqual('US');
    expect(certInfo.subject.L).toEqual('Some City');
    expect(certInfo.subject.emailAddress).toEqual('test@example.com');
    expect(certInfo.subject.ST).toEqual('Some State');

    expect(certInfo.issuer.CN).toEqual('CA');
    expect(certInfo.issuer.O).toEqual('CA Org');
    expect(certInfo.issuer.OU).toEqual('CA Unit');
    expect(certInfo.issuer.C).toEqual('US');
    expect(certInfo.issuer.L).toEqual('CA City');
    expect(certInfo.issuer.emailAddress).toEqual('ca@example.com');
    expect(certInfo.issuer.ST).toEqual('CA State');

    expect(certInfo.extensions.subjectAltName.dns).toEqual(['example.com', 'www.example.com']);
    expect(certInfo.extensions.subjectAltName.ips).toEqual(['192.168.1.1']);
    expect(certInfo.extensions.subjectAltName.emailAddresses).toEqual(['test@example.com']);
    expect(certInfo.extensions.subjectAltName.uris).toEqual(['http://example.com']);
  });

  //31/01/2025
  describe('CertInfo.tryToGetEmailSubject', () => {
    it('should set emailAddress if a valid email is found in names array', () => {
      const doc = {
        subject: {
          names: ['invalid-email', 'test@example.com', 'another-invalid-email']
        }
      };
      const certInfo = new CertInfo({});
      certInfo.tryToGetEmailSubject(doc);
      expect(certInfo.subject.emailAddress).toEqual('test@example.com');
    });

    it('should not set emailAddress if no valid email is found in names array', () => {
      const doc = {
        subject: {
          names: ['invalid-email', 'another-invalid-email']
        }
      };
      const certInfo = new CertInfo({});
      certInfo.tryToGetEmailSubject(doc);
      expect(certInfo.subject.emailAddress).toBeNull();
        });

        it('should handle missing names array gracefully', () => {
      const doc = {
        subject: {}
      };
      const certInfo = new CertInfo({});
      certInfo.tryToGetEmailSubject(doc);
      expect(certInfo.subject.emailAddress).toBeNull();
        });

        it('should handle missing subject gracefully', () => {
      const doc = {};
      const certInfo = new CertInfo({});
      certInfo.tryToGetEmailSubject(doc);
      expect(certInfo.subject.emailAddress).toBeNull();
    });
  });
});
