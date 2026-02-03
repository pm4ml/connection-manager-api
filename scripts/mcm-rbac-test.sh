#!/bin/sh
# MCM RBAC Test Runner
# This script sets up test DFSPs, runs TTK RBAC tests, and cleans up
#
# Required environment variables:
#   MCM_EXTERNAL_URL       - MCM external URL (e.g., https://mcm.example.com)
#   KRATOS_EXTERNAL_URL    - Kratos external URL
#   KEYCLOAK_URL           - Keycloak URL
#   KEYCLOAK_HUBOP_REALM_NAME - Keycloak Hub Operator realm name
#   KEYCLOAK_DFSP_REALM_NAME  - Keycloak DFSP realm name
#   MAILPIT_URL            - Mailpit URL (e.g., http://mailpit-http:80)
#   PORTAL_ADMIN_USER      - Portal admin username
#   PORTAL_ADMIN_PASSWORD  - Portal admin password
#   TTK_BACKEND_URL        - TTK backend URL (e.g., http://ml-testing-toolkit-backend:5050)
#   TEST_CASES_DIR         - Path to test cases directory
#   MCM_TEST_SETUP         - Path to mcm-test-setup script
#
# Optional environment variables:
#   SAVE_REPORT          - Save report to TTK (default: true)
#   SAVE_REPORT_BASE_URL - Base URL for saved reports
#   ALLOW_FAILURES       - Allow test failures without exit code 1 (default: false)

set -e

MONETARY_ZONE_ID="XTS"

# --- Helper Functions ---

create_dfsp() {
  "$MCM_TEST_SETUP" create-dfsp \
    --mcm-url "$MCM_EXTERNAL_URL" \
    --id "$1" --name "$2" --email "$3" \
    --monetary-zone "$MONETARY_ZONE_ID" \
    --session "$PORTAL_ADMIN_SESSION"
}

destroy_dfsp() {
  "$MCM_TEST_SETUP" destroy-dfsp \
    --mcm-url "$MCM_EXTERNAL_URL" \
    --id "$1" --session "$PORTAL_ADMIN_SESSION" || true
}

complete_invitation() {
  "$MCM_TEST_SETUP" complete-invitation \
    --mailpit-url "$MAILPIT_URL" \
    --email "$1" --password "$2" \
    --first-name "$3" --last-name "$4"
}

get_operator_session() {
  "$MCM_TEST_SETUP" get-operator-session \
    --kratos-url "$KRATOS_EXTERNAL_URL" \
    --keycloak-realm "$KEYCLOAK_DFSP_REALM_NAME" \
    --email "$1" --password "$2"
}

generate_pm4ml_creds() {
  "$MCM_TEST_SETUP" generate-pm4ml-creds \
    --mcm-url "$MCM_EXTERNAL_URL" \
    --dfsp-id "$1" --session "$2"
}

get_jwt() {
  "$MCM_TEST_SETUP" get-jwt \
    --keycloak-url "$KEYCLOAK_URL" \
    --keycloak-realm "$KEYCLOAK_DFSP_REALM_NAME" \
    --client-id "$1" --client-secret "$2"
}

run_ttk_test() {
  echo "Running $1..."
  if npm run cli -- \
    -c /tmp/mcm-test-config.json \
    -e /tmp/mcm-test-env.json \
    -i "$2" \
    -u "$TTK_BACKEND_URL" \
    --report-format html \
    --report-auto-filename-enable true \
    --extra-summary-information="Test Suite:$1" \
    $REPORT_OPTS \
    --report-name "$(echo "$1" | tr ' ' '_' | tr '[:upper:]' '[:lower:]')"; then
    echo "$1 PASSED"
  else
    echo "ERROR: $1 FAILED"
    return 1
  fi
}

# --- Main Script ---

echo "===================================="
echo "MCM RBAC Validation Test Suite"
echo "===================================="
echo ""

# Validate required environment variables
required_vars="MCM_EXTERNAL_URL KRATOS_EXTERNAL_URL KEYCLOAK_URL KEYCLOAK_HUBOP_REALM_NAME KEYCLOAK_DFSP_REALM_NAME MAILPIT_URL PORTAL_ADMIN_USER PORTAL_ADMIN_PASSWORD TTK_BACKEND_URL TEST_CASES_DIR MCM_TEST_SETUP"
for var in $required_vars; do
  eval val=\$$var
  if [ -z "$val" ]; then
    echo "ERROR: Required environment variable $var is not set"
    exit 1
  fi
done

SAVE_REPORT="${SAVE_REPORT:-true}"
ALLOW_FAILURES="${ALLOW_FAILURES:-false}"

if [ ! -x "$MCM_TEST_SETUP" ]; then
  echo "ERROR: mcm-test-setup not found at $MCM_TEST_SETUP"
  exit 1
fi

# Generate test data with random suffix
echo "Setting up test environment..."
RANDOM_SUFFIX=$(date +%s | md5sum | head -c 6)

DFSP1_ID="testdfsp1-$RANDOM_SUFFIX"
DFSP1_NAME="Test DFSP 1 ($RANDOM_SUFFIX)"
DFSP1_EMAIL="testdfsp1-$RANDOM_SUFFIX@test.local"
DFSP1_PASSWORD="Test@$(head -c 12 /dev/urandom | base64 | tr -d '/+=')"

