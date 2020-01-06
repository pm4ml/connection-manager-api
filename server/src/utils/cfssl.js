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
const Constants = require('../constants/Constants');
const spawnProcess = require('../process/spawner');
const ExternalProcessError = require('../errors/ExternalProcessError');

const validateCfsslVersion = async () => {
  let cfsslVersion = Constants.CFSSL.VERSION;
  if (!cfsslVersion) {
    throw new Error(`CFSSL version not present on Constants.CFSSL.VERSION: ${Constants.CFSSL.VERSION}`);
  }

  const commandResult = await spawnProcess('cfssl', ['version'], '');
  let { stdout } = commandResult;
  if (typeof stdout !== 'string') {
    throw new ExternalProcessError('Could not read command output');
  }

  let revisionRE = new RegExp('Revision: dev-modus');
  if (!(revisionRE.test(stdout))) {
    throw new ExternalProcessError(`cfssl version info doesn't match ${revisionRE}, it's \n${stdout}\n`);
  }

  let versionRE = new RegExp(`Version: ${cfsslVersion}`);
  if (!(versionRE.test(stdout))) {
    throw new ExternalProcessError(`cfssl version info doesn't match ${versionRE}, it's \n${stdout}\n`);
  }

  return true;
};

module.exports = {
  validateCfsslVersion
};
