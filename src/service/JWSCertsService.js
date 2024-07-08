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
const PkiService = require('./PkiService');
const ValidationError = require('../errors/ValidationError');

exports.createDfspJWSCerts = async (ctx, dfspId, body) => {
  if (body === null || typeof body === 'undefined') {
    throw new ValidationError(`Invalid body ${body}`);
  }

  await PkiService.validateDfsp(ctx, dfspId);

  const { pkiEngine } = ctx;
  const { validations, validationState } = pkiEngine.validateJWSCertificate(body.publicKey);
  const jwsData = {
    dfspId,
    publicKey: body.publicKey,
    createdAt: body.createdAt,
    validations,
    validationState,
  };
  const dbDfspId = await DFSPModel.findIdByDfspId(dfspId);
  await pkiEngine.setDFSPJWSCerts(dbDfspId, jwsData);
  return jwsData;
};

exports.createDfspExternalJWSCerts = async (ctx, body) => {
  if (body === null || typeof body === 'undefined' || !Array.isArray(body) || body.length === 0) {
    throw new ValidationError(`Invalid body ${body}`);
  }

  // Filter out the DFSPs that are not external
  const nativeDfsps = await PkiService.getDFSPs();
  const nativeDfspIdList = nativeDfsps.map(dfsp => dfsp.dfspId);
  const externalDfspList = body.filter(dfspJwsItem => !nativeDfspIdList.includes(dfspJwsItem.dfspId))

  const { pkiEngine } = ctx;
  const result = [];
  externalDfspList.forEach(async dfspJwsItem => {
    const { dfspId, publicKey, createdAt } = dfspJwsItem;
    const { validations, validationState } = pkiEngine.validateJWSCertificate(publicKey);
    const jwsData = {
      dfspId,
      publicKey,
      createdAt,
      validations,
      validationState,
    };
    await pkiEngine.setDFSPExternalJWSCerts(dfspId, jwsData);
    result.push(jwsData);
  });
  return result;
};

exports.updateDfspJWSCerts = async (ctx, dfspId, body) => {
  return exports.createDfspJWSCerts(dfspId, body);
};

exports.getDfspJWSCerts = async (ctx, dfspId) => {
  await PkiService.validateDfsp(ctx, dfspId);
  const { pkiEngine } = ctx;
  const dbDfspId = await DFSPModel.findIdByDfspId(dfspId);
  return pkiEngine.getDFSPJWSCerts(dbDfspId);
};

exports.deleteDfspJWSCerts = async (ctx, dfspId) => {
  await PkiService.validateDfsp(ctx, dfspId);
  const { pkiEngine } = ctx;
  const dbDfspId = await DFSPModel.findIdByDfspId(dfspId);
  await pkiEngine.deleteDFSPJWSCerts(dbDfspId);
};

exports.getAllDfspJWSCerts = async (ctx) => {
  const { pkiEngine } = ctx;
  return pkiEngine.getAllDFSPJWSCerts();
};
