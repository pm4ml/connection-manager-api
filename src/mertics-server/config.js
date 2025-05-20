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

const convict = require('convict');
const { name, version } = require('../../package.json');

/** @type {import('convict').Config} */
const config = convict({
  metricsServerConfig: {
    port: {
      doc: 'Port of metrics server',
      format: 'port',
      default: 9100,
      env: 'METRICS_SERVER_PORT',
    },
    disabled: {
      doc: 'Defines if metrics server is disabled',
      format: Boolean,
      default: false,
      env: 'METRICS_SERVER_DISABLED',
    },
    instrumentationConfig: {
      timeout: 5000,
      prefix: 'mcm_api_',
      defaultLabels: {
        serviceName: name,
        serviceVersion: version
      }
    }
  }
});

config.validate({ allowed: 'strict' });

module.exports = config;
