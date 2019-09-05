'use strict';
const HubServerCertsModel = require('../models/HubServerCertsModel');
const DfspServerCertsModel = require('../models/DfspServerCertsModel');
const DFSPModel = require('../models/DFSPModel');
const PKIEngine = require('../pki_engine/EmbeddedPKIEngine');
const PkiService = require('./PkiService');
const ValidationError = require('../errors/ValidationError');

const hubServerCertsModel = new HubServerCertsModel();
const dfspServerCertsModel = new DfspServerCertsModel();

exports.createDfspServerCerts = async (envId, dfspId, body) => {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);
  const pkiEngine = new PKIEngine();
  let { validations, validationState } = await pkiEngine.validateServerCertificate(body.serverCertificate, body.intermediateChain, body.rootCertificate);
  // FIXME move this logic to DfspJWSCertsModel
  let rawDfspId = await DFSPModel.findIdByDfspId(envId, dfspId);

  let values = {
    env_id: envId,
    dfsp_id: rawDfspId,
    ...(await bodyToRow(body)),
    validations: JSON.stringify(validations),
    validationState
  };
  let { id } = await dfspServerCertsModel.upsert(null, values);
  return rowToObject(await dfspServerCertsModel.findById(id));
};

exports.updateDfspServerCerts = async (envId, dfspId, body) => {
  if (body === null || typeof body === 'undefined') {
    throw new ValidationError(`Invalid body ${body}`);
  }
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);
  let { id: rowId } = await dfspServerCertsModel.findByEnvIdDfspId(envId, dfspId);
  const pkiEngine = new PKIEngine();
  let { validations, validationState } = await pkiEngine.validateServerCertificate(body.serverCertificate, body.intermediateChain, body.rootCertificate);
  let values = {
    ...(await bodyToRow(body)),
    validations: JSON.stringify(validations),
    validationState
  };
  await dfspServerCertsModel.update(rowId, values);
  return rowToObject(await dfspServerCertsModel.findById(rowId));
};

exports.getDfspServerCerts = async (envId, dfspId) => {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);
  return rowToObject(await dfspServerCertsModel.findByEnvIdDfspId(envId, dfspId));
};

exports.deleteDfspServerCerts = async (envId, dfspId) => {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);
  let { id } = await dfspServerCertsModel.findByEnvIdDfspId(envId, dfspId);
  await dfspServerCertsModel.delete(id);
};

exports.getAllDfspServerCerts = async (envId) => {
  await PkiService.validateEnvironment(envId);
  let certs = await dfspServerCertsModel.findAllByEnvId(envId);
  let certObjects = Promise.all(certs.map(async cert => rowToDFSPObject(cert)));
  return certObjects;
};

/**
 * Sets the server certificates
 */
exports.createHubServerCerts = async (envId, body) => {
  await PkiService.validateEnvironment(envId);
  const pkiEngine = new PKIEngine();
  let { validations, validationState } = await pkiEngine.validateServerCertificate(body.serverCertificate, body.intermediateChain, body.rootCertificate);
  let values = {
    env_id: envId,
    ...(await bodyToRow(body)),
    validations: JSON.stringify(validations),
    validationState
  };

  let { id } = await hubServerCertsModel.upsert(null, values);
  return rowToObject(await hubServerCertsModel.findById(id));
};

exports.updateHubServerCerts = async (envId, body) => {
  await PkiService.validateEnvironment(envId);
  let { id: rowId } = await hubServerCertsModel.findByEnvId(envId);
  const pkiEngine = new PKIEngine();
  let { validations, validationState } = await pkiEngine.validateServerCertificate(body.serverCertificate, body.intermediateChain, body.rootCertificate);
  let values = {
    ...(await bodyToRow(body)),
    validations: JSON.stringify(validations),
    validationState
  };
  await hubServerCertsModel.update(rowId, values);
  return rowToObject(await hubServerCertsModel.findById(rowId));
};

exports.getHubServerCerts = async (envId) => {
  await PkiService.validateEnvironment(envId);
  return rowToObject(await hubServerCertsModel.findByEnvId(envId));
};

exports.deleteHubServerCerts = async (envId) => {
  await PkiService.validateEnvironment(envId);
  let { id } = await hubServerCertsModel.findByEnvId(envId);
  await hubServerCertsModel.delete(id);
};

const rowToObject = (row) => {
  let serverCerts = {
    id: row.id,
    rootCertificate: row.root_cert,
    intermediateChain: row.chain,
    serverCertificate: row.server_cert,
    rootCertificateInfo: row.root_cert_info && (typeof row.root_cert_info === 'string') ? JSON.parse(row.root_cert_info) : {},
    intermediateChainInfo: row.chain_info && (typeof row.chain_info === 'string') ? JSON.parse(row.chain_info) : [],
    serverCertificateInfo: row.server_cert_info && (typeof row.server_cert_info === 'string') ? JSON.parse(row.server_cert_info) : {},
    validationState: row.validationState,
    validations: row.validations && (typeof row.validations === 'string') ? JSON.parse(row.validations) : {},
    state: row.state
  };
  return serverCerts;
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
    server_cert: body.serverCertificate,
    server_cert_info: body.serverCertificate ? JSON.stringify(await PKIEngine.getCertInfo(body.serverCertificate)) : body.serverCertificate
  };
};
