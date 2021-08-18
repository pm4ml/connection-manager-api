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
const HubCAService = require('../service/HubCAService');

exports.createHubCA = function (req, res, next) {
  const envId = req.swagger.params.envId.value;
  const body = req.swagger.params.body.value;
  HubCAService.createHubCA(envId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getHubCAs = function (req, res, next) {
  const envId = req.swagger.params.envId.value;
  HubCAService.getHubCAs(envId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getHubCA = function (req, res, next) {
  const envId = req.swagger.params.envId.value;
  const hubCAId = req.swagger.params.hubCAId.value;
  HubCAService.getHubCA(envId, hubCAId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteHubCA = function (req, res, next) {
  const envId = req.swagger.params.envId.value;
  const hubCAId = req.swagger.params.hubCAId.value;
  HubCAService.deleteHubCA(envId, hubCAId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.updateHubCA = function (req, res, next) {
  const envId = req.swagger.params.envId.value;
  const hubCAId = req.swagger.params.hubCAId.value;
  const body = req.swagger.params.body.value;
  HubCAService.updateHubCA(envId, hubCAId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};
