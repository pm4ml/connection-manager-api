const BaseCrudModel = require('./BaseCrudModel');
const { knex } = require('../db/database');
const NotFoundError = require('../errors/NotFoundError');
const InternalError = require('../errors/InternalError');

const TABLE_NAME = 'hub_server_certs';

module.exports = class HubServerCertsModel extends BaseCrudModel {
  constructor () {
    super(TABLE_NAME);
  }

  async findByEnvId (envId) {
    let rows = await knex.table(this.baseTable).where('env_id', envId).select();
    if (rows.length === 0) {
      throw new NotFoundError(`${this.baseTable} with id: ${envId}`);
    } else if (rows.length === 1) {
      let row = rows[0];
      return row;
    } else {
      throw new InternalError('E_TOO_MANY_ROWS');
    }
  }
};
