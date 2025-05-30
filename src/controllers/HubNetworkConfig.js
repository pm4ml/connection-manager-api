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
const { getRequestData } = require('../utils/request.js');

exports.createHubEgressIp = (req, res, next) => {
  const { body } = getRequestData(req);
  HubNetworkConfig.createHubEgressIp(req.context, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.createHubIngressIp = (req, res, next) => {
  const { body } = getRequestData(req);
  HubNetworkConfig.createHubIngressIp(req.context, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.createHubIngressUrl = (req, res, next) => {
  const { body } = getRequestData(req);
  HubNetworkConfig.createHubIngressUrl(req.context, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getHubIngressUrls = (req, res, next) => {
  HubNetworkConfig.getHubIngressUrls(req.context)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getHubIngressIps = (req, res, next) => {
  HubNetworkConfig.getHubIngressIps(req.context)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getHubEgressIps = (req, res, next) => {
  HubNetworkConfig.getHubEgressIps(req.context)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.updateHubEndpoint = (req, res, next) => {
  const { body, params: { epId } } = getRequestData(req);
  HubNetworkConfig.updateHubEndpoint(req.context, epId, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteHubEndpoint = (req, res, next) => {
  const { params: { epId } } = getRequestData(req);
  HubNetworkConfig.deleteHubEndpoint(req.context, epId)
    .then(response => {
      utils.writeJson(res, response, 204);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getHubEndpoints = (req, res, next) => {
  HubNetworkConfig.getHubEndpoints(req.context)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getHubEndpoint = (req, res, next) => {
  const { params: { epId } } = getRequestData(req);
  HubNetworkConfig.getHubEndpoint(req.context, epId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getHubIngressIpEndpoint = (req, res, next) => {
  const { params: { epId } } = getRequestData(req);
  HubNetworkConfig.getHubIngressIpEndpoint(req.context, epId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.updateHubIngressIpEndpoint = (req, res, next) => {
  const { body, params: { epId } } = getRequestData(req);
  HubNetworkConfig.updateHubIngressIpEndpoint(req.context, epId, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteHubIngressIpEndpoint = (req, res, next) => {
  const { params: { epId } } = getRequestData(req);
  HubNetworkConfig.deleteHubIngressIpEndpoint(req.context, epId)
    .then(response => {
      utils.writeJson(res, response, 204);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getHubEgressIpEndpoint = (req, res, next) => {
  const { params: { epId } } = getRequestData(req);
  HubNetworkConfig.getHubEgressIpEndpoint(req.context, epId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.updateHubEgressIpEndpoint = (req, res, next) => {
  const { body, params: { epId } } = getRequestData(req);
  HubNetworkConfig.updateHubEgressIpEndpoint(req.context, epId, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteHubEgressIpEndpoint = (req, res, next) => {
  const { params: { epId } } = getRequestData(req);
  HubNetworkConfig.deleteHubEgressIpEndpoint(req.context, epId)
    .then(response => {
      utils.writeJson(res, response, 204);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getHubIngressUrlEndpoint = (req, res, next) => {
  const { params: { epId } } = getRequestData(req);
  HubNetworkConfig.getHubIngressUrlEndpoint(req.context, epId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.updateHubIngressUrlEndpoint = (req, res, next) => {
  const { body, params: { epId } } = getRequestData(req);
  HubNetworkConfig.updateHubIngressUrlEndpoint(req.context, epId, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteHubIngressUrlEndpoint = (req, res, next) => {
  const { params: { epId } } = getRequestData(req);
  HubNetworkConfig.deleteHubIngressUrlEndpoint(req.context, epId)
    .then(response => {
      utils.writeJson(res, response, 204);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};
