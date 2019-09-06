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

const { knex } = require('../db/database');
const NotFoundError = require('../errors/NotFoundError');
const InternalError = require('../errors/InternalError');
const PKIEngine = require('../pki_engine/EmbeddedPKIEngine');

const CA_TABLE = 'certificate_authorities';

exports.EMBEDDED_PKI_ENGINE = 'EMBEDDED_PKI_ENGINE';

exports.findCurrentForEnv = async (envId) => {
  let rows = await knex.table(CA_TABLE).where('env_id', envId).where('current', 1).select();
  if (rows.length === 0) {
    throw new NotFoundError('Could not retrieve a Certificate Authority for environment with id: ' + envId);
  } else if (rows.length === 1) {
    let row = rows[0];
    return row;
  } else {
    throw new InternalError('E_TOO_MANY_ROWS');
  }
};

exports.create = async (values) => {
  return knex.table(CA_TABLE).insert(values);
};

exports.setAsCurrent = async (envId, caId) => {
  return knex.table(CA_TABLE).where({ env_id: envId }).whereNot({ id: caId }).update({ current: 0 });
};

exports.getPkiEngineForEnv = async (envId) => {
  let row = await exports.findCurrentForEnv(envId);
  if (row.engine_type === exports.EMBEDDED_PKI_ENGINE) {
    let pkiEngine = new PKIEngine(row.cert, row.key, JSON.parse(row.ca_config));
    return pkiEngine;
  } else {
    throw new InternalError(`Engine type unknown ${row.engine_type}`);
  }
};
