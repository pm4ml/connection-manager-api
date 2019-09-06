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
var DfspOutbound = require('../service/DfspOutboundService');

exports.createDFSPOutboundEnrollment = function createDFSPOutboundEnrollment (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  var dfspId = req.swagger.params['dfspId'].value;
  var body = req.swagger.params['body'].value;
  DfspOutbound.createDFSPOutboundEnrollment(envId, dfspId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.createCSRAndDFSPOutboundEnrollment = function createCSRAndDFSPOutboundEnrollment (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  var dfspId = req.swagger.params['dfspId'].value;
  var body = req.swagger.params['body'].value;
  DfspOutbound.createCSRAndDFSPOutboundEnrollment(envId, dfspId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPOutboundEnrollments = function getDFSPOutboundEnrollments (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  var dfspId = req.swagger.params['dfspId'].value;
  var state = req.swagger.params['state'].value;
  DfspOutbound.getDFSPOutboundEnrollments(envId, dfspId, state)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPOutboundEnrollment = function getDFSPOutboundEnrollment (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  var dfspId = req.swagger.params['dfspId'].value;
  var enId = req.swagger.params['enId'].value;
  DfspOutbound.getDFSPOutboundEnrollment(envId, dfspId, enId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.addDFSPOutboundEnrollmentCertificate = function addDFSPOutboundEnrollmentCertificate (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  var dfspId = req.swagger.params['dfspId'].value;
  var enId = req.swagger.params['enId'].value;
  var body = req.swagger.params['body'].value;
  DfspOutbound.addDFSPOutboundEnrollmentCertificate(envId, dfspId, enId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.validateDFSPOutboundEnrollmentCertificate = function validateDFSPOutboundEnrollmentCertificate (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  var dfspId = req.swagger.params['dfspId'].value;
  var enId = req.swagger.params['enId'].value;
  DfspOutbound.validateDFSPOutboundEnrollmentCertificate(envId, dfspId, enId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};
