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

const { getValidationConfig } = require('./ValidationsConfiguration');
const ValidationCodes = require('./ValidationCodes');
const Validation = require('./Validation');
const forge = require('node-forge');
const { logger } = require('../log/logger');

/**
 * PKI Engine interface
 */
class PKIEngine {
  /**
   * Creates a PKIEngine
   * @param {Object} options. Depends on the kind of PkiEngine. See subclasses
   */
  constructor (options) {
    this.opts = options;
    this.validationConfig = getValidationConfig(options);
  }

  /**
   * Creates a CA
   * @param {CAInitialInfo} options. Depends on the kind of PkiEngine. See subclasses
   * @returns An object containing the 3 components of a CA:
   * {
        cert: CA root cert
        csr: CA csr ( not used afterwards )
        key: CA private key
      }
   */
  async createCA (options) {
    return undefined;
  }

  /**
   * Signs the DFSP CSR with the Engine CA.
   *
   * @param {String} csr CSR, PEM encoded
   * @returns A PEM-encoded certificate
   */
  async sign (csr) {
    return undefined;
  }

  /**
   *
   * @param {*} keyBits Key length. If not specified, takes the CA defaults ( see constructor )
   * @param {*} algorithm signature algorithm If not specified, takes the CA defaults ( see constructor )
   */
  async createCSR (params) {
    return undefined;
  }

  /**
   * Performs a set of validations on the JWS certificate.
   *
   * @param {String} publicKey PEM-encoded JWS public key
   * @returns { validations, validationState } validations list and validationState, where validationState = VALID if all the validations are VALID or NOT_AVAIABLE; INVALID otherwise
   */
  validateJWSCertificate (publicKey) {
    const validation = new Validation(this.validationConfig.jwsCertValidations, true);
    try {
      forge.pki.publicKeyFromPem(publicKey);
    } catch (e) {
      validation.result = ValidationCodes.VALID_STATES.INVALID;
      validation.message = e.message;
      return {
        validations: [validation],
        validationState: ValidationCodes.VALID_STATES.INVALID,
      };
    }
    validation.result = ValidationCodes.VALID_STATES.VALID;
    return {
      validations: [validation],
      validationState: ValidationCodes.VALID_STATES.VALID,
    };
  }

  /**
   * Performs a set of validations on the CA certificate.
   *
   * @param {String} intermediateChain PEM-encoded certificate chain
   * @param {String} rootCertificate PEM-encoded root certificate
   * @param {String} [key] PEM-encoded certificate private key
   * @returns { validations, validationState } validations list and validationState, where validationState = VALID if all the validations are VALID or NOT_AVAIABLE; INVALID otherwise
   */
  validateCACertificate (rootCertificate, intermediateChain, key) {
    const validationCodes = [
      ...this.validationConfig.dfspCaValidations,
      ...key ? [ValidationCodes.VALIDATION_CODES.CSR_CERT_PUBLIC_PRIVATE_KEY_MATCH.code] : []
    ];
    return this.performCAValidations(validationCodes, intermediateChain, rootCertificate, key);
  }

  /**
   * Performs a set of validations on the server certificate.
   *
   * @param {String} serverCert PEM-encoded certificate
   * @param {String} intermediateChain PEM-encoded certificate chain
   * @param {String} rootCertificate PEM-encoded root certificate
   * @returns { validations, validationState } validations list and validationState, where validationState = VALID if all the validations are VALID or NOT_AVAIABLE; INVALID otherwise
   */
  validateServerCertificate (serverCert, intermediateChain, rootCertificate) {
    const validationCodes = this.validationConfig.serverCertValidations;
    return this.performCertificateValidations(validationCodes, serverCert, intermediateChain, rootCertificate);
  }

