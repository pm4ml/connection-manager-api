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
  return knex.schema.table('outbound_enrollments', function (table) {
    table.dropColumn('signing_validation_result');
    table.dropColumn('key_validation_result');
    table.dropColumn('key_validation_output');
    table.dropColumn('signing_validation_output');
  });
};

exports.down = function (knex, Promise) {
  return knex.schema.table('outbound_enrollments', function (table) {
    table.string('key_validation_result', 512).defaultTo(null);
    table.text('key_validation_output').defaultTo(null);
    table.string('signing_validation_result', 512).defaultTo(null);
    table.text('signing_validation_output').defaultTo(null);
  });
};
