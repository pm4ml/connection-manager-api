
'use strict';

const BaseError = require('./BaseError');
const ErrorCategory = require('./ErrorCategory');

class ExternalProcessError extends BaseError {
  constructor (message, stderr) {
    super(ErrorCategory.UNPROCESSABLE, message);
    this.payload.stderr = stderr;
  }
}

module.exports = ExternalProcessError;
