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

const Constants = require('../constants/Constants');
const PkiService = require('../service/PkiService');
const PKIEngine = require('./PKIEngine');
const spawnProcess = require('../process/spawner');
const ExternalProcessError = require('../errors/ExternalProcessError');
const InvalidEntityError = require('../errors/InvalidEntityError');
const defaultCAConfig = require('./ca-config.json');
const { file } = require('tmp-promise');
const fs = require('fs');
const util = require('util');
const InternalError = require('../errors/InternalError');
const CSRInfo = require('./CSRInfo');
const CertInfo = require('./CertInfo');
const CAInitialInfo = require('./CAInitialInfo');
const ValidationCodes = require('./ValidationCodes');
const Validation = require('./Validation');
const moment = require('moment');
const VALID = 'VALID';
const VALID_SIGNED = 'VALID(SIGNED)';
const VALID_SELF_SIGNED = 'VALID(SELF_SIGNED)';
const INVALID = 'INVALID';
const CAType = require('../models/CAType');

/**
 * PKI engine that uses cfssl and openssl as engines.
 *
 * It mainly uses cfssl for the signing and creation operations, and opelssl for validation and printing
 */
class EmbeddedPKIEngine extends PKIEngine {
  /**
   * Creates a PKIEngine, setting the CA
   *
   * @param {String} cert PEM encoded CA root cert
   * @param {String} key PEM encoded CA private key - encrypted
   * @param {Object} caConfig caConfig
   */
  constructor (cert, key, caConfig) { // FIXME add root and chain
    super();
    this.cert = cert;
    this.key = key;
    this.caConfig = caConfig;
  }

  /**
   * Creates a CA
   * @param {CAInitialInfo} options. Engine options, @see CAInitialInfo
   */
  async createCA (caOptionsDoc) {
    let caOptions = new CAInitialInfo(caOptionsDoc);
    let caConfig = { ...defaultCAConfig };
    if (caOptions.default) {
      caConfig.signing.default = caOptions.default;
    };
    let { fd: caFd, path: caPath, cleanup: caCleanup } = await file({ mode: '0600', prefix: 'ca-', postfix: '.json' });
    let fsWrite = util.promisify(fs.write);
    try {
      await fsWrite(caFd, JSON.stringify(caConfig));
    } catch (error) {
      caCleanup && caCleanup();
      throw new InternalError(error.message);
    }

    try {
      let csrData = caOptions.csr;
      // fix to adapt to cfssl genkey command
      csrData.CN = csrData.names[0].CN;

      let cfsslCommand = 'genkey';
      const cfsslResult = await spawnProcess(Constants.CFSSL.COMMAND_PATH, [cfsslCommand, `-config=${caPath}`, '-initca', '-'], JSON.stringify(csrData));

      let cfsslOutput;
      cfsslOutput = JSON.parse(cfsslResult.stdout);
      cfsslOutput.key = await this.encryptKey(cfsslOutput.key);

      let result = {
        cert: cfsslOutput.cert,
        csr: cfsslOutput.csr,
        key: cfsslOutput.key,
        caConfig
      };
      return result;
    } catch (error) {
      throw new ExternalProcessError(error.message);
    } finally {
      caCleanup && caCleanup();
    }
  }

  /**
   * Signs the CSR with the Engine CA.
   *
   * @param {String} csr CSR, PEM encoded
   * @returns A PEM-encoded certificate
   */
  async sign (csr) {
    let deKey = await this.decryptKey(this.key);
    let { fd: certFd, path: certPath, cleanup: certCleanup } = await file({ mode: '0600', prefix: 'ca-', postfix: '.pem' });
    let { fd: keyFd, path: keyPath, cleanup: keyCleanup } = await file({ mode: '0600', prefix: 'key-', postfix: '.pem' });
    let { configPath, configCleanup } = await this.currentConfigTempFile();
    try {
      let fsWrite = util.promisify(fs.write);
      await fsWrite(certFd, this.cert);
      await fsWrite(keyFd, deKey);
      const cfsslResult = await spawnProcess(Constants.CFSSL.COMMAND_PATH, ['sign', '-loglevel', '1', '-ca', certPath, '-ca-key', keyPath, `-config=${configPath}`, '-'], csr);

      let cfsslOutput = JSON.parse(cfsslResult.stdout);
      return cfsslOutput.cert;
    } catch (error) {
      throw new InternalError(error.message);
    } finally {
      certCleanup && certCleanup();
      keyCleanup && keyCleanup();
      configCleanup && configCleanup();
    }
  }

  async currentConfigTempFile () {
    let { fd: configFd, path: configPath, cleanup: configCleanup } = await file({ mode: '0600', prefix: 'config-', postfix: '.json' });
    let fsWrite = util.promisify(fs.write);
    let configContent = this.caConfig ? this.caConfig : defaultCAConfig;
    // console.log(`configContent: ${JSON.stringify(configContent)}`);
    await fsWrite(configFd, JSON.stringify(configContent));
    return { configPath, configCleanup };
  }

