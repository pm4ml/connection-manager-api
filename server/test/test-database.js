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

const path = require('path');
const initialConfiguration = require('../src/db/InitialDataConfiguration');

const { Model } = require('objection');

const knexOptions = {
  client: 'sqlite3',
  connection: {
    filename: ':memory:',
  },
  migrations: {
    directory: path.join(__dirname, '/../src/db/migrations')
  },
  useNullAsDefault: true,
  pool: {
    afterCreate: (conn, cb) =>
      conn.run('PRAGMA foreign_keys = ON', cb)
  },
};

const { setKnex } = require('../src/db/database');
setKnex(knexOptions);

// Now set up the test DB

const { knex } = require('../src/db/database');

const runKnexMigrations = async () => {
  console.log('Migrating');
  await knex.migrate.latest();
  console.log('Migration done');
};

exports.setupTestDB = async () => {
  Model.knex(knex);
  await knex.initialize();
  await runKnexMigrations();
  await initialConfiguration.runInitialConfigurations();
};

exports.tearDownTestDB = async () => {
  await knex.destroy();
};
