'use strict';

const BaseError = require('./BaseError');
const ErrorCategory = require('./ErrorCategory');

class BadRequestError extends BaseError {
  constructor (message, detail) {
    super(ErrorCategory.BAD_REQUEST, message);
    this.payload.detail = detail;
  }
}

module.exports = BadRequestError;
