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
const DfspNetworkConfig = require('../service/DfspNetworkConfigService');

exports.getEnvironmentDfspStatus = function getEnvironmentDfspStatus (req, res, next, dfspId) {
  DfspNetworkConfig.getEnvironmentDfspStatus(dfspId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.createDFSPEgressIp = function createDFSPEgressIp (req, res, next, dfspId) {
  DfspNetworkConfig.createDFSPEgressIp(dfspId, req.body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.createDFSPIngressIp = function createDFSPIngressIp (req, res, next, dfspId) {
  DfspNetworkConfig.createDFSPIngressIp(dfspId, req.body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.createDFSPIngressUrl = function createDFSPIngressUrl (req, res, next, dfspId) {
  DfspNetworkConfig.createDFSPIngressUrl(dfspId, req.body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getUnprocessedEndpointItems = function getUnprocessedEndpointItems (req, res, next) {
  DfspNetworkConfig.getUnprocessedEndpointItems()
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getUnprocessedDfspItems = function getUnprocessedDfspItems (req, res, next, dfspId) {
  DfspNetworkConfig.getUnprocessedDfspItems(dfspId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.confirmEndpointItem = function getUnprocessedEndpointItems (req, res, next, epId) {
  DfspNetworkConfig.confirmEndpointItem(epId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPIngressUrls = function getDFSPIngressUrls (req, res, next, dfspId) {
  DfspNetworkConfig.getDFSPIngressUrls(dfspId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPIngressIps = function getDFSPIngressIps (req, res, next, dfspId) {
  DfspNetworkConfig.getDFSPIngressIps(dfspId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPEgressIps = function getDFSPEgressIps (req, res, next, dfspId) {
  DfspNetworkConfig.getDFSPEgressIps(dfspId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.updateDFSPEndpoint = function updateDFSPEndpoint (req, res, next, dfspId, epId) {
  DfspNetworkConfig.updateDFSPEndpoint(dfspId, epId, req.body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteDFSPEndpoint = function deleteDFSPEndpoint (req, res, next, dfspId, epId) {
  DfspNetworkConfig.deleteDFSPEndpoint(dfspId, epId)
    .then(function (response) {
      utils.writeJson(res, response, 204);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPEndpoints = function getDFSPEndpoints (req, res, next, dfspId) {
  DfspNetworkConfig.getDFSPEndpoints(dfspId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPEndpoint = function getDFSPEndpoint (req, res, next, dfspId, epId) {
  DfspNetworkConfig.getDFSPEndpoint(dfspId, epId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPIngressIpEndpoint = (req, res, next, dfspId, epId) => {
  DfspNetworkConfig.getDFSPIngressIpEndpoint(dfspId, epId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.updateDFSPIngressIpEndpoint = (req, res, next, dfspId, epId) => {
  DfspNetworkConfig.updateDFSPIngressIpEndpoint(dfspId, epId, req.body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteDFSPIngressIpEndpoint = (req, res, next, dfspId, epId) => {
  DfspNetworkConfig.deleteDFSPIngressIpEndpoint(dfspId, epId)
    .then(function (response) {
      utils.writeJson(res, response, 204);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPEgressIpEndpoint = (req, res, next, dfspId, epId) => {
  DfspNetworkConfig.getDFSPEgressIpEndpoint(dfspId, epId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.updateDFSPEgressIpEndpoint = (req, res, next, dfspId, epId) => {
  DfspNetworkConfig.updateDFSPEgressIpEndpoint(dfspId, epId, req.body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteDFSPEgressIpEndpoint = (req, res, next, dfspId, epId) => {
  DfspNetworkConfig.deleteDFSPEgressIpEndpoint(dfspId, epId)
    .then(function (response) {
      utils.writeJson(res, response, 204);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPIngressUrlEndpoint = (req, res, next, dfspId, epId) => {
  DfspNetworkConfig.getDFSPIngressUrlEndpoint(dfspId, epId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.updateDFSPIngressUrlEndpoint = (req, res, next, dfspId, epId) => {
  DfspNetworkConfig.updateDFSPIngressUrlEndpoint(dfspId, epId, req.body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteDFSPIngressUrlEndpoint = (req, res, next, dfspId, epId) => {
  DfspNetworkConfig.deleteDFSPIngressUrlEndpoint(dfspId, epId)
    .then(function (response) {
      utils.writeJson(res, response, 204);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};
