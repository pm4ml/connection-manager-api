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
var DfspNetworkConfig = require('../service/DfspNetworkConfigService');

exports.getEnvironmentDfspStatus = function getEnvironmentDfspStatus (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  var dfspId = req.swagger.params['dfspId'].value;
  DfspNetworkConfig.getEnvironmentDfspStatus(envId, dfspId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.createDFSPEgressIp = function createDFSPEgressIp (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  var dfspId = req.swagger.params['dfspId'].value;
  var body = req.swagger.params['body'].value;
  DfspNetworkConfig.createDFSPEgressIp(envId, dfspId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.createDFSPIngressIp = function createDFSPIngressIp (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  var dfspId = req.swagger.params['dfspId'].value;
  var body = req.swagger.params['body'].value;
  DfspNetworkConfig.createDFSPIngressIp(envId, dfspId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.createDFSPIngressUrl = function createDFSPIngressUrl (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  var dfspId = req.swagger.params['dfspId'].value;
  var body = req.swagger.params['body'].value;
  DfspNetworkConfig.createDFSPIngressUrl(envId, dfspId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getUnprocessedEndpointItems = function getUnprocessedEndpointItems (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  DfspNetworkConfig.getUnprocessedEndpointItems(envId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getUnprocessedDfspItems = function getUnprocessedDfspItems (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  var dfspId = req.swagger.params['dfspId'].value;
  DfspNetworkConfig.getUnprocessedDfspItems(envId, dfspId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.confirmEndpointItem = function getUnprocessedEndpointItems (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  var epId = req.swagger.params['epId'].value;
  DfspNetworkConfig.confirmEndpointItem(envId, epId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPIngressUrls = function getDFSPIngressUrls (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  var dfspId = req.swagger.params['dfspId'].value;
  DfspNetworkConfig.getDFSPIngressUrls(envId, dfspId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPIngressIps = function getDFSPIngressIps (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  var dfspId = req.swagger.params['dfspId'].value;
  DfspNetworkConfig.getDFSPIngressIps(envId, dfspId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPEgressIps = function getDFSPEgressIps (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  var dfspId = req.swagger.params['dfspId'].value;
  DfspNetworkConfig.getDFSPEgressIps(envId, dfspId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.updateDFSPEndpoint = function updateDFSPEndpoint (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  var dfspId = req.swagger.params['dfspId'].value;
  var epId = req.swagger.params['epId'].value;
  var body = req.swagger.params['body'].value;
  DfspNetworkConfig.updateDFSPEndpoint(envId, dfspId, epId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteDFSPEndpoint = function deleteDFSPEndpoint (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  var dfspId = req.swagger.params['dfspId'].value;
  var epId = req.swagger.params['epId'].value;
  DfspNetworkConfig.deleteDFSPEndpoint(envId, dfspId, epId)
    .then(function (response) {
      utils.writeJson(res, response, 204);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPEndpoints = function getDFSPEndpoints (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  var dfspId = req.swagger.params['dfspId'].value;
  DfspNetworkConfig.getDFSPEndpoints(envId, dfspId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPEndpoint = function getDFSPEndpoint (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  var dfspId = req.swagger.params['dfspId'].value;
  var epId = req.swagger.params['epId'].value;
  DfspNetworkConfig.getDFSPEndpoint(envId, dfspId, epId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPIngressIpEndpoint = (req, res, next) => {
  var envId = req.swagger.params['envId'].value;
  var dfspId = req.swagger.params['dfspId'].value;
  var epId = req.swagger.params['epId'].value;
  DfspNetworkConfig.getDFSPIngressIpEndpoint(envId, dfspId, epId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.updateDFSPIngressIpEndpoint = (req, res, next) => {
  var envId = req.swagger.params['envId'].value;
  var dfspId = req.swagger.params['dfspId'].value;
  var epId = req.swagger.params['epId'].value;
  var body = req.swagger.params['body'].value;
  DfspNetworkConfig.updateDFSPIngressIpEndpoint(envId, dfspId, epId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteDFSPIngressIpEndpoint = (req, res, next) => {
  var envId = req.swagger.params['envId'].value;
  var dfspId = req.swagger.params['dfspId'].value;
  var epId = req.swagger.params['epId'].value;
  DfspNetworkConfig.deleteDFSPIngressIpEndpoint(envId, dfspId, epId)
    .then(function (response) {
      utils.writeJson(res, response, 204);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPEgressIpEndpoint = (req, res, next) => {
  var envId = req.swagger.params['envId'].value;
  var dfspId = req.swagger.params['dfspId'].value;
  var epId = req.swagger.params['epId'].value;
  DfspNetworkConfig.getDFSPEgressIpEndpoint(envId, dfspId, epId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.updateDFSPEgressIpEndpoint = (req, res, next) => {
  var envId = req.swagger.params['envId'].value;
  var dfspId = req.swagger.params['dfspId'].value;
  var epId = req.swagger.params['epId'].value;
  var body = req.swagger.params['body'].value;
  DfspNetworkConfig.updateDFSPEgressIpEndpoint(envId, dfspId, epId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteDFSPEgressIpEndpoint = (req, res, next) => {
  var envId = req.swagger.params['envId'].value;
  var dfspId = req.swagger.params['dfspId'].value;
  var epId = req.swagger.params['epId'].value;
  DfspNetworkConfig.deleteDFSPEgressIpEndpoint(envId, dfspId, epId)
    .then(function (response) {
      utils.writeJson(res, response, 204);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPIngressUrlEndpoint = (req, res, next) => {
  var envId = req.swagger.params['envId'].value;
  var dfspId = req.swagger.params['dfspId'].value;
  var epId = req.swagger.params['epId'].value;
  DfspNetworkConfig.getDFSPIngressUrlEndpoint(envId, dfspId, epId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.updateDFSPIngressUrlEndpoint = (req, res, next) => {
  var envId = req.swagger.params['envId'].value;
  var dfspId = req.swagger.params['dfspId'].value;
  var epId = req.swagger.params['epId'].value;
  var body = req.swagger.params['body'].value;
  DfspNetworkConfig.updateDFSPIngressUrlEndpoint(envId, dfspId, epId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteDFSPIngressUrlEndpoint = (req, res, next) => {
  var envId = req.swagger.params['envId'].value;
  var dfspId = req.swagger.params['dfspId'].value;
  var epId = req.swagger.params['epId'].value;
  DfspNetworkConfig.deleteDFSPIngressUrlEndpoint(envId, dfspId, epId)
    .then(function (response) {
      utils.writeJson(res, response, 204);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};
