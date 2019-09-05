const BaseCrudModel = require('./BaseCrudModel');
const { knex } = require('../db/database');

const TABLE_NAME = 'hub_issuer_cas';

module.exports = class HubIssuerCasModel extends BaseCrudModel {
  constructor () {
    super(TABLE_NAME);
  }

  async findAllByEnvId (envId) {
    return knex.table(this.baseTable).where('env_id', envId).select();
  }
};
