#!/bin/bash
set -eo pipefail

# Workaround: pin Node to .nvmrc (the CI machine executor defaults to an older one).
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
  nvm install "$(cat .nvmrc)" && nvm use "$(cat .nvmrc)"
fi

if [ ! -f .env ]; then
  cp ./test/.env-func .env
fi

npm ci

if ! npm run backend:start; then
  echo "=== backend:start failed; dumping container status and logs ==="
  docker compose --profile ci ps -a
  docker compose --profile ci logs --no-color --timestamps
  exit 1
fi

cd ./test/functional-tests

echo "Installing dependencies"
npm i

echo "Executing Functional Tests for $GIT_TAG"
npm test
