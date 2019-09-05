const { knex } = require('../db/database');
const DFSPModel = require('./DFSPModel');
const NotFoundError = require('../errors/NotFoundError');
const InternalError = require('../errors/InternalError');
const OUTBOUND_ENROLLMENTS_TABLE = 'outbound_enrollments';

exports.states = {
  NEW: 'NEW',
  CSR_LOADED: 'CSR_LOADED',
  CERT_SIGNED: 'CERT_SIGNED',
  VALIDATED: 'VALIDATED',
  INVALID: 'INVALID'
};
exports.findAll = () => {
  return knex.table(OUTBOUND_ENROLLMENTS_TABLE).select();
};

exports.findById = async (id) => {
  let rows = await knex.table(OUTBOUND_ENROLLMENTS_TABLE).where('id', id).select();
  if (rows.length === 0) {
    throw new NotFoundError('object with id: ' + id);
  } else if (rows.length === 1) {
    let row = rows[0];
    return row;
  } else {
    throw new InternalError('E_TOO_MANY_ROWS');
  }
};

exports.findAllDfsp = async (envId, dfspId, extraWhere) => {
  let id = await DFSPModel.findIdByDfspId(envId, dfspId);
  let baseQuery = knex.table(OUTBOUND_ENROLLMENTS_TABLE).where({ env_id: envId }).where({ dfsp_id: id });
  if (extraWhere) {
    return baseQuery.where(extraWhere).select();
  } else {
    return baseQuery.select();
  }
};

exports.create = async (values) => {
  return knex.table(OUTBOUND_ENROLLMENTS_TABLE).insert(values);
};

exports.delete = async (id) => {
  return knex.table(OUTBOUND_ENROLLMENTS_TABLE).where({ id: id }).del();
};

exports.update = async (id, props) => {
  let result = await knex.table(OUTBOUND_ENROLLMENTS_TABLE).where('id', id).update(props);
  if (result === 1) {
    return { id: id, ...props };
  } else throw new NotFoundError('object not found');
};
