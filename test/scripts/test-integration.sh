#!/bin/bash
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

cd "${PROJECT_ROOT}"

echo "Starting integration tests..."

# Ensure environment is test
export NODE_ENV=test

# Check if backend is running (optional, but recommended)
if ! nc -z localhost <BACKEND_PORT>; then  # Replace <BACKEND_PORT> with the actual port
  echo "WARNING: Backend is not running. Run \"npm run backend:start\" before executing..."
  exit 1  # Or continue if you want tests to run even if the backend is down.
fi

# Run integration tests with mocha.  Use the existing npm script if possible
npm run test:int

# OR, if you absolutely must use npx directly (less preferred):

# npx mocha \
#   --timeout 30000 \
#   --recursive \
#   './test/int/**/*.test.js'

echo "Integration tests finished."