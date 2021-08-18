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
const Login = require('../service/LoginService');

exports.loginUser = function login (req, res, next) {
  const username = req.swagger.params.username.value;
  const password = req.swagger.params.password.value;
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
  const username = req.swagger.params.username.value;
  const password = req.swagger.params.password.value;
  const generatedToken = req.swagger.params.generatedToken.value;

  Login.login2step(username, password, generatedToken, req, res)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};

exports.resetPassword = function resetPassword (req, res) {
  const username = req.swagger.params.username.value;
  const newPassword = req.swagger.params.newPassword.value;
  const userguid = req.swagger.params.userguid.value;

  Login.resetPassword(username, newPassword, userguid)
    .then(function (response) {
      utils.writeJson(res, response, 204);
    })
    .catch(function (response) {
      utils.writeJson(res, response, response.status);
    });
};