  /**
   * Performs a set of validations on the serverCert.
   *
   * @param {String[]} validationCodes List of validation codes to perform
   * @param {String} serverCert PEM-encoded certificate
   * @param {String} intermediateChain PEM-encoded certificate chain
   * @param {String} rootCertificate PEM-encoded root certificate
   * @returns { validations, validationState } validations list and validationState, where validationState = VALID if all the validations are VALID or NOT_AVAIABLE; INVALID otherwise
   */
  performCertificateValidations (validationCodes, serverCert, intermediateChain, rootCertificate) {
    const validations = [];
    for (const validationCode of validationCodes) {
      switch (validationCode) {
        case ValidationCodes.VALIDATION_CODES.CERTIFICATE_VALIDITY.code:
          validations.push(this.validateCertificateValidity(serverCert, ValidationCodes.VALIDATION_CODES.CERTIFICATE_VALIDITY.code));
          break;
        case ValidationCodes.VALIDATION_CODES.CERTIFICATE_USAGE_SERVER.code:
          validations.push(this.validateCertificateUsageServer(serverCert));
          break;
        case ValidationCodes.VALIDATION_CODES.CERTIFICATE_CHAIN.code:
          validations.push(this.validateCertificateChain(serverCert, intermediateChain, rootCertificate));
          break;
        case ValidationCodes.VALIDATION_CODES.CERTIFICATE_PUBLIC_KEY_LENGTH_2048.code:
          validations.push(this.validateCertificateKeyLength(serverCert, 2048, ValidationCodes.VALIDATION_CODES.CERTIFICATE_PUBLIC_KEY_LENGTH_2048.code));
          break;
        case ValidationCodes.VALIDATION_CODES.CERTIFICATE_PUBLIC_KEY_LENGTH_4096.code:
          validations.push(this.validateCertificateKeyLength(serverCert, 4096, ValidationCodes.VALIDATION_CODES.CERTIFICATE_PUBLIC_KEY_LENGTH_4096.code));
          break;
        case ValidationCodes.VALIDATION_CODES.VERIFY_ROOT_CERTIFICATE.code:
          validations.push(this.verifyRootCertificate(rootCertificate, ValidationCodes.VALIDATION_CODES.VERIFY_ROOT_CERTIFICATE.code));
          break;
        case ValidationCodes.VALIDATION_CODES.VERIFY_CHAIN_CERTIFICATES.code:
          validations.push(this.verifyIntermediateChain(rootCertificate, intermediateChain, ValidationCodes.VALIDATION_CODES.VERIFY_CHAIN_CERTIFICATES.code));
          break;
        default:
          logger.info(`Validation not yet implemented: ${validationCode}`);
          break;
      }
    }
    const valid = !validations.some((e) => e.result === ValidationCodes.VALID_STATES.INVALID);
    const validationState = valid ? ValidationCodes.VALID_STATES.VALID : ValidationCodes.VALID_STATES.INVALID;
    return { validations, validationState };
  }

