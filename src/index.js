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

const nodeHttp = require('http');
const Constants = require('./constants/Constants');
const appLoader = require('./appLoader');
const { createDFSP: defaultCreateDFSP } = require('./service/PkiService');
const { createMetricsServer } = require('./mertics-server');
const { createDfspWatcher } = require('./dfsp-watcher');

const serverPort = Constants.SERVER.PORT;

const run = async ({
  connect = appLoader.connect,
  constants = Constants,
  createDFSP = defaultCreateDFSP,
  http = nodeHttp,
} = {}) => {
  console.log('connection-manager-api starting with constants:');
  console.log(JSON.stringify(constants, null, 2));

  console.log('connection-manager-api starting with process env:');
  console.log(process.env);

  const appConnected = await connect();

  // Start the server
  http.createServer(appConnected).listen(serverPort, function () {
    console.log('Connection-Manager API server is listening on port %d...', serverPort);
    console.log('Swagger-ui is available on http://localhost:%d/docs', serverPort);
  });

  const metricsServer = createMetricsServer();
  await metricsServer.start();

  if (Constants.dfspWatcherEnabled) {
    const watcher = createDfspWatcher();
    await watcher.start();
  }
};

// This structure enables us to mock and test
if (require.main === module) {
  run();
} else {
  module.exports = run;
}
