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

const { knex } = require('../db/database');
const NotFoundError = require('../errors/NotFoundError');
const InternalError = require('../errors/InternalError');

const ENVIRONMENTS_TABLE = 'environments';

exports.findAll = () => {
  return knex.table(ENVIRONMENTS_TABLE).select();
};

exports.findById = async (id) => {
  let rows = await knex.table(ENVIRONMENTS_TABLE).where('id', id).select();
  if (rows.length === 0) {
    throw new NotFoundError('Object with id: ' + id);
  } else if (rows.length === 1) {
    let row = rows[0];
    return row;
  } else {
    throw new InternalError('E_TOO_MANY_ROWS');
  }
};

exports.create = async (values) => {
  return knex.table(ENVIRONMENTS_TABLE).insert(values);
};

exports.delete = async (envId) => {
  return knex.table(ENVIRONMENTS_TABLE).where({ id: envId }).del();
};

exports.mapRowToObject = (row) => {
  return {
    id: row.id,
    name: row.name,
    defaultDN: {
      CN: row.CN,
      C: row.C,
      L: row.L,
      O: row.O,
      OU: row.OU,
      ST: row.ST,
    }
  };
};
