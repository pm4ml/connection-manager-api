#!/bin/bash
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

cd "${PROJECT_ROOT}"

echo "Starting integration tests..."

# Ensure environment is test
export NODE_ENV=test

# Run integration tests with mocha
npx mocha \
  --timeout 30000 \
  --recursive \
  './test/integration/**/*.test.js'