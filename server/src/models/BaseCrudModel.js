const { knex } = require('../db/database');
const NotFoundError = require('../errors/NotFoundError');
const InternalError = require('../errors/InternalError');

module.exports = class BaseCrudModel {
  constructor (baseTable) {
    if (!baseTable) {
      throw new InternalError(`BaseCrudModel needs a baseTable`);
    }
    this.baseTable = baseTable;
  }

  async findAll () {
    return knex.table(this.baseTable).select();
  };

  async findById (id) {
    let rows = await knex.table(this.baseTable).where('id', id).select();
    if (rows.length === 0) {
      throw new NotFoundError(`${this.baseTable} with id: ${id}`);
    } else if (rows.length === 1) {
      let row = rows[0];
      return row;
    } else {
      throw new InternalError('E_TOO_MANY_ROWS');
    }
  };

  /**
   * Creates an object
   *
   * @param {Object} values column values
   * @returns {id : Integer}
   */
  async create (values) {
    let result = await knex.table(this.baseTable).insert(values);
    if (result.length === 1) {
      return { id: result[0] };
    } else {
      throw new InternalError('More than one row created');
    }
  };

  async delete (id) {
    return knex.table(this.baseTable).where({ id }).del();
  };

  /**
   * Updates an object
   *
   * @param {Integer} id id column value ( PK )
   * @param {Object} values column values
   * @returns {id : Integer}
   */
  async update (id, values) {
    let result = await knex.table(this.baseTable).where({ id }).update(values);
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
      let idObj = await this.create(values);
      return idObj;
    }
    let rows = await knex.table(this.baseTable).where({ id }).select();
    if (rows.length === 0) {
      return this.create(values);
    } else if (rows.length === 1) {
      return this.update(id, values);
    } else {
      throw new InternalError('E_TOO_MANY_ROWS');
    }
  };
};
