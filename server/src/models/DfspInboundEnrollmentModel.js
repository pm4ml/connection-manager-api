const { knex } = require('../db/database');
const DFSPModel = require('./DFSPModel');
const NotFoundError = require('../errors/NotFoundError');
const InternalError = require('../errors/InternalError');
const INBOUND_ENROLLMENTS_TABLE = 'inbound_enrollments';

exports.findAll = () => {
  return knex.table(INBOUND_ENROLLMENTS_TABLE).select();
};

exports.findById = async (id) => {
  let rows = await knex.table(INBOUND_ENROLLMENTS_TABLE).where('id', id).select();
  if (rows.length === 0) {
    throw new NotFoundError('object with id: ' + id);
  } else if (rows.length === 1) {
    let row = rows[0];
    return row;
  } else {
    throw new InternalError('E_TOO_MANY_ROWS');
  }
};

exports.findAllDfsp = async (envId, dfspId) => {
  let id = await DFSPModel.findIdByDfspId(envId, dfspId);
  return knex.table(INBOUND_ENROLLMENTS_TABLE).where({ env_id: envId }).where({ dfsp_id: id }).select();
};

exports.create = async (values) => {
  return knex.table(INBOUND_ENROLLMENTS_TABLE).insert(values);
};

exports.delete = async (id) => {
  return knex.table(INBOUND_ENROLLMENTS_TABLE).where({ id: id }).del();
};

exports.update = async (id, props) => {
  let result = await knex.table(INBOUND_ENROLLMENTS_TABLE).where('id', id).update(props);
  if (result === 1) {
    return { id: id, ...props };
  } else throw new Error(result);
};

exports.getCaAndCSR = async (enId, envId) => {
  let result = await knex.from(INBOUND_ENROLLMENTS_TABLE)
    // .join('certificate_authorities', `${INBOUND_ENROLLMENTS_TABLE}.env_id`, '=', 'certificate_authorities.env_id')
    .innerJoin('certificate_authorities', `${INBOUND_ENROLLMENTS_TABLE}.env_id`, 'certificate_authorities.env_id')
    .where(`${INBOUND_ENROLLMENTS_TABLE}.id`, enId)
    .where(`${INBOUND_ENROLLMENTS_TABLE}.env_id`, envId)
    .where('certificate_authorities.env_id', envId)
    .where('certificate_authorities.current', 1)
    .select(`${INBOUND_ENROLLMENTS_TABLE}.csr as csr`, 'certificate_authorities.cert as caCert', 'certificate_authorities.key as caKey');
  return result;
};
