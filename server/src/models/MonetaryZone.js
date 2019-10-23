const { BaseModel } = require('./BaseModel');
const { Model } = require('objection');
const { Currency } = require('./Currency');
const monetaryZoneSchema = require('../../src/db/validators/monetaryZoneSchema');

class MonetaryZone extends BaseModel {
  static get jsonSchema () {
    return monetaryZoneSchema;
  }

  static get tableName () {
    return 'monetaryZone';
  }

  static get idColumn () {
    return 'monetaryZoneId';
  }

  static get relationMappings () {
    return {
      currency: {
        relation: Model.BelongsToOneRelation,
        modelClass: Currency,
        join: {
          from: 'monetaryZone.monetaryZoneId',
          to: 'currency.currencyId'
        }
      }
    };
  }

  static async findById (id) {
    return MonetaryZone.query().findById(id);
  }

  static async create (monetaryZone, trx) {
    return MonetaryZone.query(trx).insert(monetaryZone);
  }
}

module.exports = {
  MonetaryZone
};
