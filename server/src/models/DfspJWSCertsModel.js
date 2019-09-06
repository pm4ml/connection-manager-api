/******************************************************************************
 *  Copyright 2019 ModusBox, Inc.                                             *
 *                                                                            *
 *  info@modusbox.com                                                         *
 *                                                                            *
 *  Licensed under the Apache License, Version 2.0 (the "License");           *
 *  you may not use this file except in compliance with the License.          *
 *  You may obtain a copy of the License at                                   *
 *  http://www.apache.org/licenses/LICENSE-2.0                                *
 *                                                                            *
 *  Unless required by applicable law or agreed to in writing, software       *
 *  distributed under the License is distributed on an "AS IS" BASIS,         *
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  *
 *  See the License for the specific language governing permissions and       *
 *  limitations under the License.                                            *
 ******************************************************************************/

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
