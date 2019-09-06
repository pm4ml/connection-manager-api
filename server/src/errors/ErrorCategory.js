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

'use strict';

const BAD_REQUEST = 'BadRequest';
const UNAUTHORIZED = 'Unauthorized';
const FORBIDDEN = 'Forbidden';
const NOT_FOUND = 'NotFound';
const METHOD_NOT_ALLOWED = 'MethodNotAllowed';
const NOT_ACCEPTABLE = 'NotAcceptable';
const CONFLICT = 'Conflict';
const UNSUPPORTED_MEDIA_TYPE = 'UnsupportedMediaType';
const UNPROCESSABLE = 'Unprocessable';
const INTERNAL = 'Internal';
const NOT_IMPLEMENTED = 'NotImplemented';

module.exports = {
  BAD_REQUEST,
  UNAUTHORIZED,
  FORBIDDEN,
  NOT_FOUND,
  METHOD_NOT_ALLOWED,
  NOT_ACCEPTABLE,
  CONFLICT,
  UNSUPPORTED_MEDIA_TYPE,
  UNPROCESSABLE,
  INTERNAL,
  NOT_IMPLEMENTED,

  getStatusCode: (category) => {
    switch (category) {
      case BAD_REQUEST: return 400;
      case UNAUTHORIZED: return 401;
      case FORBIDDEN: return 403;
      case NOT_FOUND: return 404;
      case METHOD_NOT_ALLOWED: return 405;
      case NOT_ACCEPTABLE: return 406;
      case CONFLICT: return 409;
      case UNSUPPORTED_MEDIA_TYPE: return 415;
      case UNPROCESSABLE: return 422;
      case INTERNAL: return 500;
      case NOT_IMPLEMENTED: return 501;
      default: return 500;
    }
  }
};
