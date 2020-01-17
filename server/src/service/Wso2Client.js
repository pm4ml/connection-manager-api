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
const Constants = require('../constants/Constants');
const rp = require('request-promise-native');
const UnauthorizedError = require('../errors/UnauthorizedError');

exports.getToken = async (username, password) => {
  const form = {
    username: username,
    password: password,
    scope: 'openid',
    grant_type: 'password',
  };

  try {
    let url = Constants.OAUTH.OAUTH2_ISSUER;
    let loginResponse = await rp.post(url).form(form).auth(Constants.OAUTH.APP_OAUTH_CLIENT_KEY, Constants.OAUTH.APP_OAUTH_CLIENT_SECRET); // MP-757
    console.log(`Wso2Client.getToken received ${loginResponse}`);
    let loginResponseObj = JSON.parse(loginResponse);
    return loginResponseObj;
  } catch (error) {
    if (error && error.statusCode === 400 && error.message.includes('Authentication failed')) {
      throw new UnauthorizedError(`Authentication failed for user ${username}`, error.error);
    }
    throw error;
  }
};

/**
 * Chnage password will go to WSO2 server to validate current password, and change it for the new one, also set flag first time in false, returning success
 * This still needs to be defined by Greg
 * @param {*} username
 * @param {*} newPassword
 * @param {*} userguid
 * @returns success
 */
exports.resetPassword = async (username, newPassword, userguid) => {
  const url = Constants.OAUTH.RESET_PASSWORD_ISSUER + `/${userguid}`;
  const options = {
    method: 'PUT',
    uri: url,
    headers: {
      'Content-Type': 'application/json'
    },
    body: {
      'userName': username,
      'password': newPassword,
      'EnterpriseUser':
        {
          'askPassword': false
        }

    },
    json: true,
    auth: {
      user: Constants.OAUTH.RESET_PASSWORD_AUTH_USER,
      pass: Constants.OAUTH.RESET_PASSWORD_AUTH_PASSWORD
    },
  };
  try {
    let response = await rp(options); // MP-757
    return response;
  } catch (error) {
    if (error && (error.statusCode === 404 || error.statusCode === 400)) {
      throw new UnauthorizedError(`Authentication failed for user ${username}`, error.error);
    } else {
      throw error;
    }
  }
};
