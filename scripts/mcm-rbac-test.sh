#!/bin/sh
# MCM RBAC Test Runner
# This script sets up test DFSPs, runs TTK RBAC tests, and cleans up
#
# Required environment variables:
#   MCM_URL              - MCM API URL (e.g., http://mcm-connection-manager-api:3001)
#   KRATOS_PUBLIC_URL    - Kratos public URL (e.g., http://kratos-public)
#   KEYCLOAK_URL         - Keycloak URL (e.g., http://keycloak)
#   KEYCLOAK_REALM       - Keycloak realm (e.g., mojaloop)
#   MAILPIT_URL          - Mailpit URL (e.g., http://mailpit-http:8025)
#   PORTAL_ADMIN_USER    - Portal admin username
#   PORTAL_ADMIN_PASSWORD - Portal admin password
#   TTK_BACKEND_URL      - TTK backend URL (e.g., http://ml-testing-toolkit-backend:5050)
#   TEST_CASES_DIR       - Path to test cases directory
#   MCM_TEST_SETUP       - Path to mcm-test-setup script
#
# Optional environment variables:
#   SAVE_REPORT          - Save report to TTK (default: true)
#   SAVE_REPORT_BASE_URL - Base URL for saved reports
#   ALLOW_FAILURES       - Allow test failures without exit code 1 (default: false)

set -e

echo "===================================="
echo "MCM RBAC Validation Test Suite"
echo "===================================="
echo ""

# Validate required environment variables
required_vars="MCM_URL KRATOS_PUBLIC_URL KEYCLOAK_URL KEYCLOAK_REALM MAILPIT_URL PORTAL_ADMIN_USER PORTAL_ADMIN_PASSWORD TTK_BACKEND_URL TEST_CASES_DIR MCM_TEST_SETUP"
for var in $required_vars; do
  eval val=\$$var
  if [ -z "$val" ]; then
    echo "ERROR: Required environment variable $var is not set"
    exit 1
  fi
done

# Default optional variables
SAVE_REPORT="${SAVE_REPORT:-true}"
ALLOW_FAILURES="${ALLOW_FAILURES:-false}"

if [ ! -x "$MCM_TEST_SETUP" ]; then
  echo "ERROR: mcm-test-setup not found at $MCM_TEST_SETUP"
  exit 1
fi

# Generate test data with random suffix
echo "Setting up test environment..."
RANDOM_SUFFIX=$(date +%s | md5sum | head -c 6)
MONETARY_ZONE_ID="1"

DFSP1_ID="testdfsp1-$RANDOM_SUFFIX"
DFSP1_NAME="Test DFSP 1 ($RANDOM_SUFFIX)"
DFSP1_USER_EMAIL="testdfsp1-$RANDOM_SUFFIX@test.local"
DFSP1_USER_PASSWORD="Test@$(openssl rand -base64 12 | tr -d '/+=')"

DFSP2_ID="testdfsp2-$RANDOM_SUFFIX"
DFSP2_NAME="Test DFSP 2 ($RANDOM_SUFFIX)"
DFSP2_USER_EMAIL="testdfsp2-$RANDOM_SUFFIX@test.local"
DFSP2_USER_PASSWORD="Test@$(openssl rand -base64 12 | tr -d '/+=')"

echo "Monetary Zone: $MONETARY_ZONE_ID"
echo "Test DFSP1: $DFSP1_ID ($DFSP1_USER_EMAIL)"
echo "Test DFSP2: $DFSP2_ID ($DFSP2_USER_EMAIL)"
echo ""

# Cleanup function
cleanup_test_dfsps() {
  echo ""
  echo "===================================="
  echo "Cleaning up test DFSPs..."
  echo "===================================="

  if [ -n "$PORTAL_ADMIN_SESSION" ]; then
    "$MCM_TEST_SETUP" destroy-dfsp "$DFSP1_ID" "$PORTAL_ADMIN_SESSION" || true
    "$MCM_TEST_SETUP" destroy-dfsp "$DFSP2_ID" "$PORTAL_ADMIN_SESSION" || true
    echo "Cleanup completed"
  fi
}

