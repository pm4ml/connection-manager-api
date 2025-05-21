const db = require('../db/database');
const DFSP_TABLE = 'external_dfsps';

exports.findAll = () => {
  return db.executeWithErrorCount(knex => knex.table(DFSP_TABLE).select(), 'findAllExternalDFSPs');
};

exports.upsert = async (values) => {
  return db.executeWithErrorCount(knex => knex(DFSP_TABLE)
    .insert(values)
    .onConflict('external_dfsp_id')
    .merge(), 'upsertExternalDFSP');
};
