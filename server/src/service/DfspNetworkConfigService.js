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
const { validateIPAddressInput, validatePorts, validateURLInput } = require('../utils/formatValidator');
const ValidationError = require('../errors/ValidationError');
const NotFoundError = require('../errors/NotFoundError');
const PkiService = require('./PkiService');
const DFSPModel = require('../models/DFSPModel');
const DFSPEndpointItemModel = require('../models/DFSPEndpointItemModel');

const StatusEnum = Object.freeze({ NOT_STARTED: 'NOT_STARTED', IN_PROGRESS: 'IN_PROGRESS', COMPLETED: 'COMPLETED' });
const PhaseEnum = Object.freeze({ BUSINESS_SETUP: 'BUSINESS_SETUP', TECNICAL_SETUP: 'TECNICAL_SETUP' });
const StepEnum = Object.freeze({ ID_GENERATION: 'ID_GENERATION', ENDPOINTS: 'ENDPOINTS', CSR_EXCHANGE: 'CSR_EXCHANGE', CERTIFICATE_AUTHORITY: 'CERTIFICATE_AUTHORITY', SERVER_CERTIFICATES_EXCHANGE: 'SERVER_CERTIFICATES_EXCHANGE', JWS_CERTIFICATES: 'JWS_CERTIFICATES' });

/**
 * Returns the Environment DFSP Status based on configured information for dfspId
 * dfspId String ID of dfsp
 * returns inline_response_200_1
 **/
exports.getDfspStatus = async function (dfspId) {
  const envStatus = [
    {
      phase: 'BUSINESS_SETUP',
      steps: [
        {
          identifier: 'ID_GENERATION',
          status: 'NOT_STARTED'
        }
      ]
    },
    {
      phase: 'TECHNICAL_SETUP',
      steps: [
        {
          identifier: 'ENDPOINTS',
          status: 'NOT_STARTED'
        },
        {
          identifier: 'CSR_EXCHANGE',
          status: 'NOT_STARTED'
        },
        {
          identifier: 'CERTIFICATE_AUTHORITY',
          status: 'NOT_STARTED'
        },
        {
          identifier: 'SERVER_CERTIFICATES_EXCHANGE',
          status: 'NOT_STARTED'
        },
        {
          identifier: 'JWS_CERTIFICATES',
          status: 'NOT_STARTED'
        }
      ]
    }
  ];
  let dfsp = [];
  let endpoints = [];
  const csrexch = [];
  const csrexchin = [];
  const csrexchout = [];
  const ca = [];
  const servercerts = [];
  const jwscerts = [];

  try {
    // ID_GENERATION
    dfsp = await DFSPModel.findByDfspId(dfspId);

    // ENDPOINTS
    endpoints = await DFSPEndpointItemModel.findObjectAll(dfspId);
    console.log('endpoints:');
    console.log(endpoints);
    console.log('endpoints stringify:');
    console.log(JSON.stringify(endpoints));

    // CSR
    // csrexchout = await DfspOutboundEnrollmentModel.findAllDfsp(dfspId);
    //  console.log('csrexchout:');
    //  console.log(csrexchout);
    //  console.log('csrexchout stringify:');
    //  console.log(JSON.stringify(csrexchout));
    //
    //  csrexchin = await DfspInboundEnrollmentModel.findAllDfsp(dfspId);
    //  console.log('csrexchin:');
    //  console.log(csrexchin);
    //  console.log('csrexchin stringify:');
    //  console.log(JSON.stringify(csrexchin));

    // SERVER_CERTIFICATES_EXCHANGE
    // servercerts = await DfspServerCertsModel.findDfspId(dfspId);
    //  console.log('servercerts:');
    //  console.log(servercerts);
    //  console.log('servercerts stringify:');
    //  console.log(JSON.stringify(servercerts));

    // JWS_CERTIFICATES
    //  jwscerts = await DfspJWSCertsModel.findDfspId(dfspId);
    //  console.log('jwscerts:');
    //  console.log(jwscerts);
    //  console.log('jwscerts stringify:');
    //  console.log(JSON.stringify(jwscerts));
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw new NotFoundError(`Status for environment: dfsp: ${dfspId} not found`);
    }
    throw error;
  }

  if (dfsp.id != null && dfsp.name != null) {
    const bs = envStatus.filter(phase => phase.phase === PhaseEnum.BUSINESS_SETUP);
    const s = bs[0].steps.filter(step => step.identifier === StepEnum.ID_GENERATION);
    s[0].status = StatusEnum.COMPLETED;
  }

  return envStatus;
};

