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
const app = require('./src/appLoader');
const Constants = require('./src/constants/Constants');

// If you're surprised that there's no startup code in this file:
// This file is only used by projects that use the version published at npm as a library and want to access the app or Constants objets before starting the server
// See the `package.json` file; `npm start` runs `src/index.js`, not this one.
exports.appLoader = app.connect;
exports.Constants = Constants;
