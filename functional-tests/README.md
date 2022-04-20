# Functional Tests

## Configuration

| Environment Variable    | Description                             | Default                   |
| ----------------------- | --------------------------------------- | ------------------------- |
| APP_ENDPOINT            | Endpoint for MCM API                    | http://localhost:3001/api |
| OAUTH2_ISSUER           | Endpoint for Oauth Token Issuer Service | n/a                       |
| APP_OAUTH_CLIENT_KEY    | OAuth Client-credential ID              | n/a                       |
| APP_OAUTH_CLIENT_SECRET | OAuth Client-credential Secret          | n/a                       |

## Executing Tests

1. Start the MCM API Service from root

  ```bash
  cd ./server

  npm i

  npm run start:backend

  npm start
  ```

2. Run Functional Tests

  ```bash
  cd ./functional-tests

  npm i

  npm test
  ```
