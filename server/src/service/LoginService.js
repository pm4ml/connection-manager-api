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
const UnauthorizedError = require('../errors/UnauthorizedError');
const BadRequestError = require('../errors/BadRequestError');
const Cookies = require('cookies');
const jwt = require('jsonwebtoken');
const wso2TotpClient = require('./Wso2TotpClient');
const wso2Client = require('./Wso2Client');
const wso2ManagerServiceClient = require('./Wso2ManagerServiceClient');
const ENROLLED_2FA = '2fa-enrolled';
const PASSWORD_RESET = 'askPassword';

/**
 * Logs the user in.
 * If successful, sets the JWT token in a cookie and returns the token payload
 */
exports.loginUser = async function (username, password, req, res) {
  if (!Constants.OAUTH.AUTH_ENABLED) {
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
  try {
    const loginResponseObj = await wso2Client.getToken(username, password);
    let response; // there are 3 types of possible response depending on AUTH_2FA_ENABLED and if its enrolled or not

    const decodedIdToken = jwt.decode(loginResponseObj.id_token);

    if (/true/i.test(decodedIdToken[PASSWORD_RESET])) {
      response = buildFirstLoginResponse(decodedIdToken);
    } else {
      if (Constants.AUTH_2FA.AUTH_2FA_ENABLED) {
        response = await build2FAResponse(decodedIdToken, username);
      } else {
        response = buildJWTResponse(decodedIdToken, loginResponseObj.access_token, req, res);
      }
    }

    return response;
  } catch (error) {
    console.log('Error on LoginService.loginUser: ', error);
    if (error && error.statusCode === 400 && error.message.includes('Authentication failed')) {
      throw new UnauthorizedError(`Authentication failed for user ${username}`, error.error);
    }
    throw error;
  }
};

// Just in case we need more information from WSO2 response, we created a new object
const buildFirstLoginResponse = (decodedIdToken) => {
  const response = {
    askPassword: true,
    userguid: decodedIdToken.userguid
  };

  return response;
};

const build2FAResponse = async (decodedIdToken, user) => {
  // analyze if the user is already enrolled (decodedIdToken.2fa-enrolled)
  let response;
  if (/true/i.test(decodedIdToken[ENROLLED_2FA])) {
    response = {
      enrolled: true,
      '2faEnabled': true
    };
  } else {
    // get shared secret
    const sharedSecret = await wso2TotpClient.retrieveSecretKey(user);
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

const buildJWTResponse = (decodedIdToken, accessToken, req, res) => {
  // If the user is a DFSP admin, set the dfspId so the UI can send it
  let dfspId = null;
  if (decodedIdToken.dfspId != null) {
    dfspId = decodedIdToken.dfspId;
  } else {
    // Get the DFSP id from the Application/DFSP: group
    const groups = decodedIdToken.groups;
    for (const group of groups) {
      const groupMatchResult = group.match(/^Application\/DFSP:(.*)$/);
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

  const cookies = new Cookies(req, res);
  const maxAge = 3600 * 1000; // ms
  const cookieOptions = { maxAge: maxAge, httpOnly: true, sameSite: 'strict' }; // secure is automatic based on HTTP or HTTPS used
  cookies.set(Constants.OAUTH.JWT_COOKIE_NAME, accessToken, cookieOptions);

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
  const cookies = new Cookies(req, res);
  cookies.set(Constants.OAUTH.JWT_COOKIE_NAME);
};

/**
 * Logs the user in using two factor authentication.
 * If successful, sets the JWT token in a cookie and returns the token payload
 */
exports.login2step = async (username, password, generatedToken, req, res) => {
  if (!Constants.AUTH_2FA.AUTH_2FA_ENABLED) {
    throw new BadRequestError('2FA is not enabled');
  }

  try {
    const loginResponseObj = await wso2Client.getToken(username, password);

    const decodedIdToken = jwt.decode(loginResponseObj.id_token);

    console.log('decodedIdToken.2fa-enrolled::', decodedIdToken[ENROLLED_2FA]);
    // Check with the token if the user is already enrolled or not
    await wso2TotpClient.validateTOTP(username, generatedToken);
    if (!(/true/i).test(decodedIdToken[ENROLLED_2FA])) {
      // mark the user as enrolled
      await wso2ManagerServiceClient.setUserClaimValue(username, ENROLLED_2FA, true);
    }

    const response = buildJWTResponse(decodedIdToken, loginResponseObj.access_token, req, res);
    return response;
  } catch (error) {
    console.log('Error on LoginService.login2step: ', error);
    throw error;
  }
};

exports.resetPassword = async (username, newPassword, userguid) => {
  await wso2Client.resetPassword(username, newPassword, userguid);
};
