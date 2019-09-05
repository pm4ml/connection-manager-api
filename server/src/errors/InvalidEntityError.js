'use strict';

const BaseError = require('./BaseError');
const ErrorCategory = require('./ErrorCategory');

class InvalidEntityError extends BaseError {
  constructor (message, validationErrors) {
    super(ErrorCategory.UNPROCESSABLE, message);
    this.payload.validationErrors = validationErrors;
  }
}

module.exports = InvalidEntityError;
