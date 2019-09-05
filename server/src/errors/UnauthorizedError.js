'use strict';

const BaseError = require('./BaseError');
const ErrorCategory = require('./ErrorCategory');

class UnauthorizedError extends BaseError {
  constructor (message, authErrors) {
    super(ErrorCategory.UNAUTHORIZED, message);
    this.payload.authErrors = authErrors;
  }
}

module.exports = UnauthorizedError;
