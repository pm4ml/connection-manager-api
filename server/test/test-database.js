const path = require('path');

let knexOptions = {
  client: 'sqlite3',
  connection: {
    filename: ':memory:',
  },
  migrations: {
    directory: path.join(__dirname, '/../src/db/migrations')
  },
  seeds: {
    directory: path.join(__dirname, '/./resources/knex/seeds')
  },
  useNullAsDefault: true,
  // debug: true,
};

const { setKnex } = require('../src/db/database');
setKnex(knexOptions);

// Now set up the test DB

const { knex } = require('../src/db/database');

const runKnexMigrations = async () => {
  console.log('Migrating');
  await knex.migrate.latest();
  console.log('Migration done');
};

exports.setupTestDB = async () => {
  await knex.initialize();
  await runKnexMigrations();
  await knex.seed.run();
};

exports.tearDownTestDB = async () => {
  await knex.destroy();
};
