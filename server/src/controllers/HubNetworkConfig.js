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

const utils = require('../utils/writer.js');
const HubNetworkConfig = require('../service/HubNetworkConfigService');

exports.createHubEgressIp = function createHubEgressIp (req, res, next, body) {
  HubNetworkConfig.createHubEgressIp(body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.createHubIngressIp = function createHubIngressIp (req, res, next, body) {
  HubNetworkConfig.createHubIngressIp(body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.createHubIngressUrl = function createHubIngressUrl (req, res, next, body) {
  HubNetworkConfig.createHubIngressUrl(body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getHubIngressUrls = function getHubIngressUrls (req, res, next) {
  HubNetworkConfig.getHubIngressUrls()
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getHubIngressIps = function getHubIngressIps (req, res, next) {
  HubNetworkConfig.getHubIngressIps()
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getHubEgressIps = function getHubEgressIps (req, res, next) {
  HubNetworkConfig.getHubEgressIps()
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.updateHubEndpoint = function updateHubEndpoint (req, res, next, body, epId) {
  HubNetworkConfig.updateHubEndpoint(epId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteHubEndpoint = function deleteHubEndpoint (req, res, next, epId) {
  HubNetworkConfig.deleteHubEndpoint(epId)
    .then(function (response) {
      utils.writeJson(res, response, 204);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getHubEndpoints = function getHubEndpoints (req, res, next) {
  HubNetworkConfig.getHubEndpoints()
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getHubEndpoint = function getHubEndpoint (req, res, next, epId) {
  HubNetworkConfig.getHubEndpoint(epId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getHubIngressIpEndpoint = (req, res, next, epId) => {
  HubNetworkConfig.getHubIngressIpEndpoint(epId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.updateHubIngressIpEndpoint = (req, res, next, body, epId) => {
  HubNetworkConfig.updateHubIngressIpEndpoint(epId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteHubIngressIpEndpoint = (req, res, next, epId) => {
  HubNetworkConfig.deleteHubIngressIpEndpoint(epId)
    .then(function (response) {
      utils.writeJson(res, response, 204);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getHubEgressIpEndpoint = (req, res, next, epId) => {
  HubNetworkConfig.getHubEgressIpEndpoint(epId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.updateHubEgressIpEndpoint = (req, res, next, body, epId) => {
  HubNetworkConfig.updateHubEgressIpEndpoint(epId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteHubEgressIpEndpoint = (req, res, next, epId) => {
  HubNetworkConfig.deleteHubEgressIpEndpoint(epId)
    .then(function (response) {
      utils.writeJson(res, response, 204);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getHubIngressUrlEndpoint = (req, res, next, epId) => {
  HubNetworkConfig.getHubIngressUrlEndpoint(epId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.updateHubIngressUrlEndpoint = (req, res, next, body, epId) => {
  HubNetworkConfig.updateHubIngressUrlEndpoint(epId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteHubIngressUrlEndpoint = (req, res, next, epId) => {
  HubNetworkConfig.deleteHubIngressUrlEndpoint(epId)
    .then(function (response) {
      utils.writeJson(res, response, 204);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};
