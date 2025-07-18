/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Yevhen Kyriukha - yevhen.kyriukha@modusbox.com                   *
 **************************************************************************/

require('dotenv/config');
const env = require('env-var');
const path = require('path');

module.exports = {
  client: 'mysql2',
  connection: {
    host: env.get('DATABASE_HOST').default('localhost').asString(),
    port: env.get('DATABASE_PORT').default(3306).asPortNumber(),
    user: env.get('DATABASE_USER').default('mcm').asString(),
    password: env.get('DATABASE_PASSWORD').default('mcm').asString(),
    database: env.get('DATABASE_SCHEMA').default('mcm').asString(),
    charset: 'utf8mb4',
    ssl: env.get('DATABASE_SSL_ENABLED').default('false').asBool() ? {
      rejectUnauthorized: env.get('DATABASE_SSL_VERIFY').default('true').asBool(),
      ca: env.get('DATABASE_SSL_CA').default(undefined).asString()
    } : undefined
  },
  pool: {
    min: 0,
    max: 10,
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: path.join(__dirname, '/db/migrations')
  },
  seeds: {
    directory: path.join(__dirname, '/db/seeds'),
  },
  asyncStackTraces: env.get('DATABASE_ASYNC_STACK_TRACES').default('false').asBool()
};
