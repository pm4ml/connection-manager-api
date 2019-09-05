# Connection Manager API

The Connection Manager API allows an administrator to manage the network configuration and PKI information for the Hub and a set of DFSPs.

It provides a REST API, described using a [Swagger/OpenAPI document](./server/src/api/swagger.yaml).

The current version uses both [cfssl](https://github.com/modusintegration/cfssl) and [openssl](https://www.openssl.org/) as the PKI engines which issue and process CSRs and Certificates. The specific version of cfssl that MCM depends on is kept in the [Dockerfile](./server/Dockerfile)

The API servers uses OAuth2 to implement security, as defined in the [OAuth2 implementation doc](./oauth2.md)

## Running the server locally

To run the server with all the defaults and no security, the simplest way is to run:

```bash
cd server
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

If you want to start the app with auth enabled:

1) create a local copy of `docker-compose-auth.yml` as in:

`cp docker-compose-auth.yml docker-compose-auth.local.yml`

( `docker-compose-auth.local.yml` is git-ignored )

1) Edit `docker-compose-auth.local.yml` and enter the security details.

1) Run the bundle with:

`docker-compose build && docker-compose -f docker-compose.yml -f docker-compose-auth.local.yml up`


## Configuration

There's a [Constants.js file](./server/src/constants/Constants.js) that pulls the values from the environment or uses defaults if not defined.

Variables:

|ENV var|Description
:---|:---
|process.env.PORT|API http port|
|process.env.AUTH_ENABLED|Enables support for OAuth2|
|process.env.APP_OAUTH_CLIENT_KEY|OAuth2 Client Key|
|process.env.CERTIFICATE_FILE_NAME|WSO2 Service Provider Public Certificate filename ( relative to the server dir )|
|process.env.EMBEDDED_CERTIFICATE|WSO2 Service Provider Public Certificate PEM-encoded String. This one has priority over the previous var|
|process.env.MTA_ROLE|DFSP Admin role|
|process.env.PTA_ROLE|HUB Admin Role|
|process.env.EVERYONE_ROLE|Authenticated users role|
|process.env.OAUTH2_ISSUER|OAuth token issuer|
|process.env.DATABASE_HOST|mysql host|
|process.env.DATABASE_PORT|mysql port|
|process.env.DATABASE_USER|mysql user|
|process.env.DATABASE_PASSWORD|mysql password|
|process.env.DATABASE_SCHEMA|mysql schema|
|process.env.P12_PASS_PHRASE|Pass phrase used to save the internal CA Key in the DB.|
|process.env.AUTH_2FA_ENABLED|Enables two-factor authentication|
|process.env.TOTP_ADMIN_ISSUER|URL of TOTP Admin (WSO2)|
|process.env.TOTP_ADMIN_AUTH_USER|user of TOTP Admin|
|process.env.TOTP_ADMIN_AUTH_PASSWORD|pass of TOTP Admin|
|process.env.TOTP_LABEL|a label to be shown with 2FA|
|process.env.TOTP_ISSUER|a issuer to be shown with 2FA|
|process.env.WSO2_MANAGER_SERVICE_URL|URL of WSO2 Manager Service|
|process.env.WSO2_MANAGER_SERVICE_USER|user of WSO2 Manager Service|
|process.env.WSO2_MANAGER_SERVICE_PASSWORD|pass of WSO2 Manager Service|
 

## Testing

- Unit testing: run `npm test`. The tests are implemented using `mocha`. If you need some test certificates, see the [test resources readme](./server/test/resources/README.md)
- Smoke testing ( `zsh` script ): run the [cmd-line-tester.sh](./scripts/cmd-line-tester.sh) script from a tmp directory
- swagger: see "running the server" below

## Style

[![js-semistandard-style](https://cdn.rawgit.com/flet/semistandard/master/badge.svg)](https://github.com/Flet/semistandard)
 ( + dangling commas on Objects )

## Building a docker image

The server includes a [Dockerfile](./server/Dockerfile).

There's a set of scripts to build the image and tag it for a local minikube or other environments. Take a look at [./docker-build.sh](./docker-build.sh)

