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

const db = require('../db/database');
const NotFoundError = require('../errors/NotFoundError');
const InternalError = require('../errors/InternalError');

module.exports = class BaseCrudModel {
  constructor (baseTable) {
    if (!baseTable) {
      throw new InternalError('BaseCrudModel needs a baseTable');
    }
    this.baseTable = baseTable;
    this.db = db;
  }

  async runQuery(queryFn, operation) {
    return this.db.executeWithErrorCount(queryFn, operation);
  }

  async findAll () {
    return this.runQuery((knex) => knex.table(this.baseTable).select(), 'findAll');
  };

  async findById(id) {
    const rows = await this.#rawFindById(id);
    if (rows.length === 0) {
      throw new NotFoundError(`${this.baseTable} with id: ${id}`);
    } else if (rows.length === 1) {
      const row = rows[0];
      return row;
    } else {
      throw new InternalError('E_TOO_MANY_ROWS');
    }
  }

  /**
   * Creates an object
   *
   * @param {Object} values column values
   * @returns {id : Integer}
   */
  async create (values) {
    const result = await this.runQuery((knex) => knex.table(this.baseTable)
      .insert(values), 'create');
    if (result.length === 1) {
      return { id: result[0] };
    } else {
      throw new InternalError('More than one row created');
    }
  };

  async delete (id) {
    return this.runQuery((knex) => knex.table(this.baseTable).where({ id }).del(), 'delete');
  };

  /**
   * Updates an object
   *
   * @param {Integer} id id column value ( PK )
   * @param {Object} values column values
   * @returns {id : Integer}
   */
  async update (id, values) {
    const result = await this.runQuery((knex) => knex.table(this.baseTable)
      .where({ id })
      .update(values), 'update');
    if (result === 0) {
      throw new NotFoundError('object with id: ' + id);
    } else if (result === 1) {
      return { id };
    } else throw new InternalError('More than one row updated');
  };

  /**
   * Updates an object if exists, or create it.
   *
   * @param {Integer} id id column value ( PK )
   * @param {Object} values column values
   * @returns {id : Integer}
   */
  async upsert (id, values) {
    if (id === null) {
      const idObj = await this.create(values);
      return idObj;
    }
    const rows = await this.#rawFindById(id);
    if (rows.length === 0) {
      return this.create(values);
    } else if (rows.length === 1) {
      return this.update(id, values);
    } else {
      throw new InternalError('E_TOO_MANY_ROWS');
    }
  };

  async #rawFindById(id) {
    return this.runQuery((knex) => knex.table(this.baseTable)
      .where({ id })
      .select(), 'rawFindById');
  }
};