  verifyCertificateChainPublicKeyMatchPrivateKey(certificateChain, key, code) {
    if (this.splitCertificateChain(certificateChain)
      .map(cert => this.verifyCertificatePublicKeyMatchPrivateKey(cert, key, code))
      .some(({ result }) => result === ValidationCodes.VALID_STATES.VALID)) {
      return new Validation(code, true, ValidationCodes.VALID_STATES.VALID);
    }
    return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID, 'No certificate matches the private key');
  }


  /**
   * Performs a set of validations on the CACert.
   *
   * @param {String[]} validationCodes List of validation codes to perform
   * @param {String} intermediateChain PEM-encoded certificate chain
   * @param {String} rootCertificate PEM-encoded root certificate
   * @param {String} key PEM-encoded CA private key
   * @returns { validations, validationState } validations list and validationState, where validationState = VALID if all the validations are VALID or NOT_AVAIABLE; INVALID otherwise
   */
  performCAValidations(validationCodes, intermediateChain, rootCertificate, key) {
    if (!Array.isArray(validationCodes)) {
      validationCodes = [];
    }

    const validations = [];
    for (const validationCode of validationCodes) {
      switch (validationCode) {
        case ValidationCodes.VALIDATION_CODES.VERIFY_ROOT_CERTIFICATE.code:
          validations.push(this.verifyRootCertificate(rootCertificate, ValidationCodes.VALIDATION_CODES.VERIFY_ROOT_CERTIFICATE.code));
          break;
        case ValidationCodes.VALIDATION_CODES.VERIFY_CHAIN_CERTIFICATES.code:
          validations.push(this.verifyIntermediateChain(rootCertificate, intermediateChain, ValidationCodes.VALIDATION_CODES.VERIFY_CHAIN_CERTIFICATES.code));
          break;
        case ValidationCodes.VALIDATION_CODES.CA_CERTIFICATE_USAGE.code:
          validations.push(this.validateCertificateUsageCA(rootCertificate, intermediateChain, ValidationCodes.VALIDATION_CODES.CA_CERTIFICATE_USAGE.code));
          break;
        case ValidationCodes.VALIDATION_CODES.CSR_CERT_PUBLIC_PRIVATE_KEY_MATCH.code:
          validations.push(this.verifyCertificateChainPublicKeyMatchPrivateKey(rootCertificate + intermediateChain, key, ValidationCodes.VALIDATION_CODES.CSR_CERT_PUBLIC_PRIVATE_KEY_MATCH.code));
          break;
        default:
          logger.info(`Validation not yet implemented: ${validationCode}`);
          break;
      }
    }
    const valid = !validations.some((e) => e.result === ValidationCodes.VALID_STATES.INVALID);
    const validationState = valid ? ValidationCodes.VALID_STATES.VALID : ValidationCodes.VALID_STATES.INVALID;
    return { validations, validationState };
  }
  /**
   * Validates ValidationCodes.VALIDATION_CODES.CERTIFICATE_VALIDITY
   *
   * @param {String} serverCert PEM-encoded certificate
   * @param {String} code validation code
   */
  validateCertificateValidity (serverCert, code) {
  }

  /**
   * Validates ValidationCodes.VALIDATION_CODES.CERTIFICATE_USAGE_SERVER
   *
   * @param {String} serverCert PEM-encoded certificate
   */
  validateCertificateUsageServer (serverCert) {
  }

  /**
   * Validates ValidationCodes.VALIDATION_CODES.CA_CERTIFICATE_USAGE
   *
   * @param {String} rootCertificate PEM-encoded certificate
   * @param {String} intermediateChain PEM-encoded certificate
   * @param {String} code validation code
   */
  validateCertificateUsageCA (rootCertificate, intermediateChain, code) {
  }

  /**
   * Validates ValidationCodes.VALIDATION_CODES.CERTIFICATE_CHAIN
   *
   * @param {String} serverCert PEM-encoded certificate
   * @param {String} intermediateChain PEM-encoded intermediate chain
   * @param {String} rootCertificate PEM-encoded root certificate
   */
  validateCertificateChain (serverCert, intermediateChain, rootCertificate) {
  }

  /**
   * Validates ValidationCodes.VALIDATION_CODES.CERTIFICATE_PUBLIC_KEY_LENGTH_*
   *
   * @param {String} serverCert PEM-encoded certificate
   * @param {Integer} keyLength key length in bits
   * @param {String} code Validation code.
   */
  validateCertificateKeyLength (serverCert, keyLength, code) {
  }

  /**
   * Performs a set of validations on the inbound enrollment.
   *
   * @param {String} csr PEM-encoded certificate signature request
   * @param {String} certificate PEM-encoded certificate
   * @returns { validations, validationState } validations list and validationState, where validationState = VALID if all the validations are VALID or NOT_AVAIABLE; INVALID otherwise
   */
  validateInboundEnrollment (enrollment) {
    const validationCodes = this.validationConfig.inboundValidations;
    return this.performEnrollmentValidations(validationCodes, enrollment);
  }

  /**
   * Performs a set of validations on the outbound enrollment.
   *
   * @param {String} csr PEM-encoded certificate signature request
   * @param {String} certificate PEM-encoded certificate
   * @returns { validations, validationState } validations list and validationState, where validationState = VALID if all the validations are VALID or NOT_AVAIABLE; INVALID otherwise
   */
  validateOutboundEnrollment (enrollment) {
    const validationCodes = this.validationConfig.outboundValidations;
    return this.performEnrollmentValidations(validationCodes, enrollment);
  }

  /**
   * Performs a set of validations on the CSR.
   *
   * @param {String[]} validationCodes List of validation codes to perform
   * @param {String} csr PEM-encoded certificate signature request
   * @param {String} certificate PEM-encoded certificate
   * @returns { validations, validationState } validations list and validationState, where validationState = VALID if all the validations are VALID or NOT_AVAIABLE; INVALID otherwise
   */
  performEnrollmentValidations (validationCodes, enrollment) {
    const validations = [];
    // FIXME: modify enrollment.XX for enrollment and from EmbeddedPkiEngine get what it needs
    for (const validationCode of validationCodes) {
      switch (validationCode) {
        case ValidationCodes.VALIDATION_CODES.CSR_SIGNATURE_VALID.code:
          validations.push(this.validateCsrSignatureValid(enrollment.csr));
          break;
        case ValidationCodes.VALIDATION_CODES.CSR_SIGNATURE_ALGORITHM_SHA256_512.code:
          validations.push(this.validateCsrSignatureAlgorithm(enrollment.csr, ValidationCodes.VALIDATION_CODES.CSR_SIGNATURE_ALGORITHM_SHA256_512.code, ValidationCodes.VALIDATION_CODES.CSR_SIGNATURE_ALGORITHM_SHA256_512.param));
          break;
        case ValidationCodes.VALIDATION_CODES.CSR_PUBLIC_KEY_LENGTH_4096.code:
          validations.push(this.validateCsrPublicKeyLength(enrollment.csr, ValidationCodes.VALIDATION_CODES.CSR_PUBLIC_KEY_LENGTH_4096.code, ValidationCodes.VALIDATION_CODES.CSR_PUBLIC_KEY_LENGTH_4096.param));
          break;
        case ValidationCodes.VALIDATION_CODES.CSR_PUBLIC_KEY_LENGTH_2048.code:
          validations.push(this.validateCsrPublicKeyLength(enrollment.csr, ValidationCodes.VALIDATION_CODES.CSR_PUBLIC_KEY_LENGTH_2048.code, ValidationCodes.VALIDATION_CODES.CSR_PUBLIC_KEY_LENGTH_2048.param));
          break;
        case ValidationCodes.VALIDATION_CODES.CSR_CERT_SAME_PUBLIC_KEY.code:
          validations.push(this.verifyCertificateCSRPublicKey(ValidationCodes.VALIDATION_CODES.CSR_CERT_SAME_PUBLIC_KEY.code, enrollment.certificate, enrollment.csr));
          break;
        case ValidationCodes.VALIDATION_CODES.CSR_CERT_SAME_SUBJECT_INFO.code:
          validations.push(this.verifyCertificateCSRSameSubject(ValidationCodes.VALIDATION_CODES.CSR_CERT_SAME_SUBJECT_INFO.code, enrollment));
          break;
        case ValidationCodes.VALIDATION_CODES.CSR_CERT_SAME_CN.code:
          validations.push(this.verifyCertificateCSRSameCN(ValidationCodes.VALIDATION_CODES.CSR_CERT_SAME_CN.code, enrollment));
          break;
        case ValidationCodes.VALIDATION_CODES.CSR_MANDATORY_DISTINGUISHED_NAME.code:
          validations.push(this.verifyCsrMandatoryDistinguishedNames(enrollment.csr, ValidationCodes.VALIDATION_CODES.CSR_MANDATORY_DISTINGUISHED_NAME.code));
          break;
        case ValidationCodes.VALIDATION_CODES.CERTIFICATE_USAGE_CLIENT.code:
          validations.push(this.verifyCertificateUsageClient(enrollment.certificate, ValidationCodes.VALIDATION_CODES.CERTIFICATE_USAGE_CLIENT.code));
          break;
        case ValidationCodes.VALIDATION_CODES.CERTIFICATE_VALIDITY.code:
          validations.push(this.validateCertificateValidity(enrollment.certificate, ValidationCodes.VALIDATION_CODES.CERTIFICATE_VALIDITY.code));
          break;
        case ValidationCodes.VALIDATION_CODES.CERTIFICATE_ALGORITHM_SHA256.code:
          validations.push(this.validateCertificateSignatureAlgorithm(enrollment.certificate, ValidationCodes.VALIDATION_CODES.CERTIFICATE_ALGORITHM_SHA256.code, ValidationCodes.VALIDATION_CODES.CERTIFICATE_ALGORITHM_SHA256.param));
          break;
        case ValidationCodes.VALIDATION_CODES.CSR_CERT_PUBLIC_PRIVATE_KEY_MATCH.code:
          validations.push(this.verifyCertificatePublicKeyMatchPrivateKey(enrollment.certificate, enrollment.key, ValidationCodes.VALIDATION_CODES.CSR_CERT_PUBLIC_PRIVATE_KEY_MATCH.code));
          break;
        case ValidationCodes.VALIDATION_CODES.CERTIFICATE_SIGNED_BY_DFSP_CA.code:
          validations.push(this.verifyCertificateSignedByDFSPCA(enrollment.certificate, enrollment.dfspCA, ValidationCodes.VALIDATION_CODES.CERTIFICATE_SIGNED_BY_DFSP_CA.code));
          break;
        default:
          logger.info(`Validation not yet implemented: ${validationCode}`);
          break;
      }
    }
    const validationState = validations.reduce((accum, current) => { return accum && current.result !== ValidationCodes.VALID_STATES.INVALID; }, true)
      ? ValidationCodes.VALID_STATES.VALID
      : ValidationCodes.VALID_STATES.INVALID;
    return { validations, validationState };
  }

  /**
   * Compares csrInfo subject with certInfo subject
   * @param {CSRInfo} csrInfo
   * @param {CertInfo} certInfo
   * @returns { valid: true } or { valid: false, reason: 'message' }
   */
  compareSubjectBetweenCSRandCert (csrInfo, certInfo) {
    for (const p in csrInfo.subject) {

      if (csrInfo.subject.hasOwnProperty(p)) {
        if (csrInfo.subject[p] !== certInfo.subject[p]) {
          return { valid: false, reason: `csr subject ${p}: ${csrInfo.subject[p]} is not equals cert subject ${p}: ${certInfo.subject[p]}` };
        }
      }
    }
    for (const p in certInfo.subject) {

      if (certInfo.subject.hasOwnProperty(p)) {
        if (csrInfo.subject[p] !== certInfo.subject[p]) {
          return { valid: false, reason: `csr subject ${p}: ${csrInfo.subject[p]} is not equals cert subject ${p}: ${certInfo.subject[p]}` };
        }
      }
    }
    return { valid: true };
  }

  /**
   * Compares csrInfo CN with certInfo CN
   * @param {CSRInfo} csrInfo
   * @param {CertInfo} certInfo
   * @returns { valid: true } or { valid: false, reason: 'message' }
   */
  compareCNBetweenCSRandCert (csrInfo, certInfo) {
    if (csrInfo.subject.CN !== certInfo.subject.CN) {
      return { valid: false, reason: `csr subject CN: ${csrInfo.subject.CN} and cert subject CN: ${certInfo.subject.CN} are different` };
    }
    return { valid: true };
  }

  /**
   * Compares csrInfo subject Alt names with certInfo subject Alt names
   * @param {CSRInfo} csrInfo
   * @param {CertInfo} certInfo
   * @returns { valid: true } or { valid: false, reason: 'message' }
   */
  compareSubjectAltNameBetweenCSRandCert (csrInfo, certInfo) {
    for (const p in csrInfo.extensions.subjectAltName) {
      if (JSON.stringify(csrInfo.extensions.subjectAltName[p].sort()) !== JSON.stringify(certInfo.extensions.subjectAltName[p].sort())) {
        return { valid: false, reason: `csr subject ${p}: ${csrInfo.extensions.subjectAltName[p]} is not equal to cert subject ${p}: ${certInfo.extensions.subjectAltName[p]}` };
      }
    }
    return { valid: true };
  }

  /**
   * The Certificate should be signed by the DFSP CA.
   * data.result = TRUST_CHAIN_VALID or SELF_SIGNED or INVALID or NOT_AVAILABLE if the ca info is not present
   * @param {String} certificate PEM-encoded certificate
   * @param {DFSPCAsModel} dfspCA
   * @param {String} code Validation code
   */
  verifyCertificateSignedByDFSPCA (certificate, dfspCA, code) {
  }

  /**
   * Verifies the signature on the CSR ( from https://www.openssl.org/docs/man1.1.1/man1/openssl-req.html ).
   *
   * @param {String} csr PEM-encoded CSR
   */
  validateCsrSignatureValid (csr) {
  }

  /**
   * Verifies all the requires distinguished names
   *
   * @param {String} csr PEM-encoded CSR
   * @param {String} code Validation code
   */
  verifyCsrMandatoryDistinguishedNames (csr, code) {
  }

  /**
   * Verifies that the certificate must have the "TLS WWW client authentication" key usage extension.
   * See https://tools.ietf.org/html/rfc5280#section-4.2.1.12'
   *
   * @param {String} certificate PEM-encoded certificate
   * @param {String} code Validation code
   */
  verifyCertificateUsageClient (certificate, code) {
  }

  /**
   * Verifies that the signature algorithm is the one specified by param
   *
   * @param {String} csr PEM-encoded CSR
   * @param {String} code Validation code
   * @param {String} algo algorithm
   */
  validateCsrSignatureAlgorithm (csr, code, algo) {
  }

  /**
   * Verifies that the signature algorithm is the one specified by param
   *
   * @param {String} csr PEM-encoded certificate
   * @param {String} code Validation code
   * @param {String} algo algorithm
   */
  validateCertificateSignatureAlgorithm (certificate, code, algo) {
  }

  /**
   * Verifies that the certificate and the csr have the same Subject Information ( distinguished name and extensions )
   *
   * @param {String} certificate PEM-encoded certificate
   * @param {Object} enrollment
   * @returns {boolean} if they have the same
   */
  verifyCertificateCSRSameSubject (code, enrollment) {
  }

   /**
   *
   * @param {String} code validation code
   * @param {Object} enrollment
   */
   verifyCertificateCSRSameCN(code, enrollment) {
    const { csrInfo, certInfo } = enrollment;
    for (const p in certInfo.subject) {
      if (certInfo.subject.hasOwnProperty(p)) {
        if (csrInfo.subject[p] !== certInfo.subject[p]) {
          return { valid: false, reason: `csr subject ${p}: ${csrInfo.subject[p]} is not equals cert subject ${p}: ${certInfo.subject[p]}` };
        }
      }
    }
    return { valid: true };
  }

  /**
   * Verifies that the Certificate Public Key must match the private key used to sign the CSR.
   * Only available if the CSR was created by the Connection-Manager. If the CSR was uploaded instead of generated by
   * the Connection Manager, and there's no private key associated, this will be set the state to NOT_AVAILABLE
   *
   * @param {String} code Validation code
   * @param {String} key PEM-encoded key.
   * @param {String} certificate PEM-encoded certificate
   */
  verifyCertificatePublicKeyMatchPrivateKey (certificate, key, code) {
  }

  /**
   * Verifies that the PublicKey length is the one specified by param
   *
   * @param {String} csr PEM-encoded CSR
   * @param {String} code Validation code
   * @param {Number} length key length
   */
  validateCsrPublicKeyLength (csr, code, length) {
  }

  /**
   * Verifies that the certificate and the csr have the same Public Key
   *
   * @param {String} certificate PEM-encoded certificate
   * @param {String} csr PEM-encoded CSR.
   * @returns {boolean} if they have the same
   */
  verifyCertificateCSRPublicKey (code, certificate, csr) {
  }

  /**
   * Verifies that the CSR Public Key length is at least minLength
   *
   * minLength: Number
   * returns { valid: true } or { valid: false, reason: { actualKeySize: Number, minKeySize: Number } }
   */
  verifyCSRKeyLength (csr, minLength) {
    return { valid: true };
  }

  verifyCertKeyLength (cert, minLength) {
    return { valid: true };
  }

  /**
   * Verifies that the CSR signature algorithm is the same as the parameter
   *
   * algorithms: String[]
   * returns { valid: true } or { valid: false, reason: { actualAlgorithm : String, algorithm : String} }
   *
   */
  verifyCSRAlgorithm (csr, algorithms) {
    return { valid: true };
  }

  verifyCertAlgorithm (cert, algorithms) {
    return { valid: true };
  }

  /**
   * Verifies that the certificate was signed by the key
   *
   * @param {String} certificate PEM-encoded certificate
   * @param {String} key PEM-encoded key. If encrypted, the engine will attempt to decrypt it with the env PASS_PHRASE
   * @returns {
   * result: boolean
   * output: validation details
   * }
   */
  verifyCertificateAgainstKey (certificate, key) {
    return undefined;
  }

  /**
   *
   * @param {String} rootCertificate PEM-encoded string
   * @param {String} code
   * @returns {Validation} validation
   */
  verifyRootCertificate (rootCertificate, code) {
  }

  /**
   *
   * @param {String} rootCertificate PEM-encoded string
   * @param {String} intermediateChain PEM-encoded string
   * @param {String} code
   * @returns {Validation} validation
   */
  verifyIntermediateChain (rootCertificate, intermediateChain, code) {
  }

  /**
   * Verifies that the certificate is signed by the chain and root
   *
   * @param {String} certificate PEM-encoded certificate
   * @param {String} rootCertificate PEM-encoded certificate or null
   * @param {String} intermediateChain PEM-encoded certificate chain or null
   * @returns {
   * result: boolean
   * output: validation details
   * }
   */
  verifyCertificateSigning (certificate, rootCertificate, intermediateChain) {
    return undefined;
  }

  /**
   * Returns an object with the CSR contents and info
   *
   * @param {String} csr PEM-encoded CSR
   * @returns {CSRInfo} The CSR Info
   * @throws ExternalProcessError if error occurs while processing the CSR
   * @throws InvalidEntityError if the CSR is invalid
   */
  getCSRInfo (csr) {
    return undefined;
  }

  /**
   * Returns an object with the Certificate contents and info
   *
   * @param {String} csr PEM-encoded Certificate
   * @returns {CertInfo} The Certificate Info
   * @throws ExternalProcessError if error occurs while processing the CSR
   * @throws InvalidEntityError if the CSR is invalid
   */
  getCertInfo (cert) {
    return undefined;
  }
}

module.exports = PKIEngine;
