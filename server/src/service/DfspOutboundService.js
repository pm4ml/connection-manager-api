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
const PkiService = require('./PkiService');
const ValidationError = require('../errors/ValidationError');
const VaultPKIEngine = require('../pki_engine/VaultPKIEngine');
const Constants = require('../constants/Constants');
const { createID } = require('../models/GID');
const DFSPModel = require('../models/DFSPModel');

const REQUIRED_KEY_LENGTH = 4096;

const PKIEngine = new VaultPKIEngine(Constants.vault);

/**
 * Creates a CSR, signed by the environment CA. Creates an OutboundEnrollment, associate the CSR to it, and set its state to CSR_LOADED.
 */
exports.createCSRAndDFSPOutboundEnrollment = async function (envId, dfspId, body) {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);
  const csrParameters = body;
  if (!csrParameters.subject) {
    throw new ValidationError('No subject specified');
  }

  if (!csrParameters.subject.CN) {
    throw new ValidationError('No subject CN specified');
  }

  if (!csrParameters.extensions) {
    throw new ValidationError('No extensions specified');
  }

  if (!csrParameters.extensions.subjectAltName) {
    throw new ValidationError('No extensions subjectAltName specified');
  }

  if (!csrParameters.extensions.subjectAltName.dns && !csrParameters.extensions.subjectAltName.ips) {
    throw new ValidationError('Must specify a DNS or IP subjectAltName');
  }

  const pkiEngine = new VaultPKIEngine(Constants.vault);
  await pkiEngine.connect();

  const { csr, privateKey } = await pkiEngine.createCSR(csrParameters, REQUIRED_KEY_LENGTH);
  const csrInfo = pkiEngine.getCSRInfo(csr);

  const values = {
    id: await createID(),
    csr,
    csrInfo,
    state: 'CSR_LOADED',
    key: privateKey,
  };

  const dbDfspId = await DFSPModel.findIdByDfspId(envId, dfspId);
  await pkiEngine.setDFSPOutboundEnrollment(dbDfspId, values.id, values);
  const { key, ...en } = values;
  return en;
};

/**
 * Get a list of DFSP Outbound enrollments
 */
exports.getDFSPOutboundEnrollments = async function (envId, dfspId, state) {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);
  const pkiEngine = new VaultPKIEngine(Constants.vault);
  await pkiEngine.connect();
  const dbDfspId = await DFSPModel.findIdByDfspId(envId, dfspId);
  const enrollments = await pkiEngine.getDFSPOutboundEnrollments(dbDfspId);
  return enrollments.filter((en) => en.state === state).map(({ key, ...en }) => en);
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
  const pkiEngine = new VaultPKIEngine(Constants.vault);
  await pkiEngine.connect();
  const dbDfspId = await DFSPModel.findIdByDfspId(envId, dfspId);
  const { key, ...en } = await pkiEngine.getDFSPOutboundEnrollment(dbDfspId, enId);
  return en;
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
  const certificate = body.certificate;
  let certInfo;
  try {
    certInfo = PKIEngine.getCertInfo(certificate);
  } catch (error) {
    throw new ValidationError('Could not parse the Certificate content', error);
  }

  const pkiEngine = new VaultPKIEngine(Constants.vault);
  await pkiEngine.connect();
  const dbDfspId = await DFSPModel.findIdByDfspId(envId, dfspId);
  const outboundEnrollment = await pkiEngine.getDFSPOutboundEnrollment(dbDfspId, enId);

  const dfspCA = await PkiService.getDFSPca(envId, dfspId);

  const enrollment = {
    csr: outboundEnrollment.csr,
    key: outboundEnrollment.key,
    certificate,
    dfspCA
  };

  const { validations, validationState } = await pkiEngine.validateOutboundEnrollment(enrollment);

  const values = {
    ...outboundEnrollment,
    certificate,
    certInfo,
    state: 'CERT_SIGNED',
    validations,
    validationState
  };

  await pkiEngine.setDFSPOutboundEnrollment(dbDfspId, values.id, values);
  const { key, ...en } = values;
  return en;
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

  const pkiEngine = new VaultPKIEngine(Constants.vault);
  await pkiEngine.connect();
  const dbDfspId = await DFSPModel.findIdByDfspId(envId, dfspId);
  const outboundEnrollment = await pkiEngine.getDFSPOutboundEnrollment(dbDfspId, enId);

  const dfspCA = await PkiService.getDFSPca(envId, dfspId);

  const enrollment = {
    csr: outboundEnrollment.csr,
    certificate: outboundEnrollment.certificate,
    key: outboundEnrollment.key,
    dfspCA
  };

  const { validations, validationState } = pkiEngine.validateOutboundEnrollment(enrollment);

  const values = {
    ...outboundEnrollment,
    validations,
    validationState
  };

  await pkiEngine.setDFSPOutboundEnrollment(dbDfspId, values.id, values);
  const { key, ...en } = values;
  return en;
};
