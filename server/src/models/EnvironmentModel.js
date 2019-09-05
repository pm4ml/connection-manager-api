const { knex } = require('../db/database');
const NotFoundError = require('../errors/NotFoundError');
const InternalError = require('../errors/InternalError');

const ENVIRONMENTS_TABLE = 'environments';

exports.findAll = () => {
  return knex.table(ENVIRONMENTS_TABLE).select();
};

exports.findById = async (id) => {
  let rows = await knex.table(ENVIRONMENTS_TABLE).where('id', id).select();
  if (rows.length === 0) {
    throw new NotFoundError('Object with id: ' + id);
  } else if (rows.length === 1) {
    let row = rows[0];
    return row;
  } else {
    throw new InternalError('E_TOO_MANY_ROWS');
  }
};

exports.create = async (values) => {
  return knex.table(ENVIRONMENTS_TABLE).insert(values);
};

exports.delete = async (envId) => {
  return knex.table(ENVIRONMENTS_TABLE).where({ id: envId }).del();
};

exports.mapRowToObject = (row) => {
  return {
    id: row.id,
    name: row.name,
    defaultDN: {
      CN: row.CN,
      C: row.C,
      L: row.L,
      O: row.O,
      OU: row.OU,
      ST: row.ST,
    }
  };
};
