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
 *  limitations under the License.                                            *
 ******************************************************************************/

const Constants = require('../constants/Constants');
const retry = require('async-retry');
const exitHook = require('async-exit-hook');

const knexOptions = {
  client: 'mysql2',
  connection: {
    host: Constants.DATABASE.DATABASE_HOST,
    port: Constants.DATABASE.DATABASE_PORT,
    user: Constants.DATABASE.DATABASE_USER,
    password: Constants.DATABASE.DATABASE_PASSWORD,
    database: Constants.DATABASE.DATABASE_SCHEMA,
    charset: 'utf8mb4',
  },
  pool: {
    min: 0,
    max: 10,
  },
  asyncStackTraces: true
};

const defaultKnex = require('knex')(knexOptions);

exports.setKnex = (knexOptions) => {
  exports.knex = require('knex')(knexOptions);
};

exports.waitForConnection = async () => {
  await retry(async (_, attempt) => {
    console.log(`Attempting database connection. Attempt ${attempt} of ${Constants.DATABASE.DB_RETRIES + 1}`);
    await exports.knex.raw('SELECT 1');
    exitHook(callback => {
      exports.knex.destroy().finally(callback);
    });
    
    console.log('Database connection attempt successful');
  }, {
    retries: Constants.DATABASE.DB_RETRIES,
    minTimeout: Constants.DATABASE.DB_CONNECTION_RETRY_WAIT_MILLISECONDS,
    onRetry: () => console.log('Database connection attempt failed'),
    // 1.3 ^ 10 ~= 14
    // therefore, a factor of 1.3 with an initial 1s delay has a maximum between-attempt delay of
    // 28 seconds, including jitter up to a factor of 2
    factor: 1.3,
    // async-retry has a default `randomize` parameter here which randomises retry delays by
    // multiplying them by a factor of [1,2]. We leave this default to mitigate thundering herd,
    // even though that's rather unlikely. You never know where your code will end up..
  });
};

exports.knex = defaultKnex;
