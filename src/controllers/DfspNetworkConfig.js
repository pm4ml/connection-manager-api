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

exports.getDfspStatus = (req, res, next, dfspId) => {
  DfspNetworkConfig.getDfspStatus(req.context, dfspId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.createDFSPEgress = (req, res, next, body, dfspId) => {
  DfspNetworkConfig.createDFSPEgress(req.context, dfspId, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPEgress = (req, res, next, dfspId) => {
  DfspNetworkConfig.getDFSPEgress(req.context, dfspId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.createDFSPEgressIp = (req, res, next, body, dfspId) => {
  DfspNetworkConfig.createDFSPEgressIp(req.context, dfspId, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.createDFSPIngressIp = (req, res, next, body, dfspId) => {
  DfspNetworkConfig.createDFSPIngressIp(req.context, dfspId, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.createDFSPIngressUrl = (req, res, next, body, dfspId) => {
  DfspNetworkConfig.createDFSPIngressUrl(req.context, dfspId, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getUnprocessedEndpointItems = (req, res, next) => {
  DfspNetworkConfig.getUnprocessedEndpointItems(req.context)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getUnprocessedDfspItems = (req, res, next, dfspId) => {
  DfspNetworkConfig.getUnprocessedDfspItems(req.context, dfspId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.confirmEndpointItem = (req, res, next, dfspId, epId) => {
  DfspNetworkConfig.confirmEndpointItem(req.context, dfspId, epId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPIngressUrls = (req, res, next, dfspId) => {
  DfspNetworkConfig.getDFSPIngressUrls(req.context, dfspId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPIngressIps = (req, res, next, dfspId) => {
  DfspNetworkConfig.getDFSPIngressIps(req.context, dfspId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPEgressIps = (req, res, next, dfspId) => {
  DfspNetworkConfig.getDFSPEgressIps(req.context, dfspId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.updateDFSPEndpoint = (req, res, next, body, dfspId, epId) => {
  DfspNetworkConfig.updateDFSPEndpoint(req.context, dfspId, epId, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteDFSPEndpoint = (req, res, next, dfspId, epId) => {
  DfspNetworkConfig.deleteDFSPEndpoint(req.context, dfspId, epId)
    .then(response => {
      utils.writeJson(res, response, 204);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPEndpoints = (req, res, next, dfspId) => {
  DfspNetworkConfig.getDFSPEndpoints(req.context, dfspId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPEndpoint = (req, res, next, dfspId, epId) => {
  DfspNetworkConfig.getDFSPEndpoint(req.context, dfspId, epId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.createDFSPIngress = (req, res, next, body, dfspId) => {
  DfspNetworkConfig.createDFSPIngress(req.context, dfspId, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPIngress = (req, res, next, dfspId) => {
  DfspNetworkConfig.getDFSPIngress(req.context, dfspId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPIngressIpEndpoint = (req, res, next, dfspId, epId) => {
  DfspNetworkConfig.getDFSPIngressIpEndpoint(req.context, dfspId, epId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.updateDFSPIngressIpEndpoint = (req, res, next, body, dfspId, epId) => {
  DfspNetworkConfig.updateDFSPIngressIpEndpoint(req.context, dfspId, epId, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteDFSPIngressIpEndpoint = (req, res, next, dfspId, epId) => {
  DfspNetworkConfig.deleteDFSPIngressIpEndpoint(req.context, dfspId, epId)
    .then(response => {
      utils.writeJson(res, response, 204);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPEgressIpEndpoint = (req, res, next, dfspId, epId) => {
  DfspNetworkConfig.getDFSPEgressIpEndpoint(req.context, dfspId, epId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.updateDFSPEgressIpEndpoint = (req, res, next, body, dfspId, epId) => {
  DfspNetworkConfig.updateDFSPEgressIpEndpoint(req.context, dfspId, epId, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteDFSPEgressIpEndpoint = (req, res, next, dfspId, epId) => {
  DfspNetworkConfig.deleteDFSPEgressIpEndpoint(req.context, dfspId, epId)
    .then(response => {
      utils.writeJson(res, response, 204);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPIngressUrlEndpoint = (req, res, next, dfspId, epId) => {
  DfspNetworkConfig.getDFSPIngressUrlEndpoint(req.context, dfspId, epId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.updateDFSPIngressUrlEndpoint = (req, res, next, body, dfspId, epId) => {
  DfspNetworkConfig.updateDFSPIngressUrlEndpoint(req.context, dfspId, epId, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteDFSPIngressUrlEndpoint = (req, res, next, dfspId, epId) => {
  DfspNetworkConfig.deleteDFSPIngressUrlEndpoint(req.context, dfspId, epId)
    .then(response => {
      utils.writeJson(res, response, 204);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

// When use such approach: uploadDfspStatesStatus = (req, res, next, body, dfspId),
// and send body as {}, it defines body as routeParam, and dfspId is undefined
exports.uploadDfspStatesStatus = (req, res) => {
  const { body } = req;
  const { dfspId } = req.openapi.pathParams;
  DfspNetworkConfig.uploadDfspStatesStatus(req.context, dfspId, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};
