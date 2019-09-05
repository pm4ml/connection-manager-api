'use strict';

var utils = require('../utils/writer.js');
var ServerCertsService = require('../service/ServerCertsService');

exports.createHubServerCerts = function createHubServerCerts (req, res, next) {
  var envId = req.swagger.params['envId'].value;

  var body = req.swagger.params['body'].value;
  ServerCertsService.createHubServerCerts(envId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.updateHubServerCerts = function updateHubServerCerts (req, res, next) {
  var envId = req.swagger.params['envId'].value;

  var body = req.swagger.params['body'].value;
  ServerCertsService.updateHubServerCerts(envId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getHubServerCerts = function getHubServerCerts (req, res, next) {
  var envId = req.swagger.params['envId'].value;

  ServerCertsService.getHubServerCerts(envId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteHubServerCerts = function deleteHubServerCerts (req, res, next) {
  var envId = req.swagger.params['envId'].value;

  ServerCertsService.deleteHubServerCerts(envId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};
