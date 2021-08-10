/** ************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Yevhen Kyriukha - yevhen.kyriukha@modusbox.com                   *
 ************************************************************************* */

const vault = require('node-vault');
const forge = require('node-forge');
const CAInitialInfo = require('./CAInitialInfo');
const defaultCAConfig = require('./ca-config.json');
const Validation = require('./Validation');
const ValidationCodes = require('./ValidationCodes');
const moment = require('moment');
const spawnProcess = require('../process/spawner');
const CAType = require('../models/CAType');
const PKIEngine = require('./PKIEngine');
const InvalidEntityError = require('../errors/InvalidEntityError');
const InternalError = require('../errors/InternalError');
const NotFoundError = require('../errors/NotFoundError');
const PkiService = require('../service/PkiService');
const util = require('util');
const fs = require('fs');
const { file } = require('tmp-promise');
const Constants = require('../constants/Constants');
const CSRInfo = require('./CSRInfo');
const CertInfo = require('./CertInfo');
const ExternalProcessError = require('../errors/ExternalProcessError');

const assertExternalProcessResult = (condition, ...args) => {
  if (!condition) {
    throw new ExternalProcessError(...args);
  }
};

// TODO: find and link document containing rules on allowable paths
const vaultPaths = {
  HUB_SERVER_CERT: 'hub-server-cert',
  DFSP_SERVER_CERT: 'dfsp-server-cert',
  JWS_CERTS: 'dfsp-jws-certs',
  HUB_ENDPOINTS: 'hub-endpoints',
  DFSP_CA: 'dfsp-ca',
  HUB_ISSUER_CA: 'hub-issuer-ca',
  DFSP_OUTBOUND_ENROLLMENT: 'dfsp-outbound-enrollment',
  DFSP_INBOUND_ENROLLMENT: 'dfsp-inbound-enrollment',
};

const VALID_SIGNED = 'VALID(SIGNED)';
const VALID_SELF_SIGNED = 'VALID(SELF_SIGNED)';
const INVALID = 'INVALID';

class VaultPKIEngine extends PKIEngine {
  constructor ({ endpoint, mounts, auth, pkiBaseDomain }) {
    super();
    this.auth = auth;
    this.endpoint = endpoint;
    this.vault = vault({ endpoint });
    this.pkiBaseDomain = pkiBaseDomain;
    this.mounts = mounts;
  }

  async connect () {
    let creds;

    if (this.auth.appRole) {
      creds = await this.vault.approleLogin({
        role_id: this.auth.appRole.roleId,
        secret_id: this.auth.appRole.roleSecretId,
      });
    } else if (this.auth.k8s) {
      creds = await this.vault.kubernetesLogin({
        role: this.auth.k8s.role,
        jwt: this.auth.k8s.token,
      });
    } else {
      throw new Error('Unsupported auth method');
    }
    this.client = vault({
      endpoint: this.endpoint,
      token: creds.auth.client_token,
    });
  }

  setSecret (key, value) {
    const path = `${this.mounts.kv}/${key}`;
    return this.client.write(path, value);
  }

  async getSecret (key) {
    const path = `${this.mounts.kv}/${key}`;
    try {
      const { data } = await this.client.read(path);
      return data;
    } catch (e) {
      if (e.response && e.response.statusCode === 404) {
        throw new NotFoundError();
      }
      throw e;
    }
  }

  async listSecrets (key) {
    const path = `${this.mounts.kv}/${key}`;
    try {
      const { data: { keys } } = await this.client.list(path);
      return keys;
    } catch (e) {
      if (e.response && e.response.statusCode === 404) {
        return [];
      }
      throw e;
    }
  }

  async deleteSecret (key) {
    const path = `${this.mounts.kv}/${key}`;
    await this.client.delete(path);
  }

  async deleteAllDFSPData (dfspId) {
    return Promise.all([
      this.deleteAllDFSPOutboundEnrollments(dfspId),
      this.deleteAllDFSPInboundEnrollments(dfspId),
      this.deleteDFSPCA(dfspId),
      this.deleteDFSPJWSCerts(dfspId),
      this.deleteDFSPServerCerts(dfspId)
    ]);
  }

  // region DFSP Outbound Enrollment
  async setDFSPOutboundEnrollment (dfspId, enId, value) {
    return this.setSecret(`${vaultPaths.DFSP_OUTBOUND_ENROLLMENT}/${dfspId}/${enId}`, value);
  }

  async getDFSPOutboundEnrollment (dfspId, enId) {
    return this.getSecret(`${vaultPaths.DFSP_OUTBOUND_ENROLLMENT}/${dfspId}/${enId}`);
  }

