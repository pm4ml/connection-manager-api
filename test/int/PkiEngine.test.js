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
const sinon = require('sinon');
const forge = require('node-forge');
const PKIEngine = require('../../src/pki_engine/PKIEngine');
const ValidationCodes = require('../../src/pki_engine/ValidationCodes');
const Validation = require('../../src/pki_engine/Validation');
const CSRInfo = require('../../src/pki_engine/CSRInfo');
const CertInfo = require('../../src/pki_engine/CertInfo');
const Constants = require('../../src/constants/Constants');
const VaultPKIEngine = require('../../src/pki_engine/VaultPKIEngine');

const { assert } = require('chai');
const vaultPKIEngine = new VaultPKIEngine(Constants.vault);

describe('verify CSRInfo subject is the same of the CertInfo', () => {
  it('should validate a CSRinfo subject is equals Certinfo subject', async () => {
    // FIXME add emailddress when cfssl returns it
    const csrSubject = { Subject: { Country: 'US', Locality: 'AT', Organization: 'Modusbox', CommonName: 'Modusbox', OrganizationalUnit: 'PKI', Province: 'GE' } };
    const certSubject = { subject: { country: 'US', locality: 'AT', organization: 'Modusbox', common_name: 'Modusbox', organizational_unit: 'PKI', province: 'GE' } };

    const csrInfo = new CSRInfo(csrSubject);
    const certInfo = new CertInfo(certSubject);

    assert.isTrue(vaultPKIEngine.compareSubjectBetweenCSRandCert(csrInfo, certInfo).valid);
  });

  it('should validate a CSRinfo subject is equals Certinfo subject in different order', async () => {
    const csrSubject = { Subject: { CommonName: 'Modusbox', Country: 'US', Locality: null, Organization: 'Modusbox', OrganizationalUnit: 'PKI', Province: null, EmailAddress: null } };
    const certSubject = { subject: { province: null, country: 'US', locality: null, organization: 'Modusbox', common_name: 'Modusbox', organizational_unit: 'PKI', email_address: null } };

    const csrInfo = new CSRInfo(csrSubject);
    const certInfo = new CertInfo(certSubject);

    assert.isTrue(vaultPKIEngine.compareSubjectBetweenCSRandCert(csrInfo, certInfo).valid);
  });

  it('should validate a CSRinfo subject not equals Certinfo', async () => {
    const csrSubject = { Subject: { CommonName: 'Modusbox2', Country: 'US', Locality: null, Organization: 'Modusbox', OrganizationalUnit: 'PKI', Province: null, EmailAddress: null } };
    const certSubject = { subject: { province: null, country: 'US', locality: null, organization: 'Modusbox', common_name: 'Modusbox', organizational_unit: 'PKI', email_address: null } };

    const csrInfo = new CSRInfo(csrSubject);
    const certInfo = new CertInfo(certSubject);

    const validation = vaultPKIEngine.compareSubjectBetweenCSRandCert(csrInfo, certInfo);

    assert.isFalse(validation.valid);
    assert.isNotNull(validation.reason);
  });

  it('should validate a CSRinfo more subjects than CertInfo', async () => {
    const csrSubject = { Subject: { CommonName: 'Modusbox', Country: 'US', Locality: null, Organization: 'Modusbox', OrganizationalUnit: 'PKI', Province: null, EmailAddress: null } };
    const certSubject = { subject: { common_name: 'Modusbox' } };

    const csrInfo = new CSRInfo(csrSubject);
    const certInfo = new CertInfo(certSubject);

    const validation = vaultPKIEngine.compareSubjectBetweenCSRandCert(csrInfo, certInfo);

    assert.isFalse(validation.valid);
    assert.isNotNull(validation.reason);
  });

  it('should validate a CertInfo more subjects than CSRinfo', async () => {
    const csrSubject = { Subject: { CommonName: 'Modusbox', Country: 'US' } };
    const certSubject = { subject: { province: null, country: 'US', locality: null, organization: 'Modusbox', common_name: 'Modusbox', organizational_unit: 'PKI', email_address: null } };

    const csrInfo = new CSRInfo(csrSubject);
    const certInfo = new CertInfo(certSubject);

    const validation = vaultPKIEngine.compareSubjectBetweenCSRandCert(csrInfo, certInfo);

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

    assert.isTrue(vaultPKIEngine.compareSubjectAltNameBetweenCSRandCert(csrInfo, certInfo).valid);
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

    assert.isTrue(vaultPKIEngine.compareSubjectAltNameBetweenCSRandCert(csrInfo, certInfo).valid);
  });

  it('should validate a CSRinfo extensions is equals Certinfo extensions both empty', async () => {
    const csrExtensions = {};

    const certExtensions = {};

    const csrInfo = new CSRInfo(csrExtensions);
    const certInfo = new CertInfo(certExtensions);

    assert.isTrue(vaultPKIEngine.compareSubjectAltNameBetweenCSRandCert(csrInfo, certInfo).valid);
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

    const validation = vaultPKIEngine.compareSubjectAltNameBetweenCSRandCert(csrInfo, certInfo);

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

    const validation2 = vaultPKIEngine.compareSubjectAltNameBetweenCSRandCert(csrInfo2, certInfo2);

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

    const validation = vaultPKIEngine.compareSubjectAltNameBetweenCSRandCert(csrInfo, certInfo);

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

    const validation2 = vaultPKIEngine.compareSubjectAltNameBetweenCSRandCert(csrInfo2, certInfo2);

    assert.isFalse(validation2.valid);
    assert.isNotNull(validation2.reason);
  });
});


