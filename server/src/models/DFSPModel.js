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

exports.create = async (values) => {
  return knex.table(DFSP_TABLE).insert(values);
};

exports.deleteByRawId = async (id) => {
  return knex.table(DFSP_TABLE).where({ id: id }).del();
};

exports.delete = async (envId, dfspId) => {
  return knex.table(DFSP_TABLE).where('env_id', envId).where({ dfsp_id: dfspId }).del();
};
