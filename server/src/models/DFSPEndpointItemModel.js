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

const rowToObject = async (rawObject) => {
  let dfsp = await DFSPModel.findByRawId(rawObject.dfsp_id);
  rawObject.dfsp_id = dfsp.dfsp_id;
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

exports.findObjectAll = async (envId, dfspId) => {
  let id = await DFSPModel.findIdByDfspId(envId, dfspId);
  let rawObjects = await knex.table(ENDPOINT_ITEMS_TABLE)
    .where('dfsp_id', id)
    .select();
  let endpoints = Promise.all(rawObjects.map(async row => rowToObject(row)));
  return endpoints;
};

exports.create = async (envId, values) => {
  let id = await DFSPModel.findIdByDfspId(envId, values.dfspId);
  let record = {
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
exports.findAllEnvState = async (envId, state) => {
  let rawObjects = await knex.table(ENDPOINT_ITEMS_TABLE)
    .join('dfsps', `${ENDPOINT_ITEMS_TABLE}.dfsp_id`, '=', 'dfsps.id')
    .where('dfsps.env_id', envId)
    .where(`${ENDPOINT_ITEMS_TABLE}.state`, state)
    .select(`${ENDPOINT_ITEMS_TABLE}.*`);
  let endpoints = Promise.all(rawObjects.map(async row => rowToObject(row)));
  return endpoints;
};

/**
 * Returns a list of all DFSP items with a specific state
 */
exports.findAllDfspState = async (envId, dfspId, state) => {
  let id = await DFSPModel.findIdByDfspId(envId, dfspId);
  let rawObjects = await knex.table(ENDPOINT_ITEMS_TABLE)
    .where(`${ENDPOINT_ITEMS_TABLE}.dfsp_id`, id)
    .where(`${ENDPOINT_ITEMS_TABLE}.state`, state)
    .select(`${ENDPOINT_ITEMS_TABLE}.*`);
  let endpoints = Promise.all(rawObjects.map(async row => rowToObject(row)));
  return endpoints;
};

/**
 * Gets a set of endpoints, parse the JSON in value, returning an Array of Objects
 */
exports.findObjectByDirectionType = async (direction, type, envId, dfspId) => {
  let id = await DFSPModel.findIdByDfspId(envId, dfspId);
  let rawObjects = await knex.table(ENDPOINT_ITEMS_TABLE)
    .where(`${ENDPOINT_ITEMS_TABLE}.dfsp_id`, id)
    .where(`${ENDPOINT_ITEMS_TABLE}.direction`, direction)
    .where(`${ENDPOINT_ITEMS_TABLE}.type`, type)
    .select(`${ENDPOINT_ITEMS_TABLE}.*`);
  let endpoints = Promise.all(rawObjects.map(async row => rowToObject(row)));
  return endpoints;
};

exports.update = async (id, endpointItem) => {
  let result = await knex.table(ENDPOINT_ITEMS_TABLE).where({ id: id }).update(endpointItem);
  if (result === 1) {
    return exports.findObjectById(id);
  } else throw new Error(result);
};
