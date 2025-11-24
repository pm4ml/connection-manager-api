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
const Constants = require('../constants/Constants');

exports.createDfspServerCerts = async (ctx, dfspId, body) => {
  if (body === null || typeof body === 'undefined') {
    throw new ValidationError(`Invalid body ${body}`);
  }
  await PkiService.validateDfsp(ctx, dfspId);
  const { pkiEngine } = ctx;

  // Normalize intermediateChain: convert array to string if needed
  const normalizedBody = {
    ...body,
    intermediateChain: Array.isArray(body.intermediateChain)
      ? body.intermediateChain.join('\n')
      : body.intermediateChain,
  };

  const { validations, validationState } = await pkiEngine.validateServerCertificate(normalizedBody.serverCertificate, normalizedBody.intermediateChain, normalizedBody.rootCertificate);

  const certData = {
    dfspId,
    ...formatBody(normalizedBody, pkiEngine),
    validations,
    validationState,
  };

  const dbDfspId = await DFSPModel.findIdByDfspId(dfspId);
  await pkiEngine.setDFSPServerCerts(dbDfspId, certData);
  return certData;
};

exports.updateDfspServerCerts = async (ctx, dfspId, body) => {
  return exports.createDfspServerCerts(ctx, dfspId, body);
};

exports.getDfspServerCerts = async (ctx, dfspId) => {
  await PkiService.validateDfsp(ctx, dfspId);
  const { pkiEngine } = ctx;
  const dbDfspId = await DFSPModel.findIdByDfspId(dfspId);
  return pkiEngine.getDFSPServerCerts(dbDfspId);
};

exports.deleteDfspServerCerts = async (ctx, dfspId) => {
  await PkiService.validateDfsp(ctx, dfspId);
  const { pkiEngine } = ctx;
  const dbDfspId = await DFSPModel.findIdByDfspId(dfspId);
  await pkiEngine.deleteDFSPServerCerts(dbDfspId);
};

exports.getAllDfspServerCerts = async (ctx) => {
  const { pkiEngine } = ctx;
  const allDfsps = await DFSPModel.findAll();
  const certs = await Promise.allSettled(allDfsps.map(({ id }) => pkiEngine.getDFSPServerCerts(id)));
  return certs.filter(({ status }) => status === 'fulfilled').map(({ value }) => value);
};

/**
 * Creates the server certificates
 */
exports.createHubServerCerts = async (ctx) => {
  const { pkiEngine } = ctx;
  const cert = {};
  const serverCertData = await pkiEngine.createHubServerCert(Constants.serverCsrParameters);
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

exports.getHubServerCerts = async (ctx) => {
  const { pkiEngine } = ctx;
  return pkiEngine.getHubServerCert();
};

exports.deleteHubServerCerts = async (ctx) => {
  const { pkiEngine } = ctx;
  const cert = await pkiEngine.getHubServerCert();
  if (cert) {
    await pkiEngine.revokeHubServerCert(cert.serverCertificateInfo.serialNumber);
    await pkiEngine.deleteHubServerCert();
  }
};

const formatBody = (body, pkiEngine) => {
  // Normalize intermediateChain: convert array to string if needed
  const intermediateChain = Array.isArray(body.intermediateChain)
    ? body.intermediateChain.join('\n')
    : body.intermediateChain;

  return {
    rootCertificate: body.rootCertificate,
    rootCertificateInfo: body.rootCertificate && pkiEngine.getCertInfo(body.rootCertificate),
    intermediateChain,
    intermediateChainInfo: PkiService.splitChainIntermediateCertificateInfo(intermediateChain, pkiEngine),
    serverCertificate: body.serverCertificate,
    serverCertificateInfo: body.serverCertificate && pkiEngine.getCertInfo(body.serverCertificate),
  };
};
