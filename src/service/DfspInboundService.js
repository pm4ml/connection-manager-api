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

const Constants = require('../constants/Constants');
const { createID } = require('../models/GID');
const DFSPModel = require('../models/DFSPModel');

/**
 * Create DFSP Inbound enrollment ( DFSP API )
 * The DFSP operator sends the info needed to configure the inbound PKI infra
 * Saves the enrollment info and sets its state to 'CSR_LOADED'
 * dfspId String DFSP id
 * body DFSPInboundCreate DFSP inbound initial info
 * returns ObjectCreatedResponse
 **/
exports.createDFSPInboundEnrollment = async (ctx, dfspId, body) => {
  const { pkiEngine } = ctx;
  await PkiService.validateDfsp(ctx, dfspId);

  let csrInfo;
  try {
    csrInfo = pkiEngine.getCSRInfo(body.clientCSR);
  } catch (error) {
    throw new ValidationError('Could not parse the CSR content', error);
  }

  // FIXME: create an Enrollment class with inbound and outbound as children
  const enrollment = {
    csr: body.clientCSR
  };

  const { validations, validationState } = await pkiEngine.validateInboundEnrollment(enrollment);

  const values = {
    id: await createID(),
    csr: body.clientCSR,
    csrInfo,
    state: 'CSR_LOADED',
    validations,
    validationState
  };

  const dbDfspId = await DFSPModel.findIdByDfspId(dfspId);
  await pkiEngine.setDFSPInboundEnrollment(dbDfspId, values.id, values);
  return values;
};

/**
 * Get a list of DFSP Inbound enrollments
 */
exports.getDFSPInboundEnrollments = async (ctx, dfspId) => {
  await PkiService.validateDfsp(ctx, dfspId);
  const { pkiEngine } = ctx;
  const dbDfspId = await DFSPModel.findIdByDfspId(dfspId);
  return pkiEngine.getDFSPInboundEnrollments(dbDfspId);
};

/**
 * Get a DFSP Inbound enrollment
 *
 * dfspId String DFSP id
 * enId String Enrollment id
 * returns InboundEnrollment
 **/
exports.getDFSPInboundEnrollment = async (ctx, dfspId, enId) => {
  await PkiService.validateDfsp(ctx, dfspId);
  const { pkiEngine } = ctx;
  const dbDfspId = await DFSPModel.findIdByDfspId(dfspId);
  return pkiEngine.getDFSPInboundEnrollment(dbDfspId, enId);
};

/**
 * Signs the CSR and adds the certificate to the enrollment
 * The TSP signs the CSR with the environment CA, creating a certificate. It adds this certificate to the enrollment and updates its state to CERT_SIGNED
 *
 * dfspId String DFSP id
 * enId String Enrollment id
 * returns ApiResponse
 **/
exports.signDFSPInboundEnrollment = async (ctx, dfspId, enId) => {
  await PkiService.validateDfsp(ctx, dfspId);

  const { pkiEngine } = ctx;
  const dbDfspId = await DFSPModel.findIdByDfspId(dfspId);
  const enrollment = await pkiEngine.getDFSPInboundEnrollment(dbDfspId, enId);
  if (!enrollment) {
    throw new InvalidEntityError(`Could not retrieve current CA for the endpoint ${enId}, dfsp id ${dfspId}`);
  }

  const { csr } = enrollment;

  const newCert = await pkiEngine.sign(csr, Constants.switchFQDN);
  const certInfo = pkiEngine.getCertInfo(newCert);

  const inboundEnrollment = {
    csr,
    certificate: newCert,
    caType: CAType.EXTERNAL
  };

  const { validations, validationState } = await pkiEngine.validateInboundEnrollment(inboundEnrollment);

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
