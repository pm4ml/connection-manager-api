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

const winston = require('winston');
const expressWinston = require('express-winston');
const { loggerFactory } = require('@mojaloop/central-services-logger/src/contextLogger');
const Constants = require('../constants/Constants');

const createWinstonLogger = () => {
  return expressWinston.logger({
    transports: [
      new winston.transports.Console()
    ],
    // format: winston.format.combine(
    //   winston.format.colorize(),
    //   winston.format.json()
    // ),
    meta: Constants.WINSTON_REQUEST_META_DATA,
    msg: 'HTTP {{req.method}} {{req.url}}',
    expressFormat: true,
    colorize: false,
    ignoreRoute: function (req, res) { return false; }
  });
};

const logger = loggerFactory('MCM_API');

module.exports = {
  createWinstonLogger,
  logger
};

