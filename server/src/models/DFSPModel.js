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
const DFSP_TABLE = 'dfsps';

exports.findAll = () => {
  return knex.table(DFSP_TABLE).select();
};

exports.findAllByEnvironment = (envId) => {
  return knex.table(DFSP_TABLE).where({ env_id: envId }).select();
};

exports.findByRawId = async (id) => {
  return findByField(null, 'id', id);
};

exports.findIdByDfspId = async (envId, dfspId) => {
  let dfspRow = await exports.findByDfspId(envId, dfspId);
  return dfspRow.id;
};

exports.findByDfspId = async (envId, dfspId) => {
  return findByField(envId, 'dfsp_id', dfspId);
};

exports.getDfspsByMonetaryZones = async (envId, monetaryZoneId) => {
  return findAllByField(envId, 'monetaryZoneId', monetaryZoneId);
};

const findByField = async (envId, columnName, value) => {
  let rows;
  if (envId != null) {
    rows = await knex.table(DFSP_TABLE).where('env_id', envId).where(columnName, value).select();
  } else {
    rows = await knex.table(DFSP_TABLE).where(columnName, value).select();
  }
  if (rows.length === 0) {
    throw new NotFoundError(`dfsp with ${columnName} = ${value} , env_id: ${envId}`);
  } else if (rows.length === 1) {
    let row = rows[0];
    return row;
  } else {
    throw new InternalError('E_TOO_MANY_ROWS');
  }
};

const findAllByField = async (envId, columnName, value) => {
  let rows;
  if (envId != null) {
    rows = await knex.table(DFSP_TABLE).where('env_id', envId).where(columnName, value).select();
  } else {
    rows = await knex.table(DFSP_TABLE).where(columnName, value).select();
  }
  if (rows.length === 0) {
    throw new NotFoundError(`dfsp with ${columnName} = ${value} , env_id: ${envId}`);
  } else {
    return rows;
  }
};

exports.create = async (values) => {
  return knex.table(DFSP_TABLE).insert(values);
};

exports.deleteByRawId = async (id) => {
  return knex.table(DFSP_TABLE).where({ id: id }).del();
};

exports.delete = async (envId, dfspId) => {
  return knex.table(DFSP_TABLE).where('env_id', envId).where({ dfsp_id: dfspId }).del();
};

exports.update = async (envId, dfspId, newDfsp) => {
  let result = await knex.table(DFSP_TABLE).where('env_id', envId).where({ dfsp_id: dfspId }).update(newDfsp);
  if (result === 0) {
    throw new NotFoundError(`dfsp with ${dfspId}, env_id: ${envId}`);
  } else if (result === 1) {
    const dfsp = await exports.findByDfspId(envId, dfspId);
    // return { dfspId: dfsp.dfsp_id, name: dfsp.name, monetaryZoneId: dfsp.monetaryZoneId, securityGroup: dfsp.security_group };
    return rowToObject(dfsp);
  } else {
    throw new InternalError('E_TOO_MANY_ROWS');
  }
};

const rowToObject = (dfsp) => {
  return { dfspId: dfsp.dfsp_id,
    name: dfsp.name,
    monetaryZoneId: dfsp.monetaryZoneId ? dfsp.monetaryZoneId : undefined,
    securityGroup: dfsp.security_group
  };
};
