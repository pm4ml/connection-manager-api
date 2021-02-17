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
const { validateCfsslVersion } = require('./utils/cfssl');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = require('connect')();
const swaggerTools = require('swagger-tools');
const jsyaml = require('js-yaml');
const logger = require('./log/logger');
const OAuthHelper = require('./oauth/OAuthHelper');

const db = require('./db/database');
const printToolsVersion = require('./utils/printToolVersion');
const corsUtils = require('./utils/corsUtils');

const { Model } = require('objection');

exports.connect = async () => {
  await db.waitForConnection();
  Model.knex(db.knex);
  await db.runKnexMigrations();
  await executeSSLCustomLogic();
  printToolsVersion.printToolsVersion();
  setUpTempFilesManagement();

  app.use(cors(corsUtils.getCorsOptions));
  app.use(logger.createWinstonLogger());

  // Initialize the Swagger middleware
  swaggerTools.initializeMiddleware(getSwaggerDoc(), function (middleware) {
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
    var options = {
      swaggerUi: path.join(__dirname, '/swagger.json'),
      controllers: path.join(__dirname, './controllers'),
      useStubs: false
    };

    app.use(middleware.swaggerRouter(options));

    // Serve the Swagger documents and Swagger UI
    // https://github.com/apigee-127/swagger-tools/blob/master/docs/Middleware.md#swagger-ui
    app.use(middleware.swaggerUi());
  });
  return app;
};

/**
 * Load custom SSL Logic to issue and process CSRs and Certificates
 */
async function executeSSLCustomLogic () {
  enableCustomRootCAs();

  try {
    await validateCfsslVersion();
  } catch (error) {
    console.error('Error while validating Cfssl version:', error);
    process.exit(-1);
  }
}

/**
 * Returns the swagger doc to use
 *
 */
function getSwaggerDoc () {
  var spec = fs.readFileSync(path.join(__dirname, 'api/swagger.yaml'), 'utf8');
  var swaggerDoc = jsyaml.safeLoad(spec);
  return swaggerDoc;
}

/**
 * Configures the tmp module to clean up files on shutdon
 */
function setUpTempFilesManagement () {
  const tmp = require('tmp');
  tmp.setGracefulCleanup();
}
