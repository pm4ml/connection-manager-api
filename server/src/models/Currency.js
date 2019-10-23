const { BaseModel } = require('./BaseModel');
const NotFoundError = require('../errors/NotFoundError');
const currencySchema = require('../../src/db/validators/currencySchema');

class Currency extends BaseModel {
  static get jsonSchema () {
    return currencySchema;
  }

  static get tableName () {
    return 'currency';
  }

  static get idColumn () {
    return 'currencyId';
  }

  static async create (currency, trx) {
    return Currency.query(trx).insert(currency);
  }

  static async enableCurrency (currency, trx) {
    let enabledCurrency = await Currency.query(trx)
      .findById(currency.currencyId)
      .patch({ enabled: true });

    if (!enabledCurrency) throw new NotFoundError(`Currency ${currency} cannot be enabled because it is not present in the database`);
  }
}

module.exports = {
  Currency
};
