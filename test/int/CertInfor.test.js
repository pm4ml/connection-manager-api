const { expect } = require('chai');
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
    expect(certInfo.subject.CN).to.equal('example.com');
    expect(certInfo.subject.O).to.equal('Example Org');
    expect(certInfo.subject.OU).to.equal('IT');
    expect(certInfo.subject.C).to.equal('US');
    expect(certInfo.subject.L).to.equal('Some City');
    expect(certInfo.subject.emailAddress).to.equal('test@example.com');
    expect(certInfo.subject.ST).to.equal('Some State');

    expect(certInfo.issuer.CN).to.equal('CA');
    expect(certInfo.issuer.O).to.equal('CA Org');
    expect(certInfo.issuer.OU).to.equal('CA Unit');
    expect(certInfo.issuer.C).to.equal('US');
    expect(certInfo.issuer.L).to.equal('CA City');
    expect(certInfo.issuer.emailAddress).to.equal('ca@example.com');
    expect(certInfo.issuer.ST).to.equal('CA State');

    expect(certInfo.serialNumber).to.equal('1234567890');
    expect(certInfo.notBefore).to.equal('2021-01-01T00:00:00Z');
    expect(certInfo.notAfter).to.equal('2022-01-01T00:00:00Z');
    expect(certInfo.signatureAlgorithm).to.equal('SHA256withRSA');
    expect(certInfo.subjectAlternativeNames).to.deep.equal(['example.com', 'www.example.com']);
    expect(certInfo.extensions.subjectAltName.dns).to.deep.equal(['example.com', 'www.example.com']);
    expect(certInfo.extensions.subjectAltName.ips).to.deep.equal(['192.168.1.1']);
    expect(certInfo.extensions.subjectAltName.emailAddresses).to.deep.equal(['test@example.com']);
    expect(certInfo.extensions.subjectAltName.uris).to.deep.equal(['http://example.com']);
  });

  it('should correctly set email address from names array', () => {
    const certInfo = new CertInfo(CFSL_CERT_INFO);
    certInfo.tryToGetEmailSubject(CFSL_CERT_INFO);
    expect(certInfo.subject.emailAddress).to.equal('test@example.com');
  });

  it('should return the correct number of subject alternative names', () => {
    const certInfo = new CertInfo(CFSL_CERT_INFO);
    expect(certInfo.getSubjectAlternativeNamesQuantity()).to.equal(2);
  });

  it('should handle missing subject alternative names gracefully', () => {
    const certInfo = new CertInfo({});
    expect(certInfo.getSubjectAlternativeNamesQuantity()).to.equal(0);
  });

  //31/01/2025
  it('should handle missing fields gracefully', () => {
    const doc = {};
    const certInfo = new CertInfo(doc);
  
    expect(certInfo.subject.CN).to.be.null;
    expect(certInfo.subject.O).to.be.null;
    expect(certInfo.subject.OU).to.be.null;
    expect(certInfo.subject.C).to.be.null;
    expect(certInfo.subject.L).to.be.null;
    expect(certInfo.subject.emailAddress).to.be.null;
    expect(certInfo.subject.ST).to.be.null;
  
    expect(certInfo.issuer.CN).to.be.null;
    expect(certInfo.issuer.O).to.be.null;
    expect(certInfo.issuer.OU).to.be.null;
    expect(certInfo.issuer.C).to.be.null;
    expect(certInfo.issuer.L).to.be.null;
    expect(certInfo.issuer.emailAddress).to.be.null;
    expect(certInfo.issuer.ST).to.be.null;
  
    expect(certInfo.serialNumber).to.be.null;
    expect(certInfo.notBefore).to.be.null;
    expect(certInfo.notAfter).to.be.null;
    expect(certInfo.signatureAlgorithm).to.be.null;
    expect(certInfo.subjectAlternativeNames).to.be.null;
    expect(certInfo.extensions.subjectAltName.dns).to.deep.equal([]);
    expect(certInfo.extensions.subjectAltName.ips).to.deep.equal([]);
    expect(certInfo.extensions.subjectAltName.emailAddresses).to.deep.equal([]);
    expect(certInfo.extensions.subjectAltName.uris).to.deep.equal([]);
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
    expect(certInfo.subject.CN).to.equal('example.com');
    expect(certInfo.subject.O).to.equal('Example Org');
    expect(certInfo.subject.OU).to.equal('IT');
    expect(certInfo.subject.C).to.equal('US');
    expect(certInfo.subject.L).to.equal('Some City');
    expect(certInfo.subject.emailAddress).to.equal('test@example.com');
    expect(certInfo.subject.ST).to.equal('Some State');
  
    expect(certInfo.issuer.CN).to.equal('CA');
    expect(certInfo.issuer.O).to.equal('CA Org');
    expect(certInfo.issuer.OU).to.equal('CA Unit');
    expect(certInfo.issuer.C).to.equal('US');
    expect(certInfo.issuer.L).to.equal('CA City');
    expect(certInfo.issuer.emailAddress).to.equal('ca@example.com');
    expect(certInfo.issuer.ST).to.equal('CA State');
  
    expect(certInfo.extensions.subjectAltName.dns).to.deep.equal(['example.com', 'www.example.com']);
    expect(certInfo.extensions.subjectAltName.ips).to.deep.equal(['192.168.1.1']);
    expect(certInfo.extensions.subjectAltName.emailAddresses).to.deep.equal(['test@example.com']);
    expect(certInfo.extensions.subjectAltName.uris).to.deep.equal(['http://example.com']);
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
      expect(certInfo.subject.emailAddress).to.equal('test@example.com');
    });
  
    it('should not set emailAddress if no valid email is found in names array', () => {
      const doc = {
        subject: {
          names: ['invalid-email', 'another-invalid-email']
        }
      };
      const certInfo = new CertInfo({});
      certInfo.tryToGetEmailSubject(doc);
      expect(certInfo.subject.emailAddress).to.be.null;
    });
  
    it('should handle missing names array gracefully', () => {
      const doc = {
        subject: {}
      };
      const certInfo = new CertInfo({});
      certInfo.tryToGetEmailSubject(doc);
      expect(certInfo.subject.emailAddress).to.be.null;
    });
  
    it('should handle missing subject gracefully', () => {
      const doc = {};
      const certInfo = new CertInfo({});
      certInfo.tryToGetEmailSubject(doc);
      expect(certInfo.subject.emailAddress).to.be.null;
    });
  });
});
