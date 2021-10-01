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
const PKIEngine = require('../pki_engine/VaultPKIEngine');
const Constants = require('../constants/Constants');
const ValidationCodes = require('../pki_engine/ValidationCodes');
const ValidationError = require('../errors/ValidationError');

const formatBody = (body, pkiEngine) => {
  return {
    type: body.type,
    rootCertificate: body.rootCertificate,
    rootCertificateInfo: body.rootCertificate && pkiEngine.getCertInfo(body.rootCertificate),
    intermediateChain: body.intermediateChain,
    intermediateChainInfo: PkiService.splitChainIntermediateCertificateInfo(body.intermediateChain, pkiEngine),
  };
};

const createInternalHubCA = async (body) => {
  const pkiEngine = new PKIEngine(Constants.vault);
  await pkiEngine.connect();

  const { cert } = await pkiEngine.createCA(body);
  const certInfo = pkiEngine.getCertInfo(cert);

  const info = {
    type: 'INTERNAL',
    rootCertificate: cert,
    rootCertificateInfo: certInfo,
  };

  await pkiEngine.setHubCACertDetails(info);

  return info;
};

const createExternalHubCA = async (body) => {
  const pkiEngine = new PKIEngine(Constants.vault);
  await pkiEngine.connect();

  const rootCertificate = body.rootCertificate || '';
  const intermediateChain = body.intermediateChain || '';
  const { privateKey } = body;
  if (!privateKey) {
    throw new ValidationError('Missing "privateKey" property');
  }

  const { validations, validationState } = await pkiEngine.validateCACertificate(rootCertificate, intermediateChain, privateKey);

  const info = {
    ...formatBody(body, pkiEngine),
    validations,
    validationState,
  };

  if (validationState === ValidationCodes.VALID_STATES.VALID) {
    await pkiEngine.setHubCaCertChain(rootCertificate + intermediateChain, privateKey);
    await pkiEngine.setHubCACertDetails(info);
  }
  return info;
};

exports.createHubCA = async (body) => {
  return (body.type === 'EXTERNAL') ? createExternalHubCA(body) : createInternalHubCA(body);
};

exports.getHubCA = async () => {
  const pkiEngine = new PKIEngine(Constants.vault);
  await pkiEngine.connect();
  return pkiEngine.getHubCACertDetails();
};

exports.deleteHubCA = async () => {
  const pkiEngine = new PKIEngine(Constants.vault);
  await pkiEngine.connect();
  await pkiEngine.deleteHubCACertDetails();
  await pkiEngine.deleteCA();
};