DFSP2_ID="testdfsp2-$RANDOM_SUFFIX"
DFSP2_NAME="Test DFSP 2 ($RANDOM_SUFFIX)"
DFSP2_EMAIL="testdfsp2-$RANDOM_SUFFIX@test.local"
DFSP2_PASSWORD="Test@$(head -c 12 /dev/urandom | base64 | tr -d '/+=')"

echo "Monetary Zone: $MONETARY_ZONE_ID"
echo "Test DFSP1: $DFSP1_ID ($DFSP1_EMAIL)"
echo "Test DFSP2: $DFSP2_ID ($DFSP2_EMAIL)"
echo ""

cleanup_test_dfsps() {
  echo ""
  echo "===================================="
  echo "Cleaning up test DFSPs..."
  echo "===================================="
  if [ -n "$PORTAL_ADMIN_SESSION" ]; then
    destroy_dfsp "$DFSP1_ID"
    destroy_dfsp "$DFSP2_ID"
    echo "Cleanup completed"
  fi
}
trap cleanup_test_dfsps EXIT

# Get portal admin session
echo "Getting portal admin session..."
PORTAL_ADMIN_SESSION=$("$MCM_TEST_SETUP" get-admin-session \
  --kratos-url "$KRATOS_EXTERNAL_URL" \
  --keycloak-realm "$KEYCLOAK_HUBOP_REALM_NAME" \
  --username "$PORTAL_ADMIN_USER" \
  --password "$PORTAL_ADMIN_PASSWORD")

# Create DFSPs
echo "Creating DFSP1..."
create_dfsp "$DFSP1_ID" "$DFSP1_NAME" "$DFSP1_EMAIL"
echo "Creating DFSP2..."
create_dfsp "$DFSP2_ID" "$DFSP2_NAME" "$DFSP2_EMAIL"

# Complete invitations
echo ""
echo "Completing DFSP1 invitation..."
complete_invitation "$DFSP1_EMAIL" "$DFSP1_PASSWORD" "Test" "DFSP1"
echo "Completing DFSP2 invitation..."
complete_invitation "$DFSP2_EMAIL" "$DFSP2_PASSWORD" "Test" "DFSP2"

# Get operator sessions
echo ""
echo "Getting operator sessions..."
DFSP1_SESSION=$(get_operator_session "$DFSP1_EMAIL" "$DFSP1_PASSWORD")
DFSP2_SESSION=$(get_operator_session "$DFSP2_EMAIL" "$DFSP2_PASSWORD")

# Generate PM4ML credentials
echo ""
echo "Generating PM4ML credentials..."
DFSP1_CREDS=$(generate_pm4ml_creds "$DFSP1_ID" "$DFSP1_SESSION")
DFSP1_CLIENT_ID=$(echo "$DFSP1_CREDS" | cut -d'|' -f1)
DFSP1_CLIENT_SECRET=$(echo "$DFSP1_CREDS" | cut -d'|' -f2)

DFSP2_CREDS=$(generate_pm4ml_creds "$DFSP2_ID" "$DFSP2_SESSION")
DFSP2_CLIENT_ID=$(echo "$DFSP2_CREDS" | cut -d'|' -f1)
DFSP2_CLIENT_SECRET=$(echo "$DFSP2_CREDS" | cut -d'|' -f2)

# Get JWT tokens
echo ""
echo "Getting JWT tokens..."
DFSP1_JWT=$(get_jwt "$DFSP1_CLIENT_ID" "$DFSP1_CLIENT_SECRET")
DFSP2_JWT=$(get_jwt "$DFSP2_CLIENT_ID" "$DFSP2_CLIENT_SECRET")

# Create TTK environment file
cat > /tmp/mcm-test-env.json << EOF
{
  "inputValues": {
    "MCM_EXTERNAL_URL": "$MCM_EXTERNAL_URL",
    "MONETARY_ZONE_ID": "$MONETARY_ZONE_ID",
    "DFSP1_ID": "$DFSP1_ID",
    "DFSP1_NAME": "$DFSP1_NAME",
    "DFSP2_ID": "$DFSP2_ID",
    "DFSP2_NAME": "$DFSP2_NAME",
    "PORTAL_ADMIN_SESSION": "$PORTAL_ADMIN_SESSION",
    "DFSP1_OPERATOR_SESSION": "$DFSP1_SESSION",
    "DFSP2_OPERATOR_SESSION": "$DFSP2_SESSION",
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

REPORT_OPTS=""
if [ "$SAVE_REPORT" = "true" ]; then
  REPORT_OPTS="--save-report true --report-folder /tmp"
  if [ -n "$SAVE_REPORT_BASE_URL" ]; then
    REPORT_OPTS="$REPORT_OPTS --save-report-base-url $SAVE_REPORT_BASE_URL"
  fi
fi

run_ttk_test "MCM RBAC Positive" "$TEST_CASES_DIR/mcm_rbac_positive.json" || TEST_FAILED=1
echo ""
run_ttk_test "MCM RBAC Negative" "$TEST_CASES_DIR/mcm_rbac_negative.json" || TEST_FAILED=1

if [ -f "$TEST_CASES_DIR/mcm_pm4ml_api.json" ]; then
  echo ""
  run_ttk_test "MCM PM4ML API" "$TEST_CASES_DIR/mcm_pm4ml_api.json" || TEST_FAILED=1
else
  echo ""
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
