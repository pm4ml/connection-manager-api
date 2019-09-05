'use strict';
const DFSPEndpointItemModel = require('../models/DFSPEndpointItemModel');
const { validateIPAddressInput, validatePorts, validateURLInput } = require('../utils/formatValidator');
const ValidationError = require('../errors/ValidationError');
const PkiService = require('./PkiService');
const DFSPModel = require('../models/DFSPModel');

/**
 * Creates a DFSPEndpoint, used by the createDFSPEgressIP and createDFSPIngressIP methods
 *
 * @param {Integer} envId Environment id
 * @param {String} dfspId DFSP id
 * @param {IPEntry} body IPEntry
 * @param {String{'EGRESS'|'INGRESS'}} direction
 */
const createDFSPIp = async function (envId, dfspId, body, direction) {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);
  let inputIpEntry = body.value;
  if (!inputIpEntry.address) {
    throw new ValidationError('No address received');
  }
  if (!inputIpEntry.ports) {
    throw new ValidationError('No ports received');
  }
  if (!Array.isArray(inputIpEntry.ports)) {
    throw new ValidationError('No ports array received');
  }
  if (!inputIpEntry.ports.length === 0) {
    throw new ValidationError('Empty ports array received');
  }
  validateIPAddressInput(inputIpEntry.address);
  validatePorts(inputIpEntry.ports);

  let endpointItem = {
    state: 'NEW',
    type: 'IP',
    value: JSON.stringify(inputIpEntry),
    dfspId: dfspId,
    direction: direction,
  };
  return endpointItem;
};

/**
 * Adds a new IP entry to the DFSP Egress endpoint
 *
 * @param {Integer} envId Environment id
 * @param {String} dfspId DFSP id
 * body InputIP DFSP egress IP
 * returns DFSPEndPointIp
 **/
exports.createDFSPEgressIp = async function (envId, dfspId, body) {
  let endpointItem = await createDFSPIp(envId, dfspId, body, 'EGRESS');
  let id = await DFSPEndpointItemModel.create(envId, endpointItem);
  return DFSPEndpointItemModel.findObjectById(id);
};

/**
 * Adds a new IP entry to the DFSP Ingress endpoint
 *
 * @param {Integer} envId Environment id
 * @param {String} dfspId DFSP id
 * body InputIP DFSP ingress IP
 * returns DFSPEndPointIp
 **/
exports.createDFSPIngressIp = async function (envId, dfspId, body) {
  let endpointItem = await createDFSPIp(envId, dfspId, body, 'INGRESS');
  let id = await DFSPEndpointItemModel.create(envId, endpointItem);
  return DFSPEndpointItemModel.findObjectById(id);
};

/**
 * returns DFSPEndPointIp
 */
exports.getDFSPEgressIps = async function getDFSPEgressIp (envId, dfspId) {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);
  return DFSPEndpointItemModel.findObjectByDirectionType('EGRESS', 'IP', envId, dfspId);
};

/**
 * returns DFSPEndPointIp
 */
exports.getDFSPIngressIps = async function getDFSPIngressIps (envId, dfspId) {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);
  return DFSPEndpointItemModel.findObjectByDirectionType('INGRESS', 'IP', envId, dfspId);
};

/**
 * Set the DFSP Ingress URL
 * The DFSP operator sends the ingress URL
 *
 * @param {Integer} envId Environment id
 * @param {String} dfspId DFSP id
 * body InputURL DFSP ingress URL
 * returns DFSPEndPointConfigItem
 **/
exports.createDFSPIngressUrl = async function (envId, dfspId, body) {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);
  let inputURLAddress = body.value;
  if (!inputURLAddress.url) {
    throw new ValidationError('No URL received');
  }
  validateURLInput(inputURLAddress.url);

  let endpointItem = {
    state: 'NEW',
    type: 'URL',
    value: JSON.stringify(inputURLAddress),
    dfspId: dfspId,
    direction: 'INGRESS',
  };
  let id = await DFSPEndpointItemModel.create(envId, endpointItem);
  return DFSPEndpointItemModel.findObjectById(id);
};

exports.getDFSPIngressUrls = async function getDFSPIngressUrls (envId, dfspId) {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);
  return DFSPEndpointItemModel.findObjectByDirectionType('INGRESS', 'URL', envId, dfspId);
};

exports.getUnprocessedEndpointItems = async function (envId) {
  let items = await DFSPEndpointItemModel.findAllEnvState(envId, 'NEW');
  return items;
};

exports.getUnprocessedDfspItems = async function (envId, dfspId) {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);
  let items = await DFSPEndpointItemModel.findAllDfspState(envId, dfspId, 'NEW');
  return items;
};

exports.confirmEndpointItem = async function (envId, epId) {
  return DFSPEndpointItemModel.update(epId, { state: 'CONFIRMED' });
};

exports.getDFSPEndpoint = async function (envId, dfspId, epId) {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);
  return DFSPEndpointItemModel.findObjectById(epId);
};

exports.getDFSPEndpoints = async function (envId, dfspId) {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);
  return DFSPEndpointItemModel.findObjectAll(envId, dfspId);
};

/**
 *
 */
