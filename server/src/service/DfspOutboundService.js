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

'use strict';
const DfspOutboundEnrollmentModel = require('../models/DfspOutboundEnrollmentModel');
const DFSPModel = require('../models/DFSPModel');
const PkiService = require('./PkiService');
const InternalError = require('../errors/InternalError');
const ValidationError = require('../errors/ValidationError');
const PKIEngine = require('../pki_engine/EmbeddedPKIEngine');
const CertificatesAuthoritiesModel = require('../models/CertificatesAuthoritiesModel');

const REQUIRED_KEY_LENGTH = 4096;
const PK_ALGORITHM = 'rsa';

/**
 * Create an OutboundEnrollment, associate the CSR to it, and set its state to CSR_LOADED.
 *
 * envId String ID of environment
 * dfspId String DFSP id
 * body DFSPOutboundCreate DFSP outbound initial info
 * returns ObjectCreatedResponse
 **/
exports.createDFSPOutboundEnrollment = async function (envId, dfspId, body, key) {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);

  let csrInfo;
  try {
    csrInfo = await PKIEngine.getCSRInfo(body.hubCSR);
  } catch (error) {
    throw new ValidationError('Could not parse the CSR content', error);
  }

  const enrollment = {
    csr: body.hubCSR
  };

  const pkiEngine = new PKIEngine();
  let { validations, validationState } = await pkiEngine.validateOutboundEnrollment(enrollment);

  let rawDfspId = await DFSPModel.findIdByDfspId(envId, dfspId);
  let values = {
    env_id: envId,
    dfsp_id: rawDfspId,
    csr: body.hubCSR,
    csr_info: JSON.stringify(csrInfo),
    state: DfspOutboundEnrollmentModel.states.CSR_LOADED,
    validations: JSON.stringify(validations),
    validationState
  };

  if (key) {
    values.key = key;
  }

  let result = await DfspOutboundEnrollmentModel.create(values);
  if (result.length === 1) {
    return { id: result[0] };
  } else {
    throw new InternalError('More than one row created');
  }
};

/**
 * Creates a CSR, signed by the environment CA. Creates an OutboundEnrollment, associate the CSR to it, and set its state to CSR_LOADED.
 */
exports.createCSRAndDFSPOutboundEnrollment = async function (envId, dfspId, body) {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);
  let csrParameters = body;
  if (!csrParameters.subject) {
    throw new ValidationError(`No subject specified`);
  }

  if (!csrParameters.subject.CN) {
    throw new ValidationError(`No subject CN specified`);
  }

  if (!csrParameters.extensions) {
    throw new ValidationError(`No extensions specified`);
  }

  if (!csrParameters.extensions.subjectAltName) {
    throw new ValidationError(`No extensions subjectAltName specified`);
  }

  if (!csrParameters.extensions.subjectAltName.dns && !csrParameters.extensions.subjectAltName.ips) {
    throw new ValidationError(`Must specify a DNS or IP subjectAltName`);
  }

  let pkiEngine = await CertificatesAuthoritiesModel.getPkiEngineForEnv(envId);

  let keyCSRPair = await pkiEngine.createCSR(csrParameters, REQUIRED_KEY_LENGTH, PK_ALGORITHM);
  let createResult = await exports.createDFSPOutboundEnrollment(envId, dfspId, { hubCSR: keyCSRPair.csr }, keyCSRPair.key);
  return createResult;
};

/**
 * Get a list of DFSP Outbound enrollments
 */
exports.getDFSPOutboundEnrollments = async function (envId, dfspId, state) {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);
  let rows = await DfspOutboundEnrollmentModel.findAllDfsp(envId, dfspId, state ? { state } : null);
  return rows.map(row => rowToObject(row));
};

/**
 * Get a DFSP Outbound enrollment
 *
 * envId String ID of environment
 * dfspId String DFSP id
 * enId String Enrollment id
 * returns OutboundEnrollment
 **/
exports.getDFSPOutboundEnrollment = async function (envId, dfspId, enId) {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);
  let row = await getDFSPOutboundEnrollmentPrim(enId);
  return rowToObject(row);
};

let getDFSPOutboundEnrollmentPrim = async function (enId) {
  let row = await DfspOutboundEnrollmentModel.findById(enId);
  return row;
};

