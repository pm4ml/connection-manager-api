const Constants = require('../constants/Constants');
const path = require('path');
const fs = require('fs');
const { Currency } = require('../models/Currency');
const { MonetaryZone } = require('../models/MonetaryZone');
const { transaction } = require('objection');
const InternalError = require('../errors/InternalError');

exports.runInitialConfigurations = async () => {
  !process.env.TEST && console.log('Now running initial data configurations');

  // Retrieve all currency codes
  let currencyCodes = getAllCurrencyCodes();

  // Retrieve data configuration
  let dataConfiguration = getDataConfiguration();
  let currencies = dataConfiguration.currencies;
  let monetaryZones = dataConfiguration.monetaryZones;

  let trx;
  try {
    trx = await transaction.start(Currency.knex());

    await createCurrency(currencyCodes, trx);

    await updateCurrency(currencies, trx);
    await createMonetaryZone(monetaryZones, trx);

    await trx.commit();
  } catch (err) {
    console.log('Error in DB transaction...', err);
    await trx && trx.rollback();
    throw err;
  }
};

function getAllCurrencyCodes () {
  if (!Constants.DATABASE.CURRENCY_CODES) {
    throw new InternalError('Initial configuration set to true, but environment var for currency codes file not set');
  }
  return JSON.parse(fs.readFileSync(path.join(__dirname, '../../', Constants.DATABASE.CURRENCY_CODES), 'utf8'));
}

async function createCurrency (currencies, trx) {
  !process.env.TEST && console.log('loading currencies...');
  for (let currency of currencies) {
    try {
      await Currency.create(currency, trx);
    } catch (err) {
      // If ER_DUP_ENTRY errors, is ignore, but is not console.log because there are too many
      if (err.code !== 'ER_DUP_ENTRY') {
        console.log(`Create currency has failed with the following error: ${err}`);
        throw err;
      }
    }
  }
}

function getDataConfiguration () {
  if (!Constants.DATABASE.DATA_CONFIGURATION_FILE) {
    throw new InternalError('Initial configuration set to true, but environment var for data configuration file not set');
  }
  return JSON.parse(fs.readFileSync(path.join(__dirname, '../../', Constants.DATABASE.DATA_CONFIGURATION_FILE), 'utf8'));
}

async function updateCurrency (currencies, trx) {
  !process.env.TEST && console.log('updating enable currencies...');
  for (let currency of currencies) {
    try {
      await Currency.enableCurrency(currency, trx);
      !process.env.TEST && console.log(`Currency ${JSON.stringify(currency)} enabled`);
    } catch (err) {
      console.log(`Create currency has failed with the following error: ${err}`);
      throw err;
    }
  }
}

async function createMonetaryZone (monetaryZones, trx) {
  !process.env.TEST && console.log('loading monetary zones...');
  for (let mz of monetaryZones) {
    try {
      await MonetaryZone.create(mz, trx);
      !process.env.TEST && console.log(`Monetary Zone ${JSON.stringify(mz)} created`);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') console.log(`Ignoring ${err.code} for ${JSON.stringify(mz)}`);
      else {
        console.log(`Create monetary zone has failed with the following error: ${err}`);
        throw err;
      }
    }
  }
}