trap cleanup_test_dfsps EXIT

# Get portal admin session
echo "Getting portal admin session..."
PORTAL_ADMIN_SESSION=$("$MCM_TEST_SETUP" get-admin-session)

# Create DFSPs
echo "Creating DFSP1..."
"$MCM_TEST_SETUP" create-dfsp "$DFSP1_ID" "$DFSP1_NAME" "$DFSP1_USER_EMAIL" "$MONETARY_ZONE_ID" "$PORTAL_ADMIN_SESSION"

echo "Creating DFSP2..."
"$MCM_TEST_SETUP" create-dfsp "$DFSP2_ID" "$DFSP2_NAME" "$DFSP2_USER_EMAIL" "$MONETARY_ZONE_ID" "$PORTAL_ADMIN_SESSION"

# Complete DFSP1 invitation
echo ""
echo "Completing DFSP1 invitation..."
"$MCM_TEST_SETUP" complete-invitation "$DFSP1_USER_EMAIL" "$DFSP1_USER_PASSWORD" "Test" "DFSP1"

# Clear Mailpit before DFSP2
curl -s -X DELETE "$MAILPIT_URL/api/v1/messages" > /dev/null

# Complete DFSP2 invitation
echo "Completing DFSP2 invitation..."
"$MCM_TEST_SETUP" complete-invitation "$DFSP2_USER_EMAIL" "$DFSP2_USER_PASSWORD" "Test" "DFSP2"

# Get operator sessions
echo ""
echo "Getting operator sessions..."
DFSP1_OPERATOR_SESSION=$("$MCM_TEST_SETUP" get-operator-session "$DFSP1_USER_EMAIL" "$DFSP1_USER_PASSWORD")
DFSP2_OPERATOR_SESSION=$("$MCM_TEST_SETUP" get-operator-session "$DFSP2_USER_EMAIL" "$DFSP2_USER_PASSWORD")

# Generate PM4ML credentials
echo ""
echo "Generating PM4ML credentials..."
DFSP1_CREDS=$("$MCM_TEST_SETUP" generate-pm4ml-creds "$DFSP1_ID" "$DFSP1_OPERATOR_SESSION")
DFSP1_CLIENT_ID=$(echo "$DFSP1_CREDS" | cut -d'|' -f1)
DFSP1_CLIENT_SECRET=$(echo "$DFSP1_CREDS" | cut -d'|' -f2)

DFSP2_CREDS=$("$MCM_TEST_SETUP" generate-pm4ml-creds "$DFSP2_ID" "$DFSP2_OPERATOR_SESSION")
DFSP2_CLIENT_ID=$(echo "$DFSP2_CREDS" | cut -d'|' -f1)
DFSP2_CLIENT_SECRET=$(echo "$DFSP2_CREDS" | cut -d'|' -f2)

# Get JWT tokens
echo ""
echo "Getting JWT tokens..."
DFSP1_JWT=$("$MCM_TEST_SETUP" get-jwt "$DFSP1_CLIENT_ID" "$DFSP1_CLIENT_SECRET")
DFSP2_JWT=$("$MCM_TEST_SETUP" get-jwt "$DFSP2_CLIENT_ID" "$DFSP2_CLIENT_SECRET")

