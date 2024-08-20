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
const DFSPModel = require('../models/DFSPModel');
const InternalError = require('../errors/InternalError');
const ValidationError = require('../errors/ValidationError');
const NotFoundError = require('../errors/NotFoundError');

const ValidationCodes = require('../pki_engine/ValidationCodes');
const Constants = require('../constants/Constants');
const { createCSRAndDFSPOutboundEnrollment } = require('./DfspOutboundService');

/**
 * Creates an entry to store DFSP related info
 * Returns the newly created object id
 *
 * body DFSPCreate DFSP initial info
 * returns ObjectCreatedResponse
 **/
exports.createDFSP = async (ctx, body) => {
  const regex = / /gi;
  const dfspIdNoSpaces = body.dfspId ? body.dfspId.replace(regex, '-') : null;

  const values = {
    dfsp_id: body.dfspId,
    name: body.name,
    monetaryZoneId: body.monetaryZoneId ? body.monetaryZoneId : undefined,
    isProxy: body.isProxy,
    security_group: body.securityGroup || 'Application/DFSP:' + dfspIdNoSpaces
  };

  try {
    await DFSPModel.create(values);
    await DFSPModel.createFxpSupportedCurrencies(body.dfspId, body.fxpCurrencies);
    return { id: body.dfspId };
  } catch (err) {
    console.error(err);
    throw new InternalError(err.message);
  }
};

exports.createDFSPWithCSR = async (ctx, body) => {
  const dfsp = await exports.createDFSP(ctx, body);

  try {
    await createCSRAndDFSPOutboundEnrollment(ctx, body.dfspId, Constants.clientCsrParameters);
    return dfsp;
  } catch (err) {
    console.error(err);
    throw new InternalError(err.message);
  }
};

/**
 * Returns all the dfsps in the environment
 *
 * returns DFSP[]
 **/
exports.getDFSPs = async ctx => {
  const rows = await DFSPModel.findAll();
  return rows.map(r => dfspRowToObject(r));
};

/**
 * Validates that both env and dfsp exist, and that the dfsp belongs to the env
 */
exports.validateDfsp = async (ctx, dfspId) => exports.getDFSPById(ctx, dfspId);

/**
 * Returns a DFSP by its id
 *
 * dfspId String ID of dfsp
 * returns DFSP
 **/
exports.getDFSPById = async (ctx, dfspId) => {
  if (dfspId === null || typeof dfspId === 'undefined') {
    throw new ValidationError(`Invalid dfspId ${dfspId}`);
  }
  try {
    const result = await DFSPModel.findByDfspId(dfspId);
    return dfspRowToObject(result);
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw new NotFoundError(`DFSP with id ${dfspId} not found`);
    }
    throw error;
  }
};

exports.updateDFSP = async (ctx, dfspId, newDfsp) => {
  if (dfspId === null || typeof dfspId === 'undefined') {
    throw new ValidationError(`Invalid dfspId ${dfspId}`);
  }

  const values = {
    name: newDfsp.name,
    monetaryZoneId: newDfsp.monetaryZoneId,
    isProxy: newDfsp.isProxy,
    security_group: newDfsp.securityGroup
  };

  return DFSPModel.update(dfspId, values);
};

/**
 *
 */
exports.splitChainIntermediateCertificateInfo = (intermediateChain, pkiEngine) => {
  return pkiEngine.splitCertificateChain(intermediateChain || '').map(cert => pkiEngine.getCertInfo(cert));
};

/**
 * Delete a DFSP by its id
 *
 * dfspId String ID of dfsp
 * returns DFSP
 **/
exports.deleteDFSP = async (ctx, dfspId) => {
  await exports.validateDfsp(ctx, dfspId);
  const { pkiEngine } = ctx;
  const dbDfspId = await DFSPModel.findIdByDfspId(dfspId);
  await pkiEngine.deleteAllDFSPData(dbDfspId);
  return DFSPModel.delete(dfspId);
};

/**
 * Saves the DFSP certificates. Both parameters are optional. It replaces the previous CA if there was one.
 *
 * rootCertificate: a root certificate used by the DFSP. Can be a self-signed certificate, or a globally trusted CA like Digicert.
 * intermediateChain: list of intermediate certificates.
 */
exports.setDFSPca = async (ctx, dfspId, body) => {
  await exports.validateDfsp(ctx, dfspId);

  const rootCertificate = body.rootCertificate || '';
  const intermediateChain = body.intermediateChain || '';

  const { pkiEngine } = ctx;
  const { validations, validationState } = await pkiEngine.validateCACertificate(rootCertificate, intermediateChain);

  const values = {
    rootCertificate,
    intermediateChain,
    validations,
    validationState,
  };

  const dbDfspId = await DFSPModel.findIdByDfspId(dfspId);
  await pkiEngine.setDFSPCA(dbDfspId, values);

  return values;
};

exports.getDfspsByMonetaryZones = async (ctx, monetaryZoneId) => {
  const dfsps = await DFSPModel.getDfspsByMonetaryZones(monetaryZoneId);
  return dfsps.map(r => dfspRowToObject(r));
};

exports.getDFSPca = async (ctx, dfspId) => {
  await exports.validateDfsp(ctx, dfspId);
  const { pkiEngine } = ctx;
  try {
    const dbDfspId = await DFSPModel.findIdByDfspId(dfspId);
    return await pkiEngine.getDFSPCA(dbDfspId);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return {
        rootCertificate: null,
        intermediateChain: null,
        validations: [],
        validationState: ValidationCodes.VALID_STATES.NOT_AVAILABLE
      };
    }
    throw error;
  }
};

exports.deleteDFSPca = async (ctx, dfspId) => {
  await exports.validateDfsp(ctx, dfspId);
  const { pkiEngine } = ctx;
  const dbDfspId = await DFSPModel.findIdByDfspId(dfspId);
  return pkiEngine.deleteDFSPCA(dbDfspId);
};

/**
 * Returns a DFSP with the proper attributes as defined in the API mapping them from the internal representation.
 * It doesn't return the internal id
 *
 * @param {RowObject} row RowObject as returned by the DFSPModel or knex
 */
const dfspRowToObject = (row) => {
  return {
    id: row.dfsp_id,
    name: row.name,
    monetaryZoneId: row.monetaryZoneId ? row.monetaryZoneId : undefined,
    isProxy: row.isProxy,
    securityGroup: row.security_group,
  };
};
