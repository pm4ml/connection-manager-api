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

var utils = require('../utils/writer.js');
var HubNetworkConfig = require('../service/HubNetworkConfigService');

exports.createHubEgressIp = function createHubEgressIp (req, res, next) {
  var envId = req.swagger.params['envId'].value;

  var body = req.swagger.params['body'].value;
  HubNetworkConfig.createHubEgressIp(envId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.createHubIngressIp = function createHubIngressIp (req, res, next) {
  var envId = req.swagger.params['envId'].value;

  var body = req.swagger.params['body'].value;
  HubNetworkConfig.createHubIngressIp(envId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.createHubIngressUrl = function createHubIngressUrl (req, res, next) {
  var envId = req.swagger.params['envId'].value;

  var body = req.swagger.params['body'].value;
  HubNetworkConfig.createHubIngressUrl(envId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getHubIngressUrls = function getHubIngressUrls (req, res, next) {
  var envId = req.swagger.params['envId'].value;

  HubNetworkConfig.getHubIngressUrls(envId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getHubIngressIps = function getHubIngressIps (req, res, next) {
  var envId = req.swagger.params['envId'].value;

  HubNetworkConfig.getHubIngressIps(envId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getHubEgressIps = function getHubEgressIps (req, res, next) {
  var envId = req.swagger.params['envId'].value;

  HubNetworkConfig.getHubEgressIps(envId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.updateHubEndpoint = function updateHubEndpoint (req, res, next) {
  var envId = req.swagger.params['envId'].value;

  var epId = req.swagger.params['epId'].value;
  var body = req.swagger.params['body'].value;
  HubNetworkConfig.updateHubEndpoint(envId, epId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteHubEndpoint = function deleteHubEndpoint (req, res, next) {
  var envId = req.swagger.params['envId'].value;

  var epId = req.swagger.params['epId'].value;
  HubNetworkConfig.deleteHubEndpoint(envId, epId)
    .then(function (response) {
      utils.writeJson(res, response, 204);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getHubEndpoints = function getHubEndpoints (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  HubNetworkConfig.getHubEndpoints(envId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getHubEndpoint = function getHubEndpoint (req, res, next) {
  var envId = req.swagger.params['envId'].value;

  var epId = req.swagger.params['epId'].value;
  HubNetworkConfig.getHubEndpoint(envId, epId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getHubIngressIpEndpoint = (req, res, next) => {
  var envId = req.swagger.params['envId'].value;

  var epId = req.swagger.params['epId'].value;
  HubNetworkConfig.getHubIngressIpEndpoint(envId, epId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.updateHubIngressIpEndpoint = (req, res, next) => {
  var envId = req.swagger.params['envId'].value;

  var epId = req.swagger.params['epId'].value;
  var body = req.swagger.params['body'].value;
  HubNetworkConfig.updateHubIngressIpEndpoint(envId, epId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteHubIngressIpEndpoint = (req, res, next) => {
  var envId = req.swagger.params['envId'].value;

  var epId = req.swagger.params['epId'].value;
  HubNetworkConfig.deleteHubIngressIpEndpoint(envId, epId)
    .then(function (response) {
      utils.writeJson(res, response, 204);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getHubEgressIpEndpoint = (req, res, next) => {
  var envId = req.swagger.params['envId'].value;

  var epId = req.swagger.params['epId'].value;
  HubNetworkConfig.getHubEgressIpEndpoint(envId, epId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.updateHubEgressIpEndpoint = (req, res, next) => {
  var envId = req.swagger.params['envId'].value;

  var epId = req.swagger.params['epId'].value;
  var body = req.swagger.params['body'].value;
  HubNetworkConfig.updateHubEgressIpEndpoint(envId, epId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteHubEgressIpEndpoint = (req, res, next) => {
  var envId = req.swagger.params['envId'].value;

  var epId = req.swagger.params['epId'].value;
  HubNetworkConfig.deleteHubEgressIpEndpoint(envId, epId)
    .then(function (response) {
      utils.writeJson(res, response, 204);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getHubIngressUrlEndpoint = (req, res, next) => {
  var envId = req.swagger.params['envId'].value;

  var epId = req.swagger.params['epId'].value;
  HubNetworkConfig.getHubIngressUrlEndpoint(envId, epId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.updateHubIngressUrlEndpoint = (req, res, next) => {
  var envId = req.swagger.params['envId'].value;

  var epId = req.swagger.params['epId'].value;
  var body = req.swagger.params['body'].value;
  HubNetworkConfig.updateHubIngressUrlEndpoint(envId, epId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteHubIngressUrlEndpoint = (req, res, next) => {
  var envId = req.swagger.params['envId'].value;

  var epId = req.swagger.params['epId'].value;
  HubNetworkConfig.deleteHubIngressUrlEndpoint(envId, epId)
    .then(function (response) {
      utils.writeJson(res, response, 204);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};
