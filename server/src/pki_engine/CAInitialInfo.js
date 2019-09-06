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

const ValidationError = require('../errors/ValidationError');
const Joi = require('joi');

const caInitialInfoSchema = Joi.object().description('CA initial parameters').keys({
  default: Joi.object().description('To be used as default when generating keys, CSRs and certs').keys({
    expiry: Joi.string().description('Time duration in Go\'s time package format ( https://golang.org/pkg/time/#ParseDuration ). Example 8760h ( = 1 year )').required(),
    usages: Joi.array().description('Key usages').required().items(Joi.string().valid(['signing', 'key encipherment', 'server auth', 'client auth'])),
    signature_algorithm: Joi.string().description('Signature algorithm to use when signing CSRs'),
  }),
  csr: Joi.object().description('CA root certificate parameters').required().keys({
    hosts: Joi.array().description('List of hostnames').required().items(Joi.string()),
    names: Joi.array().description('List of DN names').required().min(1).max(1).items(
      Joi.object().description('Certificate Authority subject info').keys({
        CN: Joi.string().description('Common Name').required(),
        O: Joi.string().description('Organization').required(),
        OU: Joi.string().description('Organizational Unit'),
        C: Joi.string().description('Country'),
        ST: Joi.string().description('State'),
        L: Joi.string().description('Location'),
      })),
    key: Joi.object().description('Key generation parameters').required().keys({
      algo: Joi.string().required().valid(['rsa', 'ecdsa']),
      size: Joi.number().integer().positive().multiple(256)
    })
  })
});
// result.error === null -> valid

module.exports = class CAInitialInfo {
  /**
   * Builds a CAInitialInfo object from the document
   *
   * @param {Object} doc
   */
  constructor (doc) {
    const result = Joi.validate(doc, caInitialInfoSchema);
    if (result.error) {
      console.warn(result.error.details);
      throw new ValidationError('Invalid CAInitialInfo document', result.error.details);
    }
    this.csr = result.value.csr;
    this.default = result.value.default;
  }
};
