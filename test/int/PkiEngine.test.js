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
const { expect } = require('chai');
const forge = require('node-forge');
const PKIEngine = require('../../src/pki_engine/PKIEngine');
const ValidationCodes = require('../../src/pki_engine/ValidationCodes');
const Validation = require('../../src/pki_engine/Validation');
const CSRInfo = require('../../src/pki_engine/CSRInfo');
const CertInfo = require('../../src/pki_engine/CertInfo');
const Constants = require('../../src/constants/Constants');
const VaultPKIEngine = require('../../src/pki_engine/VaultPKIEngine');
const ValidationsConfiguration = require('../../src/pki_engine/ValidationsConfiguration'); 
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

  it('should validate VERIFY_ROOT_CERTIFICATE', () => {
    const verifyRootCertificateStub = sinon.stub(pkiEngine, 'verifyRootCertificate').returns(new Validation(ValidationCodes.VALIDATION_CODES.VERIFY_ROOT_CERTIFICATE.code, true, ValidationCodes.VALID_STATES.VALID));
    const result = pkiEngine.performCAValidations([ValidationCodes.VALIDATION_CODES.VERIFY_ROOT_CERTIFICATE.code], 'intermediateChain', 'rootCertificate', 'key');
    expect(verifyRootCertificateStub.calledOnce).to.be.true;
    expect(result.validationState).to.equal(ValidationCodes.VALID_STATES.VALID);
  });

  //06/02/2025
  describe('PKIEngine', () => {
    let pkiEngine;
    let validationConfigStub;
  
    beforeEach(() => {
      validationConfigStub = {
        dfspCaValidations: [
          ValidationCodes.VALIDATION_CODES.VERIFY_ROOT_CERTIFICATE.code,
          ValidationCodes.VALIDATION_CODES.VERIFY_CHAIN_CERTIFICATES.code,
          ValidationCodes.VALIDATION_CODES.CA_CERTIFICATE_USAGE.code,
          ValidationCodes.VALIDATION_CODES.CSR_CERT_PUBLIC_PRIVATE_KEY_MATCH.code
        ]
      };
      pkiEngine = new PKIEngine({ validationConfig: validationConfigStub });
    });
  
    afterEach(() => {
      sinon.restore();
    });
  
    describe('performCAValidations', () => {
      it('should validate VERIFY_ROOT_CERTIFICATE', () => {
        const verifyRootCertificateStub = sinon.stub(pkiEngine, 'verifyRootCertificate').returns(new Validation(ValidationCodes.VALIDATION_CODES.VERIFY_ROOT_CERTIFICATE.code, true, ValidationCodes.VALID_STATES.VALID));
        const result = pkiEngine.performCAValidations([ValidationCodes.VALIDATION_CODES.VERIFY_ROOT_CERTIFICATE.code], 'intermediateChain', 'rootCertificate', 'key');
        expect(verifyRootCertificateStub.calledOnce).to.be.true;
        expect(result.validationState).to.equal(ValidationCodes.VALID_STATES.VALID);
      });
  
      it('should validate VERIFY_CHAIN_CERTIFICATES', () => {
        const verifyIntermediateChainStub = sinon.stub(pkiEngine, 'verifyIntermediateChain').returns(new Validation(ValidationCodes.VALIDATION_CODES.VERIFY_CHAIN_CERTIFICATES.code, true, ValidationCodes.VALID_STATES.VALID));
        const result = pkiEngine.performCAValidations([ValidationCodes.VALIDATION_CODES.VERIFY_CHAIN_CERTIFICATES.code], 'intermediateChain', 'rootCertificate', 'key');
        expect(verifyIntermediateChainStub.calledOnce).to.be.true;
        expect(result.validationState).to.equal(ValidationCodes.VALID_STATES.VALID);
      });
  
      it('should validate CA_CERTIFICATE_USAGE', () => {
        const validateCertificateUsageCAStub = sinon.stub(pkiEngine, 'validateCertificateUsageCA').returns(new Validation(ValidationCodes.VALIDATION_CODES.CA_CERTIFICATE_USAGE.code, true, ValidationCodes.VALID_STATES.VALID));
        const result = pkiEngine.performCAValidations([ValidationCodes.VALIDATION_CODES.CA_CERTIFICATE_USAGE.code], 'intermediateChain', 'rootCertificate', 'key');
        expect(validateCertificateUsageCAStub.calledOnce).to.be.true;
        expect(result.validationState).to.equal(ValidationCodes.VALID_STATES.VALID);
      });
  
      it('should validate CSR_CERT_PUBLIC_PRIVATE_KEY_MATCH', () => {
        const verifyCertificateChainPublicKeyMatchPrivateKeyStub = sinon.stub(pkiEngine, 'verifyCertificateChainPublicKeyMatchPrivateKey').returns(new Validation(ValidationCodes.VALIDATION_CODES.CSR_CERT_PUBLIC_PRIVATE_KEY_MATCH.code, true, ValidationCodes.VALID_STATES.VALID));
        const result = pkiEngine.performCAValidations([ValidationCodes.VALIDATION_CODES.CSR_CERT_PUBLIC_PRIVATE_KEY_MATCH.code], 'intermediateChain', 'rootCertificate', 'key');
        expect(verifyCertificateChainPublicKeyMatchPrivateKeyStub.calledOnce).to.be.true;
        expect(result.validationState).to.equal(ValidationCodes.VALID_STATES.VALID);
      });
  
      it('should log a message for unimplemented validation codes', () => {
        const consoleLogStub = sinon.stub(console, 'log');
        const result = pkiEngine.performCAValidations(['UNIMPLEMENTED_CODE'], 'intermediateChain', 'rootCertificate', 'key');
        expect(consoleLogStub.calledOnceWith('Validation not yet implemented: UNIMPLEMENTED_CODE')).to.be.true;
        expect(result.validationState).to.equal(ValidationCodes.VALID_STATES.VALID);
      });
     });

     it('should validate CSR_CERT_SAME_CN', () => {
      const verifyCertificateCSRSameCNStub = sinon.stub(pkiEngine, 'verifyCertificateCSRSameCN').returns(new Validation(ValidationCodes.VALIDATION_CODES.CSR_CERT_SAME_CN.code, true, ValidationCodes.VALID_STATES.VALID));
      const enrollment = { csr: 'some-csr' };
      const result = pkiEngine.performCAValidations([ValidationCodes.VALIDATION_CODES.CSR_CERT_SAME_CN.code], enrollment, 'rootCertificate', 'key');
      
      console.log('Called with:', verifyCertificateCSRSameCNStub.args);
      
      expect(verifyCertificateCSRSameCNStub.calledOnceWith(ValidationCodes.VALIDATION_CODES.CSR_CERT_SAME_CN.code, enrollment)).to.be.true;
      expect(result.validationState).to.equal(ValidationCodes.VALID_STATES.VALID);
      
      verifyCertificateCSRSameCNStub.restore();
     });

     it('should validate CSR_MANDATORY_DISTINGUISHED_NAME', () => {
      const verifyCsrMandatoryDistinguishedNamesStub = sinon.stub(pkiEngine, 'verifyCsrMandatoryDistinguishedNames').returns(new Validation(ValidationCodes.VALIDATION_CODES.CSR_MANDATORY_DISTINGUISHED_NAME.code, true, ValidationCodes.VALID_STATES.VALID));
      const enrollment = { csr: 'some-csr' };
      const result = pkiEngine.performCAValidations([ValidationCodes.VALIDATION_CODES.CSR_MANDATORY_DISTINGUISHED_NAME.code], enrollment, 'rootCertificate', 'key');
      
      expect(verifyCsrMandatoryDistinguishedNamesStub.calledOnceWith(enrollment.csr, ValidationCodes.VALIDATION_CODES.CSR_MANDATORY_DISTINGUISHED_NAME.code)).to.be.true;
      expect(result.validationState).to.equal(ValidationCodes.VALID_STATES.VALID);
      
      verifyCsrMandatoryDistinguishedNamesStub.restore();
     });

     it('should validate CERTIFICATE_USAGE_CLIENT', () => {
      const verifyCertificateUsageClientStub = sinon.stub(pkiEngine, 'verifyCertificateUsageClient').returns(new Validation(ValidationCodes.VALIDATION_CODES.CERTIFICATE_USAGE_CLIENT.code, true, ValidationCodes.VALID_STATES.VALID));
      const enrollment = { certificate: 'some-certificate' };
      const result = pkiEngine.performCAValidations([ValidationCodes.VALIDATION_CODES.CERTIFICATE_USAGE_CLIENT.code], enrollment, 'rootCertificate', 'key');
      
      expect(verifyCertificateUsageClientStub.calledOnceWith(enrollment.certificate, ValidationCodes.VALIDATION_CODES.CERTIFICATE_USAGE_CLIENT.code)).to.be.true;
      expect(result.validationState).to.equal(ValidationCodes.VALID_STATES.VALID);
      
      verifyCertificateUsageClientStub.restore();
     }); 
      

     describe('verifyCertificateAgainstKey', () => {
      it('should return undefined', () => {
        const result = pkiEngine.verifyCertificateAgainstKey('some-certificate', 'some-key');
        expect(result).to.be.undefined;
      });
     });
      //07/02/2025
    

  
    describe('verifyRootCertificate', () => {
      it('should return a Validation object', () => {
        const validationStub = sinon.stub(pkiEngine, 'verifyRootCertificate').returns(new Validation('some-code', true, ValidationCodes.VALID_STATES.VALID));
        const result = pkiEngine.verifyRootCertificate('some-root-certificate', 'some-code');
        expect(validationStub.calledOnceWith('some-root-certificate', 'some-code')).to.be.true;
        expect(result).to.be.an.instanceof(Validation);
        validationStub.restore();
      });
     });
  
    describe('verifyIntermediateChain', () => {
      it('should return a Validation object', () => {
        const validationStub = sinon.stub(pkiEngine, 'verifyIntermediateChain').returns(new Validation('some-code', true, ValidationCodes.VALID_STATES.VALID));
        const result = pkiEngine.verifyIntermediateChain('some-root-certificate', 'some-intermediate-chain', 'some-code');
        expect(validationStub.calledOnceWith('some-root-certificate', 'some-intermediate-chain', 'some-code')).to.be.true;
        expect(result).to.be.an.instanceof(Validation);
        validationStub.restore();
      });
    });

    describe('verifyCertificateSigning', () => {
      it('should return undefined', () => {
        const result = pkiEngine.verifyCertificateSigning('some-certificate', 'some-root-certificate', 'some-intermediate-chain');
        expect(result).to.be.undefined;
      });
     });
  
    describe('getCSRInfo', () => {
      it('should return undefined', () => {
        const result = pkiEngine.getCSRInfo('some-csr');
        expect(result).to.be.undefined;
      });
    });
  
    describe('getCertInfo', () => {
      it('should return undefined', () => {
        const result = pkiEngine.getCertInfo('some-cert');
        expect(result).to.be.undefined;
      });
    });

     describe('createCA', () => {
    it('should return undefined', async () => {
      const result = await pkiEngine.createCA({});
      expect(result).to.be.undefined;
    });
  });

  describe('sign', () => {
    it('should return undefined', async () => {
      const result = await pkiEngine.sign('some-csr');
      expect(result).to.be.undefined;
    });
  });

  describe('createCSR', () => {
    it('should return undefined', async () => {
      const result = await pkiEngine.createCSR({});
      expect(result).to.be.undefined;
    });
  });

  it('should log a message for unimplemented validation codes', () => {
      const consoleLogStub = sinon.stub(console, 'log');
      const validationCode = 'UNIMPLEMENTED_CODE';
      const result = pkiEngine.performCAValidations([validationCode], 'intermediateChain', 'rootCertificate', 'key');
      
      expect(consoleLogStub.calledOnceWith(`Validation not yet implemented: ${validationCode}`)).to.be.true;
      expect(result.validationState).to.equal(ValidationCodes.VALID_STATES.VALID);
      
      consoleLogStub.restore();
    });
//07/02/2025
    it('should handle multiple validation codes', () => {
      const consoleLogStub = sinon.stub(console, 'log');
      const verifyRootCertificateStub = sinon.stub(pkiEngine, 'verifyRootCertificate').returns(new Validation(ValidationCodes.VALIDATION_CODES.VERIFY_ROOT_CERTIFICATE.code, true, ValidationCodes.VALID_STATES.VALID));
      const validationCodes = [
        ValidationCodes.VALIDATION_CODES.VERIFY_ROOT_CERTIFICATE.code,
        'UNIMPLEMENTED_CODE'
      ];
      const result = pkiEngine.performCAValidations(validationCodes, 'intermediateChain', 'rootCertificate', 'key');
      
      expect(verifyRootCertificateStub.calledOnceWith('rootCertificate', ValidationCodes.VALIDATION_CODES.VERIFY_ROOT_CERTIFICATE.code)).to.be.true;
      expect(consoleLogStub.calledOnceWith('Validation not yet implemented: UNIMPLEMENTED_CODE')).to.be.true;
      expect(result.validationState).to.equal(ValidationCodes.VALID_STATES.VALID);
      
      verifyRootCertificateStub.restore();
      consoleLogStub.restore();
    });

    it('should handle an empty array of validation codes', () => {
      const result = pkiEngine.performCAValidations([], 'intermediateChain', 'rootCertificate', 'key');
      expect(result.validationState).to.equal(ValidationCodes.VALID_STATES.VALID);
    });

    it('should handle null values for parameters', () => {
      const consoleLogStub = sinon.stub(console, 'log');
      
      // Call the function with null parameters
      const result = pkiEngine.performCAValidations(null, null, null, null);
    
      // Log the result to inspect it
      console.log('Function Output:', result);
    
      expect(result).to.be.an('object');
      expect(result).to.have.property('validations').that.is.an('array');
      expect(result).to.have.property('validationState');
    
      consoleLogStub.restore();
    });

    it('should handle undefined values for parameters', () => {
      const result = pkiEngine.performCAValidations(undefined, undefined, undefined, undefined);
      
      expect(result.validations).to.be.an('array').that.is.empty;
      expect(result.validationState).to.equal(ValidationCodes.VALID_STATES.VALID);
    });

    it('should validate CSR_CERT_PUBLIC_PRIVATE_KEY_MATCH', () => {
      const verifyCertificateChainPublicKeyMatchPrivateKeyStub = sinon.stub(pkiEngine, 'verifyCertificateChainPublicKeyMatchPrivateKey').returns(new Validation(ValidationCodes.VALIDATION_CODES.CSR_CERT_PUBLIC_PRIVATE_KEY_MATCH.code, true, ValidationCodes.VALID_STATES.VALID));
      const result = pkiEngine.performCAValidations([ValidationCodes.VALIDATION_CODES.CSR_CERT_PUBLIC_PRIVATE_KEY_MATCH.code], 'intermediateChain', 'rootCertificate', 'key');
      expect(verifyCertificateChainPublicKeyMatchPrivateKeyStub.calledOnce).to.be.true;
      expect(result.validationState).to.equal(ValidationCodes.VALID_STATES.VALID);
    });
    it('should validate CA_CERTIFICATE_USAGE', () => {
      const validateCertificateUsageCAStub = sinon.stub(pkiEngine, 'validateCertificateUsageCA').returns(new Validation(ValidationCodes.VALIDATION_CODES.CA_CERTIFICATE_USAGE.code, true, ValidationCodes.VALID_STATES.VALID));
      const result = pkiEngine.performCAValidations([ValidationCodes.VALIDATION_CODES.CA_CERTIFICATE_USAGE.code], 'intermediateChain', 'rootCertificate', 'key');
      expect(validateCertificateUsageCAStub.calledOnce).to.be.true;
      expect(result.validationState).to.equal(ValidationCodes.VALID_STATES.VALID);
    });
    it('should validate VERIFY_CHAIN_CERTIFICATES', () => {
      const verifyIntermediateChainStub = sinon.stub(pkiEngine, 'verifyIntermediateChain').returns(new Validation(ValidationCodes.VALIDATION_CODES.VERIFY_CHAIN_CERTIFICATES.code, true, ValidationCodes.VALID_STATES.VALID));
      const result = pkiEngine.performCAValidations([ValidationCodes.VALIDATION_CODES.VERIFY_CHAIN_CERTIFICATES.code], 'intermediateChain', 'rootCertificate', 'key');
      expect(verifyIntermediateChainStub.calledOnce).to.be.true;
      expect(result.validationState).to.equal(ValidationCodes.VALID_STATES.VALID);
    });

    it('should validate VERIFY_ROOT_CERTIFICATE', () => {
      const verifyRootCertificateStub = sinon.stub(pkiEngine, 'verifyRootCertificate').returns(new Validation(ValidationCodes.VALIDATION_CODES.VERIFY_ROOT_CERTIFICATE.code, true, ValidationCodes.VALID_STATES.VALID));
      const result = pkiEngine.performCAValidations([ValidationCodes.VALIDATION_CODES.VERIFY_ROOT_CERTIFICATE.code], 'intermediateChain', 'rootCertificate', 'key');
      expect(verifyRootCertificateStub.calledOnce).to.be.true;
      expect(result.validationState).to.equal(ValidationCodes.VALID_STATES.VALID);
    });
    it('should handle a mix of valid and invalid validation results', () => {
      const verifyRootCertificateStub = sinon.stub(pkiEngine, 'verifyRootCertificate').returns(new Validation(ValidationCodes.VALIDATION_CODES.VERIFY_ROOT_CERTIFICATE.code, true, ValidationCodes.VALID_STATES.VALID));
      const verifyIntermediateChainStub = sinon.stub(pkiEngine, 'verifyIntermediateChain').returns(new Validation(ValidationCodes.VALIDATION_CODES.VERIFY_CHAIN_CERTIFICATES.code, false, ValidationCodes.VALID_STATES.INVALID));
      const validationCodes = [
        ValidationCodes.VALIDATION_CODES.VERIFY_ROOT_CERTIFICATE.code,
        ValidationCodes.VALIDATION_CODES.VERIFY_CHAIN_CERTIFICATES.code
      ];
      const result = pkiEngine.performCAValidations(validationCodes, 'intermediateChain', 'rootCertificate', 'key');
      
      expect(verifyRootCertificateStub.calledOnceWith('rootCertificate', ValidationCodes.VALIDATION_CODES.VERIFY_ROOT_CERTIFICATE.code)).to.be.true;
      expect(verifyIntermediateChainStub.calledOnceWith('rootCertificate', 'intermediateChain', ValidationCodes.VALIDATION_CODES.VERIFY_CHAIN_CERTIFICATES.code)).to.be.true;
      expect(result.validationState).to.equal(ValidationCodes.VALID_STATES.INVALID);
      
      verifyRootCertificateStub.restore();
      verifyIntermediateChainStub.restore();
    });
    

   describe('verifyCertificateCSRSameCN', () => {
    it('should return invalid if CSR subject does not match certificate subject', () => {
      const enrollment = {
        csrInfo: {
          subject: {
            CN: 'example.com'
          }
        },
        certInfo: {
          subject: {
            CN: 'different.com'
          }
        }
      };
      const code = 'some-code';

      const result = pkiEngine.verifyCertificateCSRSameCN(code, enrollment);
      expect(result).to.deep.equal({ valid: false, reason: `csr subject CN: example.com is not equals cert subject CN: different.com` });
    });

    it('should return valid if CSR subject matches certificate subject', () => {
      const enrollment = {
        csrInfo: {
          subject: {
            CN: 'example.com'
          }
        },
        certInfo: {
          subject: {
            CN: 'example.com'
          }
        }
      };
      const code = 'some-code';

      const result = pkiEngine.verifyCertificateCSRSameCN(code, enrollment);
      expect(result).to.deep.equal({ valid: true });
    });

    it('should return invalid if CSR subject has additional fields not in certificate subject', () => {
      const enrollment = {
        csrInfo: {
          subject: {
            CN: 'example.com',
            O: 'Example Organization'
          }
        },
        certInfo: {
          subject: {
            CN: 'example.com'
          }
        }
      };
      const code = 'some-code';

      const result = pkiEngine.verifyCertificateCSRSameCN(code, enrollment);
      expect(result).to.deep.equal({ valid: false, reason: `csr subject O: Example Organization is not equals cert subject O: undefined` });
    });

    it('should return invalid if certificate subject has additional fields not in CSR subject', () => {
      const enrollment = {
        csrInfo: {
          subject: {
            CN: 'example.com'
          }
        },
        certInfo: {
          subject: {
            CN: 'example.com',
            O: 'Example Organization'
          }
        }
      };
      const code = 'some-code';

      const result = pkiEngine.verifyCertificateCSRSameCN(code, enrollment);
      expect(result).to.deep.equal({ valid: false, reason: `csr subject O: undefined is not equals cert subject O: Example Organization` });
    });

    it('should return invalid if multiple fields in CSR subject do not match certificate subject', () => {
      const enrollment = {
        csrInfo: {
          subject: {
            CN: 'example.com',
            O: 'Example Organization'
          }
        },
        certInfo: {
          subject: {
            CN: 'different.com',
            O: 'Different Organization'
          }
        }
      };
      const code = 'some-code';

      const result = pkiEngine.verifyCertificateCSRSameCN(code, enrollment);
      expect(result).to.deep.equal({ valid: false, reason: `csr subject CN: example.com is not equals cert subject CN: different.com` });
    });
  });
  });
   