# Create TTK environment file
cat > /tmp/mcm-test-env.json << EOF
{
  "inputValues": {
    "MCM_URL": "$MCM_URL",
    "MCM_EXTERNAL_URL": "$MCM_URL",
    "MONETARY_ZONE_ID": "$MONETARY_ZONE_ID",
    "DFSP1_ID": "$DFSP1_ID",
    "DFSP1_NAME": "$DFSP1_NAME",
    "DFSP2_ID": "$DFSP2_ID",
    "DFSP2_NAME": "$DFSP2_NAME",
    "PORTAL_ADMIN_SESSION": "$PORTAL_ADMIN_SESSION",
    "DFSP1_OPERATOR_SESSION": "$DFSP1_OPERATOR_SESSION",
    "DFSP2_OPERATOR_SESSION": "$DFSP2_OPERATOR_SESSION",
    "DFSP1_JWT": "$DFSP1_JWT",
    "DFSP2_JWT": "$DFSP2_JWT"
  }
}
EOF

cat > /tmp/mcm-test-config.json << 'EOFCONFIG'
{
  "mode": "outbound",
  "logLevel": "2"
}
EOFCONFIG

echo ""
echo "===================================="
echo "Running MCM RBAC Tests"
echo "===================================="
echo ""

TEST_FAILED=0

# Build report options
REPORT_OPTS=""
if [ "$SAVE_REPORT" = "true" ]; then
  REPORT_OPTS="--save-report true --report-folder /tmp"
  if [ -n "$SAVE_REPORT_BASE_URL" ]; then
    REPORT_OPTS="$REPORT_OPTS --save-report-base-url $SAVE_REPORT_BASE_URL"
  fi
fi

# Run positive tests
echo "Running MCM RBAC positive tests..."
if npm run cli -- \
  -c /tmp/mcm-test-config.json \
  -e /tmp/mcm-test-env.json \
  -i "$TEST_CASES_DIR/mcm_rbac_positive.json" \
  -u "$TTK_BACKEND_URL" \
  --report-format html \
  --report-auto-filename-enable true \
  --extra-summary-information="Test Suite:MCM RBAC Positive" \
  $REPORT_OPTS \
  --report-name mcm_rbac_positive; then
  echo "Positive tests PASSED"
else
  echo "ERROR: Positive tests FAILED"
  TEST_FAILED=1
fi

echo ""

# Run negative tests
echo "Running MCM RBAC negative tests..."
if npm run cli -- \
  -c /tmp/mcm-test-config.json \
  -e /tmp/mcm-test-env.json \
  -i "$TEST_CASES_DIR/mcm_rbac_negative.json" \
  -u "$TTK_BACKEND_URL" \
  --report-format html \
  --report-auto-filename-enable true \
  --extra-summary-information="Test Suite:MCM RBAC Negative" \
  $REPORT_OPTS \
  --report-name mcm_rbac_negative; then
  echo "Negative tests PASSED"
else
  echo "ERROR: Negative tests FAILED"
  TEST_FAILED=1
fi

echo ""

# Run PM4ML API tests if collection exists
if [ -f "$TEST_CASES_DIR/mcm_pm4ml_api.json" ]; then
  echo "Running MCM PM4ML API tests..."
  if npm run cli -- \
    -c /tmp/mcm-test-config.json \
    -e /tmp/mcm-test-env.json \
    -i "$TEST_CASES_DIR/mcm_pm4ml_api.json" \
    -u "$TTK_BACKEND_URL" \
    --report-format html \
    --report-auto-filename-enable true \
    --extra-summary-information="Test Suite:MCM PM4ML API" \
    $REPORT_OPTS \
    --report-name mcm_pm4ml_api; then
    echo "PM4ML API tests PASSED"
  else
    echo "ERROR: PM4ML API tests FAILED"
    TEST_FAILED=1
  fi
else
  echo "SKIP: PM4ML API test collection not found"
fi

echo ""
echo "===================================="
echo "MCM RBAC Test Summary"
echo "===================================="
echo ""

if [ $TEST_FAILED -eq 0 ]; then
  echo "All MCM RBAC tests PASSED"
  exit 0
else
  echo "ERROR: Some MCM RBAC tests FAILED"
  if [ "$ALLOW_FAILURES" = "true" ]; then
    echo "ALLOW_FAILURES is set, exiting with 0"
    exit 0
  else
    exit 1
  fi
fi
