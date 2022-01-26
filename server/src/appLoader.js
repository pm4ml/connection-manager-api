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

const db = require('./db/database');
const corsUtils = require('./utils/corsUtils');

const { Model } = require('objection');
const Constants = require('./constants/Constants');

exports.connect = async () => {
  await db.waitForConnection();
  Model.knex(db.knex);
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
  /* function (middleware) {
    // Interpret Swagger resources and attach metadata to request - must be first in swagger-tools middleware chain
    app.use(middleware.swaggerMetadata());

    OAuthHelper.handleMiddleware(middleware, app);

    // Validate Swagger requests
    // https://github.com/apigee-127/swagger-tools/blob/master/docs/Middleware.md#swagger-validator
    // https://github.com/apigee-127/swagger-tools/blob/master/docs/Swagger_Validation.md
    // Comment this out since we're using Joi. This validator returns an html response with no detail
    // app.use(middleware.swaggerValidator());

    // Route validated requests to appropriate controller
    // Ref: https://github.com/apigee-127/swagger-tools/blob/master/docs/Middleware.md
    const options = {
      swaggerUi: path.join(__dirname, '/swagger.json'),
      controllers: path.join(__dirname, './controllers'),
      useStubs: false
    };

    app.use(middleware.swaggerRouter(options));

    // Serve the Swagger documents and Swagger UI
    // https://github.com/apigee-127/swagger-tools/blob/master/docs/Middleware.md#swagger-ui
    app.use(middleware.swaggerUi());
  });

   */

  const app = expressAppConfig.getApp();

  let middlewares = 0;
  app.use(cors(corsUtils.getCorsOptions)); middlewares++;
  app.use(logger.createWinstonLogger()); middlewares++;

  const stack = app._router.stack;
  const lastEntries = stack.splice(app._router.stack.length - middlewares);
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
