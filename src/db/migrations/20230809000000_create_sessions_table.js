// Copyright 2023 ModusBox, Inc.
// 
// Licensed under the Apache License, Version 2.0 (the "License").
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * Create the sessions table for express-mysql-session
 */
exports.up = function(knex) {
  return knex.schema.hasTable('sessions').then(function(exists) {
    if (!exists) {
      return knex.schema.createTable('sessions', function(table) {
        table.string('session_id').primary();
        table.integer('expires', 11).unsigned().notNullable();
        table.text('data', 'longtext').notNullable();
        table.datetime('created_at').defaultTo(knex.fn.now());
        table.index(['expires'], 'sessions_expires_index');
      });
    }
  });
};

/**
 * Drop the sessions table
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('sessions');
}; 