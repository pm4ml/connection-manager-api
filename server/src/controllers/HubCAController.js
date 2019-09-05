'use strict';

var utils = require('../utils/writer.js');
var HubCAService = require('../service/HubCAService');

exports.createHubCA = function login (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  var body = req.swagger.params['body'].value;
  HubCAService.createHubCA(envId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getHubCAs = function login (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  HubCAService.getHubCAs(envId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.getHubCA = function login (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  var hubCAId = req.swagger.params['hubCAId'].value;
  HubCAService.getHubCA(envId, hubCAId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.deleteHubCA = function login (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  var hubCAId = req.swagger.params['hubCAId'].value;
  HubCAService.deleteHubCA(envId, hubCAId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.updateHubCA = function login (req, res, next) {
  var envId = req.swagger.params['envId'].value;
  var hubCAId = req.swagger.params['hubCAId'].value;
  var body = req.swagger.params['body'].value;
  HubCAService.updateHubCA(envId, hubCAId, body)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};
