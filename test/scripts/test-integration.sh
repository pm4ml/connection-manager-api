#!/bin/bash
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

cd "${PROJECT_ROOT}"

echo "Starting coverage tests..."

# Ensure environment is test
export NODE_ENV=test

# Determine if running in CI or locally
if [ -z "${CI}" ]; then
  # Running locally
  
  # Check if backend is running
  if ! nc -z localhost 3001; then
    echo "WARNING: Backend is not running. Run \"npm run backend:start\" before executing..."
    exit 1
  fi
  
  # Set coverage directory
  COVERAGE_DIR="${PROJECT_ROOT}/coverage"
  
  # Create coverage directory if it doesn't exist
  mkdir -p "${COVERAGE_DIR}"
  
  # Run coverage tests using nyc (Istanbul's CLI)
  npx nyc --reporter=html --reporter=text --reporter=lcov npm run test:int
  
  # Open coverage report in browser (Mac-specific)
  open "${COVERAGE_DIR}/index.html"
  
  echo "Coverage tests finished. Report available in ${COVERAGE_DIR}"
else
  # Running in CI
  echo "Running in CI environment..."
  
  # Set coverage directory
  COVERAGE_DIR="${PROJECT_ROOT}/coverage"
  
  # Create coverage directory if it doesn't exist
  mkdir -p "${COVERAGE_DIR}"
  
  # Run coverage tests with NYC
  npx nyc --reporter=html --reporter=text --reporter=lcov npm run test:int
  
  # Check if coverage meets threshold
  COVERAGE_THRESHOLD=80
  COVERAGE_RESULT=$(npx nyc report --reporter=text-summary | grep "All files" | awk '{print $3}' | tr -d '%')
  
  echo "Coverage result: ${COVERAGE_RESULT}%"
  
  if [ $(echo "${COVERAGE_RESULT} < ${COVERAGE_THRESHOLD}" | bc -l) -eq 1 ]; then
    echo "Coverage is below threshold of ${COVERAGE_THRESHOLD}%"
    exit 1
  else
    echo "Coverage is at or above threshold of ${COVERAGE_THRESHOLD}%"
  fi
fi