exports.updateDFSPEndpoint = async function (envId, dfspId, epId, body) {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);
  await DFSPEndpointItemModel.findObjectById(epId);

  if (body.value && body.value.address) {
    validateIPAddressInput(body.value.address);
  }
  if (body.value && body.value.ports) {
    validatePorts(body.value.ports);
  }
  if (body.value && body.value.url) {
    validateURLInput(body.value.url);
  }

  let endpointItem = { ...body };
  if (endpointItem.value) {
    endpointItem.value = JSON.stringify(endpointItem.value);
  }
  let id = await DFSPModel.findIdByDfspId(envId, dfspId);
  endpointItem.dfsp_id = id;

  let updatedEndpoint = await DFSPEndpointItemModel.update(epId, endpointItem);
  return updatedEndpoint;
};

exports.deleteDFSPEndpoint = async function (envId, dfspId, epId) {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);
  await DFSPEndpointItemModel.findObjectById(epId);
  await DFSPEndpointItemModel.delete(epId);
};

/**
 * Validates that the dfspId belongs to the envId, and that the epId has the same direction and type as the parameters
 *
 * @param {Enum 'INGRESS' or 'EGRESS'} direction
 * @param {Enum 'IP' or 'ADDRESS'} type
 * @param {*} epId
 * @param {String} dfspId DFSP id
 * @param {Integer} envId Environment id
 */
const validateDirectionType = async (direction, type, epId, dfspId, envId) => {
  let endpoint = await exports.getDFSPEndpoint(envId, dfspId, epId);
  if (endpoint.direction !== direction) {
    throw new ValidationError(`Wrong direction ${direction}, endpoint has already ${endpoint.direction}`);
  }
  if (endpoint.type !== type) {
    throw new ValidationError(`Wrong type ${type}, endpoint has already ${endpoint.type}`);
  }
};

exports.getDFSPIngressIpEndpoint = async (envId, dfspId, epId) => {
  await validateDirectionType('INGRESS', 'IP', epId, dfspId, envId);
  return exports.getDFSPEndpoint(envId, dfspId, epId);
};

exports.updateDFSPIngressIpEndpoint = async (envId, dfspId, epId, body) => {
  if (body.direction) {
    if (body.direction !== 'INGRESS') {
      throw new ValidationError('Bad direction value');
    }
  } else {
    body.direction = 'INGRESS';
  }
  if (body.type) {
    if (body.type !== 'IP') {
      throw new ValidationError('Bad type value');
    }
  } else {
    body.type = 'IP';
  }
  await validateDirectionType('INGRESS', 'IP', epId, dfspId, envId);
  return exports.updateDFSPEndpoint(envId, dfspId, epId, body);
};

exports.deleteDFSPIngressIpEndpoint = async (envId, dfspId, epId) => {
  await validateDirectionType('INGRESS', 'IP', epId, dfspId, envId);
  return exports.deleteDFSPEndpoint(envId, dfspId, epId);
};

exports.getDFSPEgressIpEndpoint = async (envId, dfspId, epId) => {
  await validateDirectionType('EGRESS', 'IP', epId, dfspId, envId);
  return exports.getDFSPEndpoint(envId, dfspId, epId);
};

exports.updateDFSPEgressIpEndpoint = async (envId, dfspId, epId, body) => {
  if (body.direction) {
    if (body.direction !== 'EGRESS') {
      throw new ValidationError('Bad direction value');
    }
  } else {
    body.direction = 'EGRESS';
  }
  if (body.type) {
    if (body.type !== 'IP') {
      throw new ValidationError('Bad type value');
    }
  } else {
    body.type = 'IP';
  }
  await validateDirectionType('EGRESS', 'IP', epId, dfspId, envId);
  return exports.updateDFSPEndpoint(envId, dfspId, epId, body);
};

exports.deleteDFSPEgressIpEndpoint = async (envId, dfspId, epId) => {
  await validateDirectionType('EGRESS', 'IP', epId, dfspId, envId);
  return exports.deleteDFSPEndpoint(envId, dfspId, epId);
};

exports.getDFSPIngressUrlEndpoint = async (envId, dfspId, epId) => {
  await validateDirectionType('INGRESS', 'URL', epId, dfspId, envId);
  return exports.getDFSPEndpoint(envId, dfspId, epId);
};

exports.updateDFSPIngressUrlEndpoint = async (envId, dfspId, epId, body) => {
  if (body.direction) {
    if (body.direction !== 'INGRESS') {
      throw new ValidationError('Bad direction value');
    }
  } else {
    body.direction = 'INGRESS';
  }
  if (body.type) {
    if (body.type !== 'URL') {
      throw new ValidationError('Bad type value');
    }
  } else {
    body.type = 'URL';
  }
  await validateDirectionType('INGRESS', 'URL', epId, dfspId, envId);
  return exports.updateDFSPEndpoint(envId, dfspId, epId, body);
};

exports.deleteDFSPIngressUrlEndpoint = async (envId, dfspId, epId) => {
  await validateDirectionType('INGRESS', 'URL', epId, dfspId, envId);
  return exports.deleteDFSPEndpoint(envId, dfspId, epId);
};
