const CSRInfo = require('../src/pki_engine/CSRInfo');
const CertInfo = require('../src/pki_engine/CertInfo');
const PKIEngine = require('../src/pki_engine/PKIEngine');

const assert = require('chai').assert;

describe('verify CSRInfo subject is the same of the CertInfo', () => {
  it('should validate a CSRinfo subject is equals Certinfo subject', async () => {
    // FIXME add emailddress when cfssl returns it
    let csrSubject = { Subject: { Country: 'US', Locality: 'AT', Organization: 'Modusbox', CommonName: 'Modusbox', OrganizationalUnit: 'PKI', Province: 'GE' } };
    let certSubject = { subject: { country: 'US', locality: 'AT', organization: 'Modusbox', common_name: 'Modusbox', organizational_unit: 'PKI', province: 'GE' } };

    let csrInfo = new CSRInfo(csrSubject);
    let certInfo = new CertInfo(certSubject);

    assert.isTrue(PKIEngine.compareSubjectBetweenCSRandCert(csrInfo, certInfo).valid);
  });

  it('should validate a CSRinfo subject is equals Certinfo subject in different order', async () => {
    let csrSubject = { Subject: { CommonName: 'Modusbox', Country: 'US', Locality: null, Organization: 'Modusbox', OrganizationalUnit: 'PKI', Province: null, EmailAddress: null } };
    let certSubject = { subject: { province: null, country: 'US', locality: null, organization: 'Modusbox', common_name: 'Modusbox', organizational_unit: 'PKI', email_address: null } };

    let csrInfo = new CSRInfo(csrSubject);
    let certInfo = new CertInfo(certSubject);

    assert.isTrue(PKIEngine.compareSubjectBetweenCSRandCert(csrInfo, certInfo).valid);
  });

  it('should validate a CSRinfo subject not equals Certinfo', async () => {
    let csrSubject = { Subject: { CommonName: 'Modusbox2', Country: 'US', Locality: null, Organization: 'Modusbox', OrganizationalUnit: 'PKI', Province: null, EmailAddress: null } };
    let certSubject = { subject: { province: null, country: 'US', locality: null, organization: 'Modusbox', common_name: 'Modusbox', organizational_unit: 'PKI', email_address: null } };

    let csrInfo = new CSRInfo(csrSubject);
    let certInfo = new CertInfo(certSubject);

    let validation = PKIEngine.compareSubjectBetweenCSRandCert(csrInfo, certInfo);

    assert.isFalse(validation.valid);
    assert.isNotNull(validation.reason);
  });

  it('should validate a CSRinfo more subjects than CertInfo', async () => {
    let csrSubject = { Subject: { CommonName: 'Modusbox', Country: 'US', Locality: null, Organization: 'Modusbox', OrganizationalUnit: 'PKI', Province: null, EmailAddress: null } };
    let certSubject = { subject: { common_name: 'Modusbox' } };

    let csrInfo = new CSRInfo(csrSubject);
    let certInfo = new CertInfo(certSubject);

    let validation = PKIEngine.compareSubjectBetweenCSRandCert(csrInfo, certInfo);

    assert.isFalse(validation.valid);
    assert.isNotNull(validation.reason);
  });

  it('should validate a CertInfo more subjects than CSRinfo', async () => {
    let csrSubject = { Subject: { CommonName: 'Modusbox', Country: 'US' } };
    let certSubject = { subject: { province: null, country: 'US', locality: null, organization: 'Modusbox', common_name: 'Modusbox', organizational_unit: 'PKI', email_address: null } };

    let csrInfo = new CSRInfo(csrSubject);
    let certInfo = new CertInfo(certSubject);

    let validation = PKIEngine.compareSubjectBetweenCSRandCert(csrInfo, certInfo);

    assert.isFalse(validation.valid);
    assert.isNotNull(validation.reason);
  });
});

