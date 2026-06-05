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

const db = require('../db/database');

const TABLE = 'audit_log';
const runQuery = async (queryFn, operation) => db.executeWithErrorCount(queryFn, operation);

exports.create = async (entry) => {
  const row = {
    created_at: entry.createdAt || new Date(),
    actor: entry.actor || null,
    action: entry.action,
    entity_type: entry.entityType || null,
    entity_id: entry.entityId || null,
    before_state: entry.beforeState ? JSON.stringify(entry.beforeState) : null,
    after_state: entry.afterState ? JSON.stringify(entry.afterState) : null,
  };
  const [id] = await runQuery((knex) => knex.table(TABLE).insert(row), 'createAuditEntry');
  return { id };
};

exports.findAll = async ({ from, to, actor, action, limit = 100, offset = 0 } = {}) => {
  const rows = await runQuery((knex) => {
    const q = knex.table(TABLE).select().orderBy('created_at', 'desc').limit(limit).offset(offset);
    if (from) q.where('created_at', '>=', new Date(from));
    if (to) q.where('created_at', '<=', new Date(to));
    if (actor) q.where('actor', actor);
    if (action) q.where('action', action);
    return q;
  }, 'findAuditLog');

  return rows.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    actor: row.actor,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    beforeState: row.before_state ?? null,
    afterState: row.after_state ?? null,
  }));
};
