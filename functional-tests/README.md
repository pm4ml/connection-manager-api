# Functional Tests

## Configuration

| Environment Variable    | Description                             | Default                   |
| ----------------------- | --------------------------------------- | ------------------------- |
| APP_ENDPOINT            | Endpoint for MCM API                    | http://localhost:3001/api |
| OAUTH2_ISSUER           | Endpoint for Oauth Token Issuer Service | n/a                       |
| APP_OAUTH_CLIENT_KEY    | OAuth Client-credential ID              | n/a                       |
| APP_OAUTH_CLIENT_SECRET | OAuth Client-credential Secret          | n/a                       |

## Executing Tests

### OAuth Disabled

1. Start the MCM API Service from root with OAuth disabled

    From the root of the project

    ```bash
    cd ./server
    ```

    Open .env in this directory and set AUTH_ENABLED=false

    ```bash
    npm i
    npm run start:backend
    npm start
    ```

2. Run Functional Tests

    ```bash
    cd ./functional-tests
    ```

    Make sure in the local .env file and the file is empty, or if there are any oauth entries, they are commented out.

    ```bash
    npm i
    npm test
    ```

### OAuth Disabled with MCM API running on Docker

1. Start the MCM API Service from Docker with OAuth disabled.

    From the root of the project

    ```bash
    cd ./server
    ```

    ```bash
    npm i
    npm run start:backend
    ```

    Build MCM API Service Docker image

    ```bash
    docker build -t connection-manager-api:test .
    ```

    Run MCM API Service Docker image

    ```bash
    VAULT_DIR="`pwd`/.vault" &&
    MCM_ENV="../docker/functional-tests.env" &&
    docker run --rm -it --env-file $MCM_ENV -v $VAULT_DIR:/tmp/vault -p 3001:3001 -p 9229:9229 connection-manager-api:test
    ```

    Note:
    - if you are running on MacOS, uncomment the following lines from the [functional-test.env](../docker/functional-tests.env).

        ```bash
        # DATABASE_HOST=host.docker.internal
        # VAULT_ENDPOINT=http://host.docker.internal:8233
        ```

    - if you are running on linux, add `--net=host` to the Docker run command
  
        ```bash
        docker run --net=host --rm -it --env-file $MCM_ENV -v $VAULT_DIR:/tmp/vault -p 3001:3001 -p 9229:9229 connection-manager-api:test
        ```

2. See [#OAuth Disabled - 2. Run Functional Tests](#oauth-disabled) above.

### OAuth Enabled

1. Start the MCM API Service from root with OAuth enabled. Make sure you are connected to the vpn of the environment from where you plan to get the ISKM token.

    From the root of the project

    ```bash
    1.1 cd ./server
    ```

    1.2 Open .env in this directory and set AUTH_ENABLED=true

    1.3 Open Vault for product-dev environment. Go to secrets->secret->wso2->adminpwd and copy the admin password for wso2 ISKM

    1.4 Open wso2 ISKM. Click List in Service Providers. Click MCM_Portal and click Edit

    1.5. Open Inbound Authentication COnfiguration -> OAuth/Open ID Connect Configuration and copy OAuth Client Key and OAuth Client Secret and paste it in the APP_OAUTH_CLIENT_KEY, APP_OAUTH_CLIENT_SECRET variables in server/.env and functional_tests/.env file.

    1.6. Fill in the OAUTH2_ISSUER with the corresponding env. For example if you are using product dev env, it should be ISKM.dev.product.mbox-dev.io/oauth2/token

    1.7. Go to mcm k8s cluster, acess connection-manager-secret and copy the certificate and paste its contents as a single line in the value for EMBEDDED_CERTIFICATE variable.

    1.8 Make sure the 4 env vars are updated in both /server/.env

    ```bash
    npm i
    npm run start:backend
    npm start
    ```

2. Run Functional Tests

  2.1 Make sure APP_OAUTH_CLIENT_KEY and APP_OAUTH_CLIENT_SECRET are populated with the values from the steps described in the section above.
  
  ```bash
  cd ./functional-tests
  npm i
  npm test
  ```
