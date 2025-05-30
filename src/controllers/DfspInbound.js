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
const DfspInbound = require('../service/DfspInboundService');
const { getRequestData } = require('../utils/request.js');

exports.createDFSPInboundEnrollment = (req, res, next) => {
  const { body, params: { dfspId } } = getRequestData(req);
  DfspInbound.createDFSPInboundEnrollment(req.context, dfspId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPInboundEnrollments = (req, res, next) => {
  const { params: { dfspId }, query: { state } } = getRequestData(req);
  DfspInbound.getDFSPInboundEnrollments(req.context, dfspId, state)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPInboundEnrollment = (req, res, next) => {
  const { params: { dfspId, enId } } = getRequestData(req);
  DfspInbound.getDFSPInboundEnrollment(req.context, dfspId, enId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.signDFSPInboundEnrollment = (req, res, next) => {
  const { params: { dfspId, enId } } = getRequestData(req);
  DfspInbound.signDFSPInboundEnrollment(req.context, dfspId, enId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};
