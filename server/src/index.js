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
const Constants = require('./constants/Constants');

const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const app = require('connect')();
const swaggerTools = require('swagger-tools');
const jsyaml = require('js-yaml');
const serverPort = Constants.SERVER.PORT;
const winston = require('winston');
const expressWinston = require('express-winston');
const OAuthHelper = require('./oauth/OAuthHelper');
const spawnProcess = require('./process/spawner');
const db = require('./db/database');

const printToolsVersion = () => {
  spawnProcess('cfssl', ['version'], '')
    .then(cfsslResult => {
      let { stdout } = cfsslResult;
      console.log('\nRunning cfssl version: ', stdout);
    })
    .catch(err => {
      console.error('Error while trying to print cfssl version: ', err);
    });

  spawnProcess('openssl', ['version'], '')
    .then(opensslResult => {
      let { stdout } = opensslResult;
      console.log('\nRunning openssl version: ', stdout);
    })
    .catch(err => {
      console.error('Error while trying to print openssl version: ', err);
    });
};

printToolsVersion();

const isAuthEnabled = Constants.OAUTH.AUTH_ENABLED != null && (Constants.OAUTH.AUTH_ENABLED === 'true' || Constants.OAUTH.AUTH_ENABLED === 'TRUE');

setUpTempFilesManagement();

const whitelist = ['http://devint1-pkiadminweb.casahub.live', 'https://devint1-pkiadminweb.casahub.live'];
const corsOptions = {
  credentials: true,
  origin: function (requestOrigin, callback) {
    if (!isAuthEnabled) {
      console.log(`cors origin callback: allowing ${requestOrigin} - No Auth`);
      callback(null, true);
    // requests from curl don't usually have the Origin header
    } else if (!requestOrigin) {
      console.log(`cors origin callback: allowing ${requestOrigin} - No requestOrigin`);
      callback(null, true);
    } else if (requestOrigin.indexOf('localhost') !== -1 || whitelist.indexOf(requestOrigin) !== -1) {
      console.log(`cors origin callback: allowing ${requestOrigin} - whitelisted`);
      callback(null, true);
    } else {
      console.log(`cors origin callback: allowing ${requestOrigin} since we don't know where the UI is published in UAT`);
      callback(null, true);
      // callback(new Error('Not allowed by CORS:  requestOrigin: ', requestOrigin));
    }
  }
};
app.use(cors(corsOptions));

app.use(createWinstonLogger());

db.runKnexMigrationIfNeeded();

// Initialize the Swagger middleware
swaggerTools.initializeMiddleware(getSwaggerDoc(), function (middleware) {
  // Interpret Swagger resources and attach metadata to request - must be first in swagger-tools middleware chain
  app.use(middleware.swaggerMetadata());

  if (isAuthEnabled) {
    console.log(`Enabling OAUTH. Constants.OAUTH.AUTH_ENABLED = ${Constants.OAUTH.AUTH_ENABLED}`);
    app.use('/api/environments', OAuthHelper.getOAuth2Middleware());
    // https://github.com/apigee-127/swagger-tools/blob/master/docs/Middleware.md#swagger-security
    app.use('/api/environments', middleware.swaggerSecurity({
      OAuth2: OAuthHelper.oauth2PermissionsVerifier
    }));
  } else {
    console.log(`NOT enabling OAUTH. Constants.OAUTH.AUTH_ENABLED = ${Constants.OAUTH.AUTH_ENABLED}`);
  }

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

  // Start the server
  http.createServer(app).listen(serverPort, function () {
    console.log('Connection-Manager API server is listening on port %d (http://localhost:%d)', serverPort, serverPort);
    console.log('Swagger-ui is available on http://localhost:%d/docs', serverPort);
  });
});

/**
 * Returns the swagger doc to use
 *
 */
function getSwaggerDoc () {
  var spec = fs.readFileSync(path.join(__dirname, 'api/swagger.yaml'), 'utf8');
  var swaggerDoc = jsyaml.safeLoad(spec);
  return swaggerDoc;
}

function createWinstonLogger () {
  return expressWinston.logger({
    transports: [
      new winston.transports.Console()
    ],
    // format: winston.format.combine(
    //   winston.format.colorize(),
    //   winston.format.json()
    // ),
    meta: true,
    msg: 'HTTP {{req.method}} {{req.url}}',
    expressFormat: true,
    colorize: false,
    ignoreRoute: function (req, res) { return false; }
  });
}

/**
 * Configures the tmp module to clean up files on shutdon
 */
function setUpTempFilesManagement () {
  const tmp = require('tmp');
  tmp.setGracefulCleanup();
}
