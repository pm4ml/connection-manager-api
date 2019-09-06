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

const ValidationCodes = require('./ValidationCodes.js');

module.exports = {
  inboundValidations: [
    ValidationCodes.VALIDATION_CODES.CSR_SIGNATURE_VALID.code,
    ValidationCodes.VALIDATION_CODES.CSR_SIGNATURE_ALGORITHM_SHA256_512.code,
    ValidationCodes.VALIDATION_CODES.CSR_PUBLIC_KEY_LENGTH_4096.code,
    ValidationCodes.VALIDATION_CODES.CSR_CERT_SAME_PUBLIC_KEY.code,
    ValidationCodes.VALIDATION_CODES.CSR_CERT_SAME_SUBJECT_INFO.code,
    ValidationCodes.VALIDATION_CODES.CSR_MANDATORY_DISTINGUISHED_NAME.code,
    ValidationCodes.VALIDATION_CODES.CERTIFICATE_VALIDITY.code,
    // ValidationCodes.VALIDATION_CODES.CERTIFICATE_USAGE_CLIENT.code,
    ValidationCodes.VALIDATION_CODES.CERTIFICATE_ALGORITHM_SHA256.code,
    ValidationCodes.VALIDATION_CODES.CSR_CERT_PUBLIC_PRIVATE_KEY_MATCH.code,
    ValidationCodes.VALIDATION_CODES.CSR_CERT_SAME_CN.code
  ],
  outboundValidations: [
    ValidationCodes.VALIDATION_CODES.CSR_SIGNATURE_VALID.code,
    ValidationCodes.VALIDATION_CODES.CSR_SIGNATURE_ALGORITHM_SHA256_512.code,
    ValidationCodes.VALIDATION_CODES.CSR_PUBLIC_KEY_LENGTH_4096.code,
    ValidationCodes.VALIDATION_CODES.CSR_CERT_SAME_PUBLIC_KEY.code,
    ValidationCodes.VALIDATION_CODES.CSR_MANDATORY_DISTINGUISHED_NAME.code,
    ValidationCodes.VALIDATION_CODES.CSR_CERT_PUBLIC_PRIVATE_KEY_MATCH.code,
    ValidationCodes.VALIDATION_CODES.CERTIFICATE_VALIDITY.code,
    // ValidationCodes.VALIDATION_CODES.CERTIFICATE_USAGE_CLIENT.code,
    ValidationCodes.VALIDATION_CODES.CERTIFICATE_ALGORITHM_SHA256.code,
    ValidationCodes.VALIDATION_CODES.CERTIFICATE_SIGNED_BY_DFSP_CA.code
  ],
  jwsCertValidations: [
    ValidationCodes.VALIDATION_CODES.CERTIFICATE_VALIDITY.code,
    ValidationCodes.VALIDATION_CODES.CERTIFICATE_PUBLIC_KEY_LENGTH_2048.code
    // CERTIFICATE_USAGE_JWS
  ],
  serverCertValidations: [
    ValidationCodes.VALIDATION_CODES.CERTIFICATE_USAGE_SERVER.code,
    ValidationCodes.VALIDATION_CODES.CERTIFICATE_VALIDITY.code,
    ValidationCodes.VALIDATION_CODES.CERTIFICATE_CHAIN.code,
    ValidationCodes.VALIDATION_CODES.CERTIFICATE_PUBLIC_KEY_LENGTH_4096.code,
    ValidationCodes.VALIDATION_CODES.VERIFY_ROOT_CERTIFICATE.code,
    ValidationCodes.VALIDATION_CODES.VERIFY_CHAIN_CERTIFICATES.code
  ],
  dfspCaValidations: [
    ValidationCodes.VALIDATION_CODES.VERIFY_ROOT_CERTIFICATE.code,
    ValidationCodes.VALIDATION_CODES.VERIFY_CHAIN_CERTIFICATES.code,
    ValidationCodes.VALIDATION_CODES.CA_CERTIFICATE_USAGE.code
  ]
};
