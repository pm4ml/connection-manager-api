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

const fs = require('fs');
require('dotenv/config');
const { from } = require('env-var');

function getFileContent (path) {
  if (!fs.existsSync(path)) {
    throw new Error(`File ${path} doesn't exist`);
  }
  return fs.readFileSync(path);
}

if (process.env.TEST) {
  process.env = {
    ...process.env,
    VAULT_AUTH_METHOD: 'APP_ROLE',
    VAULT_ROLE_ID_FILE: '.vault/role-id',
    VAULT_ROLE_SECRET_ID_FILE: '.vault/secret-id',
    VAULT_ENDPOINT: 'http://127.0.0.1:8233',
    VAULT_PKI_BASE_DOMAIN: 'example.com',
  };
}

const env = from(process.env, {
  asFileContent: (path) => getFileContent(path),
  asFileListContent: (pathList) => pathList.split(',').map((path) => getFileContent(path)),
  asJsonConfig: (path) => JSON.parse(getFileContent(path)),
  asTextFileContent: (path) => getFileContent(path).toString().trim(),
});

const vaultAuthMethod = env.get('VAULT_AUTH_METHOD').required().asEnum(['K8S', 'APP_ROLE']);
let vaultAuth;
if (vaultAuthMethod === 'K8S') {
  vaultAuth = {
    k8s: {
      token: env.get('VAULT_K8S_TOKEN_FILE').default('/var/run/secrets/kubernetes.io/serviceaccount/token').asTextFileContent(),
      mountPoint: env.get('VAULT_K8S_AUTH_MOUNT_POINT').default('kubernetes').asString(),
      role: env.get('VAULT_K8S_ROLE').required().asString(),
    },
  };
} else if (vaultAuthMethod === 'APP_ROLE') {
  vaultAuth = {
    appRole: {
      // Generated per: https://www.vaultproject.io/docs/auth/approle#via-the-cli-1
      // Or: https://github.com/kr1sp1n/node-vault/blob/70097269d35a58bb560b5290190093def96c87b1/example/auth_approle.js
      roleId: env.get('VAULT_ROLE_ID_FILE').default('/vault/role-id').asTextFileContent(),
      roleSecretId: env.get('VAULT_ROLE_SECRET_ID_FILE').default('/vault/role-secret-id').asTextFileContent(),
    },
  };
}

