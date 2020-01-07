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
const { spawn } = require('child_process');
const ExternalProcessError = require('../errors/ExternalProcessError');

/**
 * Spawns an OS command.
 *
 * @param {String} command command to execute
 * @param {String[]} args args to the command
 * @param {String} stdin set as the stdin of the process
 * @param {boolean} throwOnErrorCode if exit status code != 0 and this is true, it rejects the promise
 *
 * @returns a Promise
 *  {
 *    stdout, // String
 *    stderr, // String
 *    code    // command exit code
 *  }
 * @throws if error, it rejects the Promise with
 *  {
 *    code,
 *    message,
 *    type : 'EXIT_ERROR'
 *  }
 */
const spawnProcess = function (command, args, stdin, throwOnErrorCode = true) {
  return new Promise(function (resolve, reject) {
    const childProcess = spawn(command, args, { });

    childProcess.stdin.write(stdin);
    childProcess.stdin.end();

    let stderr = '';
    let stdout = '';

    childProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    childProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    childProcess.on('close', async (code) => {
      // if (command.indexOf(Constants.CFSSL.COMMAND_PATH) !== -1 && args[0] === 'sign') {
      //   console.warn(`spawner.spawnProcess command: ${command}\nargs: ${args}\nstdin: ${stdin}\nstderr: ${stderr}\nstdout: ${stdout}`);
      // }
      if (code !== 0) {
        if (!process.env.TEST) {
          console.warn(`spawner.spawnProcess command: ${command}\nargs: ${args}\nstdin: ${stdin}\nstderr: ${stderr}\nstdout: ${stdout}`);
          console.warn(`spawner.spawnProcess command: ${JSON.stringify(command)}\nargs: ${JSON.stringify(args)}\nstdin: ${JSON.stringify(stdin)}\nstderr: ${JSON.stringify(stderr)}\nstdout: ${JSON.stringify(stdout)}`);
        }
      }
      if (code !== 0 && throwOnErrorCode) {
        let message = `child process exited with code ${code}`;
        reject(new ExternalProcessError(message, stderr));
        return;
      }
      resolve({ stdout, stderr, code });
    });
  });
};

module.exports = spawnProcess;