/**
 * Creates a DFSPEndpoint, used by the createDFSPEgressIP and createDFSPIngressIP methods
 *
 * @param {String} dfspId DFSP id
 * @param {IPEntry} body IPEntry
 * @param {String{'EGRESS'|'INGRESS'}} direction
 */
const createDFSPIp = async function (dfspId, body, direction) {
  await PkiService.validateDfsp(dfspId);
  const inputIpEntry = body.value;
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

  const endpointItem = {
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
 * @param {String} dfspId DFSP id
 * @param body {Object} InputIP DFSP egress IP
 * returns DFSPEndPointIp
 **/
exports.createDFSPEgressIp = async function (dfspId, body) {
  const endpointItem = await createDFSPIp(dfspId, body, 'EGRESS');
  const id = await DFSPEndpointItemModel.create(endpointItem);
  return DFSPEndpointItemModel.findObjectById(id);
};

/**
 * Adds a new IP entry to the DFSP Ingress endpoint
 *
 * @param {String} dfspId DFSP id
 * body InputIP DFSP ingress IP
 * returns DFSPEndPointIp
 **/
exports.createDFSPIngressIp = async function (dfspId, body) {
  const endpointItem = await createDFSPIp(dfspId, body, 'INGRESS');
  const id = await DFSPEndpointItemModel.create(endpointItem);
  return DFSPEndpointItemModel.findObjectById(id);
};

/**
 * returns DFSPEndPointIp
 */
exports.getDFSPEgressIps = async function getDFSPEgressIp (dfspId) {
  await PkiService.validateDfsp(dfspId);
  return DFSPEndpointItemModel.findObjectByDirectionType('EGRESS', 'IP', dfspId);
};

/**
 * returns DFSPEndPointIp
 */
exports.getDFSPIngressIps = async function getDFSPIngressIps (dfspId) {
  await PkiService.validateDfsp(dfspId);
  return DFSPEndpointItemModel.findObjectByDirectionType('INGRESS', 'IP', dfspId);
};

/**
 * Set the DFSP Ingress URL
 * The DFSP operator sends the ingress URL
 *
 * @param {String} dfspId DFSP id
 * body InputURL DFSP ingress URL
 * returns DFSPEndPointConfigItem
 **/
exports.createDFSPIngressUrl = async function (dfspId, body) {
  await PkiService.validateDfsp(dfspId);
  const inputURLAddress = body.value;
  if (!inputURLAddress.url) {
    throw new ValidationError('No URL received');
  }
  validateURLInput(inputURLAddress.url);

  const endpointItem = {
    state: 'NEW',
    type: 'URL',
    value: JSON.stringify(inputURLAddress),
    dfspId: dfspId,
    direction: 'INGRESS',
  };
  const id = await DFSPEndpointItemModel.create(endpointItem);
  return DFSPEndpointItemModel.findObjectById(id);
};

exports.getDFSPIngressUrls = async function getDFSPIngressUrls (dfspId) {
  await PkiService.validateDfsp(dfspId);
  return DFSPEndpointItemModel.findObjectByDirectionType('INGRESS', 'URL', dfspId);
};

exports.getUnprocessedEndpointItems = async function () {
  const items = await DFSPEndpointItemModel.findAllEnvState('NEW');
  return items;
};

exports.getUnprocessedDfspItems = async function (dfspId) {
  await PkiService.validateDfsp(dfspId);
  const items = await DFSPEndpointItemModel.findAllDfspState(dfspId, 'NEW');
  return items;
};

exports.confirmEndpointItem = async function (dfspId, epId, a, b, c) {
  return DFSPEndpointItemModel.update(dfspId, epId, { state: 'CONFIRMED' });
};

exports.getDFSPEndpoint = async function (dfspId, epId) {
  await PkiService.validateDfsp(dfspId);
  return DFSPEndpointItemModel.findObjectById(epId);
};

exports.getDFSPEndpoints = async function (dfspId) {
  await PkiService.validateDfsp(dfspId);
  return DFSPEndpointItemModel.findObjectAll(dfspId);
};

/**
 *
 */
exports.updateDFSPEndpoint = async function (dfspId, epId, body) {
  await PkiService.validateDfsp(dfspId);
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

  const endpointItem = { ...body };
  if (endpointItem.value) {
    endpointItem.value = JSON.stringify(endpointItem.value);
  }
  const id = await DFSPModel.findIdByDfspId(dfspId);
  endpointItem.dfsp_id = id;

  const updatedEndpoint = await DFSPEndpointItemModel.update(epId, endpointItem);
  return updatedEndpoint;
};

exports.deleteDFSPEndpoint = async function (dfspId, epId) {
  await PkiService.validateDfsp(dfspId);
  await DFSPEndpointItemModel.findObjectById(epId);
  await DFSPEndpointItemModel.delete(epId);
};

/**
 * Validates dfspId and the epId has the same direction and type as the parameters
 *
 * @param {Enum 'INGRESS' or 'EGRESS'} direction
 * @param {Enum 'IP' or 'ADDRESS'} type
 * @param {*} epId
 * @param {String} dfspId DFSP id
 */
const validateDirectionType = async (direction, type, epId, dfspId) => {
  const endpoint = await exports.getDFSPEndpoint(dfspId, epId);
  if (endpoint.direction !== direction) {
    throw new ValidationError(`Wrong direction ${direction}, endpoint has already ${endpoint.direction}`);
  }
  if (endpoint.type !== type) {
    throw new ValidationError(`Wrong type ${type}, endpoint has already ${endpoint.type}`);
  }
};

exports.getDFSPIngressIpEndpoint = async (dfspId, epId) => {
  await validateDirectionType('INGRESS', 'IP', epId, dfspId);
  return exports.getDFSPEndpoint(dfspId, epId);
};

exports.updateDFSPIngressIpEndpoint = async (dfspId, epId, body) => {
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
  await validateDirectionType('INGRESS', 'IP', epId, dfspId);
  return exports.updateDFSPEndpoint(dfspId, epId, body);
};

exports.deleteDFSPIngressIpEndpoint = async (dfspId, epId) => {
  await validateDirectionType('INGRESS', 'IP', epId, dfspId);
  return exports.deleteDFSPEndpoint(dfspId, epId);
};

exports.getDFSPEgressIpEndpoint = async (dfspId, epId) => {
  await validateDirectionType('EGRESS', 'IP', epId, dfspId);
  return exports.getDFSPEndpoint(dfspId, epId);
};

exports.updateDFSPEgressIpEndpoint = async (dfspId, epId, body) => {
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
  await validateDirectionType('EGRESS', 'IP', epId, dfspId);
  return exports.updateDFSPEndpoint(dfspId, epId, body);
};

exports.deleteDFSPEgressIpEndpoint = async (dfspId, epId) => {
  await validateDirectionType('EGRESS', 'IP', epId, dfspId);
  return exports.deleteDFSPEndpoint(dfspId, epId);
};

exports.getDFSPIngressUrlEndpoint = async (dfspId, epId) => {
  await validateDirectionType('INGRESS', 'URL', epId, dfspId);
  return exports.getDFSPEndpoint(dfspId, epId);
};

exports.updateDFSPIngressUrlEndpoint = async (dfspId, epId, body) => {
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
  await validateDirectionType('INGRESS', 'URL', epId, dfspId);
  return exports.updateDFSPEndpoint(dfspId, epId, body);
};

exports.deleteDFSPIngressUrlEndpoint = async (dfspId, epId) => {
  await validateDirectionType('INGRESS', 'URL', epId, dfspId);
  return exports.deleteDFSPEndpoint(dfspId, epId);
};
