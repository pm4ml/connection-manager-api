# Connection Manager API

[![build-and-test](https://github.com/modusbox/connection-manager-api/actions/workflows/build-and-test.yaml/badge.svg)](https://github.com/modusbox/connection-manager-api/actions/workflows/build-and-test.yaml)

Connection Manager API is a component of the Mojaloop ecosystem that allows an administrator to manage the network configuration and PKI information for the Hub and a set of DFSPs.

It provides a REST API, described using a [Swagger/OpenAPI document](./src/api/swagger.yaml).

The current version uses both [cfssl](https://github.com/modusintegration/cfssl) and [openssl](https://www.openssl.org/) as the PKI engines which issue and process CSRs and Certificates. The specific version of cfssl that MCM depends on is kept in the [Dockerfile](./Dockerfile) as the value of the `branch` argument ( as in `--branch=v1.3.4` ) and can also be specified as an environment variable ( see `CFSSL_VERSION` below ).

The API servers uses OAuth2 to implement security, as defined in the [OAuth2 implementation doc](./oauth2.md)

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
|AUTH_ENABLED|Enables support for OAuth2. 'TRUE' to enable| (disabled)
|AUTH_2FA_ENABLED|Enables two-factor authentication 'TRUE' to enable| (disabled)
| **OAuth2 roles**
|MTA_ROLE|DFSP Admin role|'Application/MTA'
|PTA_ROLE|HUB Admin Role|'Application/PTA'
|EVERYONE_ROLE|Authenticated users role|'Internal/everyone'
| **WSO2 OAuth Service Provider configuration**
|APP_OAUTH_CLIENT_KEY|OAuth2 Client Key. Configured in WSO2 IM Service Provider|
|APP_OAUTH_CLIENT_SECRET|OAuth2 Client Secret. Configured in WSO2 IM Service Provider|
|CERTIFICATE_FILE_NAME|WSO2 **Service Provider** Public Certificate filename. If the value starts with `/` it will be read as an absolute path, otherwise as a relative path to the app dir|'resources/wso2carbon-publickey.cert'
|EMBEDDED_CERTIFICATE|WSO2 **Service Provider** Public Certificate PEM-encoded string. This one has priority over the previous var|
| **WSO2 OAuth server configuration**
|OAUTH2_ISSUER|OAuth token issuer endpoint. This service will connect to this endpoint to request the JWTs |https://WSO2_IM_SERVER:9443/oauth2/token
|OAUTH2_TOKEN_ISS|JWTs have an `iss` property. This property is usually the same as the endpoint (`OAUTH2_ISSUER`), but it may differ for example if there's an HTTP gateway with a different endpoint in between. You can use `OAUTH2_TOKEN_ISS` to specify the expected value of the `iss` property. This service validates that the value of the `iss` property on the JWT it receives on the API calls either is equal to either OAUTH2_ISSUER or OAUTH2_TOKEN_ISS; if there's no match then authentication will fail with a 401.|
| **Database configuration**
|DATABASE_HOST|mysql host|localhost
|DATABASE_PORT|mysql port|3306
|DATABASE_USER|mysql user|mcm
|DATABASE_PASSWORD|mysql password|mcm
|DATABASE_SCHEMA|mysql schema|mcm
|DB_RETRIES|Times the initial connection to the DB will be retried|10,
|DB_CONNECTION_RETRY_WAIT_MILLISECONDS|Pause between retries|5000,
|RUN_MIGRATIONS|If true, run db schema migration at startup. Can always be true as the schema creation is idempotent|true,
|CURRENCY_CODES|Path to file containing all the supported currency codes|'./data/currencyCodes.json',
|DATA_CONFIGURATION_FILE|Initial data configuration path. See specific doc|'./data/sampleConfiguration.json'
| **WSO2 custom services configuration**
|TOTP_ADMIN_ISSUER|URL of TOTP Admin (WSO2)|
|TOTP_ADMIN_AUTH_USER|user of TOTP Admin|
|TOTP_ADMIN_AUTH_PASSWORD|pass of TOTP Admin|
|TOTP_LABEL|a label to be shown with 2FA|
|TOTP_ISSUER|a issuer to be shown with 2FA|MCM
|WSO2_MANAGER_SERVICE_URL|URL of WSO2 Manager Service|
|WSO2_MANAGER_SERVICE_USER|user of WSO2 Manager Service|
|WSO2_MANAGER_SERVICE_PASSWORD|pass of WSO2 Manager Service|
|OAUTH_RESET_PASSWORD_ISSUER|URL of reset password issuer (WSO2)|
|OAUTH_RESET_PASSWORD_AUTH_USER|user of WSO2 reset password service (WSO2)|
|OAUTH_RESET_PASSWORD_AUTH_PASSWORD|password of WSO2 reset password service (WSO2)|
| **MCM Internal Certificate Authority configuration**
|P12_PASS_PHRASE|Pass phrase used to save the internal CA Key in the DB.|
| **Support for self-signed certificates on OAuth Server and other TLS client connections**
|EXTRA_CERTIFICATE_CHAIN_FILE_NAME|Extra trusted server certificate chain file name ( PEM-encoded, as explained in https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options )|
|EXTRA_ROOT_CERT_FILE_NAME|Extra trusted server root certificate file name|
| **CFSSL**
|CFSSL_VERSION|Expected CFSSL version to use. Should be updated to keep in sync with the cfssl development|1.3.4
|CFSSL_COMMAND_PATH|cfssl command; it should be just cfssl if it's in the PATH or the full path|cfssl

## Testing

- Unit testing:
  - run `npm run backend:start` as a pre-requisite to `npm test`
  - run `npm test`. The tests are implemented using `mocha`. If you need some test certificates, see the [test resources readme](./test/resources/README.md)
- Smoke testing ( `zsh` script ): run the [cmd-line-tester.sh](./scripts/cmd-line-tester.sh) script from a tmp directory
- swagger: see "running the server" below

### Functioanl Tests

Refer to [README](./test/functional-tests/README.md).

## Style

[![js-semistandard-style](https://cdn.rawgit.com/flet/semistandard/master/badge.svg)](https://github.com/Flet/semistandard)
 ( + dangling commas on Objects )

## Building a docker image

The server includes a [Dockerfile](./Dockerfile).

There's a set of scripts to build the image and tag it for a local minikube or other environments. Take a look at [./docker-build.sh](./docker-build.sh)
