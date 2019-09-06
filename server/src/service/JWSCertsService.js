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
const DfspJWSCertsModel = require('../models/DfspJWSCertsModel');
const DFSPModel = require('../models/DFSPModel');
const PKIEngine = require('../pki_engine/EmbeddedPKIEngine');
const PkiService = require('./PkiService');
const ValidationError = require('../errors/ValidationError');

const dfspJWSCertsModel = new DfspJWSCertsModel();

exports.createDfspJWSCerts = async (envId, dfspId, body) => {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);

  const pkiEngine = new PKIEngine();
  let { validations, validationState } = await pkiEngine.validateJWSCertificate(body.jwsCertificate, body.intermediateChain, body.rootCertificate);
  // FIXME move this logic to DfspJWSCertsModel
  let rawDfspId = await DFSPModel.findIdByDfspId(envId, dfspId);
  let values = {
    env_id: envId,
    dfsp_id: rawDfspId,
    ...(await bodyToRow(body)),
    validations: JSON.stringify(validations),
    validationState
  };

  let { id } = await dfspJWSCertsModel.upsert(null, values);
  return rowToObject(await dfspJWSCertsModel.findById(id));
};

exports.updateDfspJWSCerts = async (envId, dfspId, body) => {
  if (body === null || typeof body === 'undefined') {
    throw new ValidationError(`Invalid body ${body}`);
  }
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);

  const pkiEngine = new PKIEngine();
  let { validations, validationState } = await pkiEngine.validateJWSCertificate(body.jwsCertificate, body.intermediateChain, body.rootCertificate);
  let values = {
    ...(await bodyToRow(body)),
    validations: JSON.stringify(validations),
    validationState
  };

  let { id: rowId } = await dfspJWSCertsModel.findByEnvIdDfspId(envId, dfspId);
  await dfspJWSCertsModel.update(rowId, values);
  return rowToObject(await dfspJWSCertsModel.findById(rowId));
};

exports.getDfspJWSCerts = async (envId, dfspId) => {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);
  return rowToObject(await dfspJWSCertsModel.findByEnvIdDfspId(envId, dfspId));
};

exports.deleteDfspJWSCerts = async (envId, dfspId) => {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);
  let { id } = await dfspJWSCertsModel.findByEnvIdDfspId(envId, dfspId);
  await dfspJWSCertsModel.delete(id);
};

exports.getAllDfspJWSCerts = async (envId) => {
  await PkiService.validateEnvironment(envId);
  let certs = await dfspJWSCertsModel.findAllByEnvId(envId);
  let certObjects = Promise.all(certs.map(async cert => rowToDFSPObject(cert)));
  return certObjects;
};

const rowToObject = (row) => {
  let jwsCerts = {
    id: row.id,
    rootCertificate: row.root_cert,
    intermediateChain: row.chain,
    jwsCertificate: row.jws_cert,
    rootCertificateInfo: row.root_cert_info && (typeof row.root_cert_info === 'string') ? JSON.parse(row.root_cert_info) : {},
    intermediateChainInfo: row.chain_info && (typeof row.chain_info === 'string') ? JSON.parse(row.chain_info) : [],
    jwsCertificateInfo: row.jws_cert_info && (typeof row.jws_cert_info === 'string') ? JSON.parse(row.jws_cert_info) : {},
    validationState: row.validationState,
    validations: row.validations && (typeof row.validations === 'string') ? JSON.parse(row.validations) : {},
  };
  return jwsCerts;
};

const rowToDFSPObject = async (row) => {
  let serverCerts = rowToObject(row);
  let dfsp = await DFSPModel.findByRawId(row.dfsp_id);
  serverCerts.dfspId = dfsp.dfsp_id;
  return serverCerts;
};

const bodyToRow = async (body) => {
  let chainInfo = await PkiService.splitChainIntermediateCertificate(body);

  return {
    root_cert: body.rootCertificate,
    root_cert_info: body.rootCertificate ? JSON.stringify(await PKIEngine.getCertInfo(body.rootCertificate)) : body.rootCertificate,
    chain: body.intermediateChain,
    chain_info: JSON.stringify(chainInfo),
    jws_cert: body.jwsCertificate,
    jws_cert_info: body.jwsCertificate ? JSON.stringify(await PKIEngine.getCertInfo(body.jwsCertificate)) : body.jwsCertificate
  };
};