let getDFSPOutboundEnrollmentWithKey = async function (envId, dfspId, enId) {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);
  let row = await getDFSPOutboundEnrollmentPrim(enId);
  return rowToObjectWithKey(row);
};

/**
 * Sets the certificate, and change the enrollment state to CERT_SIGNED. Returns the enrollment.
 *
 * envId String ID of environment
 * dfspId String DFSP id
 * enId String Enrollment id
 * body DFSPOutboundCertificate DFSP outbound certificate
 * returns the enrollment
 **/
exports.addDFSPOutboundEnrollmentCertificate = async function (envId, dfspId, enId, body) {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);
  let certificate = body.certificate;
  let certInfo;
  try {
    certInfo = await PKIEngine.getCertInfo(certificate);
  } catch (error) {
    throw new ValidationError('Could not parse the Certificate content', error);
  }

  let { csr, key } = await getDFSPOutboundEnrollmentWithKey(envId, dfspId, enId);

  let dfspCA = await PkiService.getDFSPca(envId, dfspId);

  const enrollment = {
    csr,
    certificate,
    key,
    dfspCA
  };

  const pkiEngine = new PKIEngine();
  let { validations, validationState } = await pkiEngine.validateOutboundEnrollment(enrollment);

  let values = {
    cert: certificate,
    cert_info: JSON.stringify(certInfo),
    state: 'CERT_SIGNED',
    validations: JSON.stringify(validations),
    validationState
  };

  await DfspOutboundEnrollmentModel.update(enId, values);
  return exports.getDFSPOutboundEnrollment(envId, dfspId, enId);
};

/**
 * Validates two aspects of the certificate:
 * 1) that the certificate matches the private key used to create the CSR. ( If the CSR was uploaded instead of generated by the Connection Manager, and there's no key associated, this will set the state to VALID too. )
 * 2) That the certificate was signed by the stored DFSP root cert and intermediate chain.
 *
 * - It will update the state to 'VALID' or 'INVALID'.
 * - It will also update the keyValidationResult property to either 'OK', 'INVALID' or 'NO_KEY', and signingValidationResult to either 'OK' or 'INVALID'.
 * - The details of the validation are stored in keyValidationOutput and signingValidationOutput
 *
 * envId String ID of environment
 * dfspId String DFSP id
 * enId String Enrollment id
 * returns the enrollment
 **/
exports.validateDFSPOutboundEnrollmentCertificate = async function (envId, dfspId, enId) {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);
  let { csr, certificate, key } = await getDFSPOutboundEnrollmentWithKey(envId, dfspId, enId);
  let dfspCA = await PkiService.getDFSPca(envId, dfspId);

  const enrollment = {
    csr,
    certificate,
    key,
    dfspCA
  };

  const validatingPkiEngine = new PKIEngine();
  let { validations, validationState } = await validatingPkiEngine.validateOutboundEnrollment(enrollment);

  let values = {
    validations: JSON.stringify(validations),
    validationState
  };

  await DfspOutboundEnrollmentModel.update(enId, values);
  return exports.getDFSPOutboundEnrollment(envId, dfspId, enId);
};

const rowToObject = (row) => {
  // We NEVER return a key.
  let enrollment = {
    id: row.id,
    csr: row.csr,
    certificate: row.cert,
    certInfo: row.cert_info && (typeof row.cert_info === 'string') ? JSON.parse(row.cert_info) : {},
    csrInfo: row.csr_info && (typeof row.csr_info === 'string') ? JSON.parse(row.csr_info) : {},
    validationState: row.validationState,
    validations: row.validations && (typeof row.validations === 'string') ? JSON.parse(row.validations) : {},
    state: row.state,
  };
  return enrollment;
};

const rowToObjectWithKey = (row) => {
  let enrollment = {
    id: row.id,
    csr: row.csr,
    key: row.key,
    certificate: row.cert,
    certInfo: row.cert_info && (typeof row.cert_info === 'string') ? JSON.parse(row.cert_info) : {},
    csrInfo: row.csr_info && (typeof row.csr_info === 'string') ? JSON.parse(row.csr_info) : {},
    validationState: row.validationState,
    validations: row.validations && (typeof row.validations === 'string') ? JSON.parse(row.validations) : {},
    state: row.state,
  };
  return enrollment;
};
