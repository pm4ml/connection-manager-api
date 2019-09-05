'use strict';

var utils = require('../utils/writer.js');
var ServerCertsService = require('../service/ServerCertsService');

exports.createDfspServerCerts = function createDfspServerCerts (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  var dfspId = req.swagger.params['dfspId'].value;

  var body = req.swagger.params['body'].value;
  ServerCertsService.createDfspServerCerts(envId, dfspId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.updateDfspServerCerts = function updateDfspServerCerts (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  var dfspId = req.swagger.params['dfspId'].value;

  var body = req.swagger.params['body'].value;
  ServerCertsService.updateDfspServerCerts(envId, dfspId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getDfspServerCerts = function getDfspServerCerts (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  var dfspId = req.swagger.params['dfspId'].value;

  ServerCertsService.getDfspServerCerts(envId, dfspId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getAllDfspServerCerts = function getAllDfspServerCerts (req, res, next) {
  var envId = req.swagger.params['envId'].value;

  ServerCertsService.getAllDfspServerCerts(envId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteDfspServerCerts = function deleteDfspServerCerts (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  var dfspId = req.swagger.params['dfspId'].value;

  ServerCertsService.deleteDfspServerCerts(envId, dfspId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};
