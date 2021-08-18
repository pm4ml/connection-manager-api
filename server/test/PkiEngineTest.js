/******************************************************************************
 *  Copyright 2019 ModusBox, Inc.                                             *
 *                                                                            *
 *  info@modusbox.com                                                         *
 *                                                                            *
 *  Licensed under the Apache License, Version 2.0 (the "License");           *
 *  you may not use this file except in compliance with the License.          *
 *  You may obtain a copy of the License at                                   *
 *  http://www.apache.org/licenses/LICENSE-2.0                                *
 *                                                                            *
 *  Unless required by applicable law or agreed to in writing, software       *
 *  distributed under the License is distributed on an "AS IS" BASIS,         *
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  *
 *  See the License for the specific language governing permissions and       *
 *  limitations under the License.                                            *
 ******************************************************************************/

const CSRInfo = require('../src/pki_engine/CSRInfo');
const CertInfo = require('../src/pki_engine/CertInfo');
const PKIEngine = require('../src/pki_engine/PKIEngine');

const assert = require('chai').assert;

describe('verify CSRInfo subject is the same of the CertInfo', () => {
  it('should validate a CSRinfo subject is equals Certinfo subject', async () => {
    // FIXME add emailddress when cfssl returns it
    const csrSubject = { Subject: { Country: 'US', Locality: 'AT', Organization: 'Modusbox', CommonName: 'Modusbox', OrganizationalUnit: 'PKI', Province: 'GE' } };
    const certSubject = { subject: { country: 'US', locality: 'AT', organization: 'Modusbox', common_name: 'Modusbox', organizational_unit: 'PKI', province: 'GE' } };

    const csrInfo = new CSRInfo(csrSubject);
    const certInfo = new CertInfo(certSubject);

    assert.isTrue(PKIEngine.compareSubjectBetweenCSRandCert(csrInfo, certInfo).valid);
  });

  it('should validate a CSRinfo subject is equals Certinfo subject in different order', async () => {
    const csrSubject = { Subject: { CommonName: 'Modusbox', Country: 'US', Locality: null, Organization: 'Modusbox', OrganizationalUnit: 'PKI', Province: null, EmailAddress: null } };
    const certSubject = { subject: { province: null, country: 'US', locality: null, organization: 'Modusbox', common_name: 'Modusbox', organizational_unit: 'PKI', email_address: null } };

    const csrInfo = new CSRInfo(csrSubject);
    const certInfo = new CertInfo(certSubject);

    assert.isTrue(PKIEngine.compareSubjectBetweenCSRandCert(csrInfo, certInfo).valid);
  });

  it('should validate a CSRinfo subject not equals Certinfo', async () => {
    const csrSubject = { Subject: { CommonName: 'Modusbox2', Country: 'US', Locality: null, Organization: 'Modusbox', OrganizationalUnit: 'PKI', Province: null, EmailAddress: null } };
    const certSubject = { subject: { province: null, country: 'US', locality: null, organization: 'Modusbox', common_name: 'Modusbox', organizational_unit: 'PKI', email_address: null } };

    const csrInfo = new CSRInfo(csrSubject);
    const certInfo = new CertInfo(certSubject);

    const validation = PKIEngine.compareSubjectBetweenCSRandCert(csrInfo, certInfo);

    assert.isFalse(validation.valid);
    assert.isNotNull(validation.reason);
  });

  it('should validate a CSRinfo more subjects than CertInfo', async () => {
    const csrSubject = { Subject: { CommonName: 'Modusbox', Country: 'US', Locality: null, Organization: 'Modusbox', OrganizationalUnit: 'PKI', Province: null, EmailAddress: null } };
    const certSubject = { subject: { common_name: 'Modusbox' } };

    const csrInfo = new CSRInfo(csrSubject);
    const certInfo = new CertInfo(certSubject);

    const validation = PKIEngine.compareSubjectBetweenCSRandCert(csrInfo, certInfo);

    assert.isFalse(validation.valid);
    assert.isNotNull(validation.reason);
  });

  it('should validate a CertInfo more subjects than CSRinfo', async () => {
    const csrSubject = { Subject: { CommonName: 'Modusbox', Country: 'US' } };
    const certSubject = { subject: { province: null, country: 'US', locality: null, organization: 'Modusbox', common_name: 'Modusbox', organizational_unit: 'PKI', email_address: null } };

    const csrInfo = new CSRInfo(csrSubject);
    const certInfo = new CertInfo(certSubject);

    const validation = PKIEngine.compareSubjectBetweenCSRandCert(csrInfo, certInfo);

    assert.isFalse(validation.valid);
    assert.isNotNull(validation.reason);
  });
});

