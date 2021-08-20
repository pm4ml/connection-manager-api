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
const EnvironmentModel = require('../models/EnvironmentModel');
const DFSPModel = require('../models/DFSPModel');
const InternalError = require('../errors/InternalError');
const ValidationError = require('../errors/ValidationError');
const NotFoundError = require('../errors/NotFoundError');
const PKIEngine = require('../pki_engine/VaultPKIEngine');

const ValidationCodes = require('../pki_engine/ValidationCodes');
const Constants = require('../constants/Constants');

/**
 * Returns all the environments
 *
 * returns Environment[]
 **/
exports.getEnvironments = function () {
  return EnvironmentModel.findAll();
};

/**
 * Creates an environment on the TSP
 *
 * body Environment Environment initial info
 * returns { id: <the newly created object id> }
 **/
exports.createEnvironment = async function (body) {
  // FIXME remove defaultDNs
  const values = {
    name: body.name,
    CN: body.defaultDN ? body.defaultDN.CN : null,
    C: body.defaultDN ? body.defaultDN.C : null,
    L: body.defaultDN ? body.defaultDN.L : null,
    O: body.defaultDN ? body.defaultDN.O : null,
    OU: body.defaultDN ? body.defaultDN.OU : null,
    ST: body.defaultDN ? body.defaultDN.ST : null,
  };
  try {
    const result = await EnvironmentModel.create(values);
    if (result.length === 1) {
      const id = result[0];
      const row = await EnvironmentModel.findById(id);
      return EnvironmentModel.mapRowToObject(row);
    }
  } catch (err) {
    throw new InternalError(err.message);
  }
};

/**
 * Find and environment by its id
 * Returns an environment
 *
 * envId String ID of environment
 * returns Environment
 **/
exports.getEnvironmentById = async function (envId) {
  if (envId === null || typeof envId === 'undefined') {
    throw new ValidationError(`Invalid envId ${envId}`);
  }
  const row = await EnvironmentModel.findById(envId);
  return EnvironmentModel.mapRowToObject(row);
};

exports.deleteEnvironment = async function (envId) {
  const affectedRows = await EnvironmentModel.delete(envId);
  if (affectedRows === 0) {
    throw new NotFoundError();
  }
  return { id: envId };
};

/**
 * Creates an entry to store DFSP related info
 * Returns the newly created object id
 *
 * envId String ID of environment
 * body DFSPCreate DFSP initial info
 * returns ObjectCreatedResponse
 **/
exports.createDFSP = async function (envId, body) {
  const regex = / /gi;
  const dfspIdNoSpaces = body.dfspId ? body.dfspId.replace(regex, '-') : null;

  const values = {
    env_id: envId,
    dfsp_id: body.dfspId,
    name: body.name,
    monetaryZoneId: body.monetaryZoneId ? body.monetaryZoneId : undefined,
    security_group: body.securityGroup || 'Application/DFSP:' + dfspIdNoSpaces
  };

  try {
    await exports.getEnvironmentById(envId);
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw new ValidationError('Environment id not found');
    }
    throw error;
  }

  try {
    const result = await DFSPModel.create(values);
    if (result.length === 1) {
      return { id: body.dfspId };
    }
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
exports.getEnvironmentDFSPs = function (envId) {
  return DFSPModel.findAllByEnvironment(envId).map(r => dfspRowToObject(r));
};

/**
 * Validates that both env and dfsp exist, and that the dfsp belongs to the env
 */
exports.validateEnvironmentAndDfsp = async function (envId, dfspId) {
  return exports.getDFSPById(envId, dfspId);
};

/**
 * Validates that the env exists
 */
exports.validateEnvironment = async function (envId) {
  return exports.getEnvironmentById(envId);
};

/**
 * Returns a DFSP by its id
 *
 * envId String ID of environment
 * dfspId String ID of dfsp
 * returns DFSP
 **/
exports.getDFSPById = async function (envId, dfspId) {
  if (envId === null || typeof envId === 'undefined') {
    throw new ValidationError(`Invalid envId ${envId}`);
  }
  if (dfspId === null || typeof dfspId === 'undefined') {
    throw new ValidationError(`Invalid dfspId ${dfspId}`);
  }
  try {
    const result = await DFSPModel.findByDfspId(envId, dfspId);
    return dfspRowToObject(result);
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw new NotFoundError(`DFSP with id ${dfspId} for environment ${envId} not found`);
    }
    throw error;
  }
};

exports.updateDFSP = async (envId, dfspId, newDfsp) => {
  if (envId === null || typeof envId === 'undefined') {
    throw new ValidationError(`Invalid envId ${envId}`);
  }
  if (dfspId === null || typeof dfspId === 'undefined') {
    throw new ValidationError(`Invalid dfspId ${dfspId}`);
  }

  const values = {
    name: newDfsp.name,
    monetaryZoneId: newDfsp.monetaryZoneId,
    security_group: newDfsp.securityGroup
  };

  return DFSPModel.update(envId, dfspId, values);
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
 * envId String ID of environment
 * dfspId String ID of dfsp
 * returns DFSP
 **/
exports.deleteDFSP = async function (envId, dfspId) {
  await exports.validateEnvironmentAndDfsp(envId, dfspId);
  const pkiEngine = new PKIEngine(Constants.vault);
  await pkiEngine.connect();
  const dbDfspId = await DFSPModel.findIdByDfspId(envId, dfspId);
  await pkiEngine.deleteAllDFSPData(dbDfspId);
  return DFSPModel.delete(envId, dfspId);
};

/**
 * Saves the DFSP certificates. Both parameters are optional. It replaces the previous CA if there was one.
 *
 * rootCertificate: a root certificate used by the DFSP. Can be a self-signed certificate, or a globally trusted CA like Digicert.
 * intermediateChain: list of intermediate certificates.
 */
exports.setDFSPca = async function (envId, dfspId, body) {
  await exports.validateEnvironmentAndDfsp(envId, dfspId);

  const rootCertificate = body.rootCertificate || '';
  const intermediateChain = body.intermediateChain || '';

  const validatingPkiEngine = new PKIEngine(Constants.vault);
  await validatingPkiEngine.connect();
  const { validations, validationState } = await validatingPkiEngine.validateCACertificate(rootCertificate, intermediateChain);

  const values = {
    rootCertificate,
    intermediateChain,
    validations,
    validationState,
  };

  await validatingPkiEngine.setDFSPCA(dfspId, values);

  return values;
};

exports.getDfspsByMonetaryZones = async (envId, monetaryZoneId) => {
  const dfsps = await DFSPModel.getDfspsByMonetaryZones(envId, monetaryZoneId);
  return dfsps.map(r => dfspRowToObject(r));
};

exports.getDFSPca = async function (envId, dfspId) {
  await exports.validateEnvironmentAndDfsp(envId, dfspId);
  try {
    const pkiEngine = new PKIEngine(Constants.vault);
    await pkiEngine.connect();
    return await pkiEngine.getDFSPCA(dfspId);
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

/**
 * Returns a DFSP with the proper attributes as defined in the API mapping them from the internal representation.
 * It doesn't return the internal id
 *
 * @param {RowObject} row RowObject as returned by the DFSPModel or knex
 */
const dfspRowToObject = (row) => {
  return {
    envId: row.env_id,
    id: row.dfsp_id,
    name: row.name,
    monetaryZoneId: row.monetaryZoneId ? row.monetaryZoneId : undefined,
    securityGroup: row.security_group,
  };
};
