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
const PKIEngine = require('../pki_engine/VaultPKIEngine');
const Constants = require('../constants/Constants');
const { createID } = require('../models/GID');

const hubCAInputSchema = Joi.object().description('Hub CA Input').keys({
  rootCertificate: Joi.string().description('CA root certificate'),
  intermediateChain: Joi.string().description('CA intermediate certificates chain'),
  name: Joi.string().description('CA name').required(),
  type: Joi.string().required().valid(['EXTERNAL']),
});

exports.createHubCA = async (envId, body) => {
  await PkiService.validateEnvironment(envId);
  const result = Joi.validate(body, hubCAInputSchema);
  if (result.error) {
    throw new ValidationError('Invalid Hub CA Input', result.error.details);
  }

  const rootCertificate = body.rootCertificate || null;
  const intermediateChain = body.intermediateChain || null;

  const pkiEngine = new PKIEngine(Constants.vault);
  await pkiEngine.connect();
  const { validations, validationState } = await pkiEngine.validateCACertificate(rootCertificate, intermediateChain);

  const info = {
    id: await createID(),
    ...formatBody(body),
    validations,
    validationState,
  };

  await pkiEngine.setHubIssuerCACert(info.id, info);
  return info;
};

exports.getHubCAs = async (envId) => {
  await PkiService.validateEnvironment(envId);

  const pkiEngine = new PKIEngine(Constants.vault);
  await pkiEngine.connect();
  return pkiEngine.getHubIssuerCACerts();
};

exports.getHubCA = async (envId, hubCAId) => {
  await PkiService.validateEnvironment(envId);
  if (hubCAId == null) {
    throw new ValidationError('Invalid hubCAid');
  }

  const pkiEngine = new PKIEngine(Constants.vault);
  await pkiEngine.connect();
  return pkiEngine.getHubIssuerCACert(hubCAId);
};

exports.deleteHubCA = async (envId, hubCAId) => {
  await PkiService.validateEnvironment(envId);
  if (hubCAId == null) {
    throw new ValidationError('Invalid hubCAid');
  }

  const pkiEngine = new PKIEngine(Constants.vault);
  await pkiEngine.connect();
  await pkiEngine.deleteHubIssuerCACert(hubCAId);
};

const formatBody = (body) => {
  return {
    name: body.name,
    type: body.type,
    rootCertificate: body.rootCertificate,
    rootCertificateInfo: body.rootCertificate && PKIEngine.getCertInfo(body.rootCertificate),
    intermediateChain: body.intermediateChain,
    intermediateChainInfo: PkiService.splitChainIntermediateCertificateInfo(body),
  };
};
