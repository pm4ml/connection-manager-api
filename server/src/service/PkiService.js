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

const certificateStartDelimiter = '-----BEGIN CERTIFICATE-----';
const certificateEndDelimiter = '-----END CERTIFICATE-----';

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
  let values = {
    name: body.name,
    CN: body.defaultDN ? body.defaultDN.CN : null,
    C: body.defaultDN ? body.defaultDN.C : null,
    L: body.defaultDN ? body.defaultDN.L : null,
    O: body.defaultDN ? body.defaultDN.O : null,
    OU: body.defaultDN ? body.defaultDN.OU : null,
    ST: body.defaultDN ? body.defaultDN.ST : null,
  };
  try {
    let result = await EnvironmentModel.create(values);
    if (result.length === 1) {
      let id = result[0];
      let row = await EnvironmentModel.findById(id);
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
  let row = await EnvironmentModel.findById(envId);
  let environment = EnvironmentModel.mapRowToObject(row);
  return environment;
};

exports.deleteEnvironment = async function (envId) {
  let affectedRows = await EnvironmentModel.delete(envId);
  if (affectedRows === 0) {
    throw new NotFoundError();
  }
  return { id: envId };
};

/**
 * Creates a CA for the environment. This CA will be used to sign the CSRs it
 * receives from the DFSPs on the Inbound flow.
 *
 *
 * Since there will usually be just once CA per environment,
 * this operation establish the newly created CA as the current CA,
 * replacing previously created ones.
 *
 * @param {CAInitialInfo} body Initial configuration to use for the engine
 *
 */
exports.createCA = async function (envId, body) {
  let caOptions = body;

  let pkiEngine = new PKIEngine(Constants.vault);
  await pkiEngine.connect();
  const { cert } = await pkiEngine.createCA(caOptions);
  let certInfo = await PKIEngine.getCertInfo(cert);

  return {
    certificate: cert,
    certInfo,
  };
};

/**
 * Returns the CA root certificate
 * Returns the certificate that was created with the createCA operation
 * envId String ID of environment
 * returns inline_response_200_1
 **/
exports.getCurrentCARootCert = async function (envId) {
  let pkiEngine = new PKIEngine(Constants.vault);
  await pkiEngine.connect();
  const cert = await pkiEngine.getRootCaCert();
  const certInfo = await PKIEngine.getCertInfo(cert);
  return {
    certificate: cert,
    certInfo,
    id: 1,
  };
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
  let regex = / /gi;
  let dfspIdNoSpaces = body.dfspId ? body.dfspId.replace(regex, '-') : null;

  let values = {
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
    let result = await DFSPModel.create(values);
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
    let result = await DFSPModel.findByDfspId(envId, dfspId);
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

  let values = {
    name: newDfsp.name,
    monetaryZoneId: newDfsp.monetaryZoneId,
    security_group: newDfsp.securityGroup
  };

  return DFSPModel.update(envId, dfspId, values);
};

/**
 *
 */
exports.splitChainIntermediateCertificate = async (body) => {
  const beginCertRegex = /(?=-----BEGIN)/g;

  let chainInfo = [];
  let count = ((body.intermediateChain && body.intermediateChain.match(/BEGIN/g)) || []).length;

  // split the intermediatesChain into a list of certInfo
  if (count > 0) {
    let intermediateChains = body.intermediateChain.split(beginCertRegex);
    for (let index = 1; index < intermediateChains.length; index++) {
      let chain = intermediateChains[index];
      chain = chain.slice(0, chain.indexOf(certificateEndDelimiter)) + certificateEndDelimiter;
      chainInfo.push(await PKIEngine.getCertInfo(chain));
    }
  }
  return chainInfo;
};

/**
 *
 */
exports.retrieveFirstAndRemainingIntermediateChainCerts = async (intermediateChain) => {
  const beginCertPattern = '(?=' + certificateStartDelimiter + ')';
  let certStartRegex = new RegExp(beginCertPattern, 'g');

  let chainInfo = [];
  let remainingIntermediateChainInfo = '';
  let count = ((intermediateChain && intermediateChain.match(certStartRegex)) || []).length;
  // split the intermediatesChain into a list of certInfo
  if (count > 0) {
    let intermediateCerts = intermediateChain.split(certStartRegex);
    let intermediateCert = intermediateCerts[0];
    intermediateCert = intermediateCert.slice(0, intermediateCert.indexOf(certificateEndDelimiter)) + certificateEndDelimiter;
    if (intermediateCert.match(certStartRegex)) {
      chainInfo.push(intermediateCert);
      intermediateCerts.shift();
      remainingIntermediateChainInfo = intermediateCerts.join('');
    } else {
      intermediateCert = intermediateCerts[1];
      intermediateCert = intermediateCert.slice(0, intermediateCert.indexOf(certificateEndDelimiter)) + certificateEndDelimiter;
      if (intermediateCert.match(certStartRegex)) {
        chainInfo.push(intermediateCert);
        intermediateCerts.shift();
        intermediateCerts.shift();
        remainingIntermediateChainInfo = intermediateCerts.join('');
      }
    }
  }
  // Test and business logic at following if (chainInfo.length === 0) added during MP-1104 bug fix work, but there is no requirement for it.
  // The business logic results in bug MP-2398 and therefore skipping test and commenting business logic.
  // if (chainInfo.length === 0) {
  //   throw new ValidationError('Empty intermediate chain');
  // }
  return {
    firstIntermediateChainCertificate: chainInfo[0],
    remainingIntermediateChainInfo: remainingIntermediateChainInfo
  };
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
  await pkiEngine.deleteAllDFSPData(dfspId);
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

  let rootCertificate = body.rootCertificate || null;
  let intermediateChain = body.intermediateChain || null;

  const validatingPkiEngine = new PKIEngine(Constants.vault);
  await validatingPkiEngine.connect();
  let { validations, validationState } = await validatingPkiEngine.validateCACertificate(rootCertificate, intermediateChain);

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
