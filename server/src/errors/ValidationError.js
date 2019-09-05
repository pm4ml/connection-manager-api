'use strict';

const BaseError = require('./BaseError');
const ErrorCategory = require('./ErrorCategory');

class ValidationError extends BaseError {
  constructor (message, validationErrors) {
    super(ErrorCategory.BAD_REQUEST, message);
    this.payload.validationErrors = validationErrors;
  }
}

module.exports = ValidationError;
