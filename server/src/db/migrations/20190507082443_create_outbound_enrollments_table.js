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
  return knex.schema.createTable('outbound_enrollments', (table) => {
    table.increments('id', 11).primary();
    table.integer('env_id', 11).unsigned().notNullable();
    table.integer('dfsp_id', 11).unsigned().notNullable();
    table.text('dfsp_ca_bundle');
    table.text('csr');
    table.text('key');
    table.text('cert');
    table.json('cert_info');
    table.json('csr_info');
    table.string('state', 512).defaultTo(null); ;
    table.string('key_validation_result', 512).defaultTo(null);
    table.text('key_validation_output').defaultTo(null);
    table.string('signing_validation_result', 512).defaultTo(null);
    table.text('signing_validation_output').defaultTo(null);
    table.foreign('dfsp_id', 'FK_OUTENROL_DFSP_ID').references('dfsps.id').onDelete('CASCADE').onUpdate('NO ACTION');
    table.foreign('env_id', 'FK_OUTENROL_ENV_ID').references('environments.id').onDelete('CASCADE').onUpdate('NO ACTION');
    table.index('env_id', 'FK_OUTENROL_ENV_ID_idx');
    table.index('dfsp_id', 'FK_OUTENROL_DFSP_ID_idx');
    if (!process.env.TEST) table.engine('InnoDB');
    if (!process.env.TEST) table.charset('utf8mb4');
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTableIfExists('outbound_enrollments');
};
