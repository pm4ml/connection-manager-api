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
  return knex.schema.createTable('certificate_authorities', (table) => {
    table.increments('id', 11).primary();
    table.integer('env_id', 11).unsigned().notNullable();
    table.text('cert').notNullable();
    table.text('csr').notNullable();
    table.json('cert_info');
    table.json('csr_info');
    table.text('key').notNullable();
    table.tinyint('current', 4).notNullable().defaultTo(0);
    table.json('ca_config');
    table.string('engine_type', 512);
    table.foreign('env_id', 'FK_CA_ENV_ID').references('environments.id').onDelete('CASCADE').onUpdate('NO ACTION');
    table.index('env_id', 'FK_ENV_ID_idx');
    if (!process.env.TEST) table.engine('InnoDB');
    if (!process.env.TEST) table.charset('utf8mb4');
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTableIfExists('certificate_authorities');
};
