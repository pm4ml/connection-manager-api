
'use strict';

const BaseError = require('./BaseError');
const ErrorCategory = require('./ErrorCategory');

class NotFoundError extends BaseError {
  constructor (message) {
    super(ErrorCategory.NOT_FOUND, message);
  }
}

module.exports = NotFoundError;
