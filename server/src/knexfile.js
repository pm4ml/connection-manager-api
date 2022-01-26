/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Yevhen Kyriukha - yevhen.kyriukha@modusbox.com                   *
 **************************************************************************/

const env = require('env-var');
const path = require('path');

module.exports = {
  client: 'mysql',
  version: '5.7',
  connection: {
    host: env.get('DATABASE_HOST').default('localhost').asString(),
    port: env.get('DATABASE_PORT').default(3306).asPortNumber(),
    user: env.get('DATABASE_USER').default('root').asString(),
    password: env.get('DATABASE_PASSWORD').default('mcm').asString(),
    database: env.get('DATABASE_SCHEMA').default('mcm').asString(),
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
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
  asyncStackTraces: true
};
