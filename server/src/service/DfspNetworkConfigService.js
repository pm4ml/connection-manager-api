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
 * Returns the Environment DFSP Status based on configured information for given envId and dfspId
 * envId String ID of environment
 * dfspId String ID of dfsp
 * returns inline_response_200_1
 **/
exports.getEnvironmentDfspStatus = async function (envId, dfspId) {
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
    dfsp = await DFSPModel.findByDfspId(envId, dfspId);

    // ENDPOINTS
    endpoints = await DFSPEndpointItemModel.findObjectAll(envId, dfspId);
    console.log('endpoints:');
    console.log(endpoints);
    console.log('endpoints stringify:');
    console.log(JSON.stringify(endpoints));

    // CSR
    // csrexchout = await DfspOutboundEnrollmentModel.findAllDfsp(envId, dfspId);
    //  console.log('csrexchout:');
    //  console.log(csrexchout);
    //  console.log('csrexchout stringify:');
    //  console.log(JSON.stringify(csrexchout));
    //
    //  csrexchin = await DfspInboundEnrollmentModel.findAllDfsp(envId, dfspId);
    //  console.log('csrexchin:');
    //  console.log(csrexchin);
    //  console.log('csrexchin stringify:');
    //  console.log(JSON.stringify(csrexchin));

    // CA
    //  ca = await CertificatesAuthoritiesModel.findCurrentForEnv(envId);
    //  console.log('ca:');
    //  console.log(ca);
    //  console.log('ca stringify:');
    //  console.log(JSON.stringify(ca));

    // SERVER_CERTIFICATES_EXCHANGE
    // servercerts = await DfspServerCertsModel.findByEnvIdDfspId(envId, dfspId);
    //  console.log('servercerts:');
    //  console.log(servercerts);
    //  console.log('servercerts stringify:');
    //  console.log(JSON.stringify(servercerts));

    // JWS_CERTIFICATES
    //  jwscerts = await DfspJWSCertsModel.findByEnvIdDfspId(envId, dfspId);
    //  console.log('jwscerts:');
    //  console.log(jwscerts);
    //  console.log('jwscerts stringify:');
    //  console.log(JSON.stringify(jwscerts));
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw new NotFoundError(`Status for environment: ${envId} and dfsp: ${dfspId} not found`);
    }
    throw error;
  }

  if (dfsp.id != null && dfsp.name != null) {
    const bs = envStatus.filter(phase => phase.phase == PhaseEnum.BUSINESS_SETUP);
    const s = bs[0].steps.filter(step => step.identifier == StepEnum.ID_GENERATION);
    s[0].status = StatusEnum.COMPLETED;
  }

  return envStatus;
};

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
 * @param {Integer} envId Environment id
 * @param {String} dfspId DFSP id
 * body InputIP DFSP egress IP
 * returns DFSPEndPointIp
 **/
exports.createDFSPEgressIp = async function (envId, dfspId, body) {
  const endpointItem = await createDFSPIp(envId, dfspId, body, 'EGRESS');
  const id = await DFSPEndpointItemModel.create(envId, endpointItem);
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
  const endpointItem = await createDFSPIp(envId, dfspId, body, 'INGRESS');
  const id = await DFSPEndpointItemModel.create(envId, endpointItem);
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
  const id = await DFSPEndpointItemModel.create(envId, endpointItem);
  return DFSPEndpointItemModel.findObjectById(id);
};

exports.getDFSPIngressUrls = async function getDFSPIngressUrls (envId, dfspId) {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);
  return DFSPEndpointItemModel.findObjectByDirectionType('INGRESS', 'URL', envId, dfspId);
};

exports.getUnprocessedEndpointItems = async function (envId) {
  const items = await DFSPEndpointItemModel.findAllEnvState(envId, 'NEW');
  return items;
};

exports.getUnprocessedDfspItems = async function (envId, dfspId) {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);
  const items = await DFSPEndpointItemModel.findAllDfspState(envId, dfspId, 'NEW');
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

  const endpointItem = { ...body };
  if (endpointItem.value) {
    endpointItem.value = JSON.stringify(endpointItem.value);
  }
  const id = await DFSPModel.findIdByDfspId(envId, dfspId);
  endpointItem.dfsp_id = id;

  const updatedEndpoint = await DFSPEndpointItemModel.update(epId, endpointItem);
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
  const endpoint = await exports.getDFSPEndpoint(envId, dfspId, epId);
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
