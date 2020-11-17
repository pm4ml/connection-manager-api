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
var Pki = require('../service/PkiService');

exports.createCA = function createCA (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  var body = req.swagger.params['body'].value;
  Pki.createCA(envId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.createDFSP = function createDFSP (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  var body = req.swagger.params['body'].value;
  Pki.createDFSP(envId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteDFSP = function createDFSP (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  var dfspId = req.swagger.params['dfspId'].value;
  Pki.deleteDFSP(envId, dfspId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.createEnvironment = function createEnvironment (req, res, next) {
  var body = req.swagger.params['body'].value;
  Pki.createEnvironment(body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getCurrentCARootCert = function getCurrentCARootCert (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  Pki.getCurrentCARootCert(envId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getEnvStatus = function getEnvStatus (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  Pki.getEnvStatus(envId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getEnvironmentById = function getEnvironmentById (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  Pki.getEnvironmentById(envId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getEnvironments = function getEnvironments (req, res, next) {
  Pki.getEnvironments()
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteEnvironment = function deleteEnvironment (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  Pki.deleteEnvironment(envId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getEnvironmentDFSPs = function getDFSPs (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  Pki.getEnvironmentDFSPs(envId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.setDFSPca = function setDFSPca (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  var dfspId = req.swagger.params['dfspId'].value;
  var body = req.swagger.params['body'].value;
  Pki.setDFSPca(envId, dfspId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPca = function getDFSPca (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  var dfspId = req.swagger.params['dfspId'].value;
  Pki.getDFSPca(envId, dfspId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.updateDFSP = (req, res, next) => {
  var envId = req.swagger.params['envId'].value;
  var dfspId = req.swagger.params['dfspId'].value;
  var body = req.swagger.params['body'].value;
  Pki.updateDFSP(envId, dfspId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDfspsByMonetaryZones = (req, res, next) => {
  var envId = req.swagger.params['envId'].value;
  var monetaryZoneId = req.swagger.params['monetaryZoneId'].value;
  Pki.getDfspsByMonetaryZones(envId, monetaryZoneId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};