  async deleteDFSPOutboundEnrollment (dfspId, enId) {
    return this.deleteSecret(`${vaultPaths.DFSP_OUTBOUND_ENROLLMENT}/${dfspId}/${enId}`);
  }

  async deleteAllDFSPOutboundEnrollments (dfspId) {
    const secrets = await this.listSecrets(`${vaultPaths.DFSP_OUTBOUND_ENROLLMENT}/${dfspId}`);
    return Promise.all(secrets.map(enId => this.deleteDFSPOutboundEnrollment(dfspId, enId)));
  }

  async getDFSPOutboundEnrollments (dfspId) {
    const secrets = await this.listSecrets(`${vaultPaths.DFSP_OUTBOUND_ENROLLMENT}/${dfspId}`);
    return Promise.all(secrets.map(enId => this.getDFSPOutboundEnrollment(dfspId, enId)));
  }
  // endregion

  // region DFSP Inbound Enrollment
  async setDFSPInboundEnrollment (dfspId, enId, value) {
    return this.setSecret(`${vaultPaths.DFSP_INBOUND_ENROLLMENT}/${dfspId}/${enId}`, value);
  }

  async getDFSPInboundEnrollments (dfspId) {
    const secrets = await this.listSecrets(`${vaultPaths.DFSP_INBOUND_ENROLLMENT}/${dfspId}`);
    return Promise.all(secrets.map(enId => this.getDFSPInboundEnrollment(dfspId, enId)));
  }

  async getDFSPInboundEnrollment (dfspId, enId) {
    return this.getSecret(`${vaultPaths.DFSP_INBOUND_ENROLLMENT}/${dfspId}/${enId}`);
  }

  async deleteDFSPInboundEnrollment (dfspId, enId) {
    return this.deleteSecret(`${vaultPaths.DFSP_INBOUND_ENROLLMENT}/${dfspId}/${enId}`);
  }

  async deleteAllDFSPInboundEnrollments (dfspId) {
    const secrets = await this.listSecrets(`${vaultPaths.DFSP_INBOUND_ENROLLMENT}/${dfspId}`);
    return Promise.all(secrets.map(enId => this.deleteDFSPInboundEnrollment(dfspId, enId)));
  }
  // endregion

  // region DFSP CA
  async setDFSPCA (dfspId, value) {
    return this.setSecret(`${vaultPaths.DFSP_CA}/${dfspId}`, value);
  }

  async getDFSPCA (dfspId) {
    return this.getSecret(`${vaultPaths.DFSP_CA}/${dfspId}`);
  }

  async deleteDFSPCA (dfspId) {
    return this.deleteSecret(`${vaultPaths.DFSP_CA}/${dfspId}`);
  }
  // endregion

  // region DFSP JWS
  async setDFSPJWSCerts (dfspId, value) {
    return this.setSecret(`${vaultPaths.JWS_CERTS}/${dfspId}`, value);
  }

  async getDFSPJWSCerts (dfspId) {
    return this.getSecret(`${vaultPaths.JWS_CERTS}/${dfspId}`);
  }

  async getAllDFSPJWSCerts () {
    const secrets = await this.listSecrets(vaultPaths.JWS_CERTS);
    return Promise.all(secrets.map(dfspId => this.getDFSPJWSCerts(dfspId)));
  }

  async deleteDFSPJWSCerts (dfspId) {
    return this.deleteSecret(`${vaultPaths.JWS_CERTS}/${dfspId}`);
  }
  // endregion

  // region Hub Server Cert
  async setHubServerCert (value) {
    return this.setSecret(vaultPaths.HUB_SERVER_CERT, value);
  }

  async getHubServerCert () {
    return this.getSecret(vaultPaths.HUB_SERVER_CERT);
  }

  async deleteHubServerCert () {
    return this.deleteSecret(vaultPaths.HUB_SERVER_CERT);
  }

  async setHubIssuerCACert (id, value) {
    return this.setSecret(`${vaultPaths.HUB_ISSUER_CA}/${id}`, value);
  }

  async getHubIssuerCACert (id) {
    return this.getSecret(`${vaultPaths.HUB_ISSUER_CA}/${id}`);
  }

  async getHubIssuerCACerts (id) {
    const secrets = await this.listSecrets(vaultPaths.HUB_ISSUER_CA);
    return Promise.all(secrets.map(id => this.getHubIssuerCACert(id)));
  }

  async deleteHubIssuerCACert (id) {
    return this.deleteSecret(`${vaultPaths.HUB_ISSUER_CA}/${id}`);
  }
  // endregion