describe('verify CSRInfo extensions are the same of the CertInfo', () => {
  it('should validate a CSRinfo extensions is equals Certinfo extensions', async () => {
    let csrExtensions = {
      DNSNames: [
        'hub1.test.modusbox.com',
        'hub2.test.modusbox.com'
      ],
      IPAddresses: [
        '163.10.5.24',
        '163.10.5.22'
      ]
    };

    let certExtensions = {
      SubjectSANs: {
        DNSNames: [
          'hub1.test.modusbox.com',
          'hub2.test.modusbox.com'
        ],
        IPAddresses: [
          '163.10.5.24',
          '163.10.5.22'
        ] }
    };

    let csrInfo = new CSRInfo(csrExtensions);
    let certInfo = new CertInfo(certExtensions);

    assert.isTrue(PKIEngine.compareSubjectAltNameBetweenCSRandCert(csrInfo, certInfo).valid);
  });

  it('should validate a CSRinfo extensions is equals Certinfo extensions different order', async () => {
    let csrExtensions = {
      DNSNames: [
        'hub2.test.modusbox.com',
        'hub1.test.modusbox.com'
      ],
      IPAddresses: [
        '163.10.5.22',
        '163.10.5.24'
      ]
    };

    let certExtensions = {
      SubjectSANs: {
        DNSNames: [
          'hub1.test.modusbox.com',
          'hub2.test.modusbox.com'
        ],
        IPAddresses: [
          '163.10.5.24',
          '163.10.5.22'
        ] }
    };

    let csrInfo = new CSRInfo(csrExtensions);
    let certInfo = new CertInfo(certExtensions);

    assert.isTrue(PKIEngine.compareSubjectAltNameBetweenCSRandCert(csrInfo, certInfo).valid);
  });

  it('should validate a CSRinfo extensions is equals Certinfo extensions both empty', async () => {
    let csrExtensions = {};

    let certExtensions = {};

    let csrInfo = new CSRInfo(csrExtensions);
    let certInfo = new CertInfo(certExtensions);

    assert.isTrue(PKIEngine.compareSubjectAltNameBetweenCSRandCert(csrInfo, certInfo).valid);
  });

  it('should validate a CSRinfo extensions not equals Certinfo dns', async () => {
    let csrExtensions = {
      DNSNames: [
        'hub2.test.modusbox.com',
        'hub1.test.modusbox.com'
      ],
      IPAddresses: [
        '163.10.5.22',
        '163.10.5.24'
      ]
    };

    let certExtensions = {
      SubjectSANs: {
        DNSNames: [
          'hub1.test.modusbox.com',
          'hub2.test.modusbox.com'
        ],
        IPAddresses: [
          '163.10.5.24',
          '163.10.5.23'
        ] }
    };

    let csrInfo = new CSRInfo(csrExtensions);
    let certInfo = new CertInfo(certExtensions);

    let validation = PKIEngine.compareSubjectAltNameBetweenCSRandCert(csrInfo, certInfo);

    assert.isFalse(validation.valid);
    assert.isNotNull(validation.reason);

    let csrExtensions2 = {
      DNSNames: [
        'hub23.test.modusbox.com',
        'hub1.test.modusbox.com'
      ],
      IPAddresses: [
        '163.10.5.22',
        '163.10.5.24'
      ]
    };

    let certExtensions2 = {
      SubjectSANs: {
        DNSNames: [
          'hub1.test.modusbox.com',
          'hub2.test.modusbox.com'
        ],
        IPAddresses: [
          '163.10.5.24',
          '163.10.5.22'
        ] }
    };

    let csrInfo2 = new CSRInfo(csrExtensions2);
    let certInfo2 = new CertInfo(certExtensions2);

    let validation2 = PKIEngine.compareSubjectAltNameBetweenCSRandCert(csrInfo2, certInfo2);

    assert.isFalse(validation2.valid);
    assert.isNotNull(validation2.reason);
  });

  it('should validate a CSRinfo extensions not equals Certinfo IP', async () => {
    let csrExtensions = {
      DNSNames: [
        'hub2.test.modusbox.com',
        'hub1.test.modusbox.com'
      ],
      IPAddresses: [
        '163.10.5.24'
      ]
    };

    let certExtensions = {
      SubjectSANs: {
        DNSNames: [
          'hub1.test.modusbox.com',
          'hub3.test.modusbox.com'
        ],
        IPAddresses: [
          '163.10.5.24',
          '163.10.5.22'
        ] }
    };

    let csrInfo = new CSRInfo(csrExtensions);
    let certInfo = new CertInfo(certExtensions);

    let validation = PKIEngine.compareSubjectAltNameBetweenCSRandCert(csrInfo, certInfo);

    assert.isFalse(validation.valid);
    assert.isNotNull(validation.reason);

    let csrExtensions2 = {
      DNSNames: [
        'hub23.test.modusbox.com',
        'hub1.test.modusbox.com'
      ],
      IPAddresses: [
        '163.10.5.22',
        '163.10.5.24'
      ]
    };

    let certExtensions2 = {
      SubjectSANs: {
        DNSNames: [
          'hub1.test.modusbox.com',
          'hub2.test.modusbox.com'
        ],
        IPAddresses: [
          '163.10.5.22'
        ] }
    };

    let csrInfo2 = new CSRInfo(csrExtensions2);
    let certInfo2 = new CertInfo(certExtensions2);

    let validation2 = PKIEngine.compareSubjectAltNameBetweenCSRandCert(csrInfo2, certInfo2);

    assert.isFalse(validation2.valid);
    assert.isNotNull(validation2.reason);
  });
});
