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
const { logger } = require('../log/logger');
const NotFoundError = require('../errors/NotFoundError');
const InternalError = require('../errors/InternalError');
const DFSP_TABLE = 'dfsps';

const log = logger.child({ component: 'DFSPModel' });

exports.findAll = () => {
  return knex.table(DFSP_TABLE).select();
};

exports.findByRawId = async (id) => {
  return findByField('id', id);
};

exports.findIdByDfspId = async (dfspId) => {
  const dfspRow = await exports.findByDfspId(dfspId);
  return dfspRow.id;
};

exports.findByDfspId = async (dfspId) => {
  return findByField('dfsp_id', dfspId);
};

exports.getDfspsByMonetaryZones = async (monetaryZoneId) => {
  return findAllByField('monetaryZoneId', monetaryZoneId);
};

exports.getFxpSupportedCurrencies = async (dfspId) => {
  return (await knex.table('fxp_supported_currencies')
    .join(DFSP_TABLE, 'fxp_supported_currencies.dfspId', 'dfsps.id')
    .where(DFSP_TABLE + '.dfsp_id', dfspId)
    .select('fxp_supported_currencies.monetaryZoneId')
  ).map((row) => row.monetaryZoneId);
};

const findByField = async (columnName, value) => {
  const rows = await knex.table(DFSP_TABLE).where(columnName, value).select();
  if (rows.length === 0) {
    throw new NotFoundError(`dfsp with ${columnName} = ${value}`);
  } else if (rows.length === 1) {
    return rows[0];
  } else {
    throw new InternalError('E_TOO_MANY_ROWS');
  }
};

const findAllByField = async (columnName, value) => {
  const rows = await knex.table(DFSP_TABLE).where(columnName, value).select();
  if (rows.length === 0) {
    throw new NotFoundError(`dfsp with ${columnName} = ${value}`);
  } else {
    return rows;
  }
};

exports.findByField = findByField;

exports.findWatchedDfspIds = async () => {
  const rows = await knex.table(DFSP_TABLE)
    .select('dfsp_id')
    .where('watch', true);
  return rows.map((row) => row.dfsp_id);
};

exports.findDfspStatesStatus = async (dfspId) => {
  const [row] = await knex.table('dfsp_states_status')
    .where({ dfspId });
  return !row ? null : Object.fromEntries( // filter out empty values and ids
    Object.entries(row).filter(([_, value]) => value && typeof value === 'object')
  );
};

exports.create = async (values) => {
  return knex.table(DFSP_TABLE).insert(values);
};

exports.createFxpSupportedCurrencies = async (dfsp_id, monetaryZoneIds) => {
  if (!monetaryZoneIds?.length) return;
  const dfspId = await findIdByDfspId(dfsp_id);
  return knex.table('fxp_supported_currencies').insert(
    monetaryZoneIds.map((monetaryZoneId) => ({ dfspId, monetaryZoneId }))
  );
};

exports.deleteByRawId = async (id) => {
  return knex.table(DFSP_TABLE).where({ id }).del();
};

exports.delete = async (dfspId) => {
  return knex.table(DFSP_TABLE).where({ dfsp_id: dfspId }).del();
};

exports.update = async (dfspId, newDfsp) => {
  const result = await knex.table(DFSP_TABLE).where({ dfsp_id: dfspId }).update(newDfsp);
  if (result === 0) {
    throw new NotFoundError(`dfsp with ${dfspId}`);
  } else if (result === 1) {
    const dfsp = await exports.findByDfspId(dfspId);
    // return { dfspId: dfsp.dfsp_id, name: dfsp.name, monetaryZoneId: dfsp.monetaryZoneId, securityGroup: dfsp.security_group };
    return rowToObject(dfsp);
  } else {
    throw new InternalError('E_TOO_MANY_ROWS');
  }
};

exports.updatePingStatus = async (dfspId, pingStatus) => {
  const result = await knex.table(DFSP_TABLE)
    .where({ dfsp_id: dfspId })
    .update({ pingStatus, lastUpdatedPingStatusAt: new Date() });
  log.debug(`updatePingStatus is done: `, { dfspId, pingStatus, result });
  return result > 0;
};

exports.upsertStatesStatus = async (dfspId, statesJson) => {
  const result = await knex.table('dfsp_states_status')
    .insert({ dfspId, ...statesJson })
    .onConflict('dfspId').merge();
  log.debug(`upsertStatesStatus is done: `, { dfspId, statesJson, result });
  return result;
};

const rowToObject = (dfsp) => {
  return {
    dfspId: dfsp.dfsp_id,
    name: dfsp.name,
    monetaryZoneId: dfsp.monetaryZoneId ? dfsp.monetaryZoneId : undefined,
    isProxy: dfsp.isProxy,
    securityGroup: dfsp.security_group
  };
};
