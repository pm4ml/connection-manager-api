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

exports.up = function (knex, Promise) {
  return knex.schema.createTable('hub_issuer_cas', (table) => {
    table.increments('id').primary();
    table.integer('env_id', 11).unsigned();
    table.string('type', 512).notNullable();
    table.string('name', 512).notNullable();
    table.text('root_cert');
    table.text('chain');
    table.json('root_cert_info');
    table.json('chain_info');
    table.json('validations').defaultTo(null);
    table.string('validationState', 512).defaultTo(null);
    table.foreign('env_id', 'FK_ISSUERCAS_ENV_ID').references('environments.id').onDelete('CASCADE').onUpdate('NO ACTION');
    table.index('env_id', 'FK_ISSUERCAS_ENV_ID_idx');
    if (!process.env.TEST) table.engine('InnoDB');
    if (!process.env.TEST) table.charset('utf8mb4');
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTableIfExists('hub_issuer_cas');
};
