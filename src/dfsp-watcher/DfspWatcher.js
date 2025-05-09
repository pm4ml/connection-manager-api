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

const { ulid } = require('ulid');
const { PingStatusToError, PingStep } = require('./constants');

/**
 * @typedef {Object} DfspWatcherDeps
 * @prop {Object} config - Configuration for DfspWatcher.
 * @prop {ContextLogger} logger - ContextLogger instance.
 * @prop {DFSPModel} dfspModel - Model to interact with DB (dfsps table).
 * @prop {PingPongClient} pingPongClient - Send http request to PingPong server.
 * @prop {MetricsServer} metricsServer - Http server to expose metrics.
 */

class DfspWatcher {
  #timer = null;

  /** @param {DfspWatcherDeps} deps */
  constructor(deps) {
    this.log = deps.logger.child({ component: this.constructor.name });
    this.config = deps.config;
    this.dfspModel = deps.dfspModel;
    this.pingPongClient = deps.pingPongClient;
    this.metricsServer = deps.metricsServer;
  }

  async start() {
    await this.metricsServer.start();
    await this.startWatching();
    this.log.info(`DfspWatcher is started`);
  }

  async startWatching() {
    await this.pingWatchedDfsps();
    const interval = this.config.get('pingInterval');
    this.#timer = setTimeout(() => this.startWatching(), interval * 1000);
    this.log.verbose(`next pingWatchedDfsps is scheduled in ${interval} seconds...`);
  }

  async stopWatching() {
    clearTimeout(this.#timer);
    this.#timer = null;
    await this.metricsServer.stop();
    this.log.info(`stopWatching is done`);
  }

  async pingWatchedDfsps() {
    try {
      const dfspIds = await this.#getWatchedDfspIds();
      const results = await Promise.all(dfspIds.map(id => this.processOneDfspPing(id)));
      this.log.info(`pingWatchedDfsps is done:`, { results });
    } catch (err) {
      this.log.error(`error in pingWatchedDfsps: `, err);
    }
  }

  async processOneDfspPing(dfspId) {
    const requestId = this.#generateRequestId();
    const { pingStatus, errorInformation } = await this.pingPongClient.sendPingRequest(dfspId, requestId);
    const isUpdated = await this.dfspModel.updatePingStatus(dfspId, pingStatus);
    if (errorInformation) this.#incrementErrorCounter(dfspId, pingStatus, errorInformation);
    this.log.verbose(`processOneDfspPing is done:`, { dfspId, requestId, pingStatus, isUpdated });
    return { pingStatus, dfspId };
  }

  async #getWatchedDfspIds() {
    return this.dfspModel.findWatchedDfspIds()
      .catch(err => {
        this.log.warn(`error in #getWatchedDfspIds: `, err);
        return [];
      });
  }

  #incrementErrorCounter(dfspId, pingStatus, errorInformation) {
    const step = errorInformation.errorDescription
      ? PingStep.RECEIVE
      : PingStep.SEND;
    const errCode = PingStatusToError[pingStatus] || 'unknown';
    this.metricsServer.incrementErrorCounter(dfspId, errCode, step);
  }

  #generateRequestId() {
    const requestId = ulid();
    this.log.debug(`generated requestId:`, { requestId });
    return requestId;
  }
}

module.exports = DfspWatcher;
