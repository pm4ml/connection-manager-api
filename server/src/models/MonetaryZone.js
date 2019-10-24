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

  static async findAllActive (trx) {
    return MonetaryZone.query(trx).where('isActive', true);
  }
}

module.exports = {
  MonetaryZone
};