//07/02/2025
it('should log a message for an unimplemented validation code', () => {
  const consoleLogStub = sinon.stub(console, 'log');

  const result = pkiEngine.performCAValidations(['UNKNOWN_CODE'], 'intermediateChain', 'rootCertificate', 'key');

  expect(consoleLogStub.calledOnceWith('Validation not yet implemented: UNKNOWN_CODE')).to.be.true;

  expect(result).to.be.an('object');
  expect(result).to.have.property('validations').that.is.an('array');
  expect(result).to.have.property('validationState');

  consoleLogStub.restore();
});
describe('performEnrollmentValidations', () => {
  

  it('should return valid when all validations pass', () => {
    sinon.stub(pkiEngine, 'validateCsrSignatureValid').returns({ result: ValidationCodes.VALID_STATES.VALID });
    sinon.stub(pkiEngine, 'validateCsrSignatureAlgorithm').returns({ result: ValidationCodes.VALID_STATES.VALID });

    const enrollment = { csr: 'test-csr', certificate: 'test-cert' };
    const result = pkiEngine.performEnrollmentValidations(
      [ValidationCodes.VALIDATION_CODES.CSR_SIGNATURE_VALID.code, ValidationCodes.VALIDATION_CODES.CSR_SIGNATURE_ALGORITHM_SHA256_512.code],
      enrollment
    );

    expect(result.validationState).to.equal(ValidationCodes.VALID_STATES.VALID);
    expect(result.validations).to.have.lengthOf(2);
  });

  it('should return invalid when at least one validation fails', () => {
    sinon.stub(pkiEngine, 'validateCsrSignatureValid').returns({ result: ValidationCodes.VALID_STATES.INVALID });
    sinon.stub(pkiEngine, 'validateCsrSignatureAlgorithm').returns({ result: ValidationCodes.VALID_STATES.VALID });

    const enrollment = { csr: 'test-csr', certificate: 'test-cert' };
    const result = pkiEngine.performEnrollmentValidations(
      [ValidationCodes.VALIDATION_CODES.CSR_SIGNATURE_VALID.code, ValidationCodes.VALIDATION_CODES.CSR_SIGNATURE_ALGORITHM_SHA256_512.code],
      enrollment
    );

    expect(result.validationState).to.equal(ValidationCodes.VALID_STATES.INVALID);
  });

  it('should log a message for an unknown validation code', () => {
    const consoleLogStub = sinon.stub(console, 'log');
    
    const enrollment = { csr: 'test-csr', certificate: 'test-cert' };
    pkiEngine.performEnrollmentValidations(['UNKNOWN_CODE'], enrollment);

    expect(consoleLogStub.calledOnceWith('Validation not yet implemented: UNKNOWN_CODE')).to.be.true;
  });

  it('should handle null values for enrollment', () => {
    const consoleLogStub = sinon.stub(console, 'log');
  
    expect(() => pkiEngine.performEnrollmentValidations(
      [ValidationCodes.VALIDATION_CODES.CSR_SIGNATURE_VALID.code], 
      null
    )).to.throw(TypeError);
  
    expect(consoleLogStub.called).to.be.false; 
  });
  

  it('should throw an error for undefined enrollment', () => {
    const consoleLogStub = sinon.stub(console, 'log');
  
    expect(() => pkiEngine.performEnrollmentValidations(
      [ValidationCodes.VALIDATION_CODES.CSR_SIGNATURE_VALID.code], 
      undefined
    )).to.throw(TypeError);
  
    expect(consoleLogStub.called).to.be.false; // No unexpected logs
  });

it('should log message for unimplemented validation code', () => {
  const consoleLogStub = sinon.stub(console, 'log'); 
  const unknownValidationCode = 'UNKNOWN_VALIDATION_CODE';

  const result = pkiEngine.performCertificateValidations(
    [unknownValidationCode], 
    'dummy-server-cert', 
    'dummy-intermediate-chain', 
    'dummy-root-cert'
  );

  expect(consoleLogStub.calledOnceWith(`Validation not yet implemented: ${unknownValidationCode}`)).to.be.true;

  expect(result.validationState).to.equal(ValidationCodes.VALID_STATES.VALID);

  consoleLogStub.restore(); 
});

it('should validate certificate key length 2048 when CERTIFICATE_PUBLIC_KEY_LENGTH_2048 code is passed', () => {
  const validateCertificateKeyLengthStub = sinon.stub(pkiEngine, 'validateCertificateKeyLength').returns({ result: ValidationCodes.VALID_STATES.VALID });
  const serverCert = 'dummy-server-cert'; 
  const intermediateChain = 'dummy-intermediate-chain';
  const rootCertificate = 'dummy-root-cert';
  const result = pkiEngine.performCertificateValidations(
    [ValidationCodes.VALIDATION_CODES.CERTIFICATE_PUBLIC_KEY_LENGTH_2048.code],
    serverCert,
    intermediateChain,
    rootCertificate
  );
  expect(validateCertificateKeyLengthStub.calledOnceWith(serverCert, 2048, ValidationCodes.VALIDATION_CODES.CERTIFICATE_PUBLIC_KEY_LENGTH_2048.code)).to.be.true;
  expect(result.validationState).to.equal(ValidationCodes.VALID_STATES.VALID);
  validateCertificateKeyLengthStub.restore();
});
   
it('should validate CSR public key length 2048 when CSR_PUBLIC_KEY_LENGTH_2048 code is passed', () => {
  const validateCsrPublicKeyLengthStub = sinon.stub(pkiEngine, 'validateCsrPublicKeyLength').returns({ result: ValidationCodes.VALID_STATES.VALID });
  const enrollment = {
    csr: 'dummy-csr', 
    certificate: 'dummy-certificate',
    key: 'dummy-key',
    dfspCA: 'dummy-dfspCA',
  };
  const result = pkiEngine.performEnrollmentValidations(
    [ValidationCodes.VALIDATION_CODES.CSR_PUBLIC_KEY_LENGTH_2048.code],
    enrollment
  );
  expect(validateCsrPublicKeyLengthStub.calledOnceWith(enrollment.csr, ValidationCodes.VALIDATION_CODES.CSR_PUBLIC_KEY_LENGTH_2048.code, ValidationCodes.VALIDATION_CODES.CSR_PUBLIC_KEY_LENGTH_2048.param)).to.be.true;
  expect(result.validationState).to.equal(ValidationCodes.VALID_STATES.VALID);
  validateCsrPublicKeyLengthStub.restore();
});

it('should validate that CSR and Certificate have the same CN', () => {
  const verifyCertificateCSRSameCNStub = sinon.stub(pkiEngine, 'verifyCertificateCSRSameCN').returns({ result: ValidationCodes.VALID_STATES.VALID });

  const enrollment = {
    csr: 'dummy-csr',
    certificate: 'dummy-certificate',
  };

  const result = pkiEngine.performEnrollmentValidations(
    [ValidationCodes.VALIDATION_CODES.CSR_CERT_SAME_CN.code],
    enrollment
  );

  expect(verifyCertificateCSRSameCNStub.calledOnceWith(ValidationCodes.VALIDATION_CODES.CSR_CERT_SAME_CN.code, enrollment)).to.be.true;

  expect(result.validationState).to.equal(ValidationCodes.VALID_STATES.VALID);
  verifyCertificateCSRSameCNStub.restore();
});
it('should validate that CSR contains mandatory Distinguished Names', () => {
  const verifyCsrMandatoryDistinguishedNamesStub = sinon.stub(pkiEngine, 'verifyCsrMandatoryDistinguishedNames').returns({ result: ValidationCodes.VALID_STATES.VALID });

  const enrollment = {
    csr: 'dummy-csr',
  };
  const result = pkiEngine.performEnrollmentValidations(
    [ValidationCodes.VALIDATION_CODES.CSR_MANDATORY_DISTINGUISHED_NAME.code],
    enrollment
  );

  expect(verifyCsrMandatoryDistinguishedNamesStub.calledOnceWith(enrollment.csr, ValidationCodes.VALIDATION_CODES.CSR_MANDATORY_DISTINGUISHED_NAME.code)).to.be.true;
  expect(result.validationState).to.equal(ValidationCodes.VALID_STATES.VALID);

  verifyCsrMandatoryDistinguishedNamesStub.restore();
});
it('should validate that certificate is for client usage', () => {
  const verifyCertificateUsageClientStub = sinon.stub(pkiEngine, 'verifyCertificateUsageClient').returns({ result: ValidationCodes.VALID_STATES.VALID });
  const enrollment = {
    certificate: 'dummy-certificate',
  };
  const result = pkiEngine.performEnrollmentValidations(
    [ValidationCodes.VALIDATION_CODES.CERTIFICATE_USAGE_CLIENT.code],
    enrollment
  );

  expect(verifyCertificateUsageClientStub.calledOnceWith(enrollment.certificate, ValidationCodes.VALIDATION_CODES.CERTIFICATE_USAGE_CLIENT.code)).to.be.true;

  expect(result.validationState).to.equal(ValidationCodes.VALID_STATES.VALID);
  verifyCertificateUsageClientStub.restore();
});
it('should return VALID if any certificate in the chain matches the private key', () => {
  const certificateChain = [
    { cert: 'cert1' }, 
    { cert: 'cert2' }  
  ];
  const key = 'privateKey'; 
  const code = 'TEST_CODE';
  pkiEngine.splitCertificateChain = (chain) => chain;
  pkiEngine.verifyCertificatePublicKeyMatchPrivateKey = (cert, key, code) => {
    if (cert.cert === 'cert2') {
      return { result: ValidationCodes.VALID_STATES.VALID };
    }
    return { result: ValidationCodes.VALID_STATES.INVALID };
  };
  const result = pkiEngine.verifyCertificateChainPublicKeyMatchPrivateKey(certificateChain, key, code);
  expect(result).to.be.instanceOf(Validation); 
  expect(result.validationCode).to.equal(code);  
  expect(result.result).to.equal(ValidationCodes.VALID_STATES.VALID);
});

it('should return INVALID if no certificate in the chain matches the private key', () => {
  const certificateChain = [
    { cert: 'cert1' }, 
    { cert: 'cert3' }  
  ];
  const key = 'privateKey'; 
  const code = 'TEST_CODE';

  pkiEngine.splitCertificateChain = (chain) => chain;
  pkiEngine.verifyCertificatePublicKeyMatchPrivateKey = (cert, key, code) => {
    return { result: ValidationCodes.VALID_STATES.INVALID }; 
  };

  const result = pkiEngine.verifyCertificateChainPublicKeyMatchPrivateKey(certificateChain, key, code);

  expect(result).to.be.instanceOf(Validation);
  expect(result.validationCode).to.equal(code);  
  expect(result.result).to.equal(ValidationCodes.VALID_STATES.INVALID); 
  expect(result.message).to.equal('No certificate matches the private key'); 
});

it('should return valid=true when CSR and certificate subjects match', () => {
  const csrInfo = {
    subject: {
      CN: 'example.com',
      O: 'Example Org',
    },
  };

  const certInfo = {
    subject: {
      CN: 'example.com',
      O: 'Example Org',
    },
  };

  const result = pkiEngine.compareSubjectBetweenCSRandCert(csrInfo, certInfo);

  expect(result).to.deep.equal({ valid: true });
});
it('should return valid=false and the correct reason when CSR and certificate subjects do not match', () => {
  const csrInfo = {
    subject: {
      CN: 'example.com',
      O: 'Example Org',
    },
  };

  const certInfo = {
    subject: {
      CN: 'example.com',
      O: 'Different Org', // Mismatched
    },
  };

  const result = pkiEngine.compareSubjectBetweenCSRandCert(csrInfo, certInfo);

  expect(result).to.deep.equal({
    valid: false,
    reason: 'csr subject O: Example Org is not equals cert subject O: Different Org',
  });
});
it('should return valid=false and the correct reason when a CSR field is missing in the certificate', () => {
  const csrInfo = {
    subject: {
      CN: 'example.com',
      O: 'Example Org',
    },
  };

  const certInfo = {
    subject: {
      CN: 'example.com', // No 'O' field in certificate
    },
  };

  const result = pkiEngine.compareSubjectBetweenCSRandCert(csrInfo, certInfo);

  expect(result).to.deep.equal({
    valid: false,
    reason: 'csr subject O: Example Org is not equals cert subject O: undefined',
  });
});
it('should return valid=false if CSR subject is empty', () => {
  const csrInfo = {
    subject: {},
  };

  const certInfo = {
    subject: {
      CN: 'example.com',
      O: 'Example Org',
    },
  };

  const result = pkiEngine.compareSubjectBetweenCSRandCert(csrInfo, certInfo);

  expect(result).to.deep.equal({
    valid: false,
    reason: 'csr subject CN: undefined is not equals cert subject CN: example.com',
  });
});

it('should return valid=false if certificate subject is empty', () => {
  const csrInfo = {
    subject: {
      CN: 'example.com',
      O: 'Example Org',
    },
  };

  const certInfo = {
    subject: {},
  };

  const result = pkiEngine.compareSubjectBetweenCSRandCert(csrInfo, certInfo);

  expect(result).to.deep.equal({
    valid: false,
    reason: 'csr subject CN: example.com is not equals cert subject CN: undefined',
  });
});
it('should return valid=false if CSR has extra fields not in the certificate subject', () => {
  const csrInfo = {
    subject: {
      CN: 'example.com',
      O: 'Example Org',
      L: 'Some Location', // Extra field in CSR
    },
  };

  const certInfo = {
    subject: {
      CN: 'example.com',
      O: 'Example Org',
    },
  };

  const result = pkiEngine.compareSubjectBetweenCSRandCert(csrInfo, certInfo);

  expect(result).to.deep.equal({
    valid: false,
    reason: 'csr subject L: Some Location is not equals cert subject L: undefined',
  });
});

it('should return valid=false when a field exists in CSR but the values are different in the certificate', () => {
  const csrInfo = {
    subject: {
      CN: 'example.com',
      O: 'Example Org',
    },
  };

  const certInfo = {
    subject: {
      CN: 'example.com',
      O: 'Different Org',  // Mismatch in the 'O' field
    },
  };

  const result = pkiEngine.compareSubjectBetweenCSRandCert(csrInfo, certInfo);

  expect(result).to.deep.equal({
    valid: false,
    reason: 'csr subject O: Example Org is not equals cert subject O: Different Org',
  });
});

it('should return valid=true when all CSR and certificate subject fields match', () => {
  const csrInfo = {
    subject: {
      CN: 'example.com',
      O: 'Example Org',
    },
  };

  const certInfo = {
    subject: {
      CN: 'example.com',
      O: 'Example Org',  // Matching 'O' field
    },
  };

  const result = pkiEngine.compareSubjectBetweenCSRandCert(csrInfo, certInfo);

  expect(result).to.deep.equal({ valid: true });
});


});

});
