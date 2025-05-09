// Copyright 2025 ModusBox, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License").
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const Constants = require('../constants/Constants');

// MySQL session store options
const sessionStoreOptions = {
  host: Constants.DATABASE.DATABASE_HOST,
  port: Constants.DATABASE.DATABASE_PORT,
  user: Constants.DATABASE.DATABASE_USER,
  password: Constants.DATABASE.DATABASE_PASSWORD,
  database: Constants.DATABASE.DATABASE_SCHEMA,
  // Recommended options for MySQL session store
  clearExpired: true,
  checkExpirationInterval: 15 * 60 * 1000, // 15 minutes
  expiration: 8 * 60 * 60 * 1000, // 8 hours
  connectionLimit: 10,
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data'
    }
  }
};

const sessionStore = new MySQLStore(sessionStoreOptions);

const sessionOptions = {
  key: 'mcm_session',
  secret: Constants.SESSION_STORE.SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: 8 * 60 * 60 * 1000 // 8 hours
  }
};

exports.createSessionMiddleware = () => {
  return session(sessionOptions);
};

exports.getSessionStore = () => {
  return sessionStore;
};

exports.sessionOptions = sessionOptions;
