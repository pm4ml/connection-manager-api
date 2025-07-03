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
const { getRequestData } = require('../utils/request.js');

exports.getDfspStatus = (req, res, next) => {
  const { params: { dfspId } } = getRequestData(req);
  DfspNetworkConfig.getDfspStatus(req.context, dfspId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.createDFSPEgress = (req, res, next) => {
  const { body, params: { dfspId } } = getRequestData(req);
  DfspNetworkConfig.createDFSPEgress(req.context, dfspId, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPEgress = (req, res, next) => {
  const { params: { dfspId } } = getRequestData(req);
  DfspNetworkConfig.getDFSPEgress(req.context, dfspId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.createDFSPEgressIp = (req, res, next) => {
  const { body, params: { dfspId } } = getRequestData(req);
  DfspNetworkConfig.createDFSPEgressIp(req.context, dfspId, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.createDFSPIngressIp = (req, res, next) => {
  const { body, params: { dfspId } } = getRequestData(req);
  DfspNetworkConfig.createDFSPIngressIp(req.context, dfspId, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.createDFSPIngressUrl = (req, res, next) => {
  const { body, params: { dfspId } } = getRequestData(req);
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

exports.getUnprocessedDfspItems = (req, res, next) => {
  const { params: { dfspId } } = getRequestData(req);
  DfspNetworkConfig.getUnprocessedDfspItems(req.context, dfspId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.confirmEndpointItem = (req, res, next) => {
  const { params: { dfspId, epId } } = getRequestData(req);
  DfspNetworkConfig.confirmEndpointItem(req.context, dfspId, epId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPIngressUrls = (req, res, next) => {
  const { params: { dfspId } } = getRequestData(req);
  DfspNetworkConfig.getDFSPIngressUrls(req.context, dfspId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPIngressIps = (req, res, next) => {
  const { params: { dfspId } } = getRequestData(req);
  DfspNetworkConfig.getDFSPIngressIps(req.context, dfspId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPEgressIps = (req, res, next) => {
  const { params: { dfspId } } = getRequestData(req);
  DfspNetworkConfig.getDFSPEgressIps(req.context, dfspId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.updateDFSPEndpoint = (req, res, next) => {
  const { body, params: { dfspId, epId } } = getRequestData(req);
  DfspNetworkConfig.updateDFSPEndpoint(req.context, dfspId, epId, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteDFSPEndpoint = (req, res, next) => {
  const { params: { dfspId, epId } } = getRequestData(req);
  DfspNetworkConfig.deleteDFSPEndpoint(req.context, dfspId, epId)
    .then(response => {
      utils.writeJson(res, response, 204);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPEndpoints = (req, res, next) => {
  const { params: { dfspId } } = getRequestData(req);
  DfspNetworkConfig.getDFSPEndpoints(req.context, dfspId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPEndpoint = (req, res, next) => {
  const { params: { dfspId, epId } } = getRequestData(req);
  DfspNetworkConfig.getDFSPEndpoint(req.context, dfspId, epId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.createDFSPIngress = (req, res, next) => {
  const { body, params: { dfspId } } = getRequestData(req);
  DfspNetworkConfig.createDFSPIngress(req.context, dfspId, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPIngress = (req, res, next) => {
  const { params: { dfspId } } = getRequestData(req);
  DfspNetworkConfig.getDFSPIngress(req.context, dfspId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPIngressIpEndpoint = (req, res, next) => {
  const { params: { dfspId, epId } } = getRequestData(req);
  DfspNetworkConfig.getDFSPIngressIpEndpoint(req.context, dfspId, epId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.updateDFSPIngressIpEndpoint = (req, res, next) => {
  const { body, params: { dfspId, epId } } = getRequestData(req);
  DfspNetworkConfig.updateDFSPIngressIpEndpoint(req.context, dfspId, epId, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteDFSPIngressIpEndpoint = (req, res, next) => {
  const { dfspId, epId } = getRequestData(req).params;
  DfspNetworkConfig.deleteDFSPIngressIpEndpoint(req.context, dfspId, epId)
    .then(response => {
      utils.writeJson(res, response, 204);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPEgressIpEndpoint = (req, res, next) => {
  const { dfspId, epId } = getRequestData(req).params;
  DfspNetworkConfig.getDFSPEgressIpEndpoint(req.context, dfspId, epId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.updateDFSPEgressIpEndpoint = (req, res, next) => {
  const { body, params: { dfspId, epId } } = getRequestData(req);
  DfspNetworkConfig.updateDFSPEgressIpEndpoint(req.context, dfspId, epId, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteDFSPEgressIpEndpoint = (req, res, next) => {
  const { dfspId, epId } = getRequestData(req).params;
  DfspNetworkConfig.deleteDFSPEgressIpEndpoint(req.context, dfspId, epId)
    .then(response => {
      utils.writeJson(res, response, 204);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPIngressUrlEndpoint = (req, res, next) => {
  const { dfspId, epId } = getRequestData(req).params;
  DfspNetworkConfig.getDFSPIngressUrlEndpoint(req.context, dfspId, epId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.updateDFSPIngressUrlEndpoint = (req, res, next) => {
  const { body, params: { dfspId , epId } } = getRequestData(req);
  DfspNetworkConfig.updateDFSPIngressUrlEndpoint(req.context, dfspId, epId, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteDFSPIngressUrlEndpoint = (req, res, next) => {
  const { dfspId, epId } = getRequestData(req).params;
  DfspNetworkConfig.deleteDFSPIngressUrlEndpoint(req.context, dfspId, epId)
    .then(response => {
      utils.writeJson(res, response, 204);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.uploadDfspStatesStatus = (req, res) => {
  const { body, params: { dfspId } } = getRequestData(req);
  DfspNetworkConfig.uploadDfspStatesStatus(req.context, dfspId, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.handleGetDfspsStatesStatus = (req, res, next) => {
  // Phase 1: Mock response for API contract validation
  const mockResponse = {
    dfsps: [
      {
        dfspId: "test-zmw-dfsp",
        pingStatus: "TIMED_OUT",
        lastUpdatedPingStatusAt: "2025-01-03T11:03:42.000Z",
        statesStatus: {
          PEER_JWS: {
            status: "completed",
            stateDescription: "Peer JWS certificate configured",
            errorDescription: null,
            lastUpdated: "2025-01-03T10:30:15.000Z"
          },
          DFSP_JWS: {
            status: "inProgress",
            stateDescription: "DFSP JWS certificate being generated",
            errorDescription: null,
            lastUpdated: "2025-01-03T10:25:30.000Z"
          },
          DFSP_CA: {
            status: "completed",
            stateDescription: "DFSP CA certificate installed",
            errorDescription: null,
            lastUpdated: "2025-01-03T09:45:22.000Z"
          },
          DFSP_SERVER_CERT: {
            status: "pending",
            stateDescription: "Server certificate setup pending",
            errorDescription: null,
            lastUpdated: "2025-01-03T09:00:00.000Z"
          },
          DFSP_CLIENT_CERT: {
            status: "inError",
            stateDescription: "Client certificate generation failed",
            errorDescription: "Certificate validation failed due to invalid CSR parameters",
            lastUpdated: "2025-01-03T08:30:45.000Z"
          },
          HUB_CA: {
            status: "completed",
            stateDescription: "Hub CA certificate received",
            errorDescription: null,
            lastUpdated: "2025-01-03T08:00:10.000Z"
          },
          HUB_CERT: {
            status: "completed",
            stateDescription: "Hub certificate validated",
            errorDescription: null,
            lastUpdated: "2025-01-03T08:00:15.000Z"
          },
          HUB_CLIENT_CERT: {
            status: "completed",
            stateDescription: "Hub client certificate configured",
            errorDescription: null,
            lastUpdated: "2025-01-03T08:00:20.000Z"
          },
          ENDPOINT_CONFIG: {
            status: "inProgress",
            stateDescription: "Endpoint configuration in progress",
            errorDescription: null,
            lastUpdated: "2025-01-03T07:45:30.000Z"
          },
          UPLOAD_PEER_JWS: {
            status: "pending",
            stateDescription: "Peer JWS upload pending",
            errorDescription: null,
            lastUpdated: "2025-01-03T07:30:00.000Z"
          }
        }
      },
      {
        dfspId: "test-mw-dfsp",
        pingStatus: "SUCCESS",
        lastUpdatedPingStatusAt: "2025-01-03T11:05:15.000Z",
        statesStatus: {
          PEER_JWS: {
            status: "completed",
            stateDescription: "Peer JWS certificate configured",
            errorDescription: null,
            lastUpdated: "2025-01-03T11:00:00.000Z"
          },
          DFSP_JWS: {
            status: "completed",
            stateDescription: "DFSP JWS certificate ready",
            errorDescription: null,
            lastUpdated: "2025-01-03T10:55:00.000Z"
          },
          DFSP_CA: {
            status: "completed",
            stateDescription: "DFSP CA certificate installed",
            errorDescription: null,
            lastUpdated: "2025-01-03T10:50:00.000Z"
          },
          DFSP_SERVER_CERT: {
            status: "completed",
            stateDescription: "Server certificate configured",
            errorDescription: null,
            lastUpdated: "2025-01-03T10:45:00.000Z"
          },
          DFSP_CLIENT_CERT: {
            status: "completed",
            stateDescription: "Client certificate configured",
            errorDescription: null,
            lastUpdated: "2025-01-03T10:40:00.000Z"
          },
          HUB_CA: {
            status: "completed",
            stateDescription: "Hub CA certificate received",
            errorDescription: null,
            lastUpdated: "2025-01-03T10:35:00.000Z"
          },
          HUB_CERT: {
            status: "completed",
            stateDescription: "Hub certificate validated",
            errorDescription: null,
            lastUpdated: "2025-01-03T10:30:00.000Z"
          },
          HUB_CLIENT_CERT: {
            status: "completed",
            stateDescription: "Hub client certificate configured",
            errorDescription: null,
            lastUpdated: "2025-01-03T10:25:00.000Z"
          },
          ENDPOINT_CONFIG: {
            status: "completed",
            stateDescription: "Endpoint configuration complete",
            errorDescription: null,
            lastUpdated: "2025-01-03T10:20:00.000Z"
          },
          UPLOAD_PEER_JWS: {
            status: "completed",
            stateDescription: "Peer JWS uploaded successfully",
            errorDescription: null,
            lastUpdated: "2025-01-03T10:15:00.000Z"
          }
        }
      },
      {
        dfspId: "test-pm-dfsp",
        pingStatus: "PING_ERROR",
        lastUpdatedPingStatusAt: "2025-01-03T11:02:30.000Z",
        statesStatus: null
      },
      {
        dfspId: "test-not-reachable-dfsp",
        pingStatus: "NOT_REACHABLE",
        lastUpdatedPingStatusAt: "2025-01-03T11:00:15.000Z",
        statesStatus: {
          PEER_JWS: {
            status: "pending",
            stateDescription: "Peer JWS configuration pending",
            errorDescription: null,
            lastUpdated: "2025-01-03T10:00:00.000Z"
          },
          DFSP_JWS: {
            status: "pending",
            stateDescription: "DFSP JWS configuration pending",
            errorDescription: null,
            lastUpdated: "2025-01-03T10:00:00.000Z"
          },
          DFSP_CA: {
            status: "pending",
            stateDescription: "DFSP CA configuration pending",
            errorDescription: null,
            lastUpdated: "2025-01-03T10:00:00.000Z"
          },
          DFSP_SERVER_CERT: {
            status: "pending",
            stateDescription: "Server certificate setup pending",
            errorDescription: null,
            lastUpdated: "2025-01-03T10:00:00.000Z"
          },
          DFSP_CLIENT_CERT: {
            status: "pending",
            stateDescription: "Client certificate setup pending",
            errorDescription: null,
            lastUpdated: "2025-01-03T10:00:00.000Z"
          },
          HUB_CA: {
            status: "pending",
            stateDescription: "Hub CA setup pending",
            errorDescription: null,
            lastUpdated: "2025-01-03T10:00:00.000Z"
          },
          HUB_CERT: {
            status: "pending",
            stateDescription: "Hub certificate setup pending",
            errorDescription: null,
            lastUpdated: "2025-01-03T10:00:00.000Z"
          },
          HUB_CLIENT_CERT: {
            status: "pending",
            stateDescription: "Hub client certificate setup pending",
            errorDescription: null,
            lastUpdated: "2025-01-03T10:00:00.000Z"
          },
          ENDPOINT_CONFIG: {
            status: "pending",
            stateDescription: "Endpoint configuration pending",
            errorDescription: null,
            lastUpdated: "2025-01-03T10:00:00.000Z"
          },
          UPLOAD_PEER_JWS: {
            status: "pending",
            stateDescription: "Peer JWS upload pending",
            errorDescription: null,
            lastUpdated: "2025-01-03T10:00:00.000Z"
          }
        }
      }
    ]
  };

  utils.writeJson(res, mockResponse);
};
