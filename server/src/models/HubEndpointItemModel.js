'use strict';
const { knex } = require('../db/database');
const NotFoundError = require('../errors/NotFoundError');
const InternalError = require('../errors/InternalError');
const ENDPOINT_ITEMS_TABLE = 'hub_endpoint_items';

exports.findById = async (id) => {
  let rows = await knex.table(ENDPOINT_ITEMS_TABLE).where('id', id).select();
  if (rows.length === 0) {
    throw new NotFoundError('Item with id: ' + id);
  } else if (rows.length === 1) {
    let row = rows[0];
    return row;
  } else {
    throw new InternalError('E_TOO_MANY_ROWS');
  }
};

const rowToObject = (rawObject) => {
  let ipEntry = JSON.parse(rawObject.value);
  delete rawObject.value;
  let denormObject = { ...rawObject, value: ipEntry };
  return denormObject;
};

/**
 * Gets an endpoint by its id, and parses the JSON in value, returning an Object
 */
exports.findObjectById = async (id) => {
  let rawObject = await exports.findById(id);
  return rowToObject(rawObject);
};

exports.findObjectAll = async (envId) => {
  let rawObjects = await knex.table(ENDPOINT_ITEMS_TABLE)
    .where('env_id', envId)
    .select();
  return rawObjects.map(row => rowToObject(row));
};

exports.create = async (values) => {
  let record = {
    state: values.state,
    type: values.type,
    value: values.value,
    env_id: values.envId,
    direction: values.direction,
  };
  return knex.table(ENDPOINT_ITEMS_TABLE).insert(record);
};

exports.delete = async (id) => {
  return knex.table(ENDPOINT_ITEMS_TABLE).where({ id: id }).del();
};

/**
 * Gets a set of endpoints, parse the JSON in value, returning an Array of Objects
 */
exports.findObjectByDirectionType = async (direction, type, envId) => {
  let rawObjects = knex.table(ENDPOINT_ITEMS_TABLE)
    .where(`${ENDPOINT_ITEMS_TABLE}.env_id`, envId)
    .where(`${ENDPOINT_ITEMS_TABLE}.direction`, direction)
    .where(`${ENDPOINT_ITEMS_TABLE}.type`, type)
    .select(`${ENDPOINT_ITEMS_TABLE}.*`);
  return rawObjects.map(row => rowToObject(row));
};

exports.update = async (id, endpointItem) => {
  let result = await knex.table(ENDPOINT_ITEMS_TABLE).where({ id: id }).update(endpointItem);
  if (result === 1) {
    return exports.findObjectById(id);
  } else throw new Error(result);
};
