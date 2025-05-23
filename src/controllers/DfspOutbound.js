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
const { getRequestData } = require('../utils/request.js');

exports.createCSRAndDFSPOutboundEnrollment = (req, res, next) => {
  const { params: { dfspId } } = getRequestData(req);
  DfspOutbound.createCSRAndDFSPOutboundEnrollment(req.context, dfspId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPOutboundEnrollments = (req, res, next) => {
  const { params: { dfspId }, query: { state } } = getRequestData(req);
  DfspOutbound.getDFSPOutboundEnrollments(req.context, dfspId, state)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPOutboundEnrollment = (req, res, next) => {
  const { params: { dfspId, enId } } = getRequestData(req);
  DfspOutbound.getDFSPOutboundEnrollment(req.context, dfspId, enId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.addDFSPOutboundEnrollmentCertificate = (req, res, next) => {
  const { body, params: { dfspId, enId } } = getRequestData(req);
  DfspOutbound.addDFSPOutboundEnrollmentCertificate(req.context, dfspId, enId, body)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.validateDFSPOutboundEnrollmentCertificate = (req, res, next) => {
  const { params: { dfspId, enId } } = getRequestData(req);
  DfspOutbound.validateDFSPOutboundEnrollmentCertificate(req.context, dfspId, enId)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};
