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
const ServerCertsService = require('../service/ServerCertsService');

exports.createDfspServerCerts = function createDfspServerCerts (req, res, next) {
  const envId = req.swagger.params.envId.value;
  const dfspId = req.swagger.params.dfspId.value;

  const body = req.swagger.params.body.value;
  ServerCertsService.createDfspServerCerts(envId, dfspId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.updateDfspServerCerts = function updateDfspServerCerts (req, res, next) {
  const envId = req.swagger.params.envId.value;
  const dfspId = req.swagger.params.dfspId.value;

  const body = req.swagger.params.body.value;
  ServerCertsService.updateDfspServerCerts(envId, dfspId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDfspServerCerts = function getDfspServerCerts (req, res, next) {
  const envId = req.swagger.params.envId.value;
  const dfspId = req.swagger.params.dfspId.value;

  ServerCertsService.getDfspServerCerts(envId, dfspId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getAllDfspServerCerts = function getAllDfspServerCerts (req, res, next) {
  const envId = req.swagger.params.envId.value;

  ServerCertsService.getAllDfspServerCerts(envId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteDfspServerCerts = function deleteDfspServerCerts (req, res, next) {
  const envId = req.swagger.params.envId.value;
  const dfspId = req.swagger.params.dfspId.value;

  ServerCertsService.deleteDfspServerCerts(envId, dfspId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};
