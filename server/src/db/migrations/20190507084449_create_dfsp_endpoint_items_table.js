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
  return knex.schema.createTable('dfsp_endpoint_items', (table) => {
    table.increments('id').primary();
    table.integer('dfsp_id', 11).unsigned().notNullable();
    table.string('state', 512).defaultTo(null);
    table.string('direction', 512).defaultTo(null);
    table.string('value', 1024).defaultTo(null);
    table.string('type', 10).defaultTo(null);
    table.datetime('created_date').notNullable().defaultTo(knex.fn.now());
    table.string('created_by', 1024).defaultTo(null);
    table.foreign('dfsp_id', 'FK_ENDITEM_DFSP_ID').references('dfsps.id').onDelete('CASCADE').onUpdate('NO ACTION');
    table.index('dfsp_id', 'FK_ENDITEM_DFSP_ID_idx');
    if (!process.env.TEST) table.engine('InnoDB');
    if (!process.env.TEST) table.charset('utf8mb4');
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.dropTableIfExists('dfsp_endpoint_items');
};