  // region DFSP Server Cert
  async setDFSPServerCerts (dfspId, value) {
    return this.setSecret(`${vaultPaths.DFSP_SERVER_CERT}/${dfspId}`, value);
  }

  async getDFSPServerCerts (dfspId) {
    return this.getSecret(`${vaultPaths.DFSP_SERVER_CERT}/${dfspId}`);
  }

  async deleteDFSPServerCerts (dfspId) {
    return this.deleteSecret(`${vaultPaths.DFSP_SERVER_CERT}/${dfspId}`);
  }
  // endregion

  /**
   * Delete root CA
   * @returns {Promise<void>}
   */
  async deleteCA () {
    await this.client.request({
      path: `/${this.mounts.pki}/root`,
      method: 'DELETE',
    });
  }

  /**
   * Create root CA
   * @param {CAInitialInfo} caOptionsDoc. Engine options, @see CAInitialInfo
   */
  async createCA (caOptionsDoc) {
    let caOptions = new CAInitialInfo(caOptionsDoc);
    let caConfig = { ...defaultCAConfig };
    if (caOptions.default) {
      caConfig.signing.default = caOptions.default;
    }

    await this.deleteCA();

    const { names, key: keyDetails } = caOptions.csr;
    const altNames = names.length > 1 ? names.slice(1).map((name) => name.CN).join(',') : '';
    const { data } = await this.client.request({
      path: `/${this.mounts.pki}/root/generate/exported`,
      method: 'POST',
      json: {
        common_name: names[0].CN,
        alt_names: altNames,
        ou: names.map((name) => name.OU),
        organization: names.map((name) => name.O),
        locality: names.map((name) => name.L),
        country: names.map((name) => name.C),
        province: names.map((name) => name.ST),
        key_type: keyDetails.algo,
        key_bits: keyDetails.size,
        ttl: caConfig.signing.default.expiry,
      },
    });

    return {
      cert: data.certificate,
      key: data.private_key,
      caConfig
    };
  }

  // TODO: Need to implement an endpoint to use the following method
  /**
   * Creates hub server certificate
   * @param params. CSR options, @see CAInitialInfo
   */
  async createHubServerCert (params) {
    const { names } = params;
    const altNames = names.length > 1 ? names.slice(1).map((name) => name.CN).join(',') : '';
    const { data } = await this.client.request({
      path: `/${this.mounts.pki}/issue/${this.pkiBaseDomain}`,
      method: 'POST',
      json: {
        common_name: names[0].CN,
        alt_names: altNames,
        ou: names.map((name) => name.OU),
        organization: names.map((name) => name.O),
        locality: names.map((name) => name.L),
        country: names.map((name) => name.C),
        province: names.map((name) => name.ST),
        key_type: params.key.algo,
        key_bits: params.key.size,
      },
    });
    return data;
  }

  /**
     * Creates a CA
     * @param {CAInitialInfo} caOptionsDoc. Engine options, @see CAInitialInfo
     */
  async createIntermediateCA (caOptionsDoc) {
    let caOptions = new CAInitialInfo(caOptionsDoc);
    let caConfig = { ...defaultCAConfig };
    if (caOptions.default) {
      caConfig.signing.default = caOptions.default;
    }
    const csr = await this.createHubCSR(caOptions.csr);
    const cert = await this.signHubCSR(csr.csr);
    await this.setIntermediateCACert(cert.certificate);

    return {
      cert: cert.certificate,
      csr: csr.csr,
      key: csr.private_key,
      caConfig
    };
  }

  /**
     * Creates intermediate CA CSR
     * @param params. CSR options, @see CAInitialInfo
     */
  async createIntermediateHubCSR (params) {
    const { names } = params;
    const altNames = names.length > 1 ? names.slice(1).map((name) => name.CN).join(',') : '';
    const { data } = await this.client.request({
      path: `/${this.mounts.intermediatePki}/intermediate/generate/exported`,
      method: 'POST',
      json: {
        common_name: names[0].CN,
        alt_names: altNames,
        ou: names.map((name) => name.OU),
        organization: names.map((name) => name.O),
        locality: names.map((name) => name.L),
        country: names.map((name) => name.C),
        province: names.map((name) => name.ST),
        key_type: params.key.algo,
        key_bits: params.key.size,
      },
    });
    return data;
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
   * @returns { csr: String, key:  String, PEM-encoded. Encrypted ( see encryptKey ) }
   */
  async createCSR (csrParameters, keyBits, algorithm) {
    let hosts = [];
    if (Array.isArray(csrParameters.extensions.subjectAltName.dns)) {
      hosts.push(...csrParameters.extensions.subjectAltName.dns);
    }
    if (Array.isArray(csrParameters.extensions.subjectAltName.ips)) {
      hosts.push(...csrParameters.extensions.subjectAltName.ips);
    }
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
      // await this.setDFSPOutboundCert(csr.CN, { key: cfsslOutput.key });
      // delete cfsslOutput.key;
      return cfsslOutput;
    } catch (error) {
      throw new InternalError(error.message);
    } finally {
      if (configCleanup) configCleanup();
    }
  }

