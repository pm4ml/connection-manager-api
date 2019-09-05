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
    let loginResponse = await rp.post(url).form(form).auth(Constants.OAUTH.APP_OAUTH_CLIENT_KEY, Constants.OAUTH.APP_OAUTH_CLIENT_SECRET);
    let loginResponseObj = JSON.parse(loginResponse);
    return loginResponseObj;
  } catch (error) {
    if (error && error.statusCode === 400 && error.message.includes('Authentication failed')) {
      throw new UnauthorizedError(`Authentication failed for user ${username}`, error.error);
    }
    throw error;
  }
};