describe('PKIEngine', () => {
  let pkiEngine;
  let options;

  beforeEach(() => {
    options = {
      validations: {
        jwsCertValidations: [],
        dfspCaValidations: [],
        serverCertValidations: [],
        inboundValidations: [],
        outboundValidations: []
      }
    };
    pkiEngine = new PKIEngine(options);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('validateJWSCertificate', () => {
    it('should return valid state when public key is valid', () => {
      const validPublicKey = '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvGvV7XwE\n-----END PUBLIC KEY-----';
      sinon.stub(forge.pki, 'publicKeyFromPem').returns({});

      const result = pkiEngine.validateJWSCertificate(validPublicKey);

      assert.equal(result.validationState, ValidationCodes.VALID_STATES.VALID);
      assert.lengthOf(result.validations, 1);
      assert.equal(result.validations[0].result, ValidationCodes.VALID_STATES.VALID);
    });

    it('should return invalid state when public key is invalid', () => {
      const invalidPublicKey = 'invalid-key';
      sinon.stub(forge.pki, 'publicKeyFromPem').throws(new Error('Invalid key'));

      const result = pkiEngine.validateJWSCertificate(invalidPublicKey);

      assert.equal(result.validationState, ValidationCodes.VALID_STATES.INVALID);
      assert.lengthOf(result.validations, 1);
      assert.equal(result.validations[0].result, ValidationCodes.VALID_STATES.INVALID);
    });
  });

  describe('compareSubjectBetweenCSRandCert', () => {
    it('should return valid when subjects match', () => {
      const csrInfo = {
        subject: { CN: 'test.com', O: 'Test Org' }
      };
      const certInfo = {
        subject: { CN: 'test.com', O: 'Test Org' }
      };

      const result = pkiEngine.compareSubjectBetweenCSRandCert(csrInfo, certInfo);

      assert.isTrue(result.valid);
    });

    it('should return invalid when subjects do not match', () => {
      const csrInfo = {
        subject: { CN: 'test.com', O: 'Test Org' }
      };
      const certInfo = {
        subject: { CN: 'test.com', O: 'Different Org' }
      };

      const result = pkiEngine.compareSubjectBetweenCSRandCert(csrInfo, certInfo);

      assert.isFalse(result.valid);
      assert.include(result.reason, 'is not equals cert subject');
    });
  });

  describe('compareCNBetweenCSRandCert', () => {
    it('should return valid when CNs match', () => {
      const csrInfo = {
        subject: { CN: 'test.com' }
      };
      const certInfo = {
        subject: { CN: 'test.com' }
      };

      const result = pkiEngine.compareCNBetweenCSRandCert(csrInfo, certInfo);

      assert.isTrue(result.valid);
    });

    it('should return invalid when CNs do not match', () => {
      const csrInfo = {
        subject: { CN: 'test.com' }
      };
      const certInfo = {
        subject: { CN: 'different.com' }
      };

      const result = pkiEngine.compareCNBetweenCSRandCert(csrInfo, certInfo);

      assert.isFalse(result.valid);
      assert.include(result.reason, 'are different');
    });
  });

  describe('compareSubjectAltNameBetweenCSRandCert', () => {
    it('should return valid when subject alt names match', () => {
      const csrInfo = {
        extensions: {
          subjectAltName: {
            dns: ['test1.com', 'test2.com']
          }
        }
      };
      const certInfo = {
        extensions: {
          subjectAltName: {
            dns: ['test1.com', 'test2.com']
          }
        }
      };

      const result = pkiEngine.compareSubjectAltNameBetweenCSRandCert(csrInfo, certInfo);

      assert.isTrue(result.valid);
    });

    it('should return invalid when subject alt names do not match', () => {
      const csrInfo = {
        extensions: {
          subjectAltName: {
            dns: ['test1.com', 'test2.com']
          }
        }
      };
      const certInfo = {
        extensions: {
          subjectAltName: {
            dns: ['test1.com', 'different.com']
          }
        }
      };

      const result = pkiEngine.compareSubjectAltNameBetweenCSRandCert(csrInfo, certInfo);

      assert.isFalse(result.valid);
      assert.include(result.reason, 'is not equal to cert subject');
    });
  });

  describe('verifyCSRKeyLength and verifyCertKeyLength', () => {
    it('should return valid when key length meets minimum requirement', () => {
      const result = pkiEngine.verifyCSRKeyLength('dummy-csr', 2048);
      assert.isTrue(result.valid);

      const certResult = pkiEngine.verifyCertKeyLength('dummy-cert', 2048);
      assert.isTrue(certResult.valid);
    });
  });

  describe('verifyCSRAlgorithm and verifyCertAlgorithm', () => {
    it('should return valid when algorithm matches allowed algorithms', () => {
      const result = pkiEngine.verifyCSRAlgorithm('dummy-csr', ['SHA256']);
      assert.isTrue(result.valid);

      const certResult = pkiEngine.verifyCertAlgorithm('dummy-cert', ['SHA256']);
      assert.isTrue(certResult.valid);
    });
  });

  describe('abstract methods', () => {
    const abstractMethods = [
      'createCA',
      'sign',
      'createCSR',
      'verifyCertificateSignedByDFSPCA',
      'validateCsrSignatureValid',
      'verifyCsrMandatoryDistinguishedNames',
      'verifyCertificateUsageClient', 
      'validateCsrSignatureAlgorithm',
      'validateCertificateSignatureAlgorithm',
      'verifyCertificateCSRSameSubject',
      'verifyCertificateCSRSameCN',
      'verifyCertificatePublicKeyMatchPrivateKey',
      'validateCsrPublicKeyLength',
      'verifyCertificateCSRPublicKey',
      'verifyCertificateAgainstKey',
      'verifyRootCertificate',
      'verifyIntermediateChain',
      'verifyCertificateSigning',
      'getCSRInfo',
      'getCertInfo'
    ];

    abstractMethods.forEach(method => {
      it(`should have abstract method ${method}`, () => {
        assert.isDefined(pkiEngine[method]);
      });
    });
  });

  describe('validateCertificateValidity', () => {
    it('should be defined but return undefined by default', () => {
      const result = pkiEngine.validateCertificateValidity('dummy-cert', 'TEST_CODE');
      assert.isUndefined(result);
    });
  });

  describe('validateCertificateUsageServer', () => {
    it('should be defined but return undefined by default', () => {
      const result = pkiEngine.validateCertificateUsageServer('dummy-cert');
      assert.isUndefined(result);
    });
  });

  describe('validateCertificateUsageCA', () => {
    it('should be defined but return undefined by default', () => {
      const result = pkiEngine.validateCertificateUsageCA('root-cert', 'intermediate-chain', 'TEST_CODE');
      assert.isUndefined(result);
    });
  });

  describe('validateCertificateChain', () => {
    it('should be defined but return undefined by default', () => {
      const result = pkiEngine.validateCertificateChain('server-cert', 'intermediate-chain', 'root-cert');
      assert.isUndefined(result);
    });
  });

  describe('validateCertificateKeyLength', () => {
    it('should be defined but return undefined by default', () => {
      const result = pkiEngine.validateCertificateKeyLength('server-cert', 2048, 'TEST_CODE');
      assert.isUndefined(result);
    });
  });
});