module.exports = {
  SERVER: {
    PORT: env.get('PORT').default('3001').asPortNumber(),
  },
  OAUTH: {
    AUTH_ENABLED: env.get('AUTH_ENABLED').default('false').asBool(),
    APP_OAUTH_CLIENT_KEY: env.get('APP_OAUTH_CLIENT_KEY').asString(), // Configured in WSO2 IM Service Provider
    APP_OAUTH_CLIENT_SECRET: env.get('APP_OAUTH_CLIENT_SECRET').asString(),
    MTA_ROLE: env.get('MTA_ROLE').default('Application/MTA').asString(),
    PTA_ROLE: env.get('PTA_ROLE').default('Application/PTA').asString(),
    EVERYONE_ROLE: env
      .get('EVERYONE_ROLE')
      .default('Internal/everyone')
      .asString(),
    OAUTH2_ISSUER: env
      .get('OAUTH2_ISSUER')
      .default('https://WSO2_IM_SERVER:9443/oauth2/token')
      .asString(),
    OAUTH2_TOKEN_ISS: env.get('OAUTH2_TOKEN_ISS').asString(),
    CERTIFICATE_FILE_NAME: env
      .get('CERTIFICATE_FILE_NAME')
      .default('resources/wso2carbon-publickey.cert')
      .asString(),
    EMBEDDED_CERTIFICATE: env.get('EMBEDDED_CERTIFICATE').asString(),
    JWT_COOKIE_NAME: 'MCM-API_ACCESS_TOKEN',
    RESET_PASSWORD_ISSUER: env.get('OAUTH_RESET_PASSWORD_ISSUER').asString(),
    RESET_PASSWORD_AUTH_USER: env
      .get('OAUTH_RESET_PASSWORD_AUTH_USER')
      .asString(),
    RESET_PASSWORD_AUTH_PASSWORD: env
      .get('OAUTH_RESET_PASSWORD_AUTH_PASSWORD')
      .asString(),
  },
  EXTRA_TLS: {
    EXTRA_CERTIFICATE_CHAIN_FILE_NAME: env
      .get('EXTRA_CERTIFICATE_CHAIN_FILE_NAME')
      .asString(),
    EXTRA_ROOT_CERT_FILE_NAME: env.get('EXTRA_ROOT_CERT_FILE_NAME').asString(),
  },
  AUTH_2FA: {
    AUTH_2FA_ENABLED: env.get('AUTH_2FA_ENABLED').default('false').asBool(),
    TOTP_ADMIN_ISSUER: env.get('TOTP_ADMIN_ISSUER').asString(),
    TOTP_ADMIN_AUTH_USER: env.get('TOTP_ADMIN_AUTH_USER').asString(),
    TOTP_ADMIN_AUTH_PASSWORD: env.get('TOTP_ADMIN_AUTH_PASSWORD').asString(),
    TOTP_LABEL: env.get('TOTP_LABEL').asString(),
    TOTP_ISSUER: env.get('TOTP_ISSUER').default('MCM').asString(),
    WSO2_MANAGER_SERVICE_URL: env.get('WSO2_MANAGER_SERVICE_URL').asString(),
    WSO2_MANAGER_SERVICE_USER: env.get('WSO2_MANAGER_SERVICE_USER').asString(),
    WSO2_MANAGER_SERVICE_PASSWORD: env
      .get('WSO2_MANAGER_SERVICE_PASSWORD')
      .asString(),
  },
  DATABASE: {
    DATABASE_HOST: env.get('DATABASE_HOST').default('localhost').asString(),
    DATABASE_PORT: env.get('DATABASE_PORT').default(3306).asPortNumber(),
    DATABASE_USER: env.get('DATABASE_USER').default('mcm').asString(),
    DATABASE_PASSWORD: env.get('DATABASE_PASSWORD').default('mcm').asString(),
    DATABASE_SCHEMA: env.get('DATABASE_SCHEMA').default('mcm').asString(),
    DB_RETRIES: env.get('DB_RETRIES').default('10').asInt(),
    DB_CONNECTION_RETRY_WAIT_MILLISECONDS: env
      .get('DB_CONNECTION_RETRY_WAIT_MILLISECONDS')
      .default('1000')
      .asInt(),
  },
  vault: {
    endpoint: env.get('VAULT_ENDPOINT').required().asString(),
    mounts: {
      pki: env.get('VAULT_MOUNT_PKI').default('pki').asString(),
      intermediatePki: env.get('VAULT_MOUNT_INTERMEDIATE_PKI').default('pki_int').asString(),
      kv: env.get('VAULT_MOUNT_KV').default('secrets').asString(),
      dfspClientCertBundle: env.get('VAULT_MOUNT_DFSP_CLIENT_CERT_BUNDLE').default('onboarding_pm4mls').asString(),
      dfspInternalIPWhitelistBundle: env.get('VAULT_MOUNT_DFSP_INT_IP_WHITELIST_BUNDLE').default('whitelist_pm4mls').asString(),
      dfspExternalIPWhitelistBundle: env.get('VAULT_MOUNT_DFSP_EXT_IP_WHITELIST_BUNDLE').default('whitelist_fsps').asString(),
    },
    pkiServerRole: env.get('VAULT_PKI_SERVER_ROLE').asString(),
    pkiClientRole: env.get('VAULT_PKI_CLIENT_ROLE').asString(),
    auth: vaultAuth,
    signExpiryHours: env.get('VAULT_SIGN_EXPIRY_HOURS').default('43800').asString(),
    keyLength: env.get('PRIVATE_KEY_LENGTH').default(4096).asIntPositive(),
    keyAlgorithm: env.get('PRIVATE_KEY_ALGORITHM').default('rsa').asString(),
  },
  auth: {
    enabled: env.get('AUTH_ENABLED').asBoolStrict(),
    creds: {
      user: env.get('AUTH_USER').asString(),
      pass: env.get('AUTH_PASS').asString(),
    }
  },
  clientCsrParameters: env.get('CLIENT_CSR_PARAMETERS').asJsonConfig(),
  serverCsrParameters: env.get('SERVER_CSR_PARAMETERS').asJsonConfig(),
  caCsrParameters: env.get('CA_CSR_PARAMETERS').asJsonConfig(),
};
