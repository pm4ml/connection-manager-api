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
const DFSPModel = require('./DFSPModel');
const NotFoundError = require('../errors/NotFoundError');
const InternalError = require('../errors/InternalError');
const BASE_TABLE = 'dfsp_cas';

exports.findAll = () => {
  return knex.table(BASE_TABLE).select();
};

exports.findAllByDfsp = async (envId, dfspId) => {
  let id = await DFSPModel.findIdByDfspId(envId, dfspId);
  return knex.table(BASE_TABLE).where({ dfsp_id: id }).select();
};

exports.findById = async (id) => {
  let rows = await knex.table(BASE_TABLE).where('id', id).select();
  if (rows.length === 0) {
    throw new NotFoundError('dfsp ca with id: ' + id);
  } else if (rows.length === 1) {
    let row = rows[0];
    return row;
  } else {
    throw new InternalError('E_TOO_MANY_ROWS');
  }
};

exports.findByDfspId = async (envId, dfspId) => {
  let id = await DFSPModel.findIdByDfspId(envId, dfspId);
  let rows = await knex.table(BASE_TABLE).where('dfsp_id', id).select();
  if (rows.length === 0) {
    throw new NotFoundError(`dfsp ca with id: ${id} dfspId: ${dfspId}`);
  } else if (rows.length === 1) {
    let row = rows[0];
    return row;
  } else {
    throw new InternalError('E_TOO_MANY_ROWS');
  }
};

exports.create = async (values) => {
  return knex.table(BASE_TABLE).insert(values);
};

exports.delete = async (id) => {
  return knex.table(BASE_TABLE).where({ id: id }).del();
};

exports.update = async (envId, dfspId, values) => {
  let id = await DFSPModel.findIdByDfspId(envId, dfspId);
  let result = await knex.table(BASE_TABLE).where('dfsp_id', id).returning(['root_certificate', 'intermediate_chain']).update(values);
  if (result === 1) {
    return result;
  } else throw new Error('More than one row updated');
};

exports.upsert = async (envId, dfspId, values) => {
  let id = await DFSPModel.findIdByDfspId(envId, dfspId);
  let rows = await knex.table(BASE_TABLE).where('dfsp_id', id).select();
  if (rows.length === 0) {
    let row = { dfsp_id: id, ...values };
    return (await exports.create(row)).length;
  } else if (rows.length === 1) {
    return exports.update(envId, dfspId, values);
  } else {
    throw new InternalError('E_TOO_MANY_ROWS');
  }
};
