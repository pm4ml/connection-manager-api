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

const spawnProcess = require('../process/spawner');

exports.printToolsVersion = () => {
  spawnProcess(Constants.CFSSL.COMMAND_PATH, ['version'], '')
    .then(cfsslResult => {
      let { stdout } = cfsslResult;
      console.log('\nRunning cfssl version: ', stdout);
    })
    .catch(err => {
      console.error('Error while trying to print cfssl version: ', err);
    });

  spawnProcess('openssl', ['version'], '')
    .then(opensslResult => {
      let { stdout } = opensslResult;
      console.log('\nRunning openssl version: ', stdout);
    })
    .catch(err => {
      console.error('Error while trying to print openssl version: ', err);
    });
};
