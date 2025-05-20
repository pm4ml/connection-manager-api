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

const knex = require('knex');
const retry = require('async-retry');
const exitHook = require('async-exit-hook');

const defaultRetryOptionsDto = (logger) => ({
  retries: 10,
  minTimeout: 1000,
  factor: 2,
  onRetry: (err) => { logger.info('Database connection attempt: ', err); },
});

/**
 * @typedef {Object} KnexWrapperDeps
 * @prop {Object} knexOptions - Configuration for
 * @prop {Object} [retryOptions] - Configuration for async-retry package
 * @prop {Metrics} metrics - Wrapper for prom-client from @mojaloop/central-services-metrics
 * @prop {ContextLogger} logger - Logger instance
 * @prop {string} [context] - Context string for errorCunter
 */

class KnexWrapper {
  #isConnected = false;

  /** @param {KnexWrapperDeps} deps */
  constructor(deps) {
    this.knex = knex(deps.knexOptions);
    this.metrics = deps.metrics;
    this.context = deps.context || 'Knex';
    this.log = deps.logger.child({ component: this.constructor.name });
    this.retryOptions = Object.assign(defaultRetryOptionsDto(this.log), deps.retryOptions);
  }

  get isConnected() { return this.#isConnected; }

  async connect() {
    try {
      const opts = this.retryOptions;
      await retry(async (_, attempt) => {
        this.log.verbose(`Attempting database connection. Attempt ${attempt} of ${opts.retries + 1}`);
        await this.knex.raw('SELECT 1');
        exitHook(callback => {
          this.knex.destroy().finally(callback);
        });
        this.#isConnected = true;
        this.log.info('Database connected');
      }, opts);
    } catch (err) {
      this.log.error('error connecting to DB: ', err);
      this.handleError(err, 'connect');
    }
  }

  async disconnect() {
    await this.knex.destroy();
    this.#isConnected = false;
    this.log.info('Database disconnected');
  }

  async executeWithErrorCount(queryFn, operation = queryFn.name || 'runQuery', step = '') {
    try {
      if (!this.isConnected) this.log.warn('Database is not connected');
      const result = await queryFn(this.knex);
      this.log.debug('executeWithErrorCount is done: ', { result });
      return result;
    } catch (err) {
      this.log.error('error in executeWithErrorCount: ', err);
      this.handleError(err, operation, step);
    }
  }

  handleError(error, operation, step = '', needRethrow = true) {
    const code = this.#defineErrorCode(error);
    this.#incrementErrorCounter({ code, operation, step });
    if (needRethrow) throw error;
    else return null;
  }

  #defineErrorCode(error) {
    if (error instanceof knex.KnexTimeoutError) {
      return 'conn_timeout';
    }
    if (error.code === 'ECONNREFUSED') {
      return 'conn_failed';
    }
    if (error.code === 'ER_LOCK_DEADLOCK') {
      return 'deadlock';
    }
    if (error.code === 'ER_DUP_ENTRY') {
      return 'dup_entry';
    }
    if (!this.isConnected) {
      return 'not_connected';
    }
    return 'unknown_db_error';
  }

  #incrementErrorCounter({ code, operation = 'db_query', step = '' }) {
    const { log, context } = this;
    try {
      const errorCounter = this.metrics.getCounter('errorCount');
      const errDetails = {
        system: 'mysql',
        code,
        context,
        operation,
        ...(step && { step }),
      };
      errorCounter.inc(errDetails);
      log.info('incrementErrorCounter is called:', { errDetails });
    } catch (error) {
      log.warn('error in incrementErrorCounter: ', error);
    }
  }
}

module.exports = KnexWrapper;
