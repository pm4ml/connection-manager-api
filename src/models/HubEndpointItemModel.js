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

const db = require('../db/database');
const NotFoundError = require('../errors/NotFoundError');
const InternalError = require('../errors/InternalError');

const ENDPOINT_ITEMS_TABLE = 'hub_endpoint_items';
const dbTable = db.knex.table(ENDPOINT_ITEMS_TABLE);
const runQuery = async (queryFn, operation) => db.executeWithErrorCount(queryFn, operation);

exports.findById = async (id) => {
  const rows = await runQuery(() => dbTable
    .where('id', id)
    .select(), 'findHubEndpointItemById');
  if (rows.length === 0) {
    throw new NotFoundError('Item with id: ' + id);
  } else if (rows.length === 1) {
    return rows[0];
  } else {
    throw new InternalError('E_TOO_MANY_ROWS');
  }
};

const rowToObject = (rawObject) => {
  const ipEntry = JSON.parse(rawObject.value);
  delete rawObject.value;
  return {
    ...rawObject,
    value: ipEntry
  };
};

/**
 * Gets an endpoint by its id, and parses the JSON in value, returning an Object
 */
exports.findObjectById = async (id) => {
  const rawObject = await exports.findById(id);
  return rowToObject(rawObject);
};

exports.findObjectAll = async () => {
  const rawObjects = await runQuery(() => dbTable.select());
  return rawObjects.map(row => rowToObject(row));
};

exports.create = async (values) => {
  const record = {
    state: values.state,
    type: values.type,
    value: values.value,
    direction: values.direction,
  };
  return runQuery(() => dbTable.insert(record), 'createHubEndpointItem');
};

exports.delete = async (id) => {
  return runQuery(() => dbTable.where({ id }).del());
};

/**
 * Gets a set of endpoints, parse the JSON in value, returning an Array of Objects
 */
exports.findObjectByDirectionType = async (direction, type) => {
  const rawObjects = await runQuery(() => dbTable
    .where(`${ENDPOINT_ITEMS_TABLE}.direction`, direction)
    .where(`${ENDPOINT_ITEMS_TABLE}.type`, type)
    .select(`${ENDPOINT_ITEMS_TABLE}.*`), 'findObjectByDirectionType');
  return rawObjects.map(row => rowToObject(row));
};

exports.update = async (id, endpointItem) => {
  const result = await runQuery(() => dbTable
    .where({ id })
    .update(endpointItem), 'updateHubEndpointItem');
  if (result === 1) {
    return exports.findObjectById(id);
  } else throw new Error(result);
};
