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
const ENDPOINT_ITEMS_TABLE = 'dfsp_endpoint_items';

exports.findById = async (id) => {
  if (Array.isArray(id) && id.length === 1) {
    id = id[0];
  }
  const rows = await knex.table(ENDPOINT_ITEMS_TABLE).where('id', id).select();
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
  const ipEntry = JSON.parse(rawObject.value);
  delete rawObject.value;
  const denormObject = { ...rawObject, value: ipEntry };
  return denormObject;
};

/**
 * Gets an endpoint by its id, and parses the JSON in value, returning an Object
 */
exports.findObjectById = async (id) => {
  const rawObject = await exports.findById(id);
  return rowToObject(rawObject);
};

exports.findObjectAll = async (dfspId) => {
  const id = await DFSPModel.findIdByDfspId(dfspId);
  const rawObjects = await knex.table(ENDPOINT_ITEMS_TABLE)
    .where('dfsp_id', id)
    .select();
  const endpoints = Promise.all(rawObjects.map(async row => rowToObject(row)));
  return endpoints;
};

exports.create = async (values) => {
  const id = await DFSPModel.findIdByDfspId(values.dfspId);
  const record = {
    state: values.state,
    type: values.type,
    value: values.value,
    dfsp_id: id,
    direction: values.direction,
  };
  return knex.table(ENDPOINT_ITEMS_TABLE).insert(record);
};

exports.delete = async (id) => {
  return knex.table(ENDPOINT_ITEMS_TABLE).where({ id: id }).del();
};

/**
 * Returns a list of all Environment items with a specific state
 */
exports.findAllEnvState = async (state) => {
  const rawObjects = await knex.table(ENDPOINT_ITEMS_TABLE)
    .join('dfsps', `${ENDPOINT_ITEMS_TABLE}.dfsp_id`, '=', 'dfsps.id')
    .where(`${ENDPOINT_ITEMS_TABLE}.state`, state)
    .select(`${ENDPOINT_ITEMS_TABLE}.*`);
  const endpoints = Promise.all(rawObjects.map(async row => rowToObject(row)));
  return endpoints;
};

/**
 * Returns a list of all DFSP items with a specific state
 */
exports.findAllDfspState = async (dfspId, state) => {
  const id = await DFSPModel.findIdByDfspId(dfspId);
  const rawObjects = await knex.table(ENDPOINT_ITEMS_TABLE)
    .where(`${ENDPOINT_ITEMS_TABLE}.dfsp_id`, id)
    .where(`${ENDPOINT_ITEMS_TABLE}.state`, state)
    .select(`${ENDPOINT_ITEMS_TABLE}.*`);
  const endpoints = Promise.all(rawObjects.map(async row => rowToObject(row)));
  return endpoints;
};

/**
 * Gets a set of endpoints, parse the JSON in value, returning an Array of Objects
 */
exports.findObjectByDirectionType = async (direction, type, dfspId) => {
  const id = await DFSPModel.findIdByDfspId(dfspId);
  const rawObjects = await knex.table(ENDPOINT_ITEMS_TABLE)
    .where(`${ENDPOINT_ITEMS_TABLE}.dfsp_id`, id)
    .where(`${ENDPOINT_ITEMS_TABLE}.direction`, direction)
    .where(`${ENDPOINT_ITEMS_TABLE}.type`, type)
    .select(`${ENDPOINT_ITEMS_TABLE}.*`);
  const endpoints = Promise.all(rawObjects.map(async row => rowToObject(row)));
  return endpoints;
};

exports.update = async (dfspId, id, endpointItem) => {
  const dfspRawId = await DFSPModel.findIdByDfspId(dfspId);
  const result = await knex.table(ENDPOINT_ITEMS_TABLE).where({ id, dfsp_id: dfspRawId }).update(endpointItem);
  if (result === 1) {
    return exports.findObjectById(id);
  } else throw new Error(result);
};
