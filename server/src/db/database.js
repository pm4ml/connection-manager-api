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
const path = require('path');
const initialConfiguration = require('./InitialDataConfiguration');

let knexOptions = {
  client: 'mysql',
  version: '5.7',
  connection: {
    host: Constants.DATABASE.DATABASE_HOST,
    port: Constants.DATABASE.DATABASE_PORT,
    user: Constants.DATABASE.DATABASE_USER,
    password: Constants.DATABASE.DATABASE_PASSWORD,
    database: Constants.DATABASE.DATABASE_SCHEMA,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
  },
  pool: {
    min: 0,
    max: 10,
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: path.join(__dirname, '/migrations')
  },
  asyncStackTraces: true
};

const defaultKnex = require('knex')(knexOptions);

exports.setKnex = (knexOptions) => {
  exports.knex = require('knex')(knexOptions);
};

const runKnexMigrations = async () => {
  console.log('Migrating');
  await exports.knex.migrate.latest();
  console.log('Migration done');
  await initialConfiguration.runInitialConfigurations();
};

// design your application to attempt to re-establish a connection to the database after a failure
// https://docs.docker.com/compose/startup-order/
let dbRetries = 1;
exports.runKnexMigrationIfNeeded = async () => {
  if (Constants.DATABASE.RUN_MIGRATIONS) {
    try {
      await runKnexMigrations();
      console.log(`success connected to DB and tables created after trying : ${dbRetries} time(s)`);
    } catch (e) {
      console.log(`error connecting to the database. Attempting retry: ${dbRetries}`);
      dbRetries++;
      if (dbRetries === Constants.DATABASE.DB_RETRIES) {
        console.error('could not get connection to DB after retries', e);
        process.exit(1);
      } else {
        setTimeout(
          exports.runKnexMigrationIfNeeded,
          Constants.DATABASE.DB_CONNECTION_RETRY_WAIT_MILLISECONDS
        );
      }
    }
  }
};

exports.knex = defaultKnex;
