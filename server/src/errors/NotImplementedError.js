
'use strict';

const BaseError = require('./BaseError');
const ErrorCategory = require('./ErrorCategory');

class NotImplementedError extends BaseError {
  constructor (message) {
    super(ErrorCategory.NOT_IMPLEMENTED, message);
  }
}

module.exports = NotImplementedError;
