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
var rp = require('request-promise-native');
// const FormData = require('form-data');
const Constants = require('../constants/Constants');
const UnauthorizedError = require('../errors/UnauthorizedError');
const BadRequestError = require('../errors/BadRequestError');
const Cookies = require('cookies');
const jwt = require('jsonwebtoken');
const wso2TotpClient = require('./Wso2TotpClient');
const wso2Client = require('./Wso2Client');
const wso2ManagerServiceClient = require('./Wso2ManagerServiceClient');
const ENROLLED_2FA = '2fa-enrolled';

/**
 * Logs the user in.
 * If successful, sets the JWT token in a cookie and returns the token payload
 */
exports.loginUser = async function (username, password, req, res) {
  if (Constants.OAUTH.AUTH_ENABLED == null || Constants.OAUTH.AUTH_ENABLED === 'DISABLED') {
    return {
      ok: false,
      token: {
        payload: {
          at_hash: null,
          aud: null,
          sub: null,
          nbf: 0,
          azp: null,
          amr: [],
          iss: null,
          groups: [],
          exp: 0,
          iat: 0,
          dfspId: null,
        }
      }
    };
  }
  const form = {
    username: username,
    password: password,
    scope: 'openid',
    grant_type: 'password',
  };
  try {
    let url = Constants.OAUTH.OAUTH2_ISSUER;
    let loginResponse = await rp.post(url).form(form).auth(Constants.OAUTH.APP_OAUTH_CLIENT_KEY, Constants.OAUTH.APP_OAUTH_CLIENT_SECRET);
    let loginResponseObj = JSON.parse(loginResponse);
    let response; // there are 3 types of possible response depending on AUTH_2FA_ENABLED and if its enrolled or not
    if ((/true/i).test(Constants.AUTH_2FA.AUTH_2FA_ENABLED)) {
      response = await build2FAResponse(loginResponseObj, username);
    } else {
      response = buildJWTResponse(loginResponseObj, req, res);
    }

    return response;
  } catch (error) {
    console.log(`Error on LoginService.loginUser: `, error);
    if (error && error.statusCode === 400 && error.message.includes('Authentication failed')) {
      throw new UnauthorizedError(`Authentication failed for user ${username}`, error.error);
    }
    throw error;
  }
};

const build2FAResponse = async (loginResponseObj, user) => {
  let decodedIdToken = jwt.decode(loginResponseObj.id_token);

  // analyze if the user is already enrolled (decodedIdToken.2fa-enrolled)
  let response;
  if (/true/i.test(decodedIdToken[ENROLLED_2FA])) {
    response = {
      enrolled: true,
      '2faEnabled': true
    };
  } else {
    // get shared secret
    let sharedSecret = await wso2TotpClient.retrieveSecretKey(user);
    console.log('Successfully getting the secret key');
    response = {
      sharedSecret,
      issuer: Constants.AUTH_2FA.TOTP_ISSUER,
      label: Constants.AUTH_2FA.TOTP_LABEL,
      enrolled: false,
      '2faEnabled': true
    };
  }

  return response;
};

const buildJWTResponse = (loginResponseObj, req, res) => {
  let decodedIdToken = jwt.decode(loginResponseObj.id_token);
  // If the user is a DFSP admin, set the dfspId so the UI can send it
  let dfspId = null;
  if (decodedIdToken.dfspId != null) {
    dfspId = decodedIdToken.dfspId;
  } else {
    // Get the DFSP id from the Application/DFSP: group
    let groups = decodedIdToken.groups;
    for (const group of groups) {
      let groupMatchResult = group.match(/^Application\/DFSP:(.*)$/);
      if (groupMatchResult == null || !Array.isArray(groupMatchResult)) {
        continue;
      }
      dfspId = groupMatchResult[1];
      console.log('LoginService.loginUser found dfspId: ', dfspId);
      break; // FIXME only returns the first ( there should be only one ). May report an error if there's more than one Application/DFSP group ?
    }
  }

  decodedIdToken.dfspId = dfspId;
  console.log('LoginService.loginUser returning decodedIdToken: ', decodedIdToken);

  let cookies = new Cookies(req, res);
  let maxAge = 3600 * 1000; // ms
  let cookieOptions = { maxAge: maxAge, httpOnly: true, sameSite: 'strict' }; // secure is automatic based on HTTP or HTTPS used
  cookies.set(Constants.OAUTH.JWT_COOKIE_NAME, loginResponseObj.access_token, cookieOptions);

  return {
    ok: true,
    token: {
      payload: decodedIdToken
    }
  };
};

/**
 * Logs the user out.
 */
exports.logoutUser = async function (req, res) {
  let cookies = new Cookies(req, res);
  cookies.set(Constants.OAUTH.JWT_COOKIE_NAME);
};

/**
 * Logs the user in using two factor authentication.
 * If successful, sets the JWT token in a cookie and returns the token payload
 */
exports.login2step = async (username, password, generatedToken, req, res) => {
  if (!(/true/i).test(Constants.AUTH_2FA.AUTH_2FA_ENABLED)) {
    throw new BadRequestError('2FA is not enabled');
  }

  try {
    let loginResponseObj = await wso2Client.getToken(username, password);

    let decodedIdToken = jwt.decode(loginResponseObj.id_token);

    console.log('decodedIdToken.2fa-enrolled::', decodedIdToken[ENROLLED_2FA]);
    // Check with the token if the user is already enrolled or not
    await wso2TotpClient.validateTOTP(username, generatedToken);
    if (!(/true/i).test(decodedIdToken[ENROLLED_2FA])) {
      // mark the user as enrolled
      wso2ManagerServiceClient.setUserClaimValue(username, ENROLLED_2FA, true);
    }

    let response = buildJWTResponse(loginResponseObj, req, res);
    return response;
  } catch (error) {
    console.log(`Error on LoginService.login2step: `, error);
    throw error;
  }
};
