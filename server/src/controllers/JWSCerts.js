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
const JWSCertsService = require('../service/JWSCertsService');

exports.createDfspJWSCerts = function createDfspJWSCerts (req, res, next, dfspId) {
  JWSCertsService.createDfspJWSCerts(dfspId, req.body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.updateDfspJWSCerts = function updateDfspJWSCerts (req, res, next, dfspId) {
  JWSCertsService.updateDfspJWSCerts(dfspId, req.body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDfspJWSCerts = function getDfspJWSCerts (req, res, next, dfspId) {
  JWSCertsService.getDfspJWSCerts(dfspId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getAllDfspJWSCerts = function getAllDfspJWSCerts (req, res, next) {
  JWSCertsService.getAllDfspJWSCerts()
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteDfspJWSCerts = function deleteDfspJWSCerts (req, res, next, dfspId) {
  JWSCertsService.deleteDfspJWSCerts(dfspId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};