describe('verify CSRInfo extensions are the same of the CertInfo', () => {
  it('should validate a CSRinfo extensions is equals Certinfo extensions', async () => {
    const csrExtensions = {
      DNSNames: [
        'hub1.test.modusbox.com',
        'hub2.test.modusbox.com'
      ],
      IPAddresses: [
        '163.10.5.24',
        '163.10.5.22'
      ]
    };

    const certExtensions = {
      SubjectSANs: {
        DNSNames: [
          'hub1.test.modusbox.com',
          'hub2.test.modusbox.com'
        ],
        IPAddresses: [
          '163.10.5.24',
          '163.10.5.22'
        ]
      }
    };

    const csrInfo = new CSRInfo(csrExtensions);
    const certInfo = new CertInfo(certExtensions);

    assert.isTrue(PKIEngine.compareSubjectAltNameBetweenCSRandCert(csrInfo, certInfo).valid);
  });

  it('should validate a CSRinfo extensions is equals Certinfo extensions different order', async () => {
    const csrExtensions = {
      DNSNames: [
        'hub2.test.modusbox.com',
        'hub1.test.modusbox.com'
      ],
      IPAddresses: [
        '163.10.5.22',
        '163.10.5.24'
      ]
    };

    const certExtensions = {
      SubjectSANs: {
        DNSNames: [
          'hub1.test.modusbox.com',
          'hub2.test.modusbox.com'
        ],
        IPAddresses: [
          '163.10.5.24',
          '163.10.5.22'
        ]
      }
    };

    const csrInfo = new CSRInfo(csrExtensions);
    const certInfo = new CertInfo(certExtensions);

    assert.isTrue(PKIEngine.compareSubjectAltNameBetweenCSRandCert(csrInfo, certInfo).valid);
  });

  it('should validate a CSRinfo extensions is equals Certinfo extensions both empty', async () => {
    const csrExtensions = {};

    const certExtensions = {};

    const csrInfo = new CSRInfo(csrExtensions);
    const certInfo = new CertInfo(certExtensions);

    assert.isTrue(PKIEngine.compareSubjectAltNameBetweenCSRandCert(csrInfo, certInfo).valid);
  });

  it('should validate a CSRinfo extensions not equals Certinfo dns', async () => {
    const csrExtensions = {
      DNSNames: [
        'hub2.test.modusbox.com',
        'hub1.test.modusbox.com'
      ],
      IPAddresses: [
        '163.10.5.22',
        '163.10.5.24'
      ]
    };

    const certExtensions = {
      SubjectSANs: {
        DNSNames: [
          'hub1.test.modusbox.com',
          'hub2.test.modusbox.com'
        ],
        IPAddresses: [
          '163.10.5.24',
          '163.10.5.23'
        ]
      }
    };

    const csrInfo = new CSRInfo(csrExtensions);
    const certInfo = new CertInfo(certExtensions);

    const validation = PKIEngine.compareSubjectAltNameBetweenCSRandCert(csrInfo, certInfo);

    assert.isFalse(validation.valid);
    assert.isNotNull(validation.reason);

    const csrExtensions2 = {
      DNSNames: [
        'hub23.test.modusbox.com',
        'hub1.test.modusbox.com'
      ],
      IPAddresses: [
        '163.10.5.22',
        '163.10.5.24'
      ]
    };

    const certExtensions2 = {
      SubjectSANs: {
        DNSNames: [
          'hub1.test.modusbox.com',
          'hub2.test.modusbox.com'
        ],
        IPAddresses: [
          '163.10.5.24',
          '163.10.5.22'
        ]
      }
    };

    const csrInfo2 = new CSRInfo(csrExtensions2);
    const certInfo2 = new CertInfo(certExtensions2);

    const validation2 = PKIEngine.compareSubjectAltNameBetweenCSRandCert(csrInfo2, certInfo2);

    assert.isFalse(validation2.valid);
    assert.isNotNull(validation2.reason);
  });

  it('should validate a CSRinfo extensions not equals Certinfo IP', async () => {
    const csrExtensions = {
      DNSNames: [
        'hub2.test.modusbox.com',
        'hub1.test.modusbox.com'
      ],
      IPAddresses: [
        '163.10.5.24'
      ]
    };

    const certExtensions = {
      SubjectSANs: {
        DNSNames: [
          'hub1.test.modusbox.com',
          'hub3.test.modusbox.com'
        ],
        IPAddresses: [
          '163.10.5.24',
          '163.10.5.22'
        ]
      }
    };

    const csrInfo = new CSRInfo(csrExtensions);
    const certInfo = new CertInfo(certExtensions);

    const validation = PKIEngine.compareSubjectAltNameBetweenCSRandCert(csrInfo, certInfo);

    assert.isFalse(validation.valid);
    assert.isNotNull(validation.reason);

    const csrExtensions2 = {
      DNSNames: [
        'hub23.test.modusbox.com',
        'hub1.test.modusbox.com'
      ],
      IPAddresses: [
        '163.10.5.22',
        '163.10.5.24'
      ]
    };

    const certExtensions2 = {
      SubjectSANs: {
        DNSNames: [
          'hub1.test.modusbox.com',
          'hub2.test.modusbox.com'
        ],
        IPAddresses: [
          '163.10.5.22'
        ]
      }
    };

    const csrInfo2 = new CSRInfo(csrExtensions2);
    const certInfo2 = new CertInfo(certExtensions2);

    const validation2 = PKIEngine.compareSubjectAltNameBetweenCSRandCert(csrInfo2, certInfo2);

    assert.isFalse(validation2.valid);
    assert.isNotNull(validation2.reason);
  });
});
