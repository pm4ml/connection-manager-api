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
const PKIEngine = require('../pki_engine/VaultPKIEngine');
const PkiService = require('./PkiService');
const ValidationError = require('../errors/ValidationError');
const Constants = require('../constants/Constants');

exports.createDfspJWSCerts = async (envId, dfspId, body) => {
  if (body === null || typeof body === 'undefined') {
    throw new ValidationError(`Invalid body ${body}`);
  }

  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);

  const pkiEngine = new PKIEngine(Constants.vault);
  await pkiEngine.connect();
  const { validations, validationState } = pkiEngine.validateJWSCertificate(body.publicKey);
  const jwsData = {
    dfspId,
    publicKey: body.publicKey,
    validations,
    validationState,
  };
  const dbDfspId = await DFSPModel.findIdByDfspId(envId, dfspId);
  await pkiEngine.setDFSPJWSCerts(dbDfspId, jwsData);
  return jwsData;
};

exports.updateDfspJWSCerts = async (envId, dfspId, body) => {
  return exports.createDfspJWSCerts(envId, dfspId, body);
};

exports.getDfspJWSCerts = async (envId, dfspId) => {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);
  const pkiEngine = new PKIEngine(Constants.vault);
  await pkiEngine.connect();
  const dbDfspId = await DFSPModel.findIdByDfspId(envId, dfspId);
  return pkiEngine.getDFSPJWSCerts(dbDfspId);
};

exports.deleteDfspJWSCerts = async (envId, dfspId) => {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);
  const pkiEngine = new PKIEngine(Constants.vault);
  await pkiEngine.connect();
  const dbDfspId = await DFSPModel.findIdByDfspId(envId, dfspId);
  await pkiEngine.deleteDFSPJWSCerts(dbDfspId);
};

exports.getAllDfspJWSCerts = async () => {
  const pkiEngine = new PKIEngine(Constants.vault);
  await pkiEngine.connect();
  return pkiEngine.getAllDFSPJWSCerts();
};
