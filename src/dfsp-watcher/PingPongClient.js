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

const { PingStatus, DEFAULT_HTTP_TIMEOUT_MS } = require('./constants');

/**
 * @typedef {Object} PingPongClientDeps
 * @prop {ContextLogger} logger
 * @prop {AxiosInstance} httpClient
 * @prop {string} pingPongServerUrl
 */

class PingPongClient {
  /**
   * @param {PingPongClientDeps} deps
   * @returns {PingPongClient}
   */
  constructor(deps) {
    this.log = deps.logger.child({ component: this.constructor.name });
    this.httpClient = deps.httpClient;
    this.pingPongServerUrl = deps.pingPongServerUrl;
  }

  /**
   * @typedef {Object} PingPongResponse
   * @prop {string} pingStatus
   * @prop {{ errorCode: string, errorDescription?: string }} [errorInformation]
   */

  /**
   * @param {string} destination
   * @param {string} requestId
   * @returns {Promise<PingPongResponse>}
   */
  async sendPingRequest(destination, requestId) {
    const log = this.log.child({ destination, requestId });
    let data;

    try {
      const url = this.pingPongServerUrl;
      const body = { requestId };
      const headers = await this.#createHeaders(destination);
      data = await this.#sendHttpPost({ url, body, headers });
    } catch (err) {
      data = null;
      log.error(`error in sendPingRequest: `, err);
    }

    return this.#formatPingResponse(data);
  }

  async #createHeaders(destination) {
    return {
      'fspiop-destination': destination,
      'content-type': 'application/json',
    };
  }

  async #sendHttpPost({ url, body, headers, timeout = DEFAULT_HTTP_TIMEOUT_MS }) {
    const { data } = await this.httpClient.post(url, body, { headers, timeout });
    this.log.debug(`sendPingRequest is done: `, { data, url, body, headers });
    return data;
  }

  /** @returns {Promise<PingPongResponse>} */
  async #formatPingResponse(data) {
    if (!data) return {
      pingStatus: PingStatus.NOT_REACHABLE,
      errorInformation: { errorCode: '1001' }
      // todo: think which errorCode to use in case of error on sending http request
    };

    const { pingStatus, fspPutResponse } = data;
    return {
      pingStatus,
      ...(fspPutResponse?.body?.errorInformation && {
        errorInformation: fspPutResponse.body.errorInformation
      })
    };
  }
}

module.exports = PingPongClient;
