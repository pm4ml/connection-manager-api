#!/bin/bash
set -eo pipefail

npm ci
npm run backend:start

cd ./test/functional-tests

echo "Installing dependencies"

npm i

echo "Executing Functional Tests for $GIT_TAG"

npm test
