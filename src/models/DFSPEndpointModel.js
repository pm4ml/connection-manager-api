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
const findRawById = async (id) => {
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
  const endPoint = rawObject.value;

  delete rawObject.value;

  return {
    ...rawObject,
    ...endPoint
  };
};

/**
 * Gets an endpoint by its id, and parses the JSON in value, returning an Object.
 */
exports.findById = async (id) => {
  const rawObject = await findRawById(id);
  return rowToObject(rawObject);
};

exports.findAll = async (dfspId) => {
  const validatedDfspId = await DFSPModel.findIdByDfspId(dfspId);
  const rawObjects = await knex.table(ENDPOINT_TABLE)
    .where('dfsp_id', validatedDfspId)
    .select();
  const endpoints = Promise.all(rawObjects.map(row => rowToObject(row)));
  return endpoints;
};

/**
 * Gets an endpoint by its id & direction, and parses the JSON in value, returning an Object.
 */
exports.findAllByDirection = async (dfspId, direction) => {
  const id = await DFSPModel.findIdByDfspId(dfspId);
  const rawObjects = await knex.table(ENDPOINT_TABLE)
    .where('dfsp_id', id)
    .where('direction', direction)
    .select();
  const endpoints = Promise.all(rawObjects.map(row => rowToObject(row)));
  return endpoints;
};

/**
 * Gets all latest endpoints by its direction, and parses the JSON in value, returning an Object.
 */
exports.findAllLatestByDirection = async (direction) => {
  const rawObjects = await knex.raw(`
    WITH ep AS (
       SELECT *, RANK() OVER (PARTITION BY dfsp_id
                               ORDER BY id DESC
                          ) AS ep_rank
         FROM dfsp_endpoint
         WHERE direction = '${direction}'
    )
    SELECT *
      FROM ep
      WHERE ep_rank = 1
    ORDER BY dfsp_id;
  `);
  const endpoints = Promise.all(rawObjects[0].map(row => rowToObject(row)));
  return endpoints;
};

/**
 * Gets an endpoint by its id & direction, and parses the JSON in value, returning an Object.
 */
exports.findLastestByDirection = async (dfspId, direction) => {
  const validatedDfspId = await DFSPModel.findIdByDfspId(dfspId);
  const rawObject = await knex.table(ENDPOINT_TABLE)
    .where('dfsp_id', validatedDfspId)
    .where('direction', direction)
    .orderBy('id', 'desc')
    .first();
  if (rawObject == null) return null;
  return rowToObject(rawObject);
};

/**
 * Creates an endpoint, and parses the JSON in value, returning an Object.
 */
exports.create = async (dfspId, state, direction, value) => {
  const validatedDfspId = await DFSPModel.findIdByDfspId(dfspId);
  const record = {
    state,
    value,
    dfsp_id: validatedDfspId,
    direction,
  };
  return knex.table(ENDPOINT_TABLE).insert(record);
};

/**
 * Deletes an endpoint by id. Note: This should never be used except to cleanup test data.
 */
exports.delete = async (id) => {
  return knex.table(ENDPOINT_TABLE).where({ id }).del();
};
