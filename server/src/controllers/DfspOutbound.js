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
const DfspOutbound = require('../service/DfspOutboundService');

exports.createDFSPOutboundEnrollment = function createDFSPOutboundEnrollment (req, res, next, body, dfspId) {
  DfspOutbound.createDFSPOutboundEnrollment(dfspId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.createCSRAndDFSPOutboundEnrollment = function createCSRAndDFSPOutboundEnrollment (req, res, next, body, dfspId) {
  DfspOutbound.createCSRAndDFSPOutboundEnrollment(dfspId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPOutboundEnrollments = function getDFSPOutboundEnrollments (req, res, next, state, dfspId) {
  DfspOutbound.getDFSPOutboundEnrollments(dfspId, state)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPOutboundEnrollment = function getDFSPOutboundEnrollment (req, res, next, dfspId, enId) {
  DfspOutbound.getDFSPOutboundEnrollment(dfspId, enId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.addDFSPOutboundEnrollmentCertificate = function addDFSPOutboundEnrollmentCertificate (req, res, next, body, dfspId, enId) {
  DfspOutbound.addDFSPOutboundEnrollmentCertificate(dfspId, enId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.validateDFSPOutboundEnrollmentCertificate = function validateDFSPOutboundEnrollmentCertificate (req, res, next, dfspId, enId) {
  DfspOutbound.validateDFSPOutboundEnrollmentCertificate(dfspId, enId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};
