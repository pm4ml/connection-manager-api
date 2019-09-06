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
  return knex.schema.createTable('dfsp_cas', (table) => {
    table.increments('id').primary();
    table.integer('dfsp_id', 11).unsigned().notNullable();
    table.text('root_certificate');
    table.string('root_certificate_state', 512);
    table.text('root_certificate_validation');
    table.text('intermediate_chain');
    table.string('intermediate_chain_state', 512);
    table.text('intermediate_chain_validation');
    table.foreign('dfsp_id', 'FK_DFSPCAS_DFSP_ID').references('dfsps.id').onDelete('CASCADE').onUpdate('NO ACTION');
    table.index('dfsp_id', 'FK_DFSPCAS_DFSP_ID_idx');
    if (!process.env.TEST) table.engine('InnoDB');
    if (!process.env.TEST) table.charset('utf8mb4');
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTableIfExists('dfsp_cas');
};
