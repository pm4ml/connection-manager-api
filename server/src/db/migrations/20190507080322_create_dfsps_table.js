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

exports.up = (knex) => knex.schema.createTable('dfsps', (table) => {
  table.increments('id').primary().unsigned().notNullable();
  table.string('name', 512).notNullable();
  table.string('identifier', 512).defaultTo(null);
  table.index('id');
  table.engine('InnoDB');
  table.charset('utf8mb4');
});

exports.down = knex => knex.schema.dropTableIfExists('dfsps');
