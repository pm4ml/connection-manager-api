#!/bin/bash
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

cd "${PROJECT_ROOT}"

echo "Starting coverage tests..."

# Ensure environment is test
source "${SCRIPT_DIR}/env.sh"

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