  /**
   *
   * @param {CSRParameters} csrParameters CSR Parameters
   * @param {*} keyBits Key length. If not specified, takes the CA defaults ( see constructor )
   * @param {*} algorithm signature algorithm If not specified, takes the CA defaults ( see constructor )
   * @returns {
   *  csr: ,
   *  key:  String, PEM-encoded. Encrypted ( see encryptKey )
   * }
   */
  async createCSR (csrParameters, keyBits, algorithm) {
    let hosts = [];
    if (Array.isArray(csrParameters.extensions.subjectAltName.dns)) {
      hosts.push(...csrParameters.extensions.subjectAltName.dns);
    };
    if (Array.isArray(csrParameters.extensions.subjectAltName.ips)) {
      hosts.push(...csrParameters.extensions.subjectAltName.ips);
    };
    let csr = {
      CN: csrParameters.subject.CN,
      hosts: hosts,
      key: {
        size: keyBits,
        algo: algorithm
      },
      names: [csrParameters.subject],
    };

    let { configPath, configCleanup } = await this.currentConfigTempFile();
    try {
      const cfssl = await spawnProcess(Constants.CFSSL.COMMAND_PATH, ['genkey', '-loglevel', '1', `-config=${configPath}`, '-'], JSON.stringify(csr));
      let cfsslOutput = JSON.parse(cfssl.stdout);
      cfsslOutput.key = await this.encryptKey(cfsslOutput.key);
      return cfsslOutput;
    } catch (error) {
      throw new InternalError(error.message);
    } finally {
      configCleanup && configCleanup();
    }
  }

  async encryptKey (key) {
    // Encrypt the key with P12_PASS_PHRASE
    if (Constants.PKI_ENGINE.P12_PASS_PHRASE) {
      const encryptResult = await spawnProcess('openssl', ['rsa', '-aes256', '-passout', 'env:P12_PASS_PHRASE'], key);

      let encryptOutput = encryptResult.stdout;
      return encryptOutput;
    } else {
      throw new InternalError('Unable to encrypt key, no P12_PASS_PHRASE');
    }
  }

  async decryptKey (key) {
    // Decrypt the key with P12_PASS_PHRASE
    if (Constants.PKI_ENGINE.P12_PASS_PHRASE) {
      const encryptResult = await spawnProcess('openssl', ['rsa', '-passin', 'env:P12_PASS_PHRASE'], key);

      let encryptOutput = encryptResult.stdout;
      return encryptOutput;
    } else {
      throw new InternalError('Unable to decrypt key, no P12_PASS_PHRASE');
    }
  }

