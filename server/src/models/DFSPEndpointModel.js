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
const { knex } = require('../db/database');
const DFSPModel = require('./DFSPModel');
const NotFoundError = require('../errors/NotFoundError');
const InternalError = require('../errors/InternalError');
const ENDPOINT_TABLE = 'dfsp_endpoint';

/**
 * Gets an raw endpoint by its id, and parses the JSON in value, returning an Object.
 */
exports.findById = async (id) => {
  if (Array.isArray(id) && id.length === 1) {
    id = id[0];
  }
  const rows = await knex.table(ENDPOINT_TABLE).where('id', id).select();
  if (rows.length === 0) {
    throw new NotFoundError('Item with id: ' + id);
  } else if (rows.length === 1) {
    const row = rows[0];
    return row;
  } else {
    throw new InternalError('E_TOO_MANY_ROWS');
  }
};

const rowToObject = async (rawObject) => {
  const dfsp = await DFSPModel.findByRawId(rawObject.dfsp_id);

  rawObject.dfsp_id = dfsp.dfsp_id;
  let endPoint = rawObject.value

  // # Lets check if we need to parse the value, some MySQL versions will store the JSONB value as a string
  if (typeof rawObject.value === 'string' || rawObject.value instanceof String) {
    endPoint = JSON.parse(rawObject.value);
  }

  delete rawObject.value;

  return {
    ...rawObject,
    ...endPoint
  };
};

/**
 * Gets an endpoint by its id, and parses the JSON in value, returning an Object.
 */
exports.findObjectById = async (id) => {
  const rawObject = await exports.findById(id);
  return rowToObject(rawObject);
};

exports.findObjectAll = async (dfspId) => {
  const dfsp_id = await DFSPModel.findIdByDfspId(dfspId);
  const rawObjects = await knex.table(ENDPOINT_TABLE)
    .where('dfsp_id', dfsp_id)
    .select();
  const endpoints = Promise.all(rawObjects.map(async row => rowToObject(row)));
  return endpoints;
};

/**
 * Gets an endpoint by its id & direction, and parses the JSON in value, returning an Object.
 */
exports.findObjectByDirection = async (dfspId, direction) => {
  const id = await DFSPModel.findIdByDfspId(dfspId);
  const rawObjects = await knex.table(ENDPOINT_TABLE)
    .where('dfsp_id', id)
    .where('direction', direction)
    .select();
  const endpoints = Promise.all(rawObjects.map(async row => rowToObject(row)));
  return endpoints;
};

/**
 * Gets an endpoint by its id & direction, and parses the JSON in value, returning an Object.
 */
 exports.findLastestObjectByDirection = async (dfspId, direction) => {
  const dfsp_id = await DFSPModel.findIdByDfspId(dfspId);
  const rawObject = await knex.table(ENDPOINT_TABLE)
    .where('dfsp_id', dfsp_id)
    .where('direction', direction)
    .orderBy('id', 'desc')
    .first();
  if (rawObject == null) return null;
  return rowToObject(rawObject);
};

/**
 * Creates an endpoint, and parses the JSON in value, returning an Object.
 */
exports.create = async (dfspId, state, type, direction, value) => {
  const dfsp_id = await DFSPModel.findIdByDfspId(dfspId);
  const record = {
    state,
    type,
    value,
    dfsp_id,
    direction: direction,
  };
  return knex.table(ENDPOINT_TABLE).insert(record);
};

/**
 * Deletes an endpoint by id. Note: This should never be used except to cleanup test data.
 */
exports.delete = async (id) => {
  return knex.table(ENDPOINT_TABLE).where({ id: id }).del();
};
