const BaseCrudModel = require('./BaseCrudModel');
const DFSPModel = require('./DFSPModel');
const { knex } = require('../db/database');
const NotFoundError = require('../errors/NotFoundError');
const InternalError = require('../errors/InternalError');

const TABLE_NAME = 'dfsp_jws_certs';

module.exports = class DfspJWSCertsModel extends BaseCrudModel {
  constructor () {
    super(TABLE_NAME);
  }

  async findByEnvIdDfspId (envId, dfspId) {
    let id = await DFSPModel.findIdByDfspId(envId, dfspId);
    let rows = await knex.table(this.baseTable).where('env_id', envId).where('dfsp_id', id).select();
    if (rows.length === 0) {
      throw new NotFoundError(`${this.baseTable} with ids: envId ${envId} dfspId ${dfspId} dfsp_id ${id}`);
    } else if (rows.length === 1) {
      let row = rows[0];
      return row;
    } else {
      throw new InternalError('E_TOO_MANY_ROWS');
    }
  }

  async findAllByEnvId (envId) {
    return knex.table(this.baseTable).where('env_id', envId).select();
  }
};