  async signIntermediateHubCSR (csr) {
    const csrInfo = forge.pki.certificationRequestFromPem(csr);
    const { data } = await this.client.request({
      path: `/${this.mounts.pki}/root/sign-intermediate`,
      method: 'POST',
      json: {
        use_csr_values: true,
        common_name: csrInfo.subject.getField('CN').value,
        csr,
      },
    });
    return data;
  }

  /**
   * Sign Hub CSR
   * @param csr
   * @returns {Promise<*>}
   */
  async signWithIntermediateCA (csr) {
    const csrInfo = forge.pki.certificationRequestFromPem(csr);
    const { data } = await this.client.request({
      path: `/${this.mounts.intermediatePki}/sign/${this.pkiBaseDomain}`,
      method: 'POST',
      json: {
        common_name: csrInfo.subject.getField('CN').value,
        csr,
      },
    });
    return data.certificate;
  }

  /**
   * Sign Hub CSR
   * @param csr
   * @returns {Promise<*>}
   */
  async sign (csr) {
    const csrInfo = forge.pki.certificationRequestFromPem(csr);
    const { data } = await this.client.request({
      path: `/${this.mounts.pki}/sign/${this.pkiBaseDomain}`,
      method: 'POST',
      json: {
        common_name: csrInfo.subject.getField('CN').value,
        csr,
        ttl: '600h',
      },
    });
    return data.certificate;
  }

  async setHubCaCert (certPem, privateKeyPem) {
    await this.client.request({
      path: `/${this.mounts.pki}/config/ca`,
      method: 'POST',
      json: {
        pem_bundle: `${privateKeyPem}\n${certPem}`,
      },
    });

    // Secret object documentation:
    // https://github.com/modusintegration/mojaloop-k3s-bootstrap/blob/e3578fc57a024a41023c61cd365f382027b922bd/docs/README-vault.md#vault-crd-secrets-integration
    // https://vault.koudingspawn.de/supported-secret-types/secret-type-cert
  }

  async getRootCaCert () {
    return this.client.request({
      path: `/${this.mounts.pki}/ca/pem`,
      method: 'GET',
    });
  }

  async setIntermediateCACert (certPem) {
    await this.client.request({
      path: `/${this.mounts.intermediatePki}/intermediate/set-signed`,
      method: 'POST',
      json: {
        certificate: certPem,
      },
    });
  }

  async setHubEndpoints (value) {
    return this.setSecret(vaultPaths.HUB_ENDPOINTS, value);
  }

  async getHubEndpoints () {
    return this.getSecret(vaultPaths.HUB_ENDPOINTS);
  }

