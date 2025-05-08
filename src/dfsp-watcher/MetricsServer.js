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

const Hapi = require('@hapi/hapi');
const { CONTEXT } = require('./constants');

/**
 * @typedef {Object} MetricsServerDeps
 * @prop {MetricsServerConfig} config - Configuration for MetricsServer
 * @prop {Metrics} metrics - Wrapper for prom-client from @mojaloop/central-services-metrics
 * @prop {ContextLogger} logger - Logger instance
 */

/**
 * @typedef {Object} MetricsServerConfig
 * @prop {number} port - Port of metrics server
 * @prop {boolean} disabled - Defines if metrics server is disabled
 * @prop {Object} instrumentationConfig - Instrumentation configuration
 */

class MetricsServer {
  #server;

  /** @param {MetricsServerDeps} deps */
  constructor(deps) {
    this.log = deps.logger.child({ component: this.constructor.name });
    this.config = deps.config;
    this.metrics = deps.metrics;
  }

  async start () {
    const { port } = this.config;
    this.#setupMetrics();
    this.#server = await this.#createServer(port);
    await this.#server.start();
    this.log.info(`MetricsServer is started...`, { port });
  }

  async stop () {
    this.#server.stop();
    this.log.info(`MetricsServer is stopped`);
  }

  incrementErrorCounter(dfsp, code, step) {
    const log = this.log.child({ dfsp });
    try {
      const errorCounter = this.metrics.getCounter('errorCount');
      const errDetails = {
        system: dfsp,
        code,
        context: CONTEXT,
        component: 'dfsp-watcher',
        operation: `ping-${dfsp}`,
        step // or add here dfsp?
      };
      errorCounter.inc(errDetails);
      log.info('incrementErrorCounter is called:', { errDetails });
    } catch (error) {
      log.error('error in incrementErrorCounter: ', error);
    }
  }

  #setupMetrics () {
    const { instrumentationConfig } = this.config;
    const isOk = this.metrics.setup(instrumentationConfig);
    this.log.debug('setupMetrics is done', { isOk, instrumentationConfig });
  }

  async #createServer (port) {
    const server = new Hapi.Server({ port });
    await server.register([this.metrics.plugin]); // think if we need it here?
    return server;
  }
}

module.exports = MetricsServer;
