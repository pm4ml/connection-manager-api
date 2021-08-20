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

exports.createDfspServerCerts = async (envId, dfspId, body) => {
  if (body === null || typeof body === 'undefined') {
    throw new ValidationError(`Invalid body ${body}`);
  }
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);
  const pkiEngine = new PKIEngine(Constants.vault);
  await pkiEngine.connect();
  const { validations, validationState } = await pkiEngine.validateServerCertificate(body.serverCertificate, body.intermediateChain, body.rootCertificate);

  const certData = {
    dfspId,
    ...formatBody(body, pkiEngine),
    validations,
    validationState,
  };

  const dbDfspId = await DFSPModel.findIdByDfspId(envId, dfspId);
  await pkiEngine.setDFSPServerCerts(dbDfspId, certData);
  return certData;
};

exports.updateDfspServerCerts = async (envId, dfspId, body) => {
  return exports.createDfspServerCerts(envId, dfspId, body);
};

exports.getDfspServerCerts = async (envId, dfspId) => {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);
  const pkiEngine = new PKIEngine(Constants.vault);
  await pkiEngine.connect();
  const dbDfspId = await DFSPModel.findIdByDfspId(envId, dfspId);
  return pkiEngine.getDFSPServerCerts(dbDfspId);
};

exports.deleteDfspServerCerts = async (envId, dfspId) => {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);
  const pkiEngine = new PKIEngine(Constants.vault);
  await pkiEngine.connect();
  const dbDfspId = await DFSPModel.findIdByDfspId(envId, dfspId);
  await pkiEngine.deleteDFSPServerCerts(dbDfspId);
};

exports.getAllDfspServerCerts = async (envId) => {
  await PkiService.validateEnvironment(envId);
  const pkiEngine = new PKIEngine(Constants.vault);
  await pkiEngine.connect();
  const allDfsps = await DFSPModel.findAllByEnvironment(envId);
  return Promise.all(allDfsps.map(({ id }) => pkiEngine.getDFSPServerCerts(id)));
};

/**
 * Creates the server certificates
 */
exports.createHubServerCerts = async (envId, body) => {
  if (body === null || typeof body === 'undefined') {
    throw new ValidationError(`Invalid body ${body}`);
  }
  await PkiService.validateEnvironment(envId);
  const pkiEngine = new PKIEngine(Constants.vault);
  await pkiEngine.connect();
  const cert = {};
  const serverCertData = await pkiEngine.createHubServerCert(body);
  cert.rootCertificate = await pkiEngine.getRootCaCert();
  cert.rootCertificateInfo = pkiEngine.getCertInfo(cert.rootCertificate);
  if (serverCertData.ca_chain) {
    cert.intermediateChain = serverCertData.ca_chain;
    cert.intermediateChainInfo = cert.intermediateChain.map(pkiEngine.getCertInfo);
  }
  cert.serverCertificate = serverCertData.certificate;
  cert.serverCertificateInfo = pkiEngine.getCertInfo(cert.serverCertificate);
  cert.serverCertificateInfo.serialNumber = serverCertData.serial_number;

  const { validations, validationState } = await pkiEngine.validateServerCertificate(cert.serverCertificate, cert.intermediateChain, cert.rootCertificate);
  const certData = {
    ...cert,
    validations,
    validationState,
  };

  await pkiEngine.setHubServerCert(certData);
  return certData;
};

exports.getHubServerCerts = async (envId) => {
  await PkiService.validateEnvironment(envId);
  const pkiEngine = new PKIEngine(Constants.vault);
  await pkiEngine.connect();
  return pkiEngine.getHubServerCert();
};

exports.deleteHubServerCerts = async (envId) => {
  await PkiService.validateEnvironment(envId);
  const pkiEngine = new PKIEngine(Constants.vault);
  await pkiEngine.connect();
  const cert = await pkiEngine.getHubServerCert();
  if (cert) {
    await pkiEngine.revokeHubServerCert(cert.serverCertificateInfo.serialNumber);
    await pkiEngine.deleteHubServerCert();
  }
};

const formatBody = (body, pkiEngine) => {
  return {
    rootCertificate: body.rootCertificate,
    rootCertificateInfo: body.rootCertificate && pkiEngine.getCertInfo(body.rootCertificate),
    intermediateChain: body.intermediateChain,
    intermediateChainInfo: PkiService.splitChainIntermediateCertificateInfo(body.intermediateChain, pkiEngine),
    serverCertificate: body.serverCertificate,
    serverCertificateInfo: body.serverCertificate && pkiEngine.getCertInfo(body.serverCertificate),
  };
};
