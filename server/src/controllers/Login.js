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

exports.loginUser = (req, res, next, body) => {
  Login.loginUser(req.context, body, req, res)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.logoutUser = (req, res, next) => {
  Login.logoutUser(req.context, req, res)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.login2step = (req, res, next, username, password, generatedToken) => {
  Login.login2step(req.context, username, password, generatedToken, req, res)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};

exports.resetPassword = (req, res, username, newPassword, userguid) => {
  Login.resetPassword(req.context, username, newPassword, userguid)
    .then(response => {
      utils.writeJson(res, response, 204);
    })
    .catch(response => {
      utils.writeJson(res, response, response.status);
    });
};
