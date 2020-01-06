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

module.exports = {
  SERVER: {
    PORT: process.env.PORT || 3001,
  },
  OAUTH: {
    AUTH_ENABLED: process.env.AUTH_ENABLED || null, // null or 'DISABLED' to disable. 'true' or 'TRUE' to enable. FIXME this is confusing as setting it to 'false' actually enables it
    APP_OAUTH_CLIENT_KEY: process.env.APP_OAUTH_CLIENT_KEY, // Configured in WSO2 IM Service Provider
    APP_OAUTH_CLIENT_SECRET: process.env.APP_OAUTH_CLIENT_SECRET,
    MTA_ROLE: process.env.MTA_ROLE || 'Application/MTA',
    PTA_ROLE: process.env.PTA_ROLE || 'Application/PTA',
    EVERYONE_ROLE: process.env.EVERYONE_ROLE || 'Internal/everyone',
    OAUTH2_ISSUER: process.env.OAUTH2_ISSUER || 'https://WSO2_IM_SERVER:9443/oauth2/token',
    CERTIFICATE_FILE_NAME: process.env.CERTIFICATE_FILE_NAME || 'resources/wso2carbon-publickey.cert',
    EMBEDDED_CERTIFICATE: process.env.EMBEDDED_CERTIFICATE,
    JWT_COOKIE_NAME: 'MCM-API_ACCESS_TOKEN',
    RESET_PASSWORD_ISSUER: process.env.OAUTH_RESET_PASSWORD_ISSUER,
    RESET_PASSWORD_AUTH_USER: process.env.OAUTH_RESET_PASSWORD_AUTH_USER,
    RESET_PASSWORD_AUTH_PASSWORD: process.env.OAUTH_RESET_PASSWORD_AUTH_PASSWORD,
  },
  EXTRA_TLS: {
    EXTRA_CERTIFICATE_CHAIN_FILE_NAME: process.env.EXTRA_CERTIFICATE_CHAIN_FILE_NAME,
    EXTRA_ROOT_CERT_FILE_NAME: process.env.EXTRA_ROOT_CERT_FILE_NAME,
  },
  AUTH_2FA: {
    AUTH_2FA_ENABLED: process.env.AUTH_2FA_ENABLED,
    TOTP_ADMIN_ISSUER: process.env.TOTP_ADMIN_ISSUER,
    TOTP_ADMIN_AUTH_USER: process.env.TOTP_ADMIN_AUTH_USER,
    TOTP_ADMIN_AUTH_PASSWORD: process.env.TOTP_ADMIN_AUTH_PASSWORD,
    TOTP_LABEL: process.env.TOTP_LABEL,
    TOTP_ISSUER: process.env.TOTP_ISSUER || 'MCM',
    WSO2_MANAGER_SERVICE_URL: process.env.WSO2_MANAGER_SERVICE_URL,
    WSO2_MANAGER_SERVICE_USER: process.env.WSO2_MANAGER_SERVICE_USER,
    WSO2_MANAGER_SERVICE_PASSWORD: process.env.WSO2_MANAGER_SERVICE_PASSWORD,
  },
  DATABASE: {
    DATABASE_HOST: process.env.DATABASE_HOST || 'localhost',
    DATABASE_PORT: process.env.DATABASE_PORT || 3306,
    DATABASE_USER: process.env.DATABASE_USER || 'mcm',
    DATABASE_PASSWORD: process.env.DATABASE_PASSWORD || 'mcm',
    DATABASE_SCHEMA: process.env.DATABASE_SCHEMA || 'mcm',
    DB_RETRIES: process.env.DB_RETRIES || 10,
    DB_CONNECTION_RETRY_WAIT_MILLISECONDS: process.env.DB_CONNECTION_RETRY_WAIT_MILLISECONDS || 5000,
    RUN_MIGRATIONS: process.env.RUN_MIGRATIONS || true,
    CURRENCY_CODES: process.env.CURRENCY_CODES || './data/currencyCodes.json',
    DATA_CONFIGURATION_FILE: process.env.DATA_CONFIGURATION_FILE || './data/sampleConfiguration.json'
  },
  PKI_ENGINE: {
    P12_PASS_PHRASE: process.env.P12_PASS_PHRASE,
  },
  CFSSL: {
    VERSION: '1.3.4' || process.env.CFSSL_VERSION
  }
};
