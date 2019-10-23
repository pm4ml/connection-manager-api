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
  return knex.schema.hasTable('monetaryZone').then(function (exists) {
    if (!exists) {
      return knex.schema.createTable('monetaryZone', (t) => {
        t.string('monetaryZoneId', 3).primary().notNullable();
        t.foreign('monetaryZoneId').references('currencyId').inTable('currency');
        t.string('name', 256).notNullable();
        t.string('description', 512).defaultTo(null).nullable();
        t.boolean('isActive').defaultTo(true).notNullable();
        t.dateTime('createdDate').defaultTo(knex.fn.now()).notNullable();
        t.string('createdBy', 128).defaultTo('admin').notNullable();
      });
    }
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('monetaryZone');
};
