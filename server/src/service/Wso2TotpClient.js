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
// constants to login
const rp = require('request-promise-native');
const parseString = require('xml2js').parseString;
const UnauthorizedError = require('../errors/UnauthorizedError');
const Constants = require('../constants/Constants');

exports.retrieveSecretKey = async (username) => {
  const url = Constants.AUTH_2FA.TOTP_ADMIN_ISSUER + '/retrieveSecretKey';
  const options = {
    method: 'POST',
    uri: url,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    form: {
      username: username
    },
    auth: {
      user: Constants.AUTH_2FA.TOTP_ADMIN_AUTH_USER,
      pass: Constants.AUTH_2FA.TOTP_ADMIN_AUTH_PASSWORD
    }
  };
  try {
    let secretKeyResponse = await rp(options);
    let secretKeyValue;
    parseString(secretKeyResponse, (err, result) => {
      if (err) throw new UnauthorizedError('XML parse of the response failed');
      secretKeyValue = result['ns:retrieveSecretKeyResponse']['ns:return'][0];
    });
    return secretKeyValue;
  } catch (err) {
    console.log('ERROR :: ' + err);
    throw new UnauthorizedError(err.message);
  }
};

exports.validateTOTP = async (username, verificationCode) => {
  const url = Constants.AUTH_2FA.TOTP_ADMIN_ISSUER + '/validateTOTP';
  const options = {
    method: 'POST',
    uri: url,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    form: {
      username: username,
      verificationCode: verificationCode
    },
    auth: {
      user: Constants.AUTH_2FA.TOTP_ADMIN_AUTH_USER,
      pass: Constants.AUTH_2FA.TOTP_ADMIN_AUTH_PASSWORD
    }
  };

  try {
    let validateTotpResponse = await rp(options);
    parseString(validateTotpResponse, (err, result) => {
      if (err) throw new UnauthorizedError('XML parse of the response failed');
      console.log('Validate boolean :: ' + JSON.stringify(result['ns:validateTOTPResponse']['ns:return'][0]));
      let validate = result['ns:validateTOTPResponse']['ns:return'][0];
      if (!validate || validate === 'false') throw new UnauthorizedError('Verification code not validated');
      return validate;
    });
  } catch (err) {
    console.error('validateTOTP::', err);
    throw err;
  }
};
