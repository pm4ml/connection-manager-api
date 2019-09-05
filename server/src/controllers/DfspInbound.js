'use strict';

var utils = require('../utils/writer.js');
var DfspInbound = require('../service/DfspInboundService');

exports.createDFSPInboundEnrollment = function createDFSPInboundEnrollment (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  var dfspId = req.swagger.params['dfspId'].value;
  var body = req.swagger.params['body'].value;
  DfspInbound.createDFSPInboundEnrollment(envId, dfspId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPInboundEnrollments = function getDFSPInboundEnrollments (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  var dfspId = req.swagger.params['dfspId'].value;
  DfspInbound.getDFSPInboundEnrollments(envId, dfspId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDFSPInboundEnrollment = function getDFSPInboundEnrollment (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  var dfspId = req.swagger.params['dfspId'].value;
  var enId = req.swagger.params['enId'].value;
  DfspInbound.getDFSPInboundEnrollment(envId, dfspId, enId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.signDFSPInboundEnrollment = function signDFSPInboundEnrollment (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  var dfspId = req.swagger.params['dfspId'].value;
  var enId = req.swagger.params['enId'].value;
  DfspInbound.signDFSPInboundEnrollment(envId, dfspId, enId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.addDFSPInboundEnrollmentCertificate = function addDFSPInboundEnrollmentCertificate (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  var dfspId = req.swagger.params['dfspId'].value;
  var enId = req.swagger.params['enId'].value;
  var body = req.swagger.params['body'].value;
  DfspInbound.addDFSPInboundEnrollmentCertificate(envId, dfspId, enId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};
