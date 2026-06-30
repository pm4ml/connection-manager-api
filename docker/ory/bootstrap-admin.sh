#!/bin/sh
# Seeds the initial hub-admin: a Kratos identity (with a password) plus the
# Hub:<hub>#admins Keto tuple, so there is an account to log into the portal
# with. Idempotent, safe to re-run.
set -e

KRATOS_ADMIN_URL="${KRATOS_ADMIN_URL:-http://kratos:4434}"
KETO_WRITE_URL="${KETO_WRITE_URL:-http://keto:4467}"
EMAIL="${IAM_ADMIN_EMAIL:-admin@mcm.local}"
PASSWORD="${IAM_ADMIN_PASSWORD:-admin1234}"
ADMIN_ROLE="${IAM_HUB_ADMIN_ROLE:-hub-admin}"
HUB_OBJECT="${KETO_HUB_OBJECT:-mojaloop}"

ID=$(curl -s "$KRATOS_ADMIN_URL/admin/identities?credentials_identifier=$EMAIL" | jq -r '.[0].id // empty')

if [ -z "$ID" ]; then
  ID=$(curl -s -X POST "$KRATOS_ADMIN_URL/admin/identities" -H 'Content-Type: application/json' -d "{
    \"schema_id\": \"default\",
    \"traits\": { \"email\": \"$EMAIL\", \"roles\": [\"$ADMIN_ROLE\"] },
    \"metadata_public\": { \"role\": \"$ADMIN_ROLE\" },
    \"credentials\": { \"password\": { \"config\": { \"password\": \"$PASSWORD\" } } },
    \"verifiable_addresses\": [{ \"value\": \"$EMAIL\", \"via\": \"email\", \"verified\": true, \"status\": \"completed\" }]
  }" | jq -r '.id')
  echo "Created hub-admin identity $ID ($EMAIL)"
else
  echo "Hub-admin identity already exists: $ID ($EMAIL)"
fi

curl -s -X PUT "$KETO_WRITE_URL/admin/relation-tuples" -H 'Content-Type: application/json' \
  -d "{\"namespace\":\"Hub\",\"object\":\"$HUB_OBJECT\",\"relation\":\"admins\",\"subject_id\":\"$ID\"}" >/dev/null
echo "Added $ID to Hub:$HUB_OBJECT#admins"
