'use strict';

var utils = require('../utils/writer.js');
var Login = require('../service/LoginService');

exports.loginUser = function login (req, res, next) {
    var username = req.swagger.params['username'].value;
    var password = req.swagger.params['password'].value;
    Login.loginUser(username, password, req, res)
      .then(function (response) {
        utils.writeJson(res, response);
      })
      .catch(function (response) {
        utils.writeJson(res, response, response.status);
      });
  };
  
  exports.logoutUser = function login (req, res, next) {
    Login.logoutUser(req, res)
      .then(function (response) {
        utils.writeJson(res, response);
      })
      .catch(function (response) {
        utils.writeJson(res, response, response.status);
      });
  };
  
  exports.login2step = function login2step (req, res, next) {
    var username = req.swagger.params['username'].value;
    var password = req.swagger.params['password'].value;
    var generatedToken = req.swagger.params['generatedToken'].value;
  
    Login.login2step(username, password, generatedToken, req, res)
      .then(function (response) {
        utils.writeJson(res, response);
      })
      .catch(function (response) {
        utils.writeJson(res, response, response.status);
      });
  };