/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Mojaloop Foundation
 * Eugen Klymniuk <eugen.klymniuk@infitx.com>

 --------------
 ******/

const axios = require('axios');
const metrics = require('@mojaloop/central-services-metrics');

const { logger } = require('../log/logger');
const DFSPModel = require('../models/DFSPModel');
const defaultConfig = require('./config');
const PingPongClient = require('./PingPongClient');

/**
 * @param {Partial<DfspWatcherDeps>} deps
 * @returns {DfspWatcherDeps}
 */
const createDeps = ({
  config = defaultConfig,
  dfspModel = DFSPModel,
  pingPongClient = createAxiosPingPongClient(config.get('pingPongServerUrl')),
} = {}) => ({
  logger,
  config,
  dfspModel,
  pingPongClient,
  metrics
});

/** @returns {PingPongClient} */
const createAxiosPingPongClient = (pingPongServerUrl) => {
  const httpClient = axios.create();
  return new PingPongClient({
    pingPongServerUrl,
    logger,
    httpClient
  });
};

module.exports = {
  createDeps,
};
