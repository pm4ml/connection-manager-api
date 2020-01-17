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
 *  limitations under the License                                             *
 ******************************************************************************/

'use strict';
const Constants = require('../constants/Constants');
const isAuthEnabled = Constants.OAUTH.AUTH_ENABLED != null && (Constants.OAUTH.AUTH_ENABLED === 'true' || Constants.OAUTH.AUTH_ENABLED === 'TRUE');

const whitelist = ['http://devint1-pkiadminweb.casahub.live', 'https://devint1-pkiadminweb.casahub.live'];

exports.getCorsOptions = {
  credentials: true,
  origin: function (requestOrigin, callback) {
    if (!isAuthEnabled) {
      console.log(`cors origin callback: allowing ${requestOrigin} because Auth is not enabled`);
      callback(null, true);
      // requests from curl don't usually have the Origin header
    } else if (!requestOrigin) {
      console.log(`cors origin callback: allowing ${requestOrigin} - No requestOrigin`);
      callback(null, true);
    } else if (requestOrigin.indexOf('localhost') !== -1 || whitelist.indexOf(requestOrigin) !== -1) {
      console.log(`cors origin callback: allowing ${requestOrigin} - whitelisted or localhost`);
      callback(null, true);
    } else {
      console.log(`cors origin callback: allowing ${requestOrigin} since we don't know where the UI is published`);
      callback(null, true);
      // callback(new Error('Not allowed by CORS:  requestOrigin: ', requestOrigin));
    }
  }
};
