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
