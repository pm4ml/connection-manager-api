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

'use strict';

exports.up = async (knex) => {
  return knex.schema.hasTable('currency').then(function (exists) {
    if (!exists) {
      return knex.schema.createTable('currency', (t) => {
        t.string('currencyId', 3).primary().notNullable();
        t.string('name', 128).defaultTo(null).nullable();
        t.integer('scale').unsigned().defaultTo(4).notNullable();
        t.boolean('isActive').defaultTo(true).notNullable();
        t.dateTime('createdDate').defaultTo(knex.fn.now()).notNullable();
        t.boolean('enabled').defaultTo(false).notNullable();
      });
    }
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('currency');
};