  /**
   * Validates ValidationCodes.VALIDATION_CODES.CERTIFICATE_VALIDITY
   *
   * @param {String} serverCert PEM-encoded certificate
   * @param {String} code validation code
   */
  async validateCertificateValidity (serverCert, code) {
    // with openssl, would need to run this command an parse the dates:
    // openssl x509 -noout -in certificate.crt -dates
    // notBefore=Feb  4 00:00:00 2019 GMT
    // notAfter=Feb 12 12:00:00 2020 GMT
    // Using CertInfo:

    if (!serverCert) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        `No certificate`);
    }

    try {
      let certInfo = await EmbeddedPKIEngine.getCertInfo(serverCert);
      let notAfterDate = moment(certInfo.notAfter);
      if (!notAfterDate || !notAfterDate.isValid()) {
        throw new Error('Invalid notAfterDate');
      }
      let notBeforeDate = moment(certInfo.notBefore);
      if (!notBeforeDate || !notBeforeDate.isValid()) {
        throw new Error('Invalid notBeforeDate');
      }
      let valid = moment().isBetween(notBeforeDate, notAfterDate);
      let validation = new Validation(code, true);
      if (valid) {
        validation.result = ValidationCodes.VALID_STATES.VALID;
        // eslint-disable-next-line no-template-curly-in-string
        validation.messageTemplate = 'Certificate is valid for ${data.currentDate}';
        validation.data = {
          currentDate: {
            type: 'DATE',
            value: Date.now()
          }
        };
        validation.message = `Certificate is valid for ${moment(validation.data.currentDate.value).format()}`;
      } else {
        validation.result = ValidationCodes.VALID_STATES.INVALID;
        // eslint-disable-next-line no-template-curly-in-string
        validation.messageTemplate = 'Certificate is not valid for ${data.currentDate}. It is not valid before ${data.notBeforeDate} and after ${data.notAfterDate}';
        validation.data = {
          currentDate: {
            type: 'DATE',
            value: Date.now()
          },
          notAfterDate: {
            type: 'DATE',
            value: notAfterDate
          },
          notBeforeDate: {
            type: 'DATE',
            value: notBeforeDate
          }
        };
        validation.message = `Certificate is not valid for ${moment(validation.data.currentDate.value).format()}. It is not valid before ${moment(validation.data.notBeforeDate).format()} and after ${moment(validation.data.notAfterDate.value).format()}`;
      }
      return validation;
    } catch (error) {
      console.error(error);
      let validation = new Validation(code, true, ValidationCodes.VALID_STATES.INVALID, `Error ocurred while processing the certificate`);
      validation.result = JSON.stringify(error);
      return validation;
    }
  }

  /**
   * Validates ValidationCodes.VALIDATION_CODES.CERTIFICATE_USAGE_SERVER
   *
   * @param {String} serverCert PEM-encoded certificate
   */
  async validateCertificateUsageServer (serverCert) {
    // capture extended key usage:
    // /X509v3 Extended Key Usage:\s*([\w\ ,]*)\s*/gm
    // Should include 'TLS Web Server Authentication'
    // For client, should include 'TLS Web Client Authentication'
    let certificateText = await EmbeddedPKIEngine.getPrimItemOutput(serverCert, 'CERT');
    let extendedKeyUsageResult = certificateText.match(/X509v3 Extended Key Usage:\s*([\w ,]*)\s*/m);
    if (extendedKeyUsageResult == null || !Array.isArray(extendedKeyUsageResult)) {
      return new Validation(ValidationCodes.VALIDATION_CODES.CERTIFICATE_USAGE_SERVER.code, true, ValidationCodes.VALID_STATES.INVALID, `Certificate doesn't have the "TLS WWW server authentication" key usage extension`);
    }
    let extendedKeyUsage = extendedKeyUsageResult[1];
    if (typeof extendedKeyUsage !== 'string') {
      return new Validation(ValidationCodes.VALIDATION_CODES.CERTIFICATE_USAGE_SERVER.code, true, ValidationCodes.VALID_STATES.INVALID, `Certificate doesn't have the "TLS WWW server authentication" key usage extension`);
    }
    if (/TLS Web Server Authentication/.test(extendedKeyUsage)) {
      return new Validation(ValidationCodes.VALIDATION_CODES.CERTIFICATE_USAGE_SERVER.code, true, ValidationCodes.VALID_STATES.VALID, `Certificate has the "TLS WWW server authentication" key usage extension`);
    } else {
      return new Validation(ValidationCodes.VALIDATION_CODES.CERTIFICATE_USAGE_SERVER.code, true, ValidationCodes.VALID_STATES.INVALID, `Certificate doesn't have the "TLS WWW server authentication" key usage extension`);
    }
  }

  /**
   * Validates ValidationCodes.VALIDATION_CODES.CERTIFICATE_CHAIN
   *
   * @param {String} serverCert PEM-encoded certificate
   * @param {String} intermediateChain PEM-encoded intermediate chain
   * @param {String} rootCertificate PEM-encoded root certificate
   */
  async validateCertificateChain (serverCert, intermediateChain, rootCertificate) {
    let { result, output } = await EmbeddedPKIEngine.verifyCertificateSigning(serverCert, rootCertificate, intermediateChain);
    if (!result) {
      return new Validation(ValidationCodes.VALIDATION_CODES.CERTIFICATE_CHAIN.code, true, ValidationCodes.VALID_STATES.INVALID, `Certificate chain invalid`, output);
    } else {
      return new Validation(ValidationCodes.VALIDATION_CODES.CERTIFICATE_CHAIN.code, true, ValidationCodes.VALID_STATES.VALID, `Certificate chain valid`, output);
    }
  }

  /**
   * Validates ValidationCodes.VALIDATION_CODES.CERTIFICATE_PUBLIC_KEY_LENGTH_*
   *
   * @param {String} serverCert PEM-encoded certificate
   * @param {Integer} keyLength key length in bits
   */
  async validateCertificateKeyLength (serverCert, keyLength, code) {
    let { valid, reason } = await EmbeddedPKIEngine.verifyCertKeyLength(serverCert, keyLength);
    if (!valid) {
      // eslint-disable-next-line no-template-curly-in-string
      let validation = new Validation(code, true);
      validation.result = ValidationCodes.VALID_STATES.INVALID;
      // eslint-disable-next-line no-template-curly-in-string
      validation.messageTemplate = 'Certificate key length ${data.actualKeySize.value} invalid, should be ${data.keyLength.value}';
      validation.details = reason;
      validation.data = {
        actualKeySize: {
          type: 'INTEGER',
          value: reason.actualKeySize
        },
        keyLength: {
          type: 'INTEGER',
          value: keyLength
        }
      };
      validation.message = `Certificate key length ${validation.data.actualKeySize.value} invalid, should be ${validation.data.keyLength.value}`;
      return validation;
    } else {
      return new Validation(code, true, ValidationCodes.VALID_STATES.VALID, `Certificate key length valid`);
    }
  }

  /**
   * Verified all the requires distinguished names
   *
   * @param {String} csr PEM-encoded CSR
   * @param {String} code Validation code
   * @returns {Validation} validation
   */
  async verifyCsrMandatoryDistinguishedNames (csr, code) {
    try {
      let csrInfo = await EmbeddedPKIEngine.getCSRInfo(csr);
      let { valid, reason } = csrInfo.hasAllRequiredDistinguishedNames();
      if (valid) {
        return new Validation(code, true, ValidationCodes.VALID_STATES.VALID,
          `CSR has all mandatory distiguished name attributes`);
      } else {
        return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
          `CSR missing required distinguished name attributes. ${reason}`);
      }
    } catch (error) {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
        `CSR couldn't be parsed`
      );
    }
  }

  /**
   * Verifies the signature on the CSR ( from https://www.openssl.org/docs/man1.1.1/man1/openssl-req.html ).
   *
   * @param {String} csr PEM-encoded CSR
   * @returns {Validation} validation
   */
  async validateCsrSignatureValid (csr) {
    let args = ['req', '-verify', '-noout'];

    const opensslResult = await spawnProcess('openssl', args, csr, false);
    let { stdout, stderr, code } = opensslResult;
    if (typeof stdout !== 'string') {
      return new Validation(ValidationCodes.VALIDATION_CODES.CSR_SIGNATURE_VALID.code, true, ValidationCodes.VALID_STATES.INVALID, `Could not read external process output`);
    }

    // eslint-disable-next-line no-template-curly-in-string
    let messageTemplate = 'External process output code ${code} not ok. Details: ${opensslResult}';
    if (code !== 0) {
      return new Validation(ValidationCodes.VALIDATION_CODES.CSR_SIGNATURE_VALID.code, true, ValidationCodes.VALID_STATES.INVALID,
        `External process output code ${code} not ok. Details: ${opensslResult}`, opensslResult, { code, opensslResult }, messageTemplate);
    }

    if (!stderr.includes('verify OK')) {
      return new Validation(ValidationCodes.VALIDATION_CODES.CSR_SIGNATURE_VALID.code, true, ValidationCodes.VALID_STATES.INVALID,
        `CSR failed verification`, opensslResult, { opensslResult }, messageTemplate);
    }
    return new Validation(ValidationCodes.VALIDATION_CODES.CSR_SIGNATURE_VALID.code, true, ValidationCodes.VALID_STATES.VALID,
      `CSR passed verification`);
  }

  /**
   * Verifies that the signature algorithm is the one specified by code
   *
   * @param {String} csr PEM-encoded CSR
   */
  async validateCsrSignatureAlgorithm (csr, code, algo) {
    try {
      let { valid, reason } = await EmbeddedPKIEngine.verifyCSRAlgorithm(csr, algo);
      if (valid) {
        return new Validation(code, true, ValidationCodes.VALID_STATES.VALID,
          `CSR has a valid Signature Algorithm : ${reason.actualAlgorithm}`);
      } else {
        return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
          `CSR has a an invalid Signature Algorithm ${reason.actualAlgorithm}`
        );
      }
    } catch (error) {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
        `CSR couldn't be parsed`
      );
    }
  }

  /**
   * Verifies that the signature algorithm is the one specified by param
   *
   * @param {String} csr PEM-encoded certificate
   * @param {String} code Validation code
   * @param {String} algo algorithm
   */
  async validateCertificateSignatureAlgorithm (certificate, code, algo) {
    if (!certificate) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        `No certificate`);
    }

    try {
      let { valid, reason } = await EmbeddedPKIEngine.verifyCertAlgorithm(certificate, [algo]);
      if (valid) {
        return new Validation(code, true, ValidationCodes.VALID_STATES.VALID,
          `certificate has a valid Signature Algorithm : ${algo}`);
      } else {
        return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
          `certificate has a an invalid Signature Algorithm ${reason.actualAlgorithm}`
        );
      }
    } catch (error) {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
        `certificate couldn't be parsed`
      );
    }
  }

  /**
   * Verifies that the Public Key length is the one specified by code
   *
   * @param {String} csr PEM-encoded CSR
   */
  async validateCsrPublicKeyLength (csr, code, length) {
    try {
      let { valid, reason } = await EmbeddedPKIEngine.verifyCSRKeyLength(csr, length);
      if (valid) {
        return new Validation(code, true, ValidationCodes.VALID_STATES.VALID,
          `CSR has a valid Public Key length of ${length}`);
      } else {
        return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
          `CSR Public Key length is not ${length}, it is ${reason.actualKeySize}`);
      }
    } catch (error) {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
        `CSR couldn't be parsed`);
    }
  }

  /**
   * The Certificate should be signed by the DFSP CA.
   * data.result = TRUST_CHAIN_VALID or SELF_SIGNED or INVALID or NOT_AVAILABLE if the ca info is not present
   * @param {String} certificate PEM-encoded certificate
   * @param {DFSPCAsModel} dfspCA
   * @param {String} code
   */
  async verifyCertificateSignedByDFSPCA (certificate, dfspCA, code) {
    if (!dfspCA || (!dfspCA.rootCertificate && !dfspCA.intermediateChain)) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        `No dfsp CA`);
    }

    if (dfspCA.validationState === 'INVALID') {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID, `Invalid dfsp ca root or chain`);
    } else {
      let { result } = await EmbeddedPKIEngine.verifyCertificateSigning(certificate, dfspCA.rootCertificate, dfspCA.intermediateChain);
      return new Validation(code, true, result ? ValidationCodes.VALID_STATES.VALID : ValidationCodes.VALID_STATES.INVALID, `The Certificate is signed by the DFSP CA`);
    }
  }

  /**
   * Verifies that the certificate and the csr have the same Public Key
   *
   * @param {String} certificate PEM-encoded certificate
   * @param {String} csr PEM-encoded CSR.
   * @returns {Validation} validation
   */
  async verifyCertificateCSRPublicKey (code, certificate, csr) {
    if (!certificate) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        `No certificate`);
    }
    if (!csr) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        `No CSR`);
    }
    let csrModulus = await EmbeddedPKIEngine.computeKeyModulus(csr, 'CSR');
    let certModulus = await EmbeddedPKIEngine.computeKeyModulus(certificate, 'CERTIFICATE');
    if (csrModulus === certModulus) {
      return new Validation(code, true, ValidationCodes.VALID_STATES.VALID,
        `CSR and Certificate have the same Public Key`);
    } else {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
        `CSR and Certificate have different Public Keys`);
    }
  }

  /**
   * Verifies that the certificate must have the "TLS WWW client authentication" key usage extension.
   * See https://tools.ietf.org/html/rfc5280#section-4.2.1.12'
   *
   * @param {String} certificate PEM-encoded certificate
   * @param {String} code Validation code
   * @returns {Validation} validation
   */
  async verifyCertificateUsageClient (certificate, code) {
    if (!certificate) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        `No certificate`);
    }

    let certificateText = await EmbeddedPKIEngine.getPrimItemOutput(certificate, 'CERT');
    let extendedKeyUsageResult = certificateText.match(/X509v3 Extended Key Usage:\s*([\w ,]*)\s*/m);
    const invalidMessage = `Certificate doesn't have the "TLS WWW client authentication" key usage extension`;
    const validMessage = `Certificate has the "TLS WWW client authentication" key usage extension`;

    if (extendedKeyUsageResult == null || !Array.isArray(extendedKeyUsageResult)) {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID, invalidMessage);
    }
    let extendedKeyUsage = extendedKeyUsageResult[1];
    if (typeof extendedKeyUsage !== 'string') {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID, invalidMessage);
    }
    if (/TLS Web Client Authentication/.test(extendedKeyUsage)) {
      return new Validation(code, true, ValidationCodes.VALID_STATES.VALID, validMessage);
    } else {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID, invalidMessage);
    }
  }

  /**
   * Verifies that the certificate and the csr have the same Subject Information ( distinguished name and extensions )
   *
   * @param {String} certificate PEM-encoded certificate
   * @param {String} csr PEM-encoded CSR.
   * @returns {Validation} validation
   */
  async verifyCertificateCSRSameSubject (code, enrollment) {
    if (!enrollment.certificate) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        `No certificate`);
    }
    if (!enrollment.csr) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        `No CSR`);
    }

    if (enrollment.caType && enrollment.caType === CAType.EXTERNAL) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        `It has an External CA`);
    }

    let csrInfo = await EmbeddedPKIEngine.getCSRInfo(enrollment.csr);
    let certInfo = await EmbeddedPKIEngine.getCertInfo(enrollment.certificate);

    let { valid, reason } = PKIEngine.compareSubjectBetweenCSRandCert(csrInfo, certInfo);

    if (!valid) {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
        `The CSR and the Certificate must have the same Subject Information`, reason);
    }

    let { valid: validAltName, reason: reasonAltName } = PKIEngine.compareSubjectAltNameBetweenCSRandCert(csrInfo, certInfo);

    if (!validAltName) {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
        `The CSR and the Certificate must have the same Subject Extension Information`, reasonAltName);
    }

    return new Validation(code, true, ValidationCodes.VALID_STATES.VALID,
      `The CSR and the Certificate must have the same Subject Information`);
  }

  /**
   *
   * @param {String} code validation code
   * @param {Object} enrollment Enrollment
   */
  async verifyCertificateCSRSameCN (code, enrollment) {
    if (!enrollment.certificate) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        `No certificate`);
    }
    if (!enrollment.csr) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        `No CSR`);
    }

    if (enrollment.caType && enrollment.caType === CAType.INTERNAL) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        `It has an Internal CA`);
    }

    let csrInfo = await EmbeddedPKIEngine.getCSRInfo(enrollment.csr);
    let certInfo = await EmbeddedPKIEngine.getCertInfo(enrollment.certificate);

    let { valid, reason } = PKIEngine.compareCNBetweenCSRandCert(csrInfo, certInfo);

    if (!valid) {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
        `The CSR and the Certificate must have the same CN`, reason);
    }

    return new Validation(code, true, ValidationCodes.VALID_STATES.VALID,
      `The CSR and the Certificate must have the same CN`);
  }

  /**
   * Verifies that the CSR Public Key length is at least minLength
   *
   * minLength: Number
   * returns { valid: true } or { valid: false, reason: { actualKeySize: Number, minKeySize: Number } }
   */
  static async verifyCSRKeyLength (csr, minLength) {
    let stdout = await EmbeddedPKIEngine.getCSROutput(csr);
    return EmbeddedPKIEngine.verifyInputKeyLength(stdout, minLength);
  }

  /**
   * Verifies that the Certificate Public Key length is at least minLength
   *
   * minLength: Number
   * returns { valid: true } or { valid: false, reason: { actualKeySize: Number, minKeySize: Number } }
   */
  static async verifyCertKeyLength (cert, minLength) {
    let stdout = await EmbeddedPKIEngine.getCertOutput(cert);
    return EmbeddedPKIEngine.verifyInputKeyLength(stdout, minLength);
  }

  /**
   * Verifies that the Input Public Key length is at least minLength
   *
   * @param {String} input openssl -text output
   * @param {Number} minLength
   * @returns { valid: true } or { valid: false, reason: { actualKeySize: Number, minKeySize: Number } }
   */
  static async verifyInputKeyLength (input, minLength) {
    let stdout = input;
    let keySizeResult = stdout.match(/^[\s\S]*Public-Key: \((.*) bit\)[\s\S]*$/);
    if (keySizeResult == null || !Array.isArray(keySizeResult)) {
      throw new InvalidEntityError('Input failed verification. Can\'t read Public-Key length field');
    }

    let keySize = Number(keySizeResult[1]);
    if (Number.isNaN(keySize)) {
      throw new InvalidEntityError(`Input failed verification. Can't read Public-Key length field with value ${keySizeResult[1]}`);
    }
    if (keySize < minLength) {
      return { valid: false, reason: { actualKeySize: keySize, minKeySize: minLength } };
    }
    return { valid: true };
  }

  /**
   * Verifies that the CSR signature algorithm is included in the algorithms list
   * @param {String} csr PEM-encoded CSR
   * @param {String[]} algorithms Array of valid algorithms
   * @returns { valid: true } or { valid: false, reason: { actualAlgorithm : String, algorithm : String} }
   */
  static async verifyCSRAlgorithm (csr, algorithms) {
    let stdout = await EmbeddedPKIEngine.getCSROutput(csr);
    return EmbeddedPKIEngine.verifyOutputAlgorithm(stdout, algorithms);
  }

  /**
   * Verifies that the Cert signature algorithm is the same as the parameter
   *
   * algorithms: String[]
   * returns { valid: true } or { valid: false, reason: { actualAlgorithm : String, algorithm : String} }
   *
   */
  static async verifyCertAlgorithm (cert, algorithms) {
    let stdout = await EmbeddedPKIEngine.getCertOutput(cert);
    return EmbeddedPKIEngine.verifyOutputAlgorithm(stdout, algorithms);
  }

  /**
   * Verifies that the Input signature algorithm is the same as the parameter
   *
   * @param {String} input openssl -text output
   * @param {String[]} algorithms
   * @returns { valid: true } or { valid: false, reason: { actualAlgorithm : String, algorithm : String} }
   *
   */
  static async verifyOutputAlgorithm (input, algorithms) {
    let stdout = input;
    let algorithmResult = stdout.match(/^[\s\S]*Signature Algorithm: (.*)\n[\s\S]*$/);
    if (algorithmResult == null || !Array.isArray(algorithmResult)) {
      throw new InvalidEntityError('Input failed verification. Can\'t read Signature Algorithm field');
    }

    let actualAlgorithm = algorithmResult[1];
    if (!algorithms.includes(actualAlgorithm)) {
      return { valid: false, reason: { actualAlgorithm, algorithms } };
    }
    return { valid: true, reason: { actualAlgorithm, algorithms } };
  }

  /**
   * Verifies that the certificate and the private key have the same modulo
   *
   * @param {String} certificate PEM-encoded certificate
   * @param {String} key PEM-encoded key. If encrypted, the engine will attempt to decrypt it with the env PASS_PHRASE
   * @returns {
   * result: {boolean}
   * output: {String} validation details
   * }
   */
  async verifyCertificateAgainstKey (certificate, key) {
    let checkedKey = this.isEncrypted(key) ? await this.decryptKey(key) : key;
    let keyModulus = await EmbeddedPKIEngine.computeKeyModulus(checkedKey, 'KEY');
    let certModulus = await EmbeddedPKIEngine.computeKeyModulus(certificate, 'CERTIFICATE');
    return { result: keyModulus === certModulus };
  }

  /**
   * Verifies that the Certificate Public Key must match the private key used to sign the CSR.
   * Only available if the CSR was created by the Connection-Manager. If the CSR was uploaded instead of generated by
   * the Connection Manager, and there's no private key associated, this will be set the state to NOT_AVAILABLE
   *
   * @param {String} code Validation code
   * @param {String} csr PEM-encoded CSR.
   * @param {String} certificate PEM-encoded certificate
   * @returns {Validation} validation
   */
  async verifyCertificatePublicKeyMatchPrivateKey (certificate, key, code) {
    if (!certificate) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        `No certificate`);
    }
    if (!key) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        `No private key`);
    }

    let { result } = await this.verifyCertificateAgainstKey(certificate, key);
    if (!result) {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID, `the Certificate Public Key doesn't match the private key used to sign the CSR`);
    }
    return new Validation(code, true, ValidationCodes.VALID_STATES.VALID, `the Certificate Public Key matches the private key used to sign the CSR`);
  }

  isEncrypted (key) {
    if (typeof key !== 'string') {
      throw new InternalError('Key is not an string');
    }
    let lines = key.split('\n');
    if (!Array.isArray(lines) || lines.length < 2) {
      throw new InternalError('key string is not a key');
    }
    return lines[1].includes('Proc-Type: 4,ENCRYPTED');
  }

  /**
   * Returns the openssl -text output.
   *
   * @param {String} csr PEM-encoded CSR
   * @returns {String} The openssl -text output.
   * @throws ExternalProcessError
   * @throws InvalidEntityError if the CSR is invalid
   */
  static async getCSROutput (csr) {
    return EmbeddedPKIEngine.getPrimItemOutput(csr, 'CSR');
  };

  /**
   * Returns the openssl -text output.
   *
   * @param {String} cert PEM-encoded Certificate
   * @returns {String} The openssl -text output.
   * @throws ExternalProcessError
   * @throws InvalidEntityError if the Certificate is invalid
   */
  static async getCertOutput (cert) {
    return EmbeddedPKIEngine.getPrimItemOutput(cert, 'CERT');
  };

  /**
   * Returns the openssl -text output.
   *
   * @param {String} input PEM-encoded Certificate or CSR
   * @param {String} type 'CERT' or 'CSR'
   * @returns {String} The openssl -text output.
   * @throws ExternalProcessError
   * @throws InvalidEntityError if the input is invalid
   */
  static async getPrimItemOutput (input, type) {
    let typeParam = type === 'CSR' ? 'req' : type === 'CERT' ? 'x509' : null;
    if (!type) {
      throw new InternalError('input type not specified');
    }
    let args = [typeParam, '-text', '-noout'];
    if (type === 'CSR') {
      args.push('-verify');
    }

    const opensslResult = await spawnProcess('openssl', args, input, false);
    let { stdout, stderr, code } = opensslResult;
    if (typeof stdout !== 'string') {
      throw new ExternalProcessError('Could not read openssl output');
    }

    if (code !== 0) {
      throw new ExternalProcessError(`openssl returned code ${code}`, { output: opensslResult });
    }

    if (type === 'CSR' && !stderr.includes('verify OK')) {
      throw new InvalidEntityError(`Input ${type} failed verification`, { output: opensslResult });
    }
    return stdout;
  };

  /**
   * Computes the modulus of a private key or the public key contained in the certificate or CSR
   * openssl rsa -noout -modulus < ca-key.pem
   * openssl x509 -noout -modulus < ca.pem
   * openssl req -noout -modulus -in test/resources/modusbox/dfsp_inbound.csr
   *
   * @param {String} source PEM-encoded Private Key or Certificate or CSR
   * @param {String} kind KEY or CERTIFICATE or CSR
   */
  static async computeKeyModulus (source, kind) {
    let command;
    switch (kind) {
      case 'KEY':
        command = 'rsa';
        break;
      case 'CSR':
        command = 'req';
        break;
      case 'CERTIFICATE':
        command = 'x509';
        break;
      default:
        break;
    }
    if (!command) {
      throw new InvalidEntityError(`Unknown source type: ${kind}`);
    }
    const openssl = await spawnProcess('openssl', [command, '-noout', '-modulus'], source);
    return openssl.stdout;
  };

  /**
   * Validates ValidationCodes.VALIDATION_CODES.CA_CERTIFICATE_USAGE
   *
   * @param {String} rootCertificate PEM-encoded certificate
   * @param {String} intermediateChain PEM-encoded certificate TODO: add validations
   * @param {String} code validation code
   * @returns {Validation} validation
   */
  async validateCertificateUsageCA (rootCertificate, intermediateChain, code) {
    if (!rootCertificate) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        `No root certificate and currently not validating intermediate CAs if present`);
    }

    let rootCertificateText = await EmbeddedPKIEngine.getPrimItemOutput(rootCertificate, 'CERT');

    const initIndex = rootCertificateText.search(/X509v3 Basic Constraints: critical/);

    if (initIndex !== -1) {
      // cleaning the part above that, which is unnecessary for this validation
      rootCertificateText = rootCertificateText.substring(initIndex);

      // splitted into two lines to obtain exactly the next and check CA:TRUE
      var splitted = rootCertificateText.split('\n', 2);

      if (/CA:TRUE/.test(splitted[1])) {
        return new Validation(code, true, ValidationCodes.VALID_STATES.VALID,
          `The root certificate has the CA basic contraint extension ( CA = true )`);
      }
    }

    return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
      `The root certificate doesn't have the CA basic contraint extension ( CA = true )`);
  }

  /**
   *
   * @param {String} rootCertificate PEM-encoded string
   * @param {String} code
   * @returns {Validation} validation
   */
  async verifyRootCertificate (rootCertificate, code) {
    if (!rootCertificate) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        `No root certificate`);
    }
    let { state, output } = await EmbeddedPKIEngine.validateRootCertificate(rootCertificate);

    if (state === 'INVALID') {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
        `The root certificate must be valid and be self-signed or signed by a global root.`, output);
    }

    return new Validation(code, true, ValidationCodes.VALID_STATES.VALID, `The root certificate is valid with ${state} state.`, state);
  }

  /**
   * Verifies that the intermediateChain is made of valid CAs and that the top of the chain is signed by the root.
   * If rootCertificate is null, the top of the chain should be signed by a global root.
   * @param {String} rootCertificate PEM-encoded string
   * @param {String} intermediateChain PEM-encoded string
   * @param {String} code
   * @returns {Validation} validation
   */
  async verifyIntermediateChain (rootCertificate, intermediateChain, code) {
    let { firstIntermediateChainCertificate, remainingIntermediateChainInfo } = await PkiService.retrieveFirstAndRemainingIntermediateChainCerts(intermediateChain);
    if (!firstIntermediateChainCertificate) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        `No intermediate chain`);
    }

    let { result, output } = await EmbeddedPKIEngine.verifyCertificateSigning(firstIntermediateChainCertificate, rootCertificate, remainingIntermediateChainInfo);
    if (!result) {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
        `the intermediateChain must be made of valid CAs and that the top of the chain is signed by the root`, output);
    }

    return new Validation(code, true, ValidationCodes.VALID_STATES.VALID,
      `The intermediateChain is made of valid CAs and at the top of the chain is signed by the root.`);
  }

  /**
   * Verifies the certificate as a root certificate. It can be self-signed or signed by a global root.
   * Global root depends on the engine root certificates list, so this condition may change over time.
   * Ref: https://www.openssl.org/docs/man1.0.2/man1/openssl-verify.html
   *
   * @param {String} rootCertificate PEM-encoded string
   * @returns {state: String, output: String} state: 'VALID(SELF_SIGNED)' | 'VALID(SIGNED)' | 'INVALID'. output: command output
   */
  static async validateRootCertificate (rootCertificate) {
    const opensslResult = await spawnProcess('openssl', ['verify', '-verbose'], rootCertificate, false);
    let { stdout, code } = opensslResult;
    if (typeof stdout !== 'string') {
      throw new ExternalProcessError('Could not read openssl output');
    }

    if (code === 0) {
      if (stdout.includes('self signed certificate')) {
        return ({ state: VALID_SELF_SIGNED, output: stdout });
      }
      return ({ state: VALID_SIGNED, output: stdout });
    }

    if (code === 1) {
      throw new ExternalProcessError(`openssl returned code ${code}`, { output: opensslResult });
    }

    if (code === 2) {
      if (stdout.includes('self signed certificate')) {
        return ({ state: VALID_SELF_SIGNED, output: stdout });
      }
      return ({ state: INVALID, output: stdout });
    }

    return ({ state: INVALID, output: stdout });
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
  static async verifyCertificateSigning (certificate, rootCertificate, intermediateChain) {
    let argsArray = ['verify', '-verbose'];
    let fsWrite = util.promisify(fs.write);
    let rootCleanup = null;
    let intermediateCleanup = null;
    if (rootCertificate) {
      let { fd, path, cleanup } = await file({ mode: '0600', prefix: 'root-', postfix: '.pem' });
      rootCleanup = cleanup;
      await fsWrite(fd, rootCertificate);

      argsArray.push('-CAfile');
      argsArray.push(path);
    }
    if (intermediateChain) {
      let { fd, path, cleanup } = await file({ mode: '0600', prefix: 'intermediate-', postfix: '.pem' });
      intermediateCleanup = cleanup;
      await fsWrite(fd, intermediateChain);

      argsArray.push('-untrusted');
      argsArray.push(path);
    }
    const opensslResult = await spawnProcess('openssl', argsArray, certificate, false);
    rootCleanup && rootCleanup();
    intermediateCleanup && intermediateCleanup();
    let { stdout, code } = opensslResult;
    if (typeof stdout !== 'string') {
      throw new ExternalProcessError('Could not read openssl output');
    }

    if (code === 0) {
      return ({ result: true, output: stdout });
    }

    if (code === 1) {
      throw new ExternalProcessError(`openssl returned code ${code}`, { output: opensslResult });
    }

    return { result: false, output: stdout };
  }

  /**
   * Returns an object with the CSR contents and info
   *
   * @param {String} csr PEM-encoded CSR
   * @returns {CSRInfo} The CSR Info
   * @throws ExternalProcessError if error occurs while processing the CSR
   * @throws InvalidEntityError if the CSR is invalid
   */
  static async getCSRInfo (csr) {
    if (!csr) {
      throw new InvalidEntityError('Empty or null CSR');
    }
    // cfssl certinfo -csr test/resources/modusbox/dfsp_outbound.csr
    let argsArray = ['certinfo', '-csr', '-'];

    const commandResult = await spawnProcess(Constants.CFSSL.COMMAND_PATH, argsArray, csr);
    let { stdout } = commandResult;
    if (typeof stdout !== 'string') {
      throw new ExternalProcessError('Could not read command output');
    }

    let doc;
    try {
      doc = JSON.parse(stdout);
    } catch (error) {
      throw new InternalError('Error while parsing csr info output: ' + JSON.stringify(error));
    }
    if (doc.code) {
      throw new InvalidEntityError('Error while parsing csr info output: ' + JSON.stringify(doc));
    }
    let csrInfo = new CSRInfo(doc);
    return csrInfo;
  }

  /**
   * Returns an object with the Certificate contents and info
   *
   * @param {String} csr PEM-encoded Certificate
   * @returns {CertInfo} The Certificate Info
   * @throws ExternalProcessError if error occurs while processing the CSR
   * @throws InvalidEntityError if the Certificate is invalid
   */
  static async getCertInfo (cert) {
    if (!cert) {
      throw new InvalidEntityError('Empty or null cert');
    }
    // cfssl certinfo -csr test/resources/modusbox/dfsp_outbound.csr
    let argsArray = ['certinfo', '-cert', '-'];

    const commandResult = await spawnProcess(Constants.CFSSL.COMMAND_PATH, argsArray, cert);
    let { stdout } = commandResult;
    if (typeof stdout !== 'string') {
      throw new ExternalProcessError('Could not read command output');
    }

    let doc;
    try {
      doc = JSON.parse(stdout);
    } catch (error) {
      throw new InternalError('Error while parsing csr info output: ' + JSON.stringify(error));
    }

    if (doc.code) {
      throw new InvalidEntityError('Error while parsing csr info output: ' + JSON.stringify(doc));
    }
    let certInfo = new CertInfo(doc);
    return certInfo;
  }
};

module.exports = EmbeddedPKIEngine;
