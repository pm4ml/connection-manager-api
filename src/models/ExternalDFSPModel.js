const { knex } = require('../db/database');
const DFSP_TABLE = 'external_dfsps';

exports.findAll = () => {
  return knex.table(DFSP_TABLE).select();
};

exports.upsert = async (values) => {
  return knex(DFSP_TABLE)
    .insert(values)
    .onConflict('external_dfsp_id')
    .merge();
};
