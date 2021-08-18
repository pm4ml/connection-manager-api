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
const CAType = require('../models/CAType');
const PKIEngine = require('./PKIEngine');
const InvalidEntityError = require('../errors/InvalidEntityError');
const NotFoundError = require('../errors/NotFoundError');
const PkiService = require('../service/PkiService');
const util = require('util');
const fs = require('fs');
const { file } = require('tmp-promise');
const { splitCertificateChain } = require('../service/PkiService');

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
    const caOptions = new CAInitialInfo(caOptionsDoc);
    const caConfig = { ...defaultCAConfig };
    if (caOptions.default) {
      caConfig.signing.default = caOptions.default;
    }

    try { await this.deleteCA(); } catch (e) { }

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

  /**
   * Creates hub server certificate
   * @param csrParameters. CSR options, @see CAInitialInfo
   */
  async createHubServerCert (csrParameters) {
    const reqJson = {
      common_name: csrParameters.subject.CN,
    };
    if (csrParameters.extensions && csrParameters.extensions.subjectAltName) {
      const { dns, ips } = csrParameters.extensions.subjectAltName;
      if (dns) {
        reqJson.alt_names = dns.join(',');
      }
      if (ips) {
        reqJson.ip_sans = ips.join(',');
      }
    }
    const { data } = await this.client.request({
      path: `/${this.mounts.pki}/issue/${this.pkiBaseDomain}`,
      method: 'POST',
      json: reqJson,
    });
    return data;
  }

  /**
     * Creates a CA
     * @param {CAInitialInfo} caOptionsDoc. Engine options, @see CAInitialInfo
     */
  async createIntermediateCA (caOptionsDoc) {
    const caOptions = new CAInitialInfo(caOptionsDoc);
    const caConfig = { ...defaultCAConfig };
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
    const { fd: configFd, path: configPath, cleanup: configCleanup } = await file({ mode: '0600', prefix: 'config-', postfix: '.json' });
    const fsWrite = util.promisify(fs.write);
    const configContent = this.caConfig ? this.caConfig : defaultCAConfig;
    // console.log(`configContent: ${JSON.stringify(configContent)}`);
    await fsWrite(configFd, JSON.stringify(configContent));
    return { configPath, configCleanup };
  }

  /**
   *
   * @param {CSRParameters} csrParameters CSR Parameters
   * @param {*} keyBits Key length. If not specified, takes the CA defaults ( see constructor )
   * @returns { csr: String, key:  String, PEM-encoded. Encrypted ( see encryptKey ) }
   */
  async createCSR (csrParameters, keyBits) {
    const keys = forge.pki.rsa.generateKeyPair(keyBits);
    const csr = forge.pki.createCertificationRequest();
    csr.publicKey = keys.publicKey;
    csr.setSubject(Object.entries(csrParameters.subject).map(([shortName, value]) => ({ shortName, value })));
    if (csrParameters.extensions && csrParameters.extensions.subjectAltName) {
      const { dns, ips } = csrParameters.extensions.subjectAltName;
      csr.setAttributes([{
        name: 'extensionRequest',
        extensions: [{
          name: 'subjectAltName',
          altNames: [
            ...dns ? dns.map(value => ({ type: VaultPKIEngine.DNS_TYPE, value })) : [],
            ...ips ? ips.map(value => ({ type: VaultPKIEngine.IP_TYPE, value })) : []
          ]
        }]
      }]);
    }

    csr.sign(keys.privateKey, forge.md.sha256.create());

    return {
      csr: forge.pki.certificationRequestToPem(csr),
      privateKey: forge.pki.privateKeyToPem(keys.privateKey, 72),
    };
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
  validateCertificateValidity (serverCert, code) {
    if (!serverCert) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        'No certificate');
    }

    try {
      const certInfo = this.getCertInfo(serverCert);
      const notAfterDate = moment(certInfo.notAfter);
      if (!notAfterDate || !notAfterDate.isValid()) {
        throw new Error('Invalid notAfterDate');
      }
      const notBeforeDate = moment(certInfo.notBefore);
      if (!notBeforeDate || !notBeforeDate.isValid()) {
        throw new Error('Invalid notBeforeDate');
      }
      const valid = moment().isBetween(notBeforeDate, notAfterDate);
      const validation = new Validation(code, true);
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
      const validation = new Validation(code, true, ValidationCodes.VALID_STATES.INVALID, 'Error ocurred while processing the certificate');
      validation.result = JSON.stringify(error);
      return validation;
    }
  }

  /**
   * Validates ValidationCodes.VALIDATION_CODES.CERTIFICATE_USAGE_SERVER
   *
   * @param {String} serverCert PEM-encoded certificate
   */
  validateCertificateUsageServer (serverCert) {
    if (!serverCert) {
      return new Validation(ValidationCodes.VALIDATION_CODES.CERTIFICATE_USAGE_SERVER.code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        'No certificate');
    }

    const cert = forge.pki.certificateFromPem(serverCert);
    const extKeyUsage = cert.getExtension('extKeyUsage');
    if (!extKeyUsage || !extKeyUsage.serverAuth) {
      return new Validation(ValidationCodes.VALIDATION_CODES.CERTIFICATE_USAGE_SERVER.code, true, ValidationCodes.VALID_STATES.INVALID,
        'Certificate doesn\'t have the "TLS WWW server authentication" key usage extension');
    }

    return new Validation(ValidationCodes.VALIDATION_CODES.CERTIFICATE_USAGE_SERVER.code, true, ValidationCodes.VALID_STATES.VALID,
      'Certificate has the "TLS WWW server authentication" key usage extension');
  }

  /**
   * Validates ValidationCodes.VALIDATION_CODES.CERTIFICATE_CHAIN
   *
   * @param {String} serverCert PEM-encoded certificate
   * @param {String} intermediateChain PEM-encoded intermediate chain
   * @param {String} rootCertificate PEM-encoded root certificate
   */
  validateCertificateChain (serverCert, intermediateChain, rootCertificate) {
    const chain = [rootCertificate, ...splitCertificateChain(intermediateChain || '')].filter(cert => cert);
    const caStore = forge.pki.createCaStore(chain);
    let valid;
    try {
      valid = forge.pki.verifyCertificateChain(caStore, [serverCert]);
    } catch (e) {
      valid = false;
    }
    if (!valid) {
      return new Validation(ValidationCodes.VALIDATION_CODES.CERTIFICATE_CHAIN.code, true, ValidationCodes.VALID_STATES.INVALID, 'Certificate chain invalid', output);
    } else {
      return new Validation(ValidationCodes.VALIDATION_CODES.CERTIFICATE_CHAIN.code, true, ValidationCodes.VALID_STATES.VALID, 'Certificate chain valid', output);
    }
  }

  /**
   * Validates ValidationCodes.VALIDATION_CODES.CERTIFICATE_PUBLIC_KEY_LENGTH_*
   *
   * @param {String} serverCert PEM-encoded certificate
   * @param {Integer} keyLength key length in bits
   */
  validateCertificateKeyLength (serverCert, keyLength, code) {
    const { valid, reason } = this.verifyCertKeyLength(serverCert, keyLength);
    if (!valid) {
      // eslint-disable-next-line no-template-curly-in-string
      const validation = new Validation(code, true);
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
      return new Validation(code, true, ValidationCodes.VALID_STATES.VALID, 'Certificate key length valid');
    }
  }

  /**
   * Verified all the requires distinguished names
   *
   * @param {String} csr PEM-encoded CSR
   * @param {String} code Validation code
   * @returns {Validation} validation
   */
  verifyCsrMandatoryDistinguishedNames (csr, code) {
    const MANDATORY_DISTINGUISHED_NAMES = ['CN', 'OU', 'O', 'L', 'ST', 'C', 'E'];
    try {
      const csrInfo = this.getCSRInfo(csr);
      for (const field of MANDATORY_DISTINGUISHED_NAMES) {
        if (!csrInfo.subject[field]) {
          return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
            `CSR missing required distinguished name attributes. Missing: ${field}`);
        }
      }
      return new Validation(code, true, ValidationCodes.VALID_STATES.VALID,
        'CSR has all mandatory distiguished name attributes');
    } catch (error) {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
        'CSR couldn\'t be parsed'
      );
    }
  }

  /**
   * Verifies the signature on the CSR ( from https://www.openssl.org/docs/man1.1.1/man1/openssl-req.html ).
   *
   * @param {String} csr PEM-encoded CSR
   * @returns {Validation} validation
   */
  validateCsrSignatureValid (csrPem) {
    try {
      const csr = forge.pki.certificationRequestFromPem(csrPem);
      csr.verify();
      return new Validation(ValidationCodes.VALIDATION_CODES.CSR_SIGNATURE_VALID.code, true, ValidationCodes.VALID_STATES.VALID,
        'CSR passed verification');
    } catch (e) {
      return new Validation(ValidationCodes.VALIDATION_CODES.CSR_SIGNATURE_VALID.code, true, ValidationCodes.VALID_STATES.INVALID,
        `CSR failed verification: ${e.message}`);
    }
  }

  /**
   * Verifies that the signature algorithm is the one specified by code
   *
   * @param {String} csr PEM-encoded CSR
   */
  validateCsrSignatureAlgorithm (csr, code, algo) {
    try {
      const { valid, reason } = this.verifyCSRAlgorithm(csr, algo);
      if (valid) {
        return new Validation(code, true, ValidationCodes.VALID_STATES.VALID,
          `CSR has a valid Signature Algorithm : ${algo}`);
      } else {
        return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
          `CSR has a an invalid Signature Algorithm ${reason.actualAlgorithm}`
        );
      }
    } catch (error) {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
        'CSR couldn\'t be parsed'
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
  validateCertificateSignatureAlgorithm (certificate, code, algo) {
    if (!certificate) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        'No certificate');
    }

    try {
      const { valid, reason } = this.verifyCertAlgorithm(certificate, [algo]);
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
        'certificate couldn\'t be parsed'
      );
    }
  }

  /**
   * Verifies that the Public Key length is the one specified by code
   *
   * @param {String} csr PEM-encoded CSR
   */
  validateCsrPublicKeyLength (csr, code, length) {
    try {
      const { valid, reason } = this.verifyCSRKeyLength(csr, length);
      if (valid) {
        return new Validation(code, true, ValidationCodes.VALID_STATES.VALID,
          `CSR has a valid Public Key length of ${length}`);
      } else {
        return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
          `CSR Public Key length is not ${length}, it is ${reason.actualKeySize}`);
      }
    } catch (error) {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
        'CSR couldn\'t be parsed');
    }
  }

  /**
   * The Certificate should be signed by the DFSP CA.
   * data.result = TRUST_CHAIN_VALID or SELF_SIGNED or INVALID or NOT_AVAILABLE if the ca info is not present
   * @param {String} certificate PEM-encoded certificate
   * @param {DFSPCAsModel} dfspCA
   * @param {String} code
   */
  verifyCertificateSignedByDFSPCA (certificate, dfspCA, code) {
    if (!dfspCA || (!dfspCA.rootCertificate && !dfspCA.intermediateChain)) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        'No dfsp CA');
    }

    if (dfspCA.validationState === 'INVALID') {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID, 'Invalid dfsp ca root or chain');
    } else {
      const caStore = forge.pki.createCaStore([dfspCA.rootCertificate, ...splitCertificateChain(dfspCA.intermediateChain)]);
      let valid;
      try {
        valid = forge.pki.verifyCertificateChain(caStore, [certificate]);
      } catch (e) {
        valid = false;
      }
      return new Validation(code, true, valid ? ValidationCodes.VALID_STATES.VALID : ValidationCodes.VALID_STATES.INVALID, 'The Certificate is signed by the DFSP CA');
    }
  }

  /**
   * Verifies that the certificate and the csr have the same Public Key
   *
   * @param {String} certificate PEM-encoded certificate
   * @param {String} csr PEM-encoded CSR.
   * @returns {Validation} validation
   */
  verifyCertificateCSRPublicKey (code, certificate, csr) {
    if (!certificate) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        'No certificate');
    }
    if (!csr) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        'No CSR');
    }
    const certKey = forge.pki.publicKeyToPem(forge.pki.certificateFromPem(certificate).publicKey);
    const csrKey = forge.pki.publicKeyToPem(forge.pki.certificationRequestFromPem(csr).publicKey);

    if (certKey === csrKey) {
      return new Validation(code, true, ValidationCodes.VALID_STATES.VALID,
        'CSR and Certificate have the same Public Key');
    } else {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
        'CSR and Certificate have different Public Keys');
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
  verifyCertificateUsageClient (certificate, code) {
    if (!certificate) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        'No certificate');
    }

    const cert = forge.pki.certificateFromPem(certificate);
    const extKeyUsage = cert.getExtension('extKeyUsage');
    if (!extKeyUsage || !extKeyUsage.clientAuth) {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
        'Certificate doesn\'t have the "TLS WWW client authentication" key usage extension');
    }

    return new Validation(code, true, ValidationCodes.VALID_STATES.VALID,
      'Certificate has the "TLS WWW client authentication" key usage extension');
  }

  /**
   * Verifies that the certificate and the csr have the same Subject Information ( distinguished name and extensions )
   *
   * @param {String} certificate PEM-encoded certificate
   * @param {String} csr PEM-encoded CSR.
   * @returns {Validation} validation
   */
  verifyCertificateCSRSameSubject (code, enrollment) {
    if (!enrollment.certificate) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        'No certificate');
    }
    if (!enrollment.csr) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        'No CSR');
    }

    if (enrollment.caType && enrollment.caType === CAType.EXTERNAL) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        'It has an External CA');
    }

    const csrInfo = this.getCSRInfo(enrollment.csr);
    const certInfo = this.getCertInfo(enrollment.certificate);

    const { valid, reason } = PKIEngine.compareSubjectBetweenCSRandCert(csrInfo, certInfo);

    if (!valid) {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
        'The CSR and the Certificate must have the same Subject Information', reason);
    }

    const { valid: validAltName, reason: reasonAltName } = PKIEngine.compareSubjectAltNameBetweenCSRandCert(csrInfo, certInfo);

    if (!validAltName) {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
        'The CSR and the Certificate must have the same Subject Extension Information', reasonAltName);
    }

    return new Validation(code, true, ValidationCodes.VALID_STATES.VALID,
      'The CSR and the Certificate must have the same Subject Information');
  }

  /**
   *
   * @param {String} code validation code
   * @param {Object} enrollment Enrollment
   */
  verifyCertificateCSRSameCN (code, enrollment) {
    if (!enrollment.certificate) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        'No certificate');
    }
    if (!enrollment.csr) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        'No CSR');
    }

    if (enrollment.caType && enrollment.caType === CAType.INTERNAL) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        'It has an Internal CA');
    }

    const csrInfo = this.getCSRInfo(enrollment.csr);
    const certInfo = this.getCertInfo(enrollment.certificate);

    const { valid, reason } = this.compareCNBetweenCSRandCert(csrInfo, certInfo);

    if (!valid) {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
        'The CSR and the Certificate must have the same CN', reason);
    }

    return new Validation(code, true, ValidationCodes.VALID_STATES.VALID,
      'The CSR and the Certificate must have the same CN');
  }

  /**
   * Verifies that the CSR Public Key length is at least minLength
   *
   * minLength: Number
   * returns { valid: true } or { valid: false, reason: { actualKeySize: Number, minKeySize: Number } }
   */
  verifyCSRKeyLength (csr, minLength) {
    const csrInfo = this.getCSRInfo(csr);
    if (csrInfo.publicKeyLength < minLength) {
      return { valid: false, reason: { actualKeySize: csrInfo.publicKeyLength, minKeySize: minLength } };
    }
    return { valid: true };
  }

  /**
   * Verifies that the Certificate Public Key length is at least minLength
   *
   * minLength: Number
   * returns { valid: true } or { valid: false, reason: { actualKeySize: Number, minKeySize: Number } }
   */
  verifyCertKeyLength (cert, minLength) {
    const certInfo = this.getCertInfo(cert);
    if (certInfo.publicKeyLength < minLength) {
      return { valid: false, reason: { actualKeySize: certInfo.publicKeyLength, minKeySize: minLength } };
    }
    return { valid: true };
  }

  /**
   * Verifies that the CSR signature algorithm is included in the algorithms list
   * @param {String} csr PEM-encoded CSR
   * @param {String[]} algorithms Array of valid algorithms
   * @returns { valid: true } or { valid: false, reason: { actualAlgorithm : String, algorithm : String} }
   */
  verifyCSRAlgorithm (csr, algorithms) {
    const csrInfo = this.getCSRInfo(csr);
    if (!algorithms.includes(csrInfo.signatureAlgorithm)) {
      return { valid: false, reason: { actualAlgorithm: csrInfo.signatureAlgorithm, algorithms } };
    }
    return { valid: true };
  }

  /**
   * Verifies that the Cert signature algorithm is the same as the parameter
   *
   * algorithms: String[]
   * returns { valid: true } or { valid: false, reason: { actualAlgorithm : String, algorithm : String} }
   *
   */
  verifyCertAlgorithm (cert, algorithms) {
    const certInfo = this.getCertInfo(cert);
    if (!algorithms.includes(certInfo.signatureAlgorithm)) {
      return { valid: false, reason: { actualAlgorithm: certInfo.signatureAlgorithm, algorithms } };
    }
    return { valid: true };
  }

  static compareKeys (a, b) {
    return a.n.toString(16) === b.n.toString(16) &&
      a.e.toString(16) === b.e.toString(16);
  }

  /**
   * Verifies that the Certificate Public Key must match the private key used to sign the CSR.
   * Only available if the CSR was created by the Connection-Manager. If the CSR was uploaded instead of generated by
   * the Connection Manager, and there's no private key associated, this will be set the state to NOT_AVAILABLE
   *
   * @param {String} code Validation code
   * @param {String} key PEM-encoded key.
   * @param {String} certificate PEM-encoded certificate
   * @returns {Validation} validation
   */
  verifyCertificatePublicKeyMatchPrivateKey (certificate, key, code) {
    if (!certificate) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        'No certificate');
    }
    if (!key) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        'No private key');
    }

    const certKey = forge.pki.certificateFromPem(certificate).publicKey;
    const privateKey = forge.pki.privateKeyFromPem(key);
    const publicKey = forge.pki.setRsaPublicKey(privateKey.n, privateKey.e);

    if (!VaultPKIEngine.compareKeys(publicKey, certKey)) {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID, 'the Certificate Public Key doesn\'t match the private key used to sign the CSR');
    }
    return new Validation(code, true, ValidationCodes.VALID_STATES.VALID, 'the Certificate Public Key matches the private key used to sign the CSR');
  }

  /**
   * Validates ValidationCodes.VALIDATION_CODES.CA_CERTIFICATE_USAGE
   *
   * @param {String} rootCertificate PEM-encoded certificate
   * @param {String} intermediateChain PEM-encoded certificate TODO: add validations
   * @param {String} code validation code
   * @returns {Validation} validation
   */
  validateCertificateUsageCA (rootCertificate, intermediateChain, code) {
    if (!rootCertificate) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        'No root certificate and currently not validating intermediate CAs if present');
    }

    const cert = forge.pki.certificateFromPem(rootCertificate);
    const basicConstraints = cert.getExtension('basicConstraints');
    if (!basicConstraints || !basicConstraints.cA) {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
        'The root certificate doesn\'t have the CA basic contraint extension ( CA = true )');
    }

    return new Validation(code, true, ValidationCodes.VALID_STATES.VALID,
      'The root certificate has the CA basic contraint extension ( CA = true )');
  }

  /**
   *
   * @param {String} rootCertificate PEM-encoded string
   * @param {String} code
   * @returns {Validation} validation
   */
  verifyRootCertificate (rootCertificate, code) {
    if (!rootCertificate) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        'No root certificate');
    }

    try {
      const cert = forge.pki.certificateFromPem(rootCertificate);
      return new Validation(code, true, ValidationCodes.VALID_STATES.VALID,
        `The root certificate is valid with ${state} state.`,
        cert.subject.uniqueId === cert.issuer.uniqueId ? VALID_SELF_SIGNED : VALID_SIGNED);
    } catch (e) {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
        'The root certificate must be valid and be self-signed or signed by a global root.');
    }
  }

  /**
   * Verifies that the intermediateChain is made of valid CAs and that the top of the chain is signed by the root.
   * If rootCertificate is null, the top of the chain should be signed by a global root.
   * @param {String} rootCertificate PEM-encoded string
   * @param {String} intermediateChain PEM-encoded string
   * @param {String} code
   * @returns {Validation} validation
   */
  verifyIntermediateChain (rootCertificate, intermediateChain, code) {
    const intermediateCerts = PkiService.splitCertificateChain(intermediateChain);
    if (!intermediateCerts.length) {
      return new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        'No intermediate chain');
    }

    const caStore = forge.pki.createCaStore([rootCertificate]);
    try {
      forge.pki.verifyCertificateChain(caStore, intermediateCerts.map(forge.pki.certificateFromPem));
      return new Validation(code, true, ValidationCodes.VALID_STATES.VALID,
        'The intermediateChain is made of valid CAs and at the top of the chain is signed by the root.');
    } catch (e) {
      return new Validation(code, true, ValidationCodes.VALID_STATES.INVALID,
        'the intermediateChain must be made of valid CAs and that the top of the chain is signed by the root', e.message);
    }
  }

  static _getSubjectInfo (forgeSubject) {
    const subjectInfo = {};
    const subjectFields = ['CN', 'O', 'OU', 'C', 'L', 'ST', 'E'];
    subjectFields
      .filter(f => forgeSubject.getField(f))
      .forEach(f => {
        subjectInfo[f] = forgeSubject.getField(f).value;
      });
    return subjectInfo;
  }

  static _getExtensionsInfo (forgeCert) {
    const extensions = {
      subjectAltName: {
        dns: [],
        ips: [],
        uris: [],
        emailAddresses: [],
      },
    };

    const altNames = extensions.subjectAltName;

    forgeCert
      ?.extensions
      ?.find(t => t.name === 'subjectAltName')
      ?.altNames
      .forEach(item => {
        switch (item.type) {
          case VaultPKIEngine.DNS_TYPE:
            altNames.dns.push(item.value);
            break;
          case VaultPKIEngine.URI_TYPE:
            altNames.uris.push(item.value);
            break;
          case VaultPKIEngine.EMAIL_TYPE:
            altNames.emailAddresses.push(item.value);
            break;
          case VaultPKIEngine.IP_TYPE:
            altNames.ips.push(item.ip);
            break;
        }
      });

    return extensions;
  }

  /**
   * Returns an object with the CSR contents and info
   *
   * @param {String} csrPem PEM-encoded CSR
   * @returns {CSRInfo} The CSR Info
   */
  getCSRInfo (csrPem) {
    if (!csrPem) {
      throw new InvalidEntityError('Empty or null CSR');
    }

    const csr = forge.pki.certificationRequestFromPem(csrPem);

    return {
      subject: VaultPKIEngine._getSubjectInfo(csr.subject),
      extensions: VaultPKIEngine._getExtensionsInfo(csr.getAttribute({ name: 'extensionRequest' })),
      signatureAlgorithm: forge.pki.oids[csr.siginfo.algorithmOid],
      publicKeyLength: csr.publicKey.n.bitLength(),
    };
  }

  /**
   * Returns an object with the Certificate contents and info
   *
   * @param {String} certPem PEM-encoded Certificate
   * @returns {CertInfo} The Certificate Info
   */
  getCertInfo (certPem) {
    if (!certPem) {
      throw new InvalidEntityError('Empty or null cert');
    }

    const cert = forge.pki.certificateFromPem(certPem);

    return {
      subject: VaultPKIEngine._getSubjectInfo(cert.subject),
      issuer: VaultPKIEngine._getSubjectInfo(cert.issuer),
      extensions: VaultPKIEngine._getExtensionsInfo(cert),
      serialNumber: cert.serialNumber,
      notBefore: cert.validity.notBefore,
      notAfter: cert.validity.notAfter,
      signatureAlgorithm: forge.pki.oids[cert.siginfo.algorithmOid],
      publicKeyLength: cert.publicKey.n.bitLength(),
    };
  }
}

VaultPKIEngine.DNS_TYPE = 2;
VaultPKIEngine.URI_TYPE = 6;
VaultPKIEngine.EMAIL_TYPE = 2;
VaultPKIEngine.IP_TYPE = 7;

module.exports = VaultPKIEngine;
