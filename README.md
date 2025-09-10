# Connection Manager API

[![Release](https://github.com/modusbox/connection-manager-api/actions/workflows/releaseWorkflow.yml/badge.svg)](https://github.com/modusbox/connection-manager-api/actions/workflows/releaseWorkflow.yml)

Connection Manager API is a component of the Mojaloop ecosystem that allows an administrator to manage the network configuration and PKI information for the Hub and a set of DFSPs.

It provides a REST API, described using a [Swagger/OpenAPI document](./src/api/swagger.yaml).

The current version uses both [cfssl](https://github.com/modusintegration/cfssl) and [openssl](https://www.openssl.org/) as the PKI engines which issue and process CSRs and Certificates. The specific version of cfssl that MCM depends on is kept in the [Dockerfile](./Dockerfile) as the value of the `branch` argument ( as in `--branch=v1.3.4` ) and can also be specified as an environment variable ( see `CFSSL_VERSION` below ).

## Authentication

The Connection Manager API supports two types of authentication methods for different client types:

1. **Browser Clients (SPA)**: Cookie-based authentication with MySQL session store
2. **Machine Clients**: JWT/Bearer token authentication via Keycloak

Authentication is implemented using OpenID Connect (OIDC) with PKCE for enhanced security.

See [Authentication Documentation](docs/authentication.md) for details.

### OpenID Connect Authentication

The system uses OpenID Connect authentication, which is a provider-agnostic approach for authentication and authorization. Configure the following environment variables to enable OpenID Connect:

|Environment variable|Description|Default Value
:---|:---|:---
|OPENID_ENABLED|Enable OpenID Connect authentication|false
|OPENID_DISCOVERY_URL|OpenID Connect discovery URL|
|OPENID_CLIENT_ID|Client ID for OpenID authentication|
|OPENID_CLIENT_SECRET|Client secret for OpenID authentication|
|OPENID_REDIRECT_URI|Redirect URI for OpenID authentication|http://localhost:3001/api/auth/callback
|OPENID_JWT_COOKIE_NAME|Cookie name for storing the JWT token|MCM-API_ACCESS_TOKEN
|OPENID_EVERYONE_ROLE|Role assigned to all authenticated users|everyone
|OPENID_MTA_ROLE|DFSP Admin role mapping for OpenID|mta
|OPENID_PTA_ROLE|HUB Admin role mapping for OpenID|pta

#### Password Reset

For OpenID Connect authentication, password reset functionality is handled by the identity provider's own interface rather than through the Connection Manager API. This approach ensures compatibility with any standards-compliant OpenID provider.

## Running the server locally

To run the server with all the defaults and no security, the simplest way is to run:

```bash
P12_PASS_PHRASE="choose your own password" npm start
```

The default config requires a `mysql` db running on the default port.

Once running, you can access the [Swagger UI interface](http://localhost:3001/docs)

## Running the server + db + web UI locally while developing

The API server requires a mysql db. There's also a Web UI [https://github.com/modusbox/connection-manager-ui](https://github.com/modusbox/connection-manager-ui).

To run them together, you can use the following setup:

- Clone this repo and the Web UI repo at the same level
- Use the `docker-compose` config in this repo to run a mysql DB, the WebUI and the API server

```bash
mkdir modusbox
cd modusbox
git clone https://github.com/modusbox/connection-manager-ui
git clone https://github.com/modusbox/connection-manager-api
cd connection-manager-api/docker
docker-compose build
docker-compose up
```

Once the docker containers are confirmed to be stable and up, you will need to create the initial HUB environment. From a new terminal
 session, execute the following;

 ```bash
curl -X POST "http://localhost:3001/api/environments" -H "accept: application/json" -H "Content-Type: application/json" -d "{ \"name\": \"DEV\", \"defaultDN\": { \"CN\": \"tes1.centralhub.modusbox.live\", \"O\": \"Modusbox\", \"OU\": \"MCM\" }}"
 ```

The UI 'localhost' can now be opened in your local browser.

If you want to start the app with auth enabled:

1) create a local copy of `docker-compose-auth.yml` as in:

`cp docker-compose-auth.yml docker-compose-auth.local.yml`

( `docker-compose-auth.local.yml` is git-ignored )

1) Edit `docker-compose-auth.local.yml` and enter the security details.

1) Run the bundle with:

`docker-compose build && docker-compose -f docker-compose.yml -f docker-compose-auth.local.yml up`

## Configuration

There's a [Constants.js file](./src/constants/Constants.js) that pulls the values from the environment or uses defaults if not defined.

Variables:

|Environment variable|Description|Default Value
:---|:---|:---
| **MCM API server configuration**
|PORT|mcm API HTTP port|3001
| **Authentication features**
|OPENID_ENABLED|Enables support for OAuth2. 'TRUE' to enable| (disabled)
|OPENID_ENABLE_2FA|Enables two-factor authentication 'TRUE' to enable| (disabled)
| **Session configuration**
|SESSION_STORE_SECRET|Secret for encrypting session data|
|SESSION_MAX_AGE|Session timeout in milliseconds|86400000 (24 hours)
|SESSION_SAME_SITE|SameSite cookie setting|'strict'
|SESSION_SECURE|Whether session cookies require HTTPS|true in production
| **OAuth2 roles**
|MTA_ROLE|DFSP Admin role|'Application/MTA'
|PTA_ROLE|HUB Admin Role|'Application/PTA'
|EVERYONE_ROLE|Authenticated users role|'Internal/everyone'
| **Database configuration**
|DATABASE_HOST|mysql host|localhost
|DATABASE_PORT|mysql port|3306
|DATABASE_USER|mysql user|mcm
|DATABASE_PASSWORD|mysql password|mcm
|DATABASE_SCHEMA|mysql schema|mcm
|DATABASE_SSL_ENABLED|Enable SSL for MySQL connection|false
|DATABASE_SSL_VERIFY|Verify server certificate when using SSL|false
|DATABASE_SSL_CA|CA certificate string for MySQL SSL|''
|DB_RETRIES|Times the initial connection to the DB will be retried|10,
|DB_CONNECTION_RETRY_WAIT_MILLISECONDS|Pause between retries|5000,
|RUN_MIGRATIONS|If true, run db schema migration at startup. Can always be true as the schema creation is idempotent|true,
|CURRENCY_CODES|Path to file containing all the supported currency codes|'./data/currencyCodes.json',
|DATA_CONFIGURATION_FILE|Initial data configuration path. See specific doc|'./data/sampleConfiguration.json'
| **MCM Internal Certificate Authority configuration**
|P12_PASS_PHRASE|Pass phrase used to save the internal CA Key in the DB.|
| **Support for self-signed certificates on OAuth Server and other TLS client connections**
|EXTRA_CERTIFICATE_CHAIN_FILE_NAME|Extra trusted server certificate chain file name ( PEM-encoded, as explained in https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options )|
|EXTRA_ROOT_CERT_FILE_NAME|Extra trusted server root certificate file name|
| **CFSSL**
|CFSSL_VERSION|Expected CFSSL version to use. Should be updated to keep in sync with the cfssl development|1.3.4
|CFSSL_COMMAND_PATH|cfssl command; it should be just cfssl if it's in the PATH or the full path|cfssl
| **Keycloak Integration**
|KEYCLOAK_ENABLED|Enable Keycloak integration for DFSP account creation|false
|KEYCLOAK_BASE_URL|Base URL of the Keycloak server|http://localhost:8080
|KEYCLOAK_DISCOVERY_URL|OpenID Connect discovery URL for Keycloak|http://localhost:8080/realms/dfsps/.well-known/openid-configuration
|KEYCLOAK_ADMIN_CLIENT_ID|Client ID for Keycloak admin operations|connection-manager-client
|KEYCLOAK_ADMIN_CLIENT_SECRET|Client secret for Keycloak admin operations|
|KEYCLOAK_DFSPS_REALM|Keycloak realm for DFSP accounts|dfsps
|KEYCLOAK_AUTO_CREATE_ACCOUNTS|Automatically create Keycloak accounts when DFSPs are created|true

## Testing

- Unit testing:
  - run `npm run backend:start` as a pre-requisite to `npm test`
  - run `npm test`. The tests are implemented using `jest`. If you need some test certificates, see the [test resources readme](./test/resources/README.md)
- Smoke testing ( `zsh` script ): run the [cmd-line-tester.sh](./scripts/cmd-line-tester.sh) script from a tmp directory
- swagger: see "running the server" below

### Functional Tests

Refer to [README](./test/functional-tests/README.md).

## Style

[![js-semistandard-style](https://cdn.rawgit.com/flet/semistandard/master/badge.svg)](https://github.com/Flet/semistandard)
 ( + dangling commas on Objects )

## Building a docker image

The server includes a [Dockerfile](./Dockerfile).

There's a set of scripts to build the image and tag it for a local minikube or other environments. Take a look at
[./docker-build.sh](./docker-build.sh)
