#!/bin/bash
set -eo pipefail

npm ci
npm run backend:start
export TEST=true
export TEST_INT=true
export SWITCH_ID=switch
npm run start

cd ./test/functional-tests

echo "Installing dependencies"

npm i

echo "Executing Functional Tests for $GIT_TAG"

npm test
