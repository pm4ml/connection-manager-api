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
const { enableCustomRootCAs } = require('./utils/tlsUtils');
const cors = require('cors');
const path = require('path');
// const app = require('connect')();
const oas3Tools = require('oas3-tools');
const logger = require('./log/logger');
const OAuthHelper = require('./oauth/OAuthHelper');
const HubCAService = require('./service/HubCAService');

const db = require('./db/database');
const corsUtils = require('./utils/corsUtils');

const Constants = require('./constants/Constants');
const PKIEngine = require('./pki_engine/VaultPKIEngine');
const NotFoundError = require('./errors/NotFoundError');
const CertManager = require('./pki_engine/CertManager');

exports.connect = async () => {
  await db.waitForConnection();
  await executeSSLCustomLogic();
  // await pkiService.init(Constants.vault);

  // swaggerRouter configuration
  const options = {
    routing: {
      controllers: path.join(__dirname, './controllers')
    },
    logging: {
      format: 'combined',
      errorLimit: 400
    },
    openApiValidator: {
      validateSecurity: {
        handlers: {
          OAuth2: Constants.OAUTH.AUTH_ENABLED ? OAuthHelper.createOAuth2Handler() : () => true,
        }
      }
    }
  };

  // Initialize the Swagger middleware
  const expressAppConfig = oas3Tools.expressAppConfig(path.join(__dirname, 'api/swagger.yaml'), options);

  const app = expressAppConfig.getApp();

  const pkiEngine = new PKIEngine(Constants.vault);
  await pkiEngine.connect();

  let certManager;
  if (Constants.certManager.enabled) {
    certManager = new CertManager({
      ...Constants.certManager,
      logger,
    });
  }

  let rootCA;
  const ctx = { pkiEngine, certManager };
  try {
    rootCA = await HubCAService.getHubCA(ctx);
  } catch (e) {
    if (!(e instanceof NotFoundError)) {
      throw e;
    }
  }
  if (!rootCA) {
    await HubCAService.createInternalHubCA(ctx, Constants.caCsrParameters);
  }

  const middlewares = [
    (req, res, next) => {
      req.context = {
        pkiEngine,
        certManager,
      };
      next();
    },
    cors(corsUtils.getCorsOptions),
    logger.createWinstonLogger()
  ];

  app.use(...middlewares);
  const stack = app._router.stack;
  const lastEntries = stack.splice(app._router.stack.length - middlewares.length);
  const firstEntries = stack.splice(0, 5);
  app._router.stack = [...firstEntries, ...lastEntries, ...stack];
  // console.log(app._router.stack);

  return app;
};

/**
 * Load custom SSL Logic to issue and process CSRs and Certificates
 */
async function executeSSLCustomLogic () {
  enableCustomRootCAs();
}
