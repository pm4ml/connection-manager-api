const Constants = require('../constants/Constants');
const path = require('path');

let knexOptions = {
  client: 'mysql',
  version: '5.7',
  connection: {
    host: Constants.DATABASE.DATABASE_HOST,
    port: Constants.DATABASE.DATABASE_PORT,
    user: Constants.DATABASE.DATABASE_USER,
    password: Constants.DATABASE.DATABASE_PASSWORD,
    database: Constants.DATABASE.DATABASE_SCHEMA,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
  },
  pool: {
    min: 0,
    max: 10,
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: path.join(__dirname, '/migrations')
  },
  asyncStackTraces: true
};

const defaultKnex = require('knex')(knexOptions);

exports.setKnex = (knexOptions) => {
  exports.knex = require('knex')(knexOptions);
};

const runKnexMigrations = async () => {
  console.log('Migrating');
  await exports.knex.migrate.latest();
  console.log('Migration done');
};

// design your application to attempt to re-establish a connection to the database after a failure
// https://docs.docker.com/compose/startup-order/
let dbRetries = 1;
exports.runKnexMigrationIfNeeded = async () => {
    if(Constants.DATABASE.RUN_MIGRATIONS){
        try {
            await runKnexMigrations();
            console.log(`success connected to DB and tables created after trying : ${dbRetries} time(s)`);
        } catch (e) {
            console.log(`error connecting to the database. Attempting retry: ${dbRetries}`);
            dbRetries++;
            if (dbRetries === Constants.DATABASE.DB_RETRIES) {
                console.error('could not get connection to DB after retries', e);
                process.exit(1);
            } else {
                setTimeout(
                    exports.runKnexMigrationIfNeeded,
                    Constants.DATABASE.DB_CONNECTION_RETRY_WAIT_MILLISECONDS
                );
            }
        }

    }
};

exports.knex = defaultKnex;