  /**
   * Validates ValidationCodes.VALIDATION_CODES.CERTIFICATE_VALIDITY
   *
   * @param {String} serverCert PEM-encoded certificate
   * @param {String} code validation code
   */
  async validateCertificateValidity (serverCert, code) {
    if (!serverCert) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        `No certificate`);
    }

    try {
      let certInfo = await VaultPKIEngine.getCertInfo(serverCert);
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
    let certificateText = await VaultPKIEngine.getPrimItemOutput(serverCert, 'CERT');
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
    let { result, output } = await VaultPKIEngine.verifyCertificateSigning(serverCert, rootCertificate, intermediateChain);
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
    let { valid, reason } = await VaultPKIEngine.verifyCertKeyLength(serverCert, keyLength);
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
      let csrInfo = await VaultPKIEngine.getCSRInfo(csr);
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
      let { valid, reason } = await VaultPKIEngine.verifyCSRAlgorithm(csr, algo);
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
      let { valid, reason } = await VaultPKIEngine.verifyCertAlgorithm(certificate, [algo]);
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
      let { valid, reason } = await VaultPKIEngine.verifyCSRKeyLength(csr, length);
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
      let { result } = await VaultPKIEngine.verifyCertificateSigning(certificate, dfspCA.rootCertificate, dfspCA.intermediateChain);
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
    let csrModulus = await VaultPKIEngine.computeKeyModulus(csr, 'CSR');
    let certModulus = await VaultPKIEngine.computeKeyModulus(certificate, 'CERTIFICATE');
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

    let certificateText = await VaultPKIEngine.getPrimItemOutput(certificate, 'CERT');
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

    let csrInfo = await VaultPKIEngine.getCSRInfo(enrollment.csr);
    let certInfo = await VaultPKIEngine.getCertInfo(enrollment.certificate);

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

    let csrInfo = await VaultPKIEngine.getCSRInfo(enrollment.csr);
    let certInfo = await VaultPKIEngine.getCertInfo(enrollment.certificate);

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
    let stdout = await VaultPKIEngine.getCSROutput(csr);
    return VaultPKIEngine.verifyInputKeyLength(stdout, minLength);
  }

  /**
   * Verifies that the Certificate Public Key length is at least minLength
   *
   * minLength: Number
   * returns { valid: true } or { valid: false, reason: { actualKeySize: Number, minKeySize: Number } }
   */
  static async verifyCertKeyLength (cert, minLength) {
    let stdout = await VaultPKIEngine.getCertOutput(cert);
    return VaultPKIEngine.verifyInputKeyLength(stdout, minLength);
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
    let stdout = await VaultPKIEngine.getCSROutput(csr);
    return VaultPKIEngine.verifyOutputAlgorithm(stdout, algorithms);
  }

  /**
   * Verifies that the Cert signature algorithm is the same as the parameter
   *
   * algorithms: String[]
   * returns { valid: true } or { valid: false, reason: { actualAlgorithm : String, algorithm : String} }
   *
   */
  static async verifyCertAlgorithm (cert, algorithms) {
    let stdout = await VaultPKIEngine.getCertOutput(cert);
    return VaultPKIEngine.verifyOutputAlgorithm(stdout, algorithms);
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
    let keyModulus = await VaultPKIEngine.computeKeyModulus(key, 'KEY');
    let certModulus = await VaultPKIEngine.computeKeyModulus(certificate, 'CERTIFICATE');
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

  /**
   * Returns the openssl -text output.
   *
   * @param {String} csr PEM-encoded CSR
   * @returns {String} The openssl -text output.
   * @throws ExternalProcessError
   * @throws InvalidEntityError if the CSR is invalid
   */
  static async getCSROutput (csr) {
    return VaultPKIEngine.getPrimItemOutput(csr, 'CSR');
  }

  /**
   * Returns the openssl -text output.
   *
   * @param {String} cert PEM-encoded Certificate
   * @returns {String} The openssl -text output.
   * @throws ExternalProcessError
   * @throws InvalidEntityError if the Certificate is invalid
   */
  static async getCertOutput (cert) {
    return VaultPKIEngine.getPrimItemOutput(cert, 'CERT');
  }

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

    assertExternalProcessResult(typeof stdout === 'string', 'Could not read openssl output');
    assertExternalProcessResult(code === 0, `openssl returned code ${code}`, { output: opensslResult });

    if (type === 'CSR' && !stderr.includes('verify OK')) {
      throw new InvalidEntityError(`Input ${type} failed verification`, { output: opensslResult });
    }
    return stdout;
  }

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
  }

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

    let rootCertificateText = await VaultPKIEngine.getPrimItemOutput(rootCertificate, 'CERT');

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
    let { state, output } = await VaultPKIEngine.validateRootCertificate(rootCertificate);

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

    let { result, output } = await VaultPKIEngine.verifyCertificateSigning(firstIntermediateChainCertificate, rootCertificate, remainingIntermediateChainInfo);
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
    let { stdout, stderr, code } = opensslResult;

    assertExternalProcessResult(typeof stdout === 'string', 'Could not read openssl output');
    assertExternalProcessResult(code !== 1, `openssl returned code ${code}`, { output: opensslResult });

    if (code === 0) {
      if (stdout.includes('self signed certificate')) {
        return ({ state: VALID_SELF_SIGNED, output: stdout });
      }
      return ({ state: VALID_SIGNED, output: stdout });
    }

    if (code === 2) {
      if (stdout.includes('self signed certificate') || stderr.includes('self signed certificate')) {
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
    if (rootCleanup) rootCleanup();
    if (intermediateCleanup) intermediateCleanup();
    let { stdout, code } = opensslResult;

    assertExternalProcessResult(typeof stdout === 'string', 'Could not read openssl output');
    assertExternalProcessResult(code !== 1, `openssl returned code ${code}`, { output: opensslResult });

    return ({ result: code === 0, output: stdout });
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

    assertExternalProcessResult(typeof stdout === 'string', 'Could not read openssl output');

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

    assertExternalProcessResult(typeof stdout === 'string', 'Could not read openssl output');

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
}

module.exports = VaultPKIEngine;
