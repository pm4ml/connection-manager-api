
'use strict';

const BaseError = require('./BaseError');
const ErrorCategory = require('./ErrorCategory');

class InternalError extends BaseError {
  constructor (message) {
    super(ErrorCategory.INTERNAL, message);
  }
}

module.exports = InternalError;
