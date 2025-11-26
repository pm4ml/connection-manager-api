#!/bin/bash
set -eo pipefail

if [ ! -f .env ]; then
  cp ./test/.env-func .env
fi

nvm use
npm ci
npm run backend:start

cd ./test/functional-tests

echo "Installing dependencies"
nvm use
npm i

echo "Executing Functional Tests for $GIT_TAG"
npm test
