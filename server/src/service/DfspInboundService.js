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
const InvalidEntityError = require('../errors/InvalidEntityError');
const ValidationError = require('../errors/ValidationError');
const CAType = require('../models/CAType');
const PKIEngine = require('../pki_engine/VaultPKIEngine');
const Joi = require('joi');
const Constants = require('../constants/Constants');
const { createID } = require('../models/GID');
const DFSPModel = require('../models/DFSPModel');

const enrollmentCertificate = Joi.object().description('Enrollment Certificate').keys({
  certificate: Joi.string().description('certificate').required(),
  hubCAId: Joi.number().description('the id of the selected EXTERNAL Hub CA').required(),
});

/**
 * Create DFSP Inbound enrollment ( DFSP API )
 * The DFSP operator sends the info needed to configure the inbound PKI infra
 * Saves the enrollment info and sets its state to 'CSR_LOADED'
 * envId String ID of environment
 * dfspId String DFSP id
 * body DFSPInboundCreate DFSP inbound initial info
 * returns ObjectCreatedResponse
 **/
exports.createDFSPInboundEnrollment = async function (envId, dfspId, body) {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);

  let csrInfo;
  try {
    csrInfo = await PKIEngine.getCSRInfo(body.clientCSR);
  } catch (error) {
    throw new ValidationError('Could not parse the CSR content', error);
  }

  // FIXME: create an Enrollment class with inbound and outbound as children
  const enrollment = {
    csr: body.clientCSR
  };

  const pkiEngine = new PKIEngine(Constants.vault);
  await pkiEngine.connect();
  const { validations, validationState } = await pkiEngine.validateInboundEnrollment(enrollment);

  const values = {
    id: await createID(),
    csr: body.clientCSR,
    csrInfo,
    state: 'CSR_LOADED',
    validations,
    validationState
  };

  const dbDfspId = await DFSPModel.findIdByDfspId(envId, dfspId);
  await pkiEngine.setDFSPInboundEnrollment(dbDfspId, values.id, values);
  return values;
};

/**
 * Get a list of DFSP Inbound enrollments
 */
exports.getDFSPInboundEnrollments = async function (envId, dfspId) {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);
  const pkiEngine = new PKIEngine(Constants.vault);
  await pkiEngine.connect();
  const dbDfspId = await DFSPModel.findIdByDfspId(envId, dfspId);
  return pkiEngine.getDFSPInboundEnrollments(dbDfspId);
};

/**
 * Get a DFSP Inbound enrollment
 *
 * envId String ID of environment
 * dfspId String DFSP id
 * enId String Enrollment id
 * returns InboundEnrollment
 **/
exports.getDFSPInboundEnrollment = async function (envId, dfspId, enId) {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);
  const pkiEngine = new PKIEngine(Constants.vault);
  await pkiEngine.connect();
  const dbDfspId = await DFSPModel.findIdByDfspId(envId, dfspId);
  return pkiEngine.getDFSPInboundEnrollment(dbDfspId, enId);
};

/**
 * Signs the CSR and adds the certificate to the enrollment
 * The TSP signs the CSR with the environment CA, creating a certificate. It adds this certificate to the enrollment and updates its state to CERT_SIGNED
 *
 * envId String ID of environment
 * dfspId String DFSP id
 * enId String Enrollment id
 * returns ApiResponse
 **/
exports.signDFSPInboundEnrollment = async function (envId, dfspId, enId) {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);

  const pkiEngine = new PKIEngine(Constants.vault);
  await pkiEngine.connect();
  const dbDfspId = await DFSPModel.findIdByDfspId(envId, dfspId);
  const enrollment = await pkiEngine.getDFSPInboundEnrollment(dbDfspId, enId);
  if (!enrollment) {
    throw new InvalidEntityError(`Could not retrieve current CA for the endpoint ${enId}, dfsp id ${dfspId}, environment id ${envId}`);
  }

  const { csr } = enrollment;

  let newCert = await pkiEngine.sign(csr);
  let certInfo = await PKIEngine.getCertInfo(newCert);

  const inboundEnrollment = {
    csr,
    certificate: newCert,
    caType: CAType.EXTERNAL
  };

  let { validations, validationState } = await pkiEngine.validateInboundEnrollment(inboundEnrollment);

  const values = {
    ...enrollment,
    certificate: newCert,
    certInfo,
    state: 'CERT_SIGNED',
    validations,
    validationState
  };

  await pkiEngine.setDFSPInboundEnrollment(dbDfspId, values.id, values);
  return values;
};

/**
 * Adds the certificate to the enrollment and updates its state to CERT_SIGNED
 *
 * envId String ID of environment
 * dfspId String DFSP id
 * enId String Enrollment id
 * body Certificate Certificate
 * returns the enrollment
 **/
exports.addDFSPInboundEnrollmentCertificate = async function (envId, dfspId, enId, body) {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);

  const result = Joi.validate(body, enrollmentCertificate);
  if (result.error) {
    throw new ValidationError('Invalid Enrollment Certificate Input', result.error.details);
  }

  let certificate = body.certificate;
  let hubCAId = body.hubCAId;

  let certInfo;
  try {
    certInfo = await PKIEngine.getCertInfo(certificate);
  } catch (error) {
    throw new ValidationError('Could not parse the Certificate content', error);
  }

  const pkiEngine = new PKIEngine(Constants.vault);
  await pkiEngine.connect();
  const dbDfspId = await DFSPModel.findIdByDfspId(envId, dfspId);
  const inboundEnrollment = await pkiEngine.getDFSPInboundEnrollment(dbDfspId, enId);
  if (!inboundEnrollment) {
    throw new InvalidEntityError(`Could not retrieve current CA for the endpoint ${enId}, dfsp id ${dfspId}, environment id ${envId}`);
  }

  const validationEnrollment = JSON.parse(JSON.stringify(inboundEnrollment));
  validationEnrollment.certificate = certificate;

  const { validations, validationState } = await pkiEngine.validateInboundEnrollment(validationEnrollment);

  const values = {
    ...inboundEnrollment,
    certificate,
    certInfo,
    state: 'CERT_SIGNED',
    validations,
    validationState,
    hubCAId
  };

  await pkiEngine.setDFSPInboundEnrollment(dbDfspId, values.id, values);
  return values;
};
