const ValidationCodes = require('./ValidationCodes');

module.exports = class Validation {
  constructor (validationCode, performed = true, result = ValidationCodes.VALID_STATES.VALID, message = '', details, data = {}, messageTemplate = '') {
    this.validationCode = validationCode; // From ./ValidationCodes
    this.performed = performed; // boolean "Whether the validation has been performed or not"
    this.result = result; // ValidationCodes.VALID_STATES "VALID", "INVALID" or "NOT_AVAILABLE"
    this.message = message; // "Textual description of the validation result"
    this.details = details; // "Command output or some other details about the validation"
    this.data = data; // "validation-specific data. Could be used by the UI to show more detail to the user"
    this.messageTemplate = messageTemplate; // "Textual description of the validation result, using the JavaScript template literal format"
  }
};
