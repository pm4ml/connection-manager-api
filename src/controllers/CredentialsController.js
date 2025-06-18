// Copyright 2025 ModusBox, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License").
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

const utils = require('../utils/writer');
const CredentialsService = require('../service/CredentialsService');
const { getRequestData } = require('../utils/request');

exports.getCredentials = (req, res, next) => {
  const { params: { dfspId } } = getRequestData(req);
  CredentialsService.getCredentials(req.context, dfspId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.createCredentials = (req, res, next) => {
  const { params: { dfspId } } = getRequestData(req);
  CredentialsService.createCredentials(req.context, dfspId)
    .then(function (response) {
      utils.writeJson(res, response.data, response.status);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
}; 