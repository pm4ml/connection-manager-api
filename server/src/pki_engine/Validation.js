/******************************************************************************
 *  Copyright 2019 ModusBox, Inc.                                             *
 *                                                                            *
 *  info@modusbox.com                                                         *
 *                                                                            *
 *  Licensed under the Apache License, Version 2.0 (the "License");           *
 *  you may not use this file except in compliance with the License.          *
 *  You may obtain a copy of the License at                                   *
 *  http://www.apache.org/licenses/LICENSE-2.0                                *
 *                                                                            *
 *  Unless required by applicable law or agreed to in writing, software       *
 *  distributed under the License is distributed on an "AS IS" BASIS,         *
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  *
 *  See the License for the specific language governing permissions and       *
 *  limitations under the License.                                            *
 ******************************************************************************/

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
