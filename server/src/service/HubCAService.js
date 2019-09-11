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
const Joi = require('joi');
const ValidationError = require('../errors/ValidationError');
const HubIssuerCasModel = require('../models/HubIssuerCAsModel');
const PKIEngine = require('../pki_engine/EmbeddedPKIEngine');

const hubCAInputSchema = Joi.object().description('Hub CA Input').keys({
  rootCertificate: Joi.string().description('CA root certificate'),
  intermediateChain: Joi.string().description('CA intermediate certificates chain'),
  name: Joi.string().description('CA name').required(),
  type: Joi.string().required().valid(['EXTERNAL']),
});

const hubIssuerCasModel = new HubIssuerCasModel();

exports.createHubCA = async (envId, body) => {
  await PkiService.validateEnvironment(envId);
  const result = Joi.validate(body, hubCAInputSchema);
  if (result.error) {
    throw new ValidationError('Invalid Hub CA Input', result.error.details);
  }

  let rootCertificate = body.rootCertificate || null;
  let intermediateChain = body.intermediateChain || null;

  const validatingPkiEngine = new PKIEngine();
  let { validations, validationState } = await validatingPkiEngine.validateCACertificate(rootCertificate, intermediateChain);

  let validationResult = {
    validations: JSON.stringify(validations),
    validationState,
  };

  let row = await bodyToRow(body, envId, validationResult);
  await hubIssuerCasModel.create(row);
  return rowToObject(row);
};

exports.getHubCAs = async (envId) => {
  await PkiService.validateEnvironment(envId);

  let hubCAs = await hubIssuerCasModel.findAllByEnvId(envId);
  return hubCAs.map(hubCA => rowToObject(hubCA));
};

exports.getHubCA = async (envId, hubCAId) => {
  await PkiService.validateEnvironment(envId);
  if (hubCAId == null) {
    throw new ValidationError('Invalid hubCAid');
  }
  let hubCA = await hubIssuerCasModel.findById(hubCAId);
  return rowToObject(hubCA);
};

exports.deleteHubCA = async (envId, hubCAId) => {
  await PkiService.validateEnvironment(envId);
  if (hubCAId == null) {
    throw new ValidationError('Invalid hubCAid');
  }
  await hubIssuerCasModel.delete(hubCAId);
};

const bodyToRow = async (body, envId, validationResult) => {
  let chainInfo = await PkiService.splitChainIntermediateCertificate(body);

  return {
    env_id: envId,
    type: body.type,
    name: body.name,
    root_cert: body.rootCertificate,
    chain: body.intermediateChain,
    root_cert_info: body.rootCertificate ? JSON.stringify(await PKIEngine.getCertInfo(body.rootCertificate)) : body.rootCertificate,
    chain_info: JSON.stringify(chainInfo),
    ...validationResult
  };
};

const rowToObject = (row) => {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    rootCertificate: row.root_cert,
    intermediateChain: row.chain,
    rootCertificateInfo: row.root_cert_info && (typeof row.root_cert_info === 'string') ? JSON.parse(row.root_cert_info) : {},
    intermediateChainInfo: row.chain_info && (typeof row.chain_info === 'string') ? JSON.parse(row.chain_info) : [],
    validationState: row.validationState,
    validations: row.validations && (typeof row.validations === 'string') ? JSON.parse(row.validations) : []
  };
};
