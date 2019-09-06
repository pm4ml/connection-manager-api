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
const HubEndpointItemModel = require('../models/HubEndpointItemModel');
const { validateIPAddressInput, validatePorts, validateURLInput } = require('../utils/formatValidator');
const ValidationError = require('../errors/ValidationError');

/**
 * Creates a HubEndpoint, used by the createHubEgressIP and createHubIngressIP methods
 *
 * @param {String|Integer} envId Environment id
 * @param {IPEntry} body IPEntry
 * @param {String{'EGRESS'|'INGRESS'}} direction
 */
const createHubIp = async function (envId, body, direction) {
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
    envId: envId,
    direction: direction,
  };
  return endpointItem;
};

/**
 * Adds a new IP entry to the Hub Egress endpoint
 *
 * envId String ID of environment
 * body InputIP Hub egress IP
 * returns EndPointIp
 **/
exports.createHubEgressIp = async function (envId, body) {
  let endpointItem = await createHubIp(envId, body, 'EGRESS');
  let id = await HubEndpointItemModel.create(endpointItem);
  return HubEndpointItemModel.findObjectById(id);
};

/**
 * Adds a new IP entry to the Hub Ingress endpoint
 *
 * envId String ID of environment
 * body InputIP Hub ingress IP
 * returns EndPointIp
 **/
exports.createHubIngressIp = async function (envId, body) {
  let endpointItem = await createHubIp(envId, body, 'INGRESS');
  let id = await HubEndpointItemModel.create(endpointItem);
  return HubEndpointItemModel.findObjectById(id);
};

/**
 * returns EndPointIp
 */
exports.getHubEgressIps = async function getHubEgressIp (envId) {
  return HubEndpointItemModel.findObjectByDirectionType('EGRESS', 'IP', envId);
};

/**
 * returns EndPointIp
 */
exports.getHubIngressIps = async function getHubIngressIps (envId) {
  return HubEndpointItemModel.findObjectByDirectionType('INGRESS', 'IP', envId);
};

/**
 * Set the Hub Ingress URL
 * The Hub operator sends the ingress URL
 *
 * envId String ID of environment
 * body InputURL Hub ingress URL
 * returns EndPointConfigItem
 **/
exports.createHubIngressUrl = async function (envId, body) {
  let inputURLAddress = body.value;
  if (!inputURLAddress.url) {
    throw new ValidationError('No URL received');
  }
  validateURLInput(inputURLAddress.url);

  let endpointItem = {
    state: 'NEW',
    type: 'URL',
    value: JSON.stringify(inputURLAddress),
    envId: envId,
    direction: 'INGRESS',
  };
  let id = await HubEndpointItemModel.create(endpointItem);
  return HubEndpointItemModel.findObjectById(id);
};

exports.getHubIngressUrls = async function getHubIngressUrls (envId) {
  return HubEndpointItemModel.findObjectByDirectionType('INGRESS', 'URL', envId);
};

exports.getHubEndpoint = async function (envId, epId) {
  return HubEndpointItemModel.findObjectById(epId);
};

exports.getHubEndpoints = async function (envId) {
  return HubEndpointItemModel.findObjectAll(envId);
};

/**
 *
 */
exports.updateHubEndpoint = async function (envId, epId, body) {
  await HubEndpointItemModel.findObjectById(epId);
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
  let updatedEndpoint = await HubEndpointItemModel.update(epId, endpointItem);
  return updatedEndpoint;
};

exports.deleteHubEndpoint = async function (envId, epId) {
  await HubEndpointItemModel.findObjectById(epId);
  await HubEndpointItemModel.delete(epId);
};

/**
 * Validates that the epId belongs to the envId, and that the epId has the same direction and type as the parameters
 *
 * @param {Enum 'INGRESS' or 'EGRESS'} direction
 * @param {Enum 'IP' or 'ADDRESS'} type
 * @param {*} epId
 * @param {*} envId
 */
const validateDirectionType = async (direction, type, epId, envId) => {
  let endpoint = await exports.getHubEndpoint(envId, epId);
  if (endpoint.direction !== direction) {
    throw new ValidationError(`Wrong direction ${direction}, endpoint has already ${endpoint.direction}`);
  }
  if (endpoint.type !== type) {
    throw new ValidationError(`Wrong type ${type}, endpoint has already ${endpoint.type}`);
  }
};

exports.getHubIngressIpEndpoint = async (envId, epId) => {
  await validateDirectionType('INGRESS', 'IP', epId, envId);
  return exports.getHubEndpoint(envId, epId);
};

exports.updateHubIngressIpEndpoint = async (envId, epId, body) => {
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
  await validateDirectionType('INGRESS', 'IP', epId, envId);
  return exports.updateHubEndpoint(envId, epId, body);
};

exports.deleteHubIngressIpEndpoint = async (envId, epId) => {
  await validateDirectionType('INGRESS', 'IP', epId, envId);
  return exports.deleteHubEndpoint(envId, epId);
};

exports.getHubEgressIpEndpoint = async (envId, epId) => {
  await validateDirectionType('EGRESS', 'IP', epId, envId);
  return exports.getHubEndpoint(envId, epId);
};

exports.updateHubEgressIpEndpoint = async (envId, epId, body) => {
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
  await validateDirectionType('EGRESS', 'IP', epId, envId);
  return exports.updateHubEndpoint(envId, epId, body);
};

exports.deleteHubEgressIpEndpoint = async (envId, epId) => {
  await validateDirectionType('EGRESS', 'IP', epId, envId);
  return exports.deleteHubEndpoint(envId, epId);
};

exports.getHubIngressUrlEndpoint = async (envId, epId) => {
  await validateDirectionType('INGRESS', 'URL', epId, envId);
  return exports.getHubEndpoint(envId, epId);
};

exports.updateHubIngressUrlEndpoint = async (envId, epId, body) => {
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
  await validateDirectionType('INGRESS', 'URL', epId, envId);
  return exports.updateHubEndpoint(envId, epId, body);
};

exports.deleteHubIngressUrlEndpoint = async (envId, epId) => {
  await validateDirectionType('INGRESS', 'URL', epId, envId);
  return exports.deleteHubEndpoint(envId, epId);
};